import { compoundPeriodRate, realRate, yearFracForAge } from '../core/math.js';
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
  withdrawFromPotsByPriorityDetailed,
} from './dcEngine.js';
import { buildDcTaxResult, solveGrossForNetTarget } from './taxEngine.js';
import { scoreStrategies } from './strategyScorer.js';

function cloneState(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function standardDeviation(values) {
  if (!values || values.length === 0) return 0;
  const nums = values.map((value) => Number(value || 0));
  const mean = nums.reduce((sum, value) => sum + value, 0) / nums.length;
  const variance = nums.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / nums.length;
  return Math.sqrt(variance);
}

function roundToStep(value, step) {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) return 0;
  return Math.round(value / step) * step;
}

function dbReductionFactor(takeAge, npa, earlyReductionPct, deferralIncreasePct) {
  const earlyPct = Math.max(0, Number(earlyReductionPct || 0));
  const deferPct = Math.max(0, Number(deferralIncreasePct || 0));
  if (takeAge >= npa) {
    const yearsDeferred = takeAge - npa;
    return Math.pow(1 + (deferPct / 100), yearsDeferred);
  }
  const yearsEarly = npa - takeAge;
  return Math.pow(Math.max(0, 1 - (earlyPct / 100)), yearsEarly);
}

function buildRetirementLumpSumContext(state, retireAge) {
  const baseDrawdown = Number(state.drawdown || 0);
  const tflsCap = Math.max(0, Number(state.tflsCap || 0));
  const dcPots = [
    {
      id: 'current-workplace',
      name: 'current workplace pension',
      currentValue: Number(state.pot || 0),
      feePct: Number(state.feePct || 0),
    },
    ...((state.dcPensions || []).map((pot) => ({
      id: String(pot.id || ''),
      name: String(pot.name || 'DC pension'),
      currentValue: Number(pot.currentValue || 0),
      feePct: Number(pot.feePct || 0),
    }))),
  ].filter((pot) => pot.currentValue > 0 && pot.id);

  const totalDcNow = dcPots.reduce((sum, pot) => sum + Number(pot.currentValue || 0), 0);
  const cappedPool = Math.max(0, Math.min(totalDcNow, tflsCap));

  const smallestPot = [...dcPots].sort((a, b) => Number(a.currentValue || 0) - Number(b.currentValue || 0))[0] || null;
  const highestFeePot = [...dcPots].sort((a, b) => Number(b.feePct || 0) - Number(a.feePct || 0))[0] || null;

  const targetOptions = [
    { id: 'any-dc', label: 'across DC pots by priority' },
    ...(smallestPot ? [{ id: smallestPot.id, label: `from ${smallestPot.name}` }] : []),
    ...(highestFeePot && highestFeePot.id !== smallestPot?.id ? [{ id: highestFeePot.id, label: `from ${highestFeePot.name}` }] : []),
  ];

  return { retireAge, baseDrawdown, cappedPool, targetOptions };
}

function buildPclsCandidate(ctx, amount, targetOption, idPrefix = 'pcls-at-retirement') {
  const amountK = Math.round(amount / 1000);
  const amountRatio = Math.max(0, Math.min(1, amount / Math.max(1, ctx.cappedPool)));
  const beforeSpCut = Math.min(1.3, 0.2 + (amountRatio * 1.8));
  const afterSpCut = Math.min(1.6, 0.35 + (amountRatio * 2.0));
  return {
    id: `${idPrefix}-${targetOption.id}-${Math.round(amount)}`,
    name: `Take ~£${amountK}k tax-free at retirement`,
    summary: `Take approximately £${amountK}k as a tax-free lump sum at retirement ${targetOption.label}, then draw a lower recurring income from the remaining pot.`,
    objective: 'balanced',
    dcOrder: 'smallest-pot-first',
    retirementLumpSum: {
      enabled: true,
      type: 'pcls',
      amountType: 'fixed',
      amount,
      age: ctx.retireAge,
      targetId: targetOption.id,
    },
    drawdownPlan: {
      mode: 'pct-pot',
      beforeStatePensionPct: Math.max(2.2, ctx.baseDrawdown - beforeSpCut),
      afterStatePensionPct: Math.max(1.8, ctx.baseDrawdown - afterSpCut),
    },
    optimisationMeta: { kind: 'retirement-pcls-grid', targetId: targetOption.id, amount },
  };
}

function buildRetirementLumpSumCandidatesFromAmounts(state, retireAge, amountSteps, idPrefix = 'pcls-at-retirement') {
  const ctx = buildRetirementLumpSumContext(state, retireAge);
  if (ctx.cappedPool < 5000 || ctx.targetOptions.length === 0) return [];

  const amounts = [...new Set((amountSteps || [])
    .map((amount) => roundToStep(Number(amount || 0), 1000))
    .filter((amount) => amount >= 5000 && amount <= ctx.cappedPool))]
    .sort((a, b) => a - b);

  const candidates = [];
  amounts.forEach((amount) => {
    ctx.targetOptions.forEach((targetOption) => {
      candidates.push(buildPclsCandidate(ctx, amount, targetOption, idPrefix));
    });
  });

  if (idPrefix === 'pcls-at-retirement') {
    const defaultTarget = ctx.targetOptions[0];
    const midAmount = amounts[Math.floor(amounts.length / 2)] || 0;
    if (defaultTarget && midAmount > 0) {
      const canonical = buildPclsCandidate(ctx, midAmount, defaultTarget, 'pcls-at-retirement-canonical');
      canonical.id = 'pcls-at-retirement';
      candidates.unshift(canonical);
    }
  }

  const byId = new Map();
  candidates.forEach((candidate) => {
    if (!byId.has(candidate.id)) byId.set(candidate.id, candidate);
  });
  return [...byId.values()];
}

function buildRetirementLumpSumCandidates(state, retireAge) {
  const ctx = buildRetirementLumpSumContext(state, retireAge);
  if (ctx.cappedPool < 5000) return [];
  const amountPercents = [0.08, 0.12, 0.16, 0.2, 0.24];
  const amountSteps = [...new Set(amountPercents.map((pct) => roundToStep(ctx.cappedPool * pct, 1000)))]
    .filter((amount) => amount >= 5000)
    .sort((a, b) => a - b);
  return buildRetirementLumpSumCandidatesFromAmounts(state, retireAge, amountSteps, 'pcls-at-retirement').slice(0, 16);
}

export function getCandidateStrategies(state) {
  const potCount = 1 + (state.dcPensions || []).length;
  const hasDb = (state.dbPensions || []).length > 0;
  const retireAge = Number(state.retireAge || state.stateAge || 67);
  const stateAge = Number(state.stateAge || 67);
  const hasBridgeWindow = retireAge < stateAge;
  const bridgeTarget = Math.max(18000, Math.round((Number(state.salary || 0) * 0.33) / 1000) * 1000 || 24000);
  const retirementLumpSumCandidates = buildRetirementLumpSumCandidates(state, retireAge);

  // Determine DB timing options based on existing DB pensions
  const dbTimingOptions = [];
  if (hasDb) {
    const dbNpas = (state.dbPensions || [])
      .map((p) => Number(p.npaAge || p.startAge || 67))
      .filter((a) => a > 0);
    const latestNpa = Math.max(...dbNpas, 67);
    const endAge = Number(state.endAge || 95);
    const minEligibleAge = 55; // Rising to 57 in 2028

    dbTimingOptions.push({ key: 'early', label: `Take DB at ${minEligibleAge} where eligible` });
    dbTimingOptions.push({ key: 'npa', label: 'Take DB at Normal Pension Age' });
    if (latestNpa + 3 <= endAge) dbTimingOptions.push({ key: 'defer-3', label: 'Defer DB by 3 years' });
  }

  const baseStrategies = [
    {
      id: 'straight-drawdown',
      name: 'Straight drawdown',
      summary: 'Keep the existing drawdown approach with your normal pension order.',
      objective: 'balanced',
      dcOrder: 'default',
      retirementLumpSum: null,
      drawdownPlan: {
        mode: 'pct-pot',
        beforeStatePensionPct: Number(state.drawdown || 0),
        afterStatePensionPct: Number(state.drawdown || 0),
      },
    },
    ...retirementLumpSumCandidates,
    {
      id: 'highest-fee-first',
      name: 'Use highest-fee pot first',
      summary: 'Draw from the most expensive DC pension first to try to preserve cheaper pots for longer.',
      objective: 'pot',
      dcOrder: 'highest-fee-first',
      retirementLumpSum: null,
      drawdownPlan: {
        mode: 'pct-pot',
        beforeStatePensionPct: Number(state.drawdown || 0),
        afterStatePensionPct: Math.max(2.5, Number(state.drawdown || 0) - 0.25),
      },
    },
  ];

  if (hasBridgeWindow) {
    baseStrategies.push({
      id: 'bridge-to-state-pension',
      name: 'Bridge to State Pension',
      summary: 'Use DC more heavily before State Pension starts, then ease back once guaranteed income begins.',
      objective: 'tax',
      dcOrder: 'highest-fee-first',
      retirementLumpSum: null,
      drawdownPlan: {
        mode: 'target-net-before-sp',
        targetNetBeforeSp: bridgeTarget,
        afterStatePensionPct: Math.max(2.5, Number(state.drawdown || 0) - 1),
      },
    });

    baseStrategies.push({
      id: 'tax-smoothing',
      name: 'Tax smoothing before State Pension',
      summary: 'Aim for steadier taxable income before State Pension so later years do not spike as sharply.',
      objective: 'tax',
      dcOrder: potCount > 1 ? 'highest-fee-first' : 'default',
      retirementLumpSum: null,
      drawdownPlan: {
        mode: 'target-net-before-sp',
        targetNetBeforeSp: Math.max(16000, Math.round((bridgeTarget * 0.8) / 1000) * 1000),
        afterStatePensionPct: Math.max(2.0, Number(state.drawdown || 0) - 1.25),
      },
    });
  }

  if (hasDb && hasBridgeWindow) {
    baseStrategies.push({
      id: 'db-aware-balance',
      name: 'DB-aware balanced plan',
      summary: 'Lean on defined benefit income as it starts and reduce DC strain once that guaranteed income is in payment.',
      objective: 'balanced',
      dcOrder: 'highest-fee-first',
      retirementLumpSum: null,
      drawdownPlan: {
        mode: 'target-net-before-sp',
        targetNetBeforeSp: Math.max(18000, Math.round((bridgeTarget * 0.9) / 1000) * 1000),
        afterStatePensionPct: Math.max(2.0, Number(state.drawdown || 0) - 1.5),
      },
      dbAware: true,
    });
  }

  // If no DB, return base strategies; otherwise multiply by DB timing options
  if (!hasDb || dbTimingOptions.length === 0) {
    return baseStrategies;
  }

  // Create variants by combining base strategies with DB timing options
  const candidates = [];
  baseStrategies.forEach((baseStrat) => {
    dbTimingOptions.forEach((timing) => {
      const dbStartAges = {};
      (state.dbPensions || []).forEach((dbPen) => {
        const npa = Number(dbPen.npaAge || dbPen.startAge || 67);
        let chosenAge = npa;

        if (timing.key === 'early') chosenAge = Math.min(npa, 55);
        if (timing.key === 'defer-3') chosenAge = npa + 3;

        dbStartAges[String(dbPen.id || '')] = chosenAge;
      });

      const variant = {
        ...baseStrat,
        id: `${baseStrat.id}|${Object.values(dbStartAges).join('-')}`,
        name: `${baseStrat.name} — ${timing.label}`,
        summary: `${baseStrat.summary} ${timing.label.toLowerCase()}.`,
        dbStartAges,
      };

      candidates.push(variant);
    });
  });

  return candidates;
}

function buildStrategyState(baseState, strategy) {
  const next = cloneState(baseState);
  next.dcPensions = (baseState.dcPensions || []).map((p) => ({ ...p }));
  next.dcOrderRule = String(strategy.dcOrder || 'default');
  next.strategyMeta = strategy;
  next.lumpSumEvents = [...(baseState.lumpSumEvents || [])];

  // Apply DB timing adjustments if specified in strategy
  if (strategy.dbStartAges && Object.keys(strategy.dbStartAges).length > 0) {
    const earlyReductionPct = Number(baseState.dbEarlyReductionPct ?? 4);
    const deferralIncreasePct = Number(baseState.dbDeferralIncreasePct ?? 5);
    next.dbPensions = (baseState.dbPensions || []).map((dbPen) => {
      const penId = String(dbPen.id || '');
      const chosenAge = strategy.dbStartAges[penId];
      const npa = Number(dbPen.npaAge || dbPen.startAge || 67);
      const baseNpaAnnualIncome = Number(dbPen.annualIncome || 0);

      if (chosenAge != null && chosenAge !== Number(dbPen.startAge)) {
        const factor = dbReductionFactor(chosenAge, npa, earlyReductionPct, deferralIncreasePct);
        return {
          ...dbPen,
          startAge: chosenAge,
          annualIncome: baseNpaAnnualIncome * factor,
          dbTakingAge: chosenAge,
          dbNpa: npa,
          dbNpaAnnualIncome: baseNpaAnnualIncome,
        };
      }

      return {
        ...dbPen,
        dbTakingAge: Number(dbPen.startAge || npa),
        dbNpa: npa,
        dbNpaAnnualIncome: baseNpaAnnualIncome,
      };
    });
  } else {
    next.dbPensions = (baseState.dbPensions || []).map((p) => ({ ...p }));
  }

  if (strategy.retirementLumpSum?.enabled) {
    next.lumpSumEvents.push({
      id: `strategy-${strategy.id}-lump`,
      name: `${strategy.name} lump sum`,
      type: strategy.retirementLumpSum.type,
      amountType: strategy.retirementLumpSum.amountType,
      amount: strategy.retirementLumpSum.amount,
      age: strategy.retirementLumpSum.age,
      targetId: strategy.retirementLumpSum.targetId || 'any-dc',
    });
  }

  return next;
}

function simulateStrategy(state, strategy) {
  const workingState = buildStrategyState(state, strategy);
  const inflation = workingState.inflation / 100;
  const baseReturn = realRate(workingState.returnNom / 100, inflation);
  const salaryGrowth = workingState.salaryGrowth / 100;
  const sources = normaliseSourceData(workingState);
  const pots = clonePots(sources.dc);
  const years = [];
  const actions = [];
  let salary = workingState.salary;
  let tflsUsed = 0;
  let startRetirementRow = null;
  const withdrawalByPotTotals = {};
  const lumpSumByPotTotals = {};
  let totalRetirementDrawdown = 0;

  for (let age = workingState.currentAge; age <= workingState.endAge; age += 1) {
    const yearFrac = yearFracForAge(workingState, age);
    const isRetired = age >= workingState.retireAge;
    const potStart = totalPot(pots);
    const stateIncome = age >= workingState.stateAge ? workingState.statePension * yearFrac : 0;
    const dbIncome = dbIncomeAtAge(workingState, sources.db, age);
    const lumpRes = processLumpSumEventsForAge(workingState, sources.lumpSums, pots, age, tflsUsed);
        Object.entries(lumpRes.byPot || {}).forEach(([potId, amount]) => {
          lumpSumByPotTotals[potId] = (lumpSumByPotTotals[potId] || 0) + Number(amount || 0);
        });

    const lumpSumGross = (lumpRes.flows.pclsGross || 0) + (lumpRes.flows.ufplsGross || 0) + (lumpRes.flows.taxableLumpGross || 0);
    let drawdownGross = 0;
    let drawdownByPot = {};
    let drawdownDetail = '';
    let contributionTotal = 0;

    if (!isRetired) {
      for (const pot of pots) {
        let add = 0;
        if (pot.salaryLinked) add += salary * ((workingState.empPct + workingState.erPct) / 100) * yearFrac;
        add += extraContribForPotAtAge(sources.events, pot.id, age, yearFrac);
        pot.value += add;
        contributionTotal += add;
      }
    } else {
      const potAfterLumps = totalPot(pots);
      const plan = strategy.drawdownPlan || {};
      if (plan.mode === 'target-net-before-sp' && age < workingState.stateAge) {
        const targetNet = Number(plan.targetNetBeforeSp || 0) * yearFrac;
        const solved = solveGrossForNetTarget(workingState, potAfterLumps, targetNet, stateIncome + dbIncome, workingState.otherIncome, lumpRes.tflsUsedAfterLumps);
        const drawdownRes = withdrawFromPotsByPriorityDetailed(pots, solved.gross);
        drawdownGross = drawdownRes.withdrawn;
        drawdownByPot = drawdownRes.byPot;
        drawdownDetail = `This targets approximately ${targetNet.toFixed(0)} net income before State Pension starts.`;
      } else {
        const pct = age < workingState.stateAge
          ? Number(plan.beforeStatePensionPct ?? workingState.drawdown)
          : Number(plan.afterStatePensionPct ?? workingState.drawdown);
        const grossTarget = Math.min(potAfterLumps, potAfterLumps * (pct / 100) * yearFrac);
        const drawdownRes = withdrawFromPotsByPriorityDetailed(pots, grossTarget);
        drawdownGross = drawdownRes.withdrawn;
        drawdownByPot = drawdownRes.byPot;
      }

      if (drawdownGross > 0) {
        totalRetirementDrawdown += drawdownGross;
        Object.entries(drawdownByPot).forEach(([potId, amount]) => {
          withdrawalByPotTotals[potId] = (withdrawalByPotTotals[potId] || 0) + Number(amount || 0);
        });
      }
    }

    const flows = {
      drawdownGross,
      pclsGross: lumpRes.flows.pclsGross,
      ufplsGross: lumpRes.flows.ufplsGross,
      taxableLumpGross: lumpRes.flows.taxableLumpGross,
    };

    const drawOnly = buildDcTaxResult(workingState, { drawdownGross, pclsGross: 0, ufplsGross: 0, taxableLumpGross: 0 }, 0, 0, 0, lumpRes.tflsUsedAfterLumps);
    const recurringTotal = buildDcTaxResult(workingState, { drawdownGross, pclsGross: 0, ufplsGross: 0, taxableLumpGross: 0 }, stateIncome, dbIncome, workingState.otherIncome, lumpRes.tflsUsedAfterLumps);
    const totalCash = buildDcTaxResult(workingState, flows, stateIncome, dbIncome, workingState.otherIncome, tflsUsed);
    tflsUsed = totalCash.tflsUsedNew;

    applyGrowthAndFeesToPots(workingState, pots, baseReturn, baseReturn, yearFrac);
    const potEnd = totalPot(pots);

    const notes = [];
    if (age === workingState.stateAge) notes.push('State Pension starts');
    if (yearFrac < 1) notes.push(`First period pro-rated (${(yearFrac * 12).toFixed(1)} months)`);
    if (dbIncome > 0) notes.push(`DB income ${dbIncome.toFixed(0)}`);
    notes.push(...lumpRes.notes);

    if (lumpRes.flows.pclsGross > 0) {
      actions.push({
        age,
        type: 'pcls',
        action: `Take ${lumpRes.flows.pclsGross.toFixed(0)} tax-free cash`,
        detail: `This uses Lump Sum Allowance and reduces the selected DC pot before ongoing drawdown.`
      });
    }
    if (lumpRes.flows.ufplsGross > 0) {
      actions.push({
        age,
        type: 'ufpls',
        action: `Take ${lumpRes.flows.ufplsGross.toFixed(0)} as UFPLS`,
        detail: `25% is treated as tax-free cash subject to remaining allowance, with the rest taxed as pension income.`
      });
    }
    if (drawdownGross > 0 && isRetired) {
      const stateFlag = age < workingState.stateAge ? 'before State Pension' : 'after State Pension';
      actions.push({
        age,
        type: 'drawdown',
        action: `Withdraw ${drawdownGross.toFixed(0)} gross from DC (${stateFlag})`,
        detail: drawdownDetail || `Recurring DC net income is ${drawOnly.net.toFixed(0)} and total annual net income is ${recurringTotal.net.toFixed(0)}.`
      });
    }

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
      guaranteedIncome: stateIncome + dbIncome,
      grossTaxableIncome: totalCash.grossTaxableIncome,
      taxableTotal: totalCash.taxableTotal,
      higherBand: totalCash.higherBand,
      basicBand: totalCash.basicBand,
      otherIncome: workingState.otherIncome,
      remainingLsa: Math.max(0, Number(workingState.tflsCap || 0) - Number(tflsUsed || 0)),
      drawdownByPot,
      lumpSumByPot: lumpRes.byPot || {},
      potStart,
      potEnd,
      note: notes.join(' • '),
    };

    if (age === workingState.retireAge) startRetirementRow = row;
    years.push(row);
    if (!isRetired) salary *= (1 + compoundPeriodRate(salaryGrowth, yearFrac));
  }

  const retRow = startRetirementRow || years.find((y) => y.age === workingState.retireAge) || years[years.length - 1];
  const potAt75Row = years.find((y) => y.age === 75) || years[years.length - 1];
  const retirementYears = years.filter((y) => y.age >= workingState.retireAge);
  const allowance = Number(workingState.allowance || 0);
  const higherRateYears = retirementYears.filter((y) => Number(y.higherBand || 0) > 0).length;
  const wastedAllowanceYears = retirementYears.filter((y) => Number(y.grossTaxableIncome || 0) > 0 && Number(y.grossTaxableIncome || 0) < allowance).length;

  const stateOrDbStartAges = new Set();
  stateOrDbStartAges.add(Number(workingState.stateAge || 0));
  retirementYears.forEach((row, idx, arr) => {
    if (row.dbIncome > 0 && (idx === 0 || Number(arr[idx - 1].dbIncome || 0) === 0)) {
      stateOrDbStartAges.add(Number(row.age));
    }
  });
  let taxSpikeAtStateOrDbStart = 0;
  retirementYears.forEach((row, idx, arr) => {
    if (!stateOrDbStartAges.has(Number(row.age))) return;
    const prevTax = idx > 0 ? Number(arr[idx - 1].tax || 0) : 0;
    taxSpikeAtStateOrDbStart = Math.max(taxSpikeAtStateOrDbStart, Number(row.tax || 0) - prevTax);
  });

  const recurringIncomes = retirementYears.map((y) => Number(y.recurringNetIncome || 0));
  const incomeDropsPct = recurringIncomes.slice(1).map((income, idx) => {
    const prev = Math.max(1, recurringIncomes[idx]);
    return Math.max(0, (prev - income) / prev);
  });
  const maxIncomeDropPct = incomeDropsPct.reduce((max, value) => Math.max(max, value), 0);
  const cliffEdgeCount = incomeDropsPct.filter((value) => value >= 0.15).length;

  const laterLifeRows = retirementYears.filter((y) => Number(y.age) >= 75);
  const dcRelianceLaterLife = laterLifeRows.length
    ? laterLifeRows.reduce((sum, row) => {
      const total = Math.max(1, Number(row.recurringNetIncome || 0));
      return sum + (Number(row.dcNetIncome || 0) / total);
    }, 0) / laterLifeRows.length
    : 0;

  const guaranteedIncomeRatioAtRet = Number(retRow?.guaranteedIncome || 0) / Math.max(1, Number(retRow?.recurringNetIncome || 0));
  const guaranteedFloorCoverageYears = retirementYears.filter((row) => Number(row.guaranteedIncome || 0) >= Math.max(0, Number(workingState.minimumDesiredNetIncome || 0))).length;

  const withdrawalShares = Object.values(withdrawalByPotTotals).map((value) => Number(value || 0) / Math.max(1, totalRetirementDrawdown));
  const maxWithdrawalShare = withdrawalShares.reduce((max, value) => Math.max(max, value), 0);

  const totalFees = years.reduce((sum, y) => sum + Number(y.fees || 0), 0);

  const metrics = {
    totalTax: years.reduce((sum, y) => sum + Number(y.tax || 0), 0),
    netAtRet: Number(retRow?.recurringNetIncome || 0),
    totalCashAtRet: Number(retRow?.totalCashReceived || 0),
    lowestIncomeAfterRet: retirementYears.length
      ? retirementYears.reduce((min, y) => Math.min(min, Number(y.recurringNetIncome ?? 0)), Infinity)
      : 0,
    potAt75: Number(potAt75Row?.potEnd || 0),
    potAtEnd: Number(years[years.length - 1]?.potEnd || 0),
    remainingLsaAtRet: Number(retRow?.remainingLsa || 0),
    totalLumpSums: years.reduce((sum, y) => sum + Number(y.lumpSumGross || 0), 0),
    averageRetirementIncome: retirementYears.reduce((sum, y, idx, arr) => sum + Number(y.recurringNetIncome || 0) / Math.max(arr.length, 1), 0),
    higherRateYears,
    wastedAllowanceYears,
    taxSpikeAtStateOrDbStart,
    incomeVolatility: standardDeviation(recurringIncomes),
    maxIncomeDropPct,
    cliffEdgeCount,
    dcRelianceLaterLife,
    guaranteedIncomeRatioAtRet,
    guaranteedFloorCoverageYears,
    maxWithdrawalShare,
    totalFees,
    lsaUsedByRet: Math.max(0, Number(workingState.tflsCap || 0) - Number(retRow?.remainingLsa || 0)),
    oneOffLumpSpikeAtRet: Math.max(0, Number(retRow?.totalCashReceived || 0) - Number(retRow?.recurringNetIncome || 0)),
    withdrawalByPotTotals,
    lumpSumByPotTotals,
  };

  return {
    strategy,
    state: workingState,
    years,
    actions,
    metrics,
    summary: {
      potAtRet: Number(retRow?.potStart || 0),
      netAtRet: Number(retRow?.recurringNetIncome || 0),
      totalCashAtRet: Number(retRow?.totalCashReceived || 0),
      taxAtRet: Number(retRow?.tax || 0),
      stateAtRet: Number(retRow?.statePension || 0),
      dbAtRet: Number(retRow?.dbIncome || 0),
      grossDcAtRet: Number(retRow?.drawdownGross || 0),
      remainingLsaAtRet: Number(retRow?.remainingLsa || 0),
    },
  };
}

export function runStrategy(state, strategy) {
  return simulateStrategy(state, strategy);
}

export function evaluateStrategies(state) {
  const candidates = getCandidateStrategies(state);
  const coarseResults = candidates.map((strategy) => runStrategy(state, strategy));

  const coarseLumpResults = coarseResults.filter((result) => result.strategy?.optimisationMeta?.kind === 'retirement-pcls-grid');
  if (coarseLumpResults.length === 0) return coarseResults;

  const scoredCoarse = scoreStrategies(coarseLumpResults, {
    priorityMode: state.strategyPriorityMode,
    targets: {
      minimumDesiredNetIncome: state.minimumDesiredNetIncome,
      targetRetirementNetIncome: state.targetRetirementNetIncome,
      minimumFlexibilityBufferAt75: state.minimumFlexibilityBufferAt75,
    },
  });

  const topForRefine = (scoredCoarse.ranked || []).slice(0, 2);
  const refineAmounts = [...new Set(topForRefine.flatMap((item) => {
    const anchor = roundToStep(Number(item.strategy?.optimisationMeta?.amount || 0), 1000);
    const deltas = [0, -10000, -6000, -3000, 3000, 6000, 10000];
    return deltas.map((delta) => anchor + delta);
  }))];

  const refinedCandidates = buildRetirementLumpSumCandidatesFromAmounts(state, Number(state.retireAge || state.stateAge || 67), refineAmounts, 'pcls-refined').slice(0, 18);
  if (refinedCandidates.length === 0) return coarseResults;

  const refinedResults = refinedCandidates.map((strategy) => runStrategy(state, strategy));
  const coarseNonLump = coarseResults.filter((result) => result.strategy?.optimisationMeta?.kind !== 'retirement-pcls-grid');

  // Score all lump candidates together (coarse + refined) and surface only the top 3 to avoid
  // flooding the strategy comparison table with near-identical PCLS variants.
  const allLumpResults = [...coarseLumpResults, ...refinedResults];
  const scoredAllLump = scoreStrategies(allLumpResults, {
    priorityMode: state.strategyPriorityMode,
    targets: {
      minimumDesiredNetIncome: state.minimumDesiredNetIncome,
      targetRetirementNetIncome: state.targetRetirementNetIncome,
      minimumFlexibilityBufferAt75: state.minimumFlexibilityBufferAt75,
    },
  });

  // Patch each top candidate's name/summary to reflect the *actual* simulated lump sum
  // rather than the pre-simulation requested amount (which may differ due to pot size,
  // LSA limits, or growth between valuation date and retirement).
  const top3Lump = (scoredAllLump.ranked || []).slice(0, 3).map((scored) => {
    const actualAmount = Number(scored.metrics?.totalLumpSums || 0);
    const actualK = Math.round(actualAmount / 1000);
    if (actualK > 0 && scored.strategy?.optimisationMeta) {
      return {
        ...scored,
        strategy: {
          ...scored.strategy,
          name: `Take ~\u00a3${actualK}k tax-free at retirement`,
          summary: `Take approximately \u00a3${actualK.toLocaleString()}k as a one-off tax-free lump sum from your DC pot at retirement, then draw a lower recurring income from the remaining pot.`,
        },
      };
    }
    return scored;
  });

  return [...coarseNonLump, ...top3Lump];
}
