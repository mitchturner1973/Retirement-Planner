import { assert } from './_helpers.mjs';
import { scoreStrategies } from '../../src/engines/strategyScorer.js';

function makeResult(id, metrics, years) {
  return {
    strategy: { id, name: id },
    metrics: {
      totalTax: 18000,
      netAtRet: 25000,
      lowestIncomeAfterRet: 22000,
      potAt75: 210000,
      potAtEnd: 140000,
      remainingLsaAtRet: 180000,
      totalLumpSums: 0,
      higherRateYears: 0,
      wastedAllowanceYears: 0,
      taxSpikeAtStateOrDbStart: 0,
      dcRelianceLaterLife: 0.5,
      incomeVolatility: 0.05,
      maxIncomeDropPct: 0.07,
      cliffEdgeCount: 0,
      guaranteedIncomeRatioAtRet: 0.45,
      guaranteedFloorCoverageYears: 16,
      lsaUsedByRet: 80000,
      maxWithdrawalShare: 0.45,
      totalFees: 20000,
      oneOffLumpSpikeAtRet: 0,
      ...metrics,
    },
    summary: { potAtRet: 260000, netAtRet: Number(metrics.netAtRet || 25000) },
    years,
    actions: [],
    state: { endAge: 90, retireAge: 67, tflsCap: 268275 },
  };
}

const resilient = makeResult(
  'resilient',
  {},
  [
    { age: 67, recurringNetIncome: 25000 },
    { age: 68, recurringNetIncome: 24800 },
    { age: 69, recurringNetIncome: 24600 },
  ],
);

const risky = makeResult(
  'risky',
  {
    netAtRet: 23500,
    lowestIncomeAfterRet: 13500,
    potAt75: 90000,
    potAtEnd: 35000,
    remainingLsaAtRet: 12000,
    incomeVolatility: 0.35,
    maxIncomeDropPct: 0.32,
    cliffEdgeCount: 3,
    maxWithdrawalShare: 0.93,
    oneOffLumpSpikeAtRet: 14000,
    guaranteedFloorCoverageYears: 4,
  },
  [
    { age: 67, recurringNetIncome: 23500 },
    { age: 68, recurringNetIncome: 17000 },
    { age: 69, recurringNetIncome: 13000 },
  ],
);

const scored = scoreStrategies([risky, resilient], {
  priorityMode: 'balanced',
  targets: {
    minimumDesiredNetIncome: 18000,
    targetRetirementNetIncome: 25000,
    minimumFlexibilityBufferAt75: 150000,
  },
});

const riskyScored = scored.ranked.find((r) => r.strategy.id === 'risky');
const resilientScored = scored.ranked.find((r) => r.strategy.id === 'resilient');

assert.ok(riskyScored, 'expected risky strategy to be scored');
assert.ok(resilientScored, 'expected resilient strategy to be scored');
assert.ok(riskyScored.watchouts.length >= 3, `expected multiple watchouts for risky strategy, got ${riskyScored.watchouts.length}`);
assert.ok(riskyScored.penalties.total > 0, 'expected positive watchout penalties for risky strategy');
assert.ok(
  riskyScored.scores.balanced < resilientScored.scores.balanced,
  `expected risky strategy to be penalised in balanced score, got risky=${riskyScored.scores.balanced}, resilient=${resilientScored.scores.balanced}`,
);
