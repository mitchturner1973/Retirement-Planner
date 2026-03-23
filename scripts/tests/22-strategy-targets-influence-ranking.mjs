import { assert } from './_helpers.mjs';
import { scoreStrategies } from '../../src/engines/strategyScorer.js';

function makeResult(id, metrics) {
  return {
    strategy: { id, name: id },
    metrics: {
      totalTax: 0,
      netAtRet: 0,
      lowestIncomeAfterRet: 0,
      potAt75: 170000,
      potAtEnd: 120000,
      remainingLsaAtRet: 180000,
      totalLumpSums: 0,
      higherRateYears: 0,
      wastedAllowanceYears: 0,
      taxSpikeAtStateOrDbStart: 0,
      dcRelianceLaterLife: 0.5,
      incomeVolatility: 0.05,
      maxIncomeDropPct: 0.05,
      cliffEdgeCount: 0,
      guaranteedIncomeRatioAtRet: 0.45,
      guaranteedFloorCoverageYears: 16,
      lsaUsedByRet: 70000,
      maxWithdrawalShare: 0.5,
      totalFees: 19000,
      oneOffLumpSpikeAtRet: 0,
      ...metrics,
    },
    summary: { potAtRet: 220000, netAtRet: Number(metrics.netAtRet || 0) },
    years: [
      { age: 67, recurringNetIncome: Number(metrics.netAtRet || 0) },
      { age: 68, recurringNetIncome: Number(metrics.lowestIncomeAfterRet || 0) },
    ],
    actions: [],
    state: { endAge: 90, retireAge: 67, tflsCap: 268275 },
  };
}

const lowTaxLowerIncome = makeResult('low-tax-lower-income', {
  totalTax: 12000,
  netAtRet: 22000,
  lowestIncomeAfterRet: 21000,
});

const higherTaxHigherIncome = makeResult('higher-tax-higher-income', {
  totalTax: 23000,
  netAtRet: 29000,
  lowestIncomeAfterRet: 28000,
});

const lowTarget = scoreStrategies([lowTaxLowerIncome, higherTaxHigherIncome], {
  priorityMode: 'balanced',
  targets: {
    minimumDesiredNetIncome: 18000,
    targetRetirementNetIncome: 20000,
    minimumFlexibilityBufferAt75: 150000,
  },
});

assert.equal(
  lowTarget.ranked[0].strategy.id,
  'low-tax-lower-income',
  `expected lower tax strategy to win when retirement income target is modest, got ${lowTarget.ranked[0].strategy.id}`,
);

const highTarget = scoreStrategies([lowTaxLowerIncome, higherTaxHigherIncome], {
  priorityMode: 'balanced',
  targets: {
    minimumDesiredNetIncome: 24000,
    targetRetirementNetIncome: 30000,
    minimumFlexibilityBufferAt75: 150000,
  },
});

assert.equal(
  highTarget.ranked[0].strategy.id,
  'higher-tax-higher-income',
  `expected higher income strategy to win when retirement income target is demanding, got ${highTarget.ranked[0].strategy.id}`,
);
