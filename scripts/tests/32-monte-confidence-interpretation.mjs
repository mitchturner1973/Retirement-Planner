import { assert } from './_helpers.mjs';
import { classifyMonteConfidence, buildMonteInterpretation } from '../../src/services/riskResilienceService.js';

const strong = classifyMonteConfidence(0.9);
const moderate = classifyMonteConfidence(0.72);
const weak = classifyMonteConfidence(0.5);

assert.equal(strong.band, 'strong', 'expected strong confidence band');
assert.equal(moderate.band, 'moderate', 'expected moderate confidence band');
assert.equal(weak.band, 'weak', 'expected weak confidence band');

const interpretation = buildMonteInterpretation(
  {
    successProb: 0.58,
    p10Terminal: 10000,
    p50Terminal: 120000,
    p90Terminal: 260000,
  },
  { ruinDef: 0 },
);

assert.equal(interpretation.confidence.band, 'weak', 'expected weak confidence interpretation');
assert.equal(interpretation.growthDependency, 'high', 'expected high growth dependency');
assert.ok(interpretation.successDefinition.includes('does not hit £0'), 'expected success definition text');
assert.ok(Array.isArray(interpretation.watchouts) && interpretation.watchouts.length >= 1, 'expected watchouts');
assert.ok(Array.isArray(interpretation.suggestions) && interpretation.suggestions.length >= 2, 'expected actionable suggestions');
