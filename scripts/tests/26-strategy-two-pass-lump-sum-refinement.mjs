import { assert, baseState } from './_helpers.mjs';
import { evaluateStrategies } from '../../src/engines/strategyEngine.js';

const state = baseState({
  currentAge: 60,
  retireAge: 60,
  endAge: 85,
  drawdown: 4,
  pot: 260000,
  feePct: 0.3,
  tflsCap: 268275,
  dcPensions: [
    { id: 'pot-a', name: 'Pot A', currentValue: 90000, feePct: 0.5, priority: 30 },
    { id: 'pot-b', name: 'Pot B', currentValue: 190000, feePct: 0.25, priority: 50 },
  ],
  strategyPriorityMode: 'balanced',
  minimumDesiredNetIncome: 18000,
  targetRetirementNetIncome: 26000,
  minimumFlexibilityBufferAt75: 150000,
});

const results = evaluateStrategies(state);
const coarse = results.filter((r) => String(r.strategy?.id || '').startsWith('pcls-at-retirement'));
const refined = results.filter((r) => String(r.strategy?.id || '').startsWith('pcls-refined'));

assert.ok(coarse.length > 0, 'expected coarse retirement lump-sum candidates');
assert.ok(refined.length > 0, 'expected refined retirement lump-sum candidates from second pass');

const coarseAmounts = [...new Set(coarse.map((r) => Number(r.strategy?.optimisationMeta?.amount || 0)).filter((v) => v > 0))];
const refinedAmounts = [...new Set(refined.map((r) => Number(r.strategy?.optimisationMeta?.amount || 0)).filter((v) => v > 0))];
assert.ok(coarseAmounts.length > 0, 'expected coarse optimisation amounts');
assert.ok(refinedAmounts.length > 0, 'expected refined optimisation amounts');

const hasNewRefinedAmount = refinedAmounts.some((amount) => !coarseAmounts.includes(amount));
assert.ok(
  hasNewRefinedAmount,
  `expected second pass to introduce finer lump-sum points beyond coarse grid; coarse=${coarseAmounts.join(',')} refined=${refinedAmounts.join(',')}`,
);
