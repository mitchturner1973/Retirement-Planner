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
const hasBridgeNone = noBridgeCandidates.some((id) => id.startsWith('bridge-to-state-pension'));
const hasTaxSmoothingNone = noBridgeCandidates.some((id) => id.startsWith('tax-smoothing'));
const hasDbAwareNone = noBridgeCandidates.some((id) => id.startsWith('db-aware-balance'));
assert.ok(!hasBridgeNone, 'bridge-to-state-pension should not be offered when retireAge >= stateAge');
assert.ok(!hasTaxSmoothingNone, 'tax-smoothing should not be offered when retireAge >= stateAge');
assert.ok(!hasDbAwareNone, 'db-aware-balance should not be offered when retireAge >= stateAge');

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
const hasBridgeYes = bridgeCandidates.some((id) => id.startsWith('bridge-to-state-pension'));
const hasTaxSmoothingYes = bridgeCandidates.some((id) => id.startsWith('tax-smoothing'));
assert.ok(bridgeCandidates.some((id) => id.startsWith('db-aware-balance')), 'db-aware-balance should be offered when retireAge < stateAge and DB exists');
