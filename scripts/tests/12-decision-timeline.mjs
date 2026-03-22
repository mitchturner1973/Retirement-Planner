import { assert, baseState } from './_helpers.mjs';
import { getCandidateStrategies, runStrategy } from '../../src/engines/strategyEngine.js';
import { buildDecisionTimeline } from '../../src/services/decisionTimelineService.js';

const state = baseState({
  currentAge: 57,
  retireAge: 57,
  endAge: 75,
  pot: 220000,
  drawdown: 4,
  stateAge: 67,
  statePension: 12000,
  dcPensions: [{ id: 'old1', name: 'Old pension', currentValue: 100000, feePct: 0.8, priority: 50 }],
});

const strategy = getCandidateStrategies(state).find((s) => s.id === 'pcls-at-retirement');
assert.ok(strategy, 'expected pcls-at-retirement strategy');

const result = runStrategy(state, strategy);
const timeline = buildDecisionTimeline(result);

assert.ok(timeline.length > 0, 'timeline should contain entries');
const retirementEntry = timeline.find((item) => item.age === state.retireAge);
assert.ok(retirementEntry, 'expected retirement age entry in timeline');
assert.ok(retirementEntry.items.some((item) => /tax-free cash|Retirement starts/i.test(item.action)), 'expected retirement timeline actions');
const statePensionEntry = timeline.find((item) => item.age === state.stateAge);
assert.ok(statePensionEntry, 'expected State Pension entry in timeline');
