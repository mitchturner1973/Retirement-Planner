import { assert, baseState } from './_helpers.mjs';
import { evaluateStrategies } from '../../src/engines/strategyEngine.js';
import { scoreStrategies } from '../../src/engines/strategyScorer.js';

const state = baseState({
  currentAge: 57,
  retireAge: 57,
  endAge: 90,
  pot: 350000,
  drawdown: 4.5,
  stateAge: 67,
  statePension: 12000,
  returnNom: 5,
  feePct: 0.4,
  dcPensions: [
    { id: 'old1', name: 'Old pension', currentValue: 120000, feePct: 0.9, priority: 50 },
    { id: 'old2', name: 'SIPP', currentValue: 80000, feePct: 0.35, priority: 60 },
  ],
});

const strategies = evaluateStrategies(state);
const scored = scoreStrategies(strategies);

assert.ok(strategies.length >= 5, 'expected at least 5 candidate strategies');
assert.ok(scored.bestTax, 'bestTax result missing');
assert.ok(scored.bestSustainable, 'bestSustainable result missing');
assert.ok(scored.bestBalanced, 'bestBalanced result missing');
assert.ok(scored.ranked[0].scores.balanced >= scored.ranked[scored.ranked.length - 1].scores.balanced, 'ranked strategies not sorted by balanced score');
