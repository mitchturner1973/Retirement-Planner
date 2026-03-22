import { assert, baseState } from './_helpers.mjs';
import { getCandidateStrategies } from '../../src/engines/strategyEngine.js';

const stateNoBridge = baseState({
  currentAge: 57,
  retireAge: 67,
  stateAge: 67,
  endAge: 90,
  drawdown: 4,
  pot: 300000,
  dbPensions: [
    { id: 'db1', name: 'DB 1', annualIncome: 8000, startAge: 67, increaseType: 'fixed', escalationPct: 0 },
  ],
});

const noBridgeCandidates = getCandidateStrategies(stateNoBridge).map((strategy) => strategy.id);
assert.ok(!noBridgeCandidates.includes('bridge-to-state-pension'), 'bridge-to-state-pension should not be offered when retireAge >= stateAge');
assert.ok(!noBridgeCandidates.includes('tax-smoothing'), 'tax-smoothing should not be offered when retireAge >= stateAge');
assert.ok(!noBridgeCandidates.includes('db-aware-balance'), 'db-aware-balance should not be offered when retireAge >= stateAge');

const stateWithBridge = baseState({
  currentAge: 57,
  retireAge: 62,
  stateAge: 67,
  endAge: 90,
  drawdown: 4,
  pot: 300000,
  dbPensions: [
    { id: 'db1', name: 'DB 1', annualIncome: 8000, startAge: 67, increaseType: 'fixed', escalationPct: 0 },
  ],
});

const bridgeCandidates = getCandidateStrategies(stateWithBridge).map((strategy) => strategy.id);
assert.ok(bridgeCandidates.includes('bridge-to-state-pension'), 'bridge-to-state-pension should be offered when retireAge < stateAge');
assert.ok(bridgeCandidates.includes('tax-smoothing'), 'tax-smoothing should be offered when retireAge < stateAge');
assert.ok(bridgeCandidates.includes('db-aware-balance'), 'db-aware-balance should be offered when retireAge < stateAge and DB exists');
