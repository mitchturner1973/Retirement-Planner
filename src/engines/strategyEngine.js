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
} from './dcEngine.js';
import { buildDcTaxResult, solveGrossForNetTarget } from './taxEngine.js';

function cloneState(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function reorderDcPensions(dcPensions, rule = 'default') {
  const arr = (dcPensions || []).map((p) => ({ ...p }));
  if (rule === 'highest-fee-first') {
    arr.sort((a, b) => Number(b.feePct || 0) - Number(a.feePct || 0));
  } else if (rule === 'smallest-pot-first') {
    arr.sort((a, b) => Number(a.currentValue || 0) - Number(b.currentValue || 0));
  } else if (rule === 'largest-pot-first') {
    arr.sort((a, b) => Number(b.currentValue || 0) - Number(a.currentValue || 0));
  }
  return arr.map((p, idx) => ({ ...p, priority: idx + 1 }));
}

export function getCandidateStrategies(state) {
  const potCount = 1 + (state.dcPensions || []).length;
  const hasDb = (state.dbPensions || []).length > 0;
  const retireAge = Number(state.retireAge || state.stateAge || 67);
  const stateAge = Number(state.stateAge || 67);
  const bridgeTarget = Math.max(18000, Math.round((Number(state.salary || 0) * 0.33) / 1000) * 1000 || 24000);

  const candidates = [
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
    {
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
    },
    {
      id: 'pcls-at-retirement',
      name: 'Tax-free lump sum at retirement',
      summary: 'Take a modest tax-free lump sum at retirement, then use a lower recurring drawdown rate.',
      objective: 'balanced',
      dcOrder: 'smallest-pot-first',
      retirementLumpSum: {
        enabled: true,
        type: 'pcls',
        amountType: 'fixed',
        amount: 20000,
        age: retireAge,
        targetId: 'any-dc',
      },
      drawdownPlan: {
        mode: 'pct-pot',
        beforeStatePensionPct: Math.max(2.5, Number(state.drawdown || 0) - 0.5),
        afterStatePensionPct: Math.max(2.0, Number(state.drawdown || 0) - 1),
      },
    },
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
    {
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
    },
  ];

  if (hasDb) {
    candidates.push({
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

  return candidates;
}

function buildStrategyState(baseState, strategy) {
  const next = cloneState(baseState);
  next.dcPensions = reorderDcPensions(baseState.dcPensions, strategy.dcOrder);
  next.strategyMeta = strategy;
  next.lumpSumEvents = [...(baseState.lumpSumEvents || [])];
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

  for (let age = workingState.currentAge; age <= workingState.endAge; age += 1) {
    const yearFrac = yearFracForAge(workingState, age);
    const isRetired = age >= workingState.retireAge;
    const potStart = totalPot(pots);
    const stateIncome = age >= workingState.stateAge ? workingState.statePension * yearFrac : 0;
    const dbIncome = dbIncomeAtAge(workingState, sources.db, age);
    const lumpRes = processLumpSumEventsForAge(workingState, sources.lumpSums, pots, age, tflsUsed);
    const lumpSumGross = (lumpRes.flows.pclsGross || 0) + (lumpRes.flows.ufplsGross || 0) + (lumpRes.flows.taxableLumpGross || 0);
    let drawdownGross = 0;
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
        drawdownGross = withdrawFromPotsByPriority(pots, solved.gross);
        if (drawdownGross > 0) {
          actions.push({ age, type: 'drawdown', action: `Target net income before State Pension`, detail: `Gross DC withdrawal ${drawdownGross.toFixed(0)} to support approximately ${targetNet.toFixed(0)} net before State Pension starts.` });
        }
      } else {
        const pct = age < workingState.stateAge
          ? Number(plan.beforeStatePensionPct ?? workingState.drawdown)
          : Number(plan.afterStatePensionPct ?? workingState.drawdown);
        const grossTarget = Math.min(potAfterLumps, potAfterLumps * (pct / 100) * yearFrac);
        drawdownGross = withdrawFromPotsByPriority(pots, grossTarget);
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
        detail: `Recurring DC net income is ${drawOnly.net.toFixed(0)} and total annual net income is ${recurringTotal.net.toFixed(0)}.`
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
      otherIncome: workingState.otherIncome,
      remainingLsa: Math.max(0, Number(workingState.tflsCap || 0) - Number(tflsUsed || 0)),
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
  const metrics = {
    totalTax: years.reduce((sum, y) => sum + Number(y.tax || 0), 0),
    netAtRet: Number(retRow?.recurringNetIncome || 0),
    totalCashAtRet: Number(retRow?.totalCashReceived || 0),
    lowestIncomeAfterRet: years.filter((y) => y.age >= workingState.retireAge).reduce((min, y) => Math.min(min, Number(y.recurringNetIncome || Infinity)), Infinity),
    potAt75: Number(potAt75Row?.potEnd || 0),
    potAtEnd: Number(years[years.length - 1]?.potEnd || 0),
    remainingLsaAtRet: Number(retRow?.remainingLsa || 0),
    totalLumpSums: years.reduce((sum, y) => sum + Number(y.lumpSumGross || 0), 0),
    averageRetirementIncome: years.filter((y) => y.age >= workingState.retireAge).reduce((sum, y, idx, arr) => sum + Number(y.recurringNetIncome || 0) / Math.max(arr.length, 1), 0),
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
  return getCandidateStrategies(state).map((strategy) => runStrategy(state, strategy));
}
