import { assert, baseState } from './_helpers.mjs';
import { getCandidateStrategies, runStrategy } from '../../src/engines/strategyEngine.js';

const state = baseState({
  currentAge: 60,
  retireAge: 60,
  endAge: 60,
  drawdown: 0,
  pot: 180000,
  feePct: 0.3,
  tflsCap: 268275,
  dcPensions: [
    { id: 'small-pot', name: 'Small pot', currentValue: 40000, feePct: 0.45, priority: 50 },
    { id: 'large-pot', name: 'Large pot', currentValue: 300000, feePct: 0.2, priority: 60 },
  ],
});

const candidates = getCandidateStrategies(state);
const pclsCandidates = candidates.filter((s) => s.id.startsWith('pcls-at-retirement'));

assert.ok(pclsCandidates.length >= 3, `expected multiple retirement PCLS candidates, got ${pclsCandidates.length}`);
assert.ok(
  pclsCandidates.some((s) => s.retirementLumpSum?.targetId === 'any-dc'),
  'expected at least one PCLS candidate targeting any-dc',
);
assert.ok(
  pclsCandidates.some((s) => s.retirementLumpSum?.targetId === 'small-pot'),
  'expected at least one PCLS candidate targeting small-pot',
);

const targeted = pclsCandidates.find((s) => s.retirementLumpSum?.targetId === 'small-pot');
assert.ok(targeted, 'expected a specific-pot lump sum strategy for small-pot');

const result = runStrategy(state, targeted);
const retirementRow = result.years.find((y) => y.age === state.retireAge);
assert.ok(retirementRow, 'expected retirement row');

const smallPotLump = Number(retirementRow.lumpSumByPot?.['small-pot'] || 0);
const otherLump = Object.entries(retirementRow.lumpSumByPot || {})
  .filter(([potId]) => potId !== 'small-pot')
  .reduce((sum, [, amount]) => sum + Number(amount || 0), 0);

assert.ok(smallPotLump > 0, `expected lump sum to be taken from small-pot, got ${smallPotLump}`);
assert.equal(otherLump, 0, `expected no lump sum from other pots, got ${otherLump}`);
assert.equal(
  Number(result.metrics.lumpSumByPotTotals?.['small-pot'] || 0),
  smallPotLump,
  'expected per-pot lump sum totals metric to match retirement row usage',
);
