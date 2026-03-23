import { assert } from './_helpers.mjs';
import { scoreStrategies } from '../../src/engines/strategyScorer.js';

function makeResult(id, tax, income, pot75) {
  return {
    strategy: { id, name: id },
    metrics: {
      totalTax: tax,
      netAtRet: income,
      lowestIncomeAfterRet: income - 1200,
      potAt75: pot75,
      potAtEnd: pot75 - 30000,
      remainingLsaAtRet: 170000,
      totalLumpSums: 0,
      higherRateYears: 0,
      wastedAllowanceYears: 0,
      taxSpikeAtStateOrDbStart: 0,
      dcRelianceLaterLife: 0.45,
      incomeVolatility: 0.06,
      maxIncomeDropPct: 0.08,
      cliffEdgeCount: 0,
      guaranteedIncomeRatioAtRet: 0.4,
      guaranteedFloorCoverageYears: 14,
      lsaUsedByRet: 90000,
      maxWithdrawalShare: 0.55,
      totalFees: 16000,
      oneOffLumpSpikeAtRet: 0,
    },
    summary: { potAtRet: pot75 + 45000, netAtRet: income },
    years: [
      { age: 67, recurringNetIncome: income },
      { age: 68, recurringNetIncome: income - 1200 },
    ],
    actions: [],
    state: { endAge: 90, retireAge: 67, tflsCap: 268275 },
  };
}

const base = [
  makeResult('alpha', 17000, 25500, 180000),
  makeResult('beta', 15000, 24500, 170000),
  makeResult('gamma', 20000, 27500, 195000),
  makeResult('delta', 22000, 28500, 205000),
];

const first = scoreStrategies(base, {
  priorityMode: 'balanced',
  targets: {
    minimumDesiredNetIncome: 18000,
    targetRetirementNetIncome: 25000,
    minimumFlexibilityBufferAt75: 150000,
  },
});

const second = scoreStrategies([...base].reverse(), {
  priorityMode: 'balanced',
  targets: {
    minimumDesiredNetIncome: 18000,
    targetRetirementNetIncome: 25000,
    minimumFlexibilityBufferAt75: 150000,
  },
});

assert.deepEqual(
  first.ranked.map((r) => r.strategy.id),
  second.ranked.map((r) => r.strategy.id),
  'expected ranking order to remain deterministic regardless of input order',
);

assert.deepEqual(
  first.ranked.map((r) => r.scores.balanced),
  second.ranked.map((r) => r.scores.balanced),
  'expected balanced scores to be deterministic',
);
