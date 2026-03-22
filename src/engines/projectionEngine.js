import { compoundPeriodRate, realRate, yearFracForAge } from '../core/math.js';
import { fmtGBP } from '../core/formatters.js';
import { normaliseSourceData } from '../domain/sourceNormaliser.js';
import { dbIncomeAtAge } from './dbEngine.js';
import {
  applyGrowthAndFeesToPots,
  clonePots,
  extraContribForPotAtAge,
  processLumpSumEventsForAge,
  totalFeesForPots,
  totalPot,
  withdrawFromPotsByPriority,
} from './dcEngine.js';
import { buildDcTaxResult, solveGrossForNetTarget } from './taxEngine.js';

export function calcProjection(state, opts = {}) {
  const inflation = state.inflation / 100;
  const baseReturn = realRate(state.returnNom / 100, inflation);
  const salaryGrowth = state.salaryGrowth / 100;
  const drawdownPct = state.drawdown / 100;

  const crashAtAge = opts.crashAtAge ?? null;
  const crashPct = (opts.crashPct ?? 0) / 100;
  const badYears = opts.badYears ?? 0;
  const badPenalty = (opts.badPenalty ?? 0) / 100;

  const sources = normaliseSourceData(state);
  const pots = clonePots(sources.dc);
  const years = [];
  let salary = state.salary;
  let tflsUsed = 0;
  let startRetirementRow = null;

  for (let age = state.currentAge; age <= state.endAge; age += 1) {
    if (crashAtAge !== null && age === crashAtAge) {
      for (const pot of pots) pot.value *= (1 - crashPct);
    }

    const potStart = totalPot(pots);
    const yearFrac = yearFracForAge(state, age);
    const isRetired = age >= state.retireAge;
    let adjustedReturn = baseReturn;
    const yearsSinceRetirement = age - state.retireAge;
    if (isRetired && yearsSinceRetirement >= 0 && yearsSinceRetirement < badYears) {
      adjustedReturn = Math.max(-0.9, baseReturn - badPenalty);
    }

    const stateIncome = age >= state.stateAge ? state.statePension * yearFrac : 0;
    const dbIncome = dbIncomeAtAge(state, sources.db, age);
    const lumpRes = processLumpSumEventsForAge(state, sources.lumpSums, pots, age, tflsUsed);
    const lumpSumGross = (lumpRes.flows.pclsGross || 0) + (lumpRes.flows.ufplsGross || 0) + (lumpRes.flows.taxableLumpGross || 0);

    let drawdownGross = 0;
    let contributionTotal = 0;

    if (!isRetired) {
      for (const pot of pots) {
        let add = 0;
        if (pot.salaryLinked) add += salary * ((state.empPct + state.erPct) / 100) * yearFrac;
        add += extraContribForPotAtAge(sources.events, pot.id, age, yearFrac);
        pot.value += add;
        contributionTotal += add;
      }
    } else {
      const potAfterLumps = totalPot(pots);
      const grossTarget = Math.min(potAfterLumps, potAfterLumps * drawdownPct * yearFrac);
      drawdownGross = withdrawFromPotsByPriority(pots, grossTarget);
    }

    const flows = {
      drawdownGross,
      pclsGross: lumpRes.flows.pclsGross,
      ufplsGross: lumpRes.flows.ufplsGross,
      taxableLumpGross: lumpRes.flows.taxableLumpGross,
    };

    const drawOnly = buildDcTaxResult(state, { drawdownGross, pclsGross: 0, ufplsGross: 0, taxableLumpGross: 0 }, 0, 0, 0, lumpRes.tflsUsedAfterLumps);
    const recurringTotal = buildDcTaxResult(state, { drawdownGross, pclsGross: 0, ufplsGross: 0, taxableLumpGross: 0 }, stateIncome, dbIncome, state.otherIncome, lumpRes.tflsUsedAfterLumps);
    const totalCash = buildDcTaxResult(state, flows, stateIncome, dbIncome, state.otherIncome, tflsUsed);
    tflsUsed = totalCash.tflsUsedNew;

    applyGrowthAndFeesToPots(state, pots, baseReturn, isRetired ? adjustedReturn : baseReturn, yearFrac);
    const potEnd = totalPot(pots);

    const notes = [];
    if (age === state.stateAge) notes.push('State Pension starts');
    if (yearFrac < 1) notes.push(`First period pro-rated (${(yearFrac * 12).toFixed(1)} months)`);
    if (dbIncome > 0) notes.push(`DB income ${fmtGBP(dbIncome)}`);
    notes.push(...lumpRes.notes);

    const row = {
      age,
      phase: isRetired ? 'retired' : 'work',
      salary: isRetired ? 0 : salary,
      contrib: isRetired ? 0 : contributionTotal,
      grossWithdrawal: drawdownGross,
      drawdownGross,
      lumpSumGross,
      pclsGross: lumpRes.flows.pclsGross || 0,
      ufplsGross: lumpRes.flows.ufplsGross || 0,
      taxableLumpGross: lumpRes.flows.taxableLumpGross || 0,
      tax: totalCash.tax,
      fees: totalFeesForPots(pots),
      dcNetIncome: drawOnly.net,
      recurringNetIncome: recurringTotal.net,
      annualNetIncome: recurringTotal.net,
      netIncome: totalCash.net,
      totalNetIncome: recurringTotal.net,
      totalCashReceived: totalCash.net,
      statePension: stateIncome,
      dbIncome,
      otherIncome: state.otherIncome,
      remainingLsa: Math.max(0, Number(state.tflsCap || 0) - Number(tflsUsed || 0)),
      potStart,
      potEnd,
      note: notes.join(' • '),
    };

    if (age === state.retireAge) startRetirementRow = row;
    years.push(row);

    if (!isRetired) salary *= (1 + compoundPeriodRate(salaryGrowth, yearFrac));
  }

  const retRow = startRetirementRow || years.find((year) => year.age === state.retireAge) || years[years.length - 1];
  const earlyRow = state.earlyAge !== '' ? years.find((year) => year.age === state.earlyAge) : null;
  const runOut = years.find((year) => (year.potEnd ?? Infinity) <= 0.000001 && year.age >= state.retireAge);

  const potAtRet = retRow?.potStart ?? years[years.length - 1]?.potEnd ?? 0;
  const potAtEarly = earlyRow ? earlyRow.potStart : Number.NaN;
  const stateAtRet = retRow?.statePension ?? 0;
  const dbAtRet = retRow?.dbIncome ?? 0;
  const netAtRet = retRow?.recurringNetIncome ?? retRow?.annualNetIncome ?? retRow?.totalNetIncome ?? retRow?.netIncome ?? 0;
  const privateAtRet = retRow?.dcNetIncome ?? 0;
  const grossDcAtRet = retRow?.drawdownGross ?? retRow?.grossWithdrawal ?? 0;
  const taxAtRet = Math.max(0, ((retRow?.drawdownGross ?? 0) + stateAtRet + dbAtRet + (retRow?.otherIncome ?? 0)) - netAtRet);
  const otherAtRet = retRow?.otherIncome ?? 0;
  const remainingLsaAtRet = retRow?.remainingLsa ?? Math.max(0, Number(state.tflsCap || 0));
  const retirementLumpSumAtRet = retRow?.lumpSumGross ?? 0;
  const pclsAtRet = retRow?.pclsGross ?? 0;
  const ufplsAtRet = retRow?.ufplsGross ?? 0;
  const taxableLumpAtRet = retRow?.taxableLumpGross ?? 0;

  return {
    years,
    potAtRet,
    potAtEarly,
    netAtRet,
    privateAtRet,
    grossDcAtRet,
    stateAtRet,
    dbAtRet,
    otherAtRet,
    taxAtRet,
    remainingLsaAtRet,
    retirementLumpSumAtRet,
    pclsAtRet,
    ufplsAtRet,
    taxableLumpAtRet,
    runOutAge: runOut ? runOut.age : null,
  };
}

function simulateBridgePath(state, opts, postStrategy) {
  const inflation = state.inflation / 100;
  const baseReturn = realRate(state.returnNom / 100, inflation);
  const salaryGrowth = state.salaryGrowth / 100;
  const early = state.earlyAge;
  const end = state.bridgeEndAge;
  const postDraw = state.bridgePostDraw / 100;
  const crashPct = state.crashPct / 100;
  const badYears = state.badYears;
  const badPenalty = state.badPenalty / 100;

  const sources = normaliseSourceData(state);
  const pots = clonePots(sources.dc);
  let salary = state.salary;
  let tflsUsed = 0;
  const rows = [];

  for (let age = state.currentAge; age <= state.endAge; age += 1) {
    const working = age < early;
    const bridging = age >= early && age < end;

    if (opts.crashAtEarly && age === early) for (const pot of pots) pot.value *= (1 - crashPct);
    if (opts.crashAtState && age === end) for (const pot of pots) pot.value *= (1 - crashPct);

    if (working) {
      const yearFrac = yearFracForAge(state, age);
      const potStart = totalPot(pots);
      let contrib = 0;
      for (const pot of pots) {
        let add = 0;
        if (pot.salaryLinked) add += salary * ((state.empPct + state.erPct) / 100) * yearFrac;
        add += extraContribForPotAtAge(sources.events, pot.id, age, yearFrac);
        pot.value += add;
        contrib += add;
      }
      applyGrowthAndFeesToPots(state, pots, baseReturn, baseReturn, yearFrac);
      rows.push({
        age,
        phase: 'work',
        gross: 0,
        netIncome: 0,
        tax: 0,
        fees: totalFeesForPots(pots),
        contrib,
        potStart,
        potEnd: totalPot(pots),
        note: yearFrac < 1 ? `First period pro-rated (${(yearFrac * 12).toFixed(1)} months)` : '',
      });
      salary *= (1 + compoundPeriodRate(salaryGrowth, yearFrac));
      continue;
    }

    let adjustedReturn = baseReturn;
    if (opts.badSeqFromEarly) {
      const since = age - early;
      if (since >= 0 && since < badYears) adjustedReturn = Math.max(-0.9, baseReturn - badPenalty);
    }

    const yearFrac = yearFracForAge(state, age);
    const stateIncome = age >= state.stateAge ? state.statePension * yearFrac : 0;
    const dbIncome = dbIncomeAtAge(state, sources.db, age);
    const otherIncome = state.otherIncome;
    let gross = 0;
    let net = 0;
    let tax = 0;
    const potStart = totalPot(pots);
    const lumpRes = processLumpSumEventsForAge(state, sources.lumpSums, pots, age, tflsUsed);

    if (bridging) {
      const potAfterLumps = totalPot(pots);
      let drawdownGross = 0;
      if (state.bridgeMode === 'gross') {
        drawdownGross = withdrawFromPotsByPriority(pots, Math.min(potAfterLumps, state.bridgeAmount * yearFrac));
      } else {
        const solution = solveGrossForNetTarget(state, potAfterLumps, state.bridgeAmount * yearFrac, stateIncome + dbIncome, otherIncome, tflsUsed);
        drawdownGross = withdrawFromPotsByPriority(pots, solution.gross);
      }
      const tr = buildDcTaxResult(state, {
        drawdownGross,
        pclsGross: lumpRes.flows.pclsGross,
        ufplsGross: lumpRes.flows.ufplsGross,
        taxableLumpGross: lumpRes.flows.taxableLumpGross,
      }, stateIncome, dbIncome, otherIncome, tflsUsed);
      gross = tr.grossDc;
      net = tr.net;
      tax = tr.tax;
      tflsUsed = tr.tflsUsedNew;
      applyGrowthAndFeesToPots(state, pots, baseReturn, adjustedReturn, yearFrac);
      rows.push({
        age,
        phase: 'bridge',
        gross,
        netIncome: net,
        tax,
        fees: totalFeesForPots(pots),
        potStart,
        potEnd: totalPot(pots),
        note: [dbIncome > 0 ? `DB income ${fmtGBP(dbIncome)}` : '', yearFrac < 1 ? `First period pro-rated (${(yearFrac * 12).toFixed(1)} months)` : '', ...lumpRes.notes]
          .filter(Boolean)
          .join(' • '),
      });
      continue;
    }

    let drawdownGross = 0;
    const potAfterLumps = totalPot(pots);
    if (postStrategy === 'baseline') {
      drawdownGross = withdrawFromPotsByPriority(pots, Math.min(potAfterLumps, potAfterLumps * postDraw * yearFrac));
    } else {
      const solution = solveGrossForNetTarget(state, potAfterLumps, state.bridgeAmount * yearFrac, stateIncome + dbIncome, otherIncome, tflsUsed);
      drawdownGross = withdrawFromPotsByPriority(pots, solution.gross);
    }

    const tr = buildDcTaxResult(state, {
      drawdownGross,
      pclsGross: lumpRes.flows.pclsGross,
      ufplsGross: lumpRes.flows.ufplsGross,
      taxableLumpGross: lumpRes.flows.taxableLumpGross,
    }, stateIncome, dbIncome, otherIncome, tflsUsed);
    gross = tr.grossDc;
    net = tr.net;
    tax = tr.tax;
    tflsUsed = tr.tflsUsedNew;
    applyGrowthAndFeesToPots(state, pots, baseReturn, adjustedReturn, yearFrac);
    rows.push({
      age,
      phase: 'post',
      gross,
      netIncome: net,
      tax,
      fees: totalFeesForPots(pots),
      potStart,
      potEnd: totalPot(pots),
      note: [age === end ? 'State Pension starts' : '', dbIncome > 0 ? `DB income ${fmtGBP(dbIncome)}` : '', yearFrac < 1 ? `First period pro-rated (${(yearFrac * 12).toFixed(1)} months)` : '', ...lumpRes.notes]
        .filter(Boolean)
        .join(' • '),
    });
  }

  return rows;
}

export function calcBridge(state, opts = {}) {
  if (!(state.earlyAge !== '' && isFinite(state.earlyAge))) return { error: 'Set an early retirement age.' };
  if (state.earlyAge < state.currentAge) return { error: 'Early retirement age must be >= current age.' };
  if (state.bridgeEndAge <= state.earlyAge) return { error: 'Bridge end age must be after early retirement age.' };

  const baseline = simulateBridgePath(state, opts, 'baseline');
  const lifestyle = state.bridgeKeepLifestyle === 1 ? simulateBridgePath(state, opts, 'lifestyle') : null;

  const potAtStart = (rows, age) => rows.find((item) => item.age === age)?.potStart ?? Number.NaN;
  const potAtEnd = (rows, age) => rows.find((item) => item.age === age)?.potEnd ?? Number.NaN;
  const netAt = (rows, age) => rows.find((item) => item.age === age)?.netIncome ?? Number.NaN;
  const runOutAge = (rows) => rows.find((item) => (item.potEnd ?? Infinity) <= 0.000001)?.age ?? null;

  return {
    baseline,
    lifestyle,
    early: state.earlyAge,
    end: state.bridgeEndAge,
    potEarly_base: potAtStart(baseline, state.earlyAge),
    potEnd_base: potAtEnd(baseline, state.bridgeEndAge),
    netEnd_base: netAt(baseline, state.bridgeEndAge),
    potEnd_life: lifestyle ? potAtEnd(lifestyle, state.bridgeEndAge) : Number.NaN,
    netEnd_life: lifestyle ? netAt(lifestyle, state.bridgeEndAge) : Number.NaN,
    runOut_base: runOutAge(baseline),
    runOut_life: lifestyle ? runOutAge(lifestyle) : null,
    error: null,
  };
}
