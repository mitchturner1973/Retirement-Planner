import { assert, baseState } from './_helpers.mjs';
import { getCandidateStrategies, runStrategy } from '../../src/engines/strategyEngine.js';

const state = baseState({
  currentAge: 57,
  retireAge: 57,
  endAge: 57,
  drawdown: 50,
  returnNom: 2.5,
  inflation: 2.5,
  pot: 50000,
  feePct: 1.5,
  dcPensions: [
    { id: 'old-low-fee', name: 'Old low fee', currentValue: 50000, feePct: 0.2, priority: 50 },
  ],
});

const strategy = getCandidateStrategies(state).find((item) => item.id === 'highest-fee-first');
assert.ok(strategy, 'expected highest-fee-first strategy');

const result = runStrategy(state, strategy);
const row = result.years.find((year) => year.age === state.retireAge);
assert.ok(row, 'expected retirement year row');

// If current workplace is included in ordering, its higher fee pot is depleted first.
// Remaining pot should therefore be the low-fee pot, producing low annual fees.
assert.ok(row.fees < 200, `expected fees below 200 when high-fee workplace pot is drawn first, got ${row.fees}`);
