import { assert } from './_helpers.mjs';
import { scoreStrategies } from '../../src/engines/strategyScorer.js';

function makeResult(id, metrics, years = []) {
  return {
    strategy: { id, name: id },
    metrics: {
      totalTax: 0,
      netAtRet: 0,
      lowestIncomeAfterRet: 0,
      potAt75: 0,
      potAtEnd: 0,
      remainingLsaAtRet: 0,
      totalLumpSums: 0,
      higherRateYears: 0,
      wastedAllowanceYears: 0,
      taxSpikeAtStateOrDbStart: 0,
      dcRelianceLaterLife: 0,
      incomeVolatility: 0,
      maxIncomeDropPct: 0,
      cliffEdgeCount: 0,
      guaranteedIncomeRatioAtRet: 0,
      guaranteedFloorCoverageYears: 0,
      lsaUsedByRet: 0,
      maxWithdrawalShare: 0,
      totalFees: 0,
      oneOffLumpSpikeAtRet: 0,
      ...metrics,
    },
    summary: { potAtRet: 200000, netAtRet: Number(metrics.netAtRet || 0) },
    years,
    actions: [],
    state: { endAge: 90, retireAge: 67, tflsCap: 268275 },
  };
}

const strategies = [
  makeResult(
    'tax-leaning',
    {
      totalTax: 10000,
      netAtRet: 21500,
      lowestIncomeAfterRet: 20500,
      potAt75: 175000,
      potAtEnd: 120000,
      remainingLsaAtRet: 220000,
      incomeVolatility: 0.08,
      maxIncomeDropPct: 0.1,
      cliffEdgeCount: 0,
      guaranteedIncomeRatioAtRet: 0.4,
      guaranteedFloorCoverageYears: 12,
    },
    [
      { age: 67, recurringNetIncome: 21500 },
      { age: 68, recurringNetIncome: 19000 },
      { age: 69, recurringNetIncome: 17500 },
    ],
  ),
  makeResult(
    'stable-income',
    {
      totalTax: 50000,
      netAtRet: 26000,
      lowestIncomeAfterRet: 23500,
      potAt75: 185000,
      potAtEnd: 115000,
      remainingLsaAtRet: 190000,
      higherRateYears: 6,
      wastedAllowanceYears: 3,
      taxSpikeAtStateOrDbStart: 2200,
      incomeVolatility: 0.04,
      maxIncomeDropPct: 0.05,
      cliffEdgeCount: 0,
      guaranteedIncomeRatioAtRet: 0.5,
      guaranteedFloorCoverageYears: 18,
    },
    [
      { age: 67, recurringNetIncome: 26000 },
      { age: 68, recurringNetIncome: 25500 },
      { age: 69, recurringNetIncome: 25000 },
    ],
  ),
];

const taxPriority = scoreStrategies(strategies, { priorityMode: 'minimise-tax' });
assert.equal(
  taxPriority.ranked[0].strategy.id,
  'tax-leaning',
  `expected minimise-tax mode to rank tax-leaning first, got ${taxPriority.ranked[0].strategy.id}`,
);

const stablePriority = scoreStrategies(strategies, { priorityMode: 'maximise-stable-income' });
assert.equal(
  stablePriority.ranked[0].strategy.id,
  'stable-income',
  `expected maximise-stable-income mode to rank stable-income first, got ${stablePriority.ranked[0].strategy.id}`,
);
