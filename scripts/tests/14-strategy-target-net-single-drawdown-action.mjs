import { assert, baseState } from './_helpers.mjs';
import { getCandidateStrategies, runStrategy } from '../../src/engines/strategyEngine.js';

const state = baseState({
  currentAge: 57,
  retireAge: 57,
  endAge: 60,
  drawdown: 4,
  stateAge: 67,
  statePension: 12000,
  pot: 220000,
});

const strategy = getCandidateStrategies(state).find((item) => item.id === 'bridge-to-state-pension');
assert.ok(strategy, 'expected bridge-to-state-pension strategy');

const result = runStrategy(state, strategy);
const drawdownActions = result.actions.filter((action) => action.type === 'drawdown');
assert.ok(drawdownActions.length > 0, 'expected drawdown actions');

const countsByAge = new Map();
for (const action of drawdownActions) {
  countsByAge.set(action.age, (countsByAge.get(action.age) || 0) + 1);
}

for (const [age, count] of countsByAge.entries()) {
  assert.equal(count, 1, `expected one drawdown action at age ${age}, got ${count}`);
}

assert.ok(
  drawdownActions.every((action) => String(action.detail || '').toLowerCase().includes('targets approximately')),
  'expected target-net drawdown actions to include target-income context in detail',
);
