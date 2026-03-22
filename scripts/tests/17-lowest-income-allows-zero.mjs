import { assert, baseState } from './_helpers.mjs';
import { getCandidateStrategies, runStrategy } from '../../src/engines/strategyEngine.js';

const state = baseState({
  currentAge: 67,
  retireAge: 67,
  endAge: 70,
  pot: 0,
  dcPensions: [],
  dbPensions: [],
  statePension: 0,
  otherIncome: 0,
  drawdown: 5,
});

const strategy = getCandidateStrategies(state).find((item) => item.id === 'straight-drawdown');
assert.ok(strategy, 'expected straight-drawdown strategy');

const result = runStrategy(state, strategy);

assert.equal(result.metrics.lowestIncomeAfterRet, 0, 'lowest retirement income should be zero when there is no retirement income');
assert.ok(Number.isFinite(result.metrics.lowestIncomeAfterRet), 'lowest retirement income should remain finite');
