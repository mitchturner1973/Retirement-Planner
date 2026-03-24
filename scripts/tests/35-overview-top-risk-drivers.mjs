import { assert, logPass } from './_helpers.mjs';
import { buildOverviewViewModel } from '../../src/services/overviewViewModel.js';

const state = {
  currentAge: 60,
  earlyAge: '',
  stateAge: 67,
  bridgeMode: 'net',
  bridgeAmount: 25000,
  bridgeKeepLifestyle: 1,
  retireAge: 67,
  endAge: 90,
  householdMode: 'single',
  watchoutIncomeDropPct: 10,
  watchoutIncomeDropAbs: 2500,
  watchoutLateLifePotYears: 4,
  watchoutDcReliancePct: 65,
  watchoutLumpSumPctNet: 25,
  watchoutLowLsa: 20000,
};

const base = {
  potAtRet: 500000,
  netAtRet: 30000,
  stateAtRet: 10000,
  dbAtRet: 4000,
  otherAtRet: 0,
  grossDcAtRet: 36000,
  taxAtRet: 6000,
  remainingLsaAtRet: 80000,
  retirementLumpSumAtRet: 0,
  years: [
    { age: 67, recurringNetIncome: 30000, potEnd: 500000 },
    { age: 75, recurringNetIncome: 26000, potEnd: 320000 },
  ],
};

const model = buildOverviewViewModel({
  state,
  base,
  household: null,
  bridgeResult: null,
  riskSummary: {
    stress: {
      ranked: [
        { key: 'lower-returns', label: 'Lower long-run returns', assumptions: 'Return -1.5%', metrics: { pass: false } },
        { key: 'drawdown-pressure', label: 'Higher withdrawal pressure', assumptions: 'Drawdown +1%', metrics: { pass: true } },
      ],
    },
    monte: {
      confidence: { label: 'Moderate confidence', detail: 'Some sensitivity to weaker paths.', severity: 'warn' },
    },
  },
  stressStatus: { s: 'warn' },
  bridgeStatus: { base: { s: 'na' }, life: null },
  monteStatus: { s: 'warn' },
  selectedStrategyId: null,
  compareSnapshot: null,
  compareLabel: 'previous recalculation',
});

assert.equal(Array.isArray(model.topRiskDrivers), true, 'topRiskDrivers should be an array');
assert.equal(model.topRiskDrivers.length, 3, 'expected top 3 risk drivers');
assert.ok(model.topRiskDrivers.some((item) => item.key === 'monte-confidence'), 'expected monte confidence risk driver');

logPass('35-overview-top-risk-drivers');
