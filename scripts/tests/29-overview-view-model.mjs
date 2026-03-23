import { assert, logPass } from './_helpers.mjs';
import { buildOverviewViewModel } from '../../src/services/overviewViewModel.js';

const state = {
  currentAge: 60,
  earlyAge: 60,
  stateAge: 67,
  bridgeMode: 'net',
  bridgeAmount: 25000,
  bridgeKeepLifestyle: 1,
  retireAge: 67,
  endAge: 90,
  householdMode: 'joint',
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
  remainingLsaAtRet: 12000,
  retirementLumpSumAtRet: 12000,
  years: [
    { age: 67, recurringNetIncome: 32000, potEnd: 490000 },
    { age: 68, recurringNetIncome: 26000, potEnd: 470000 },
    { age: 75, recurringNetIncome: 24000, potEnd: 90000 },
  ],
};

const household = {
  years: [
    { age: 67, householdNet: 40000 },
  ],
  primaryState: { retireAge: 67 },
  partnerState: { retireAge: 66 },
};

const stressStatus = { s: 'bad' };
const bridgeStatus = { base: { s: 'warn' }, life: null };
const monteStatus = { s: 'warn' };

const model = buildOverviewViewModel({
  state,
  base,
  household,
  bridgeResult: {
    early: 60,
    end: 67,
    potEarly_base: 420000,
    potEnd_base: 300000,
    netEnd_base: 26000,
    runOut_base: null,
    runOut_life: 84,
    netEnd_life: 25000,
  },
  stressStatus,
  bridgeStatus,
  monteStatus,
  selectedStrategyId: 'balanced',
  compareSnapshot: {
    potAtRet: 480000,
    netAtRet: 28000,
    taxAtRet: 5800,
    selectedStrategyId: 'tax',
  },
  compareLabel: 'saved scenario "Baseline"',
  compareSource: 'scenario',
  compareScenarioId: 'sc_1',
  compareScenarioOptions: [{ id: 'sc_1', name: 'Baseline' }],
});

assert.equal(model.headlineCards.some((card) => card.key === 'household-net-at-retirement'), true, 'includes household retirement card in joint mode');
assert.equal(model.headlineCards.every((card) => Array.isArray(card.sparkline) && card.sparkline.length > 0), true, 'headline cards include sparkline series');
assert.equal(model.watchouts.some((item) => item.key === 'income-drop'), true, 'detects major income drop watchout');
assert.equal(model.watchouts.some((item) => item.key === 'dc-reliance'), true, 'detects DC reliance watchout');
assert.equal(model.watchouts.some((item) => item.key === 'low-lsa'), true, 'detects low LSA watchout');
assert.equal(model.changes.available, true, 'exposes change set when prior snapshot exists');
assert.equal(model.changes.items.find((item) => item.key === 'potAtRet')?.delta, 20000, 'computes retirement pot delta');
assert.equal(model.nextSteps.some((step) => step.key === 'stress'), true, 'adds stress next step when stress is not green');
assert.equal(model.nextSteps.some((step) => step.key === 'strategy'), true, 'always adds strategy next step');
assert.equal(model.changes.summary.includes('saved scenario'), true, 'uses supplied compare label');
assert.equal(model.earlyBridge?.available, true, 'builds early bridge summary when early age is set');
assert.equal(model.earlyBridge?.baseHolds, true, 'captures baseline bridge hold status');
assert.equal(model.earlyBridge?.lifeRunOutAge, 84, 'captures lifestyle bridge run-out age when enabled');

const firstModel = buildOverviewViewModel({
  state: { ...state, householdMode: 'single', watchoutIncomeDropPct: 30 },
  base,
  household: null,
  bridgeResult: null,
  stressStatus: { s: 'good' },
  bridgeStatus: { base: { s: 'na' }, life: null },
  monteStatus: { s: 'good' },
  selectedStrategyId: null,
  compareSnapshot: null,
  compareLabel: 'previous recalculation',
});

assert.equal(firstModel.changes.available, false, 'first render has no change comparison');
assert.equal(firstModel.watchouts.some((item) => item.key === 'income-drop'), false, 'higher threshold can suppress income-drop watchout');
assert.equal(firstModel.earlyBridge?.enabled, true, 'early bridge section still enabled for early-age plans');

logPass('29-overview-view-model');
