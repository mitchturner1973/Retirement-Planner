import { assert } from './_helpers.mjs';
import { scoreStrategies } from '../../src/engines/strategyScorer.js';

function makeResult(id, metrics) {
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
    summary: { potAtRet: 0, netAtRet: 0 },
    years: [{ age: 67, recurringNetIncome: Number(metrics.lowestIncomeAfterRet || 0) }],
    actions: [],
    state: { endAge: 90, retireAge: 67, tflsCap: 268275 },
  };
}

// Robust normalization should avoid collapsing non-outlier strategies when one outlier exists.
const robustResults = [
  makeResult('t10', { totalTax: 10, netAtRet: 25000, lowestIncomeAfterRet: 23000, potAt75: 200000, potAtEnd: 180000, remainingLsaAtRet: 220000 }),
  makeResult('t11', { totalTax: 11, netAtRet: 25000, lowestIncomeAfterRet: 23000, potAt75: 200000, potAtEnd: 180000, remainingLsaAtRet: 220000 }),
  makeResult('t12', { totalTax: 12, netAtRet: 25000, lowestIncomeAfterRet: 23000, potAt75: 200000, potAtEnd: 180000, remainingLsaAtRet: 220000 }),
  makeResult('t13', { totalTax: 13, netAtRet: 25000, lowestIncomeAfterRet: 23000, potAt75: 200000, potAtEnd: 180000, remainingLsaAtRet: 220000 }),
  makeResult('t14', { totalTax: 14, netAtRet: 25000, lowestIncomeAfterRet: 23000, potAt75: 200000, potAtEnd: 180000, remainingLsaAtRet: 220000 }),
  makeResult('outlier', { totalTax: 1000, netAtRet: 25000, lowestIncomeAfterRet: 23000, potAt75: 200000, potAtEnd: 180000, remainingLsaAtRet: 220000 }),
];

const robustScored = scoreStrategies(robustResults);
const t10 = robustScored.ranked.find((item) => item.strategy.id === 't10');
const t14 = robustScored.ranked.find((item) => item.strategy.id === 't14');
assert.ok(t10 && t14, 'expected robust normalization test strategies in ranked results');
assert.ok(
  t10.scores.tax > t14.scores.tax,
  `expected lower tax strategy to retain higher tax score despite outlier, got t10=${t10.scores.tax} t14=${t14.scores.tax}`,
);
assert.ok(
  (t10.scores.tax - t14.scores.tax) >= 20,
  `expected meaningful score spread among non-outlier strategies, got spread=${t10.scores.tax - t14.scores.tax}`,
);
