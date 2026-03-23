import { assert } from './_helpers.mjs';
import { scoreStrategies } from '../../src/engines/strategyScorer.js';

function makeResult(id, metrics, years) {
  return {
    strategy: { id, name: id },
    metrics: {
      totalTax: 20000,
      netAtRet: 25000,
      lowestIncomeAfterRet: 22000,
      potAt75: 180000,
      potAtEnd: 130000,
      remainingLsaAtRet: 180000,
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
      ...metrics,
    },
    summary: { potAtRet: 225000, netAtRet: Number(metrics.netAtRet || 25000) },
    years,
    actions: [],
    state: { endAge: 90, retireAge: 67, tflsCap: 268275 },
  };
}

const risky = makeResult(
  'risky',
  {
    potAt75: 90000,
    maxIncomeDropPct: 0.34,
    cliffEdgeCount: 3,
    maxWithdrawalShare: 0.92,
    oneOffLumpSpikeAtRet: 12000,
    remainingLsaAtRet: 10000,
  },
  [
    { age: 67, recurringNetIncome: 24000 },
    { age: 68, recurringNetIncome: 16500 },
    { age: 69, recurringNetIncome: 13000 },
  ],
);

const steady = makeResult(
  'steady',
  {
    totalTax: 17000,
    netAtRet: 26000,
    lowestIncomeAfterRet: 24500,
    potAt75: 200000,
    potAtEnd: 150000,
    incomeVolatility: 0.03,
    maxIncomeDropPct: 0.04,
    cliffEdgeCount: 0,
    maxWithdrawalShare: 0.5,
  },
  [
    { age: 67, recurringNetIncome: 26000 },
    { age: 68, recurringNetIncome: 25500 },
    { age: 69, recurringNetIncome: 25000 },
  ],
);

const scored = scoreStrategies([risky, steady], {
  priorityMode: 'balanced',
  targets: {
    minimumDesiredNetIncome: 18000,
    targetRetirementNetIncome: 25000,
    minimumFlexibilityBufferAt75: 150000,
  },
});

assert.ok(scored.ranked.length >= 2, 'expected at least two scored strategies');

for (const result of scored.ranked) {
  assert.ok(result.rankingExplanation, 'expected rankingExplanation object on scored strategy');
  assert.ok(result.rankingExplanation.weights, 'expected rankingExplanation.weights');
  assert.ok(Array.isArray(result.rankingExplanation.topDrivers), 'expected rankingExplanation.topDrivers array');
  assert.ok(Array.isArray(result.rankingExplanation.penaltyBreakdown), 'expected rankingExplanation.penaltyBreakdown array');
  assert.ok(result.rankingExplanation.topDrivers.length > 0, 'expected at least one top driver');

  const allDriverDims = result.rankingExplanation.topDrivers.map((d) => d.dimension);
  assert.ok(allDriverDims.includes('taxEfficiency'), 'expected top drivers to include known dimensions');
}

const riskyScored = scored.ranked.find((r) => r.strategy.id === 'risky');
assert.ok(riskyScored, 'expected risky strategy in ranked results');
assert.ok(riskyScored.rankingExplanation.penaltyBreakdown.length > 0, 'expected risky strategy to include penalty breakdown entries');
