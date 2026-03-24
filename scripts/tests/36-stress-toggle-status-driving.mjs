import { assert, calcProjection, baseState } from './_helpers.mjs';
import { buildStressScenarioResults } from '../../src/services/riskResilienceService.js';

const weakState = baseState({
  currentAge: 65,
  retireAge: 65,
  endAge: 90,
  pot: 120000,
  drawdown: 8,
  statePension: 10000,
  floor70: 22000,
  returnNom: 4.0,
  inflation: 3.0,
  badYears: 7,
  badPenalty: 8,
  stressScenarioCrash: 0,
  stressScenarioBadSeq: 1,
  stressScenarioLowerReturns: 0,
  stressScenarioHigherInflation: 0,
  stressScenarioEarlierRetire: 0,
  stressScenarioReducedContrib: 0,
  stressScenarioDrawdownPressure: 0,
  stressScenarioLaterLifeFloor: 0,
  stressScenarioHouseholdStrain: 0,
});

const base = calcProjection(weakState);
const summary = buildStressScenarioResults({ state: weakState, base, calcProjection });

assert.equal(summary.scenarios.length, 1, 'expected exactly one enabled scenario');
assert.equal(summary.scenarios[0].key, 'bad-sequence', 'expected bad-sequence enabled scenario');
assert.ok(summary.ranked[0].metrics.pass === false, 'expected enabled scenario to fail in weak state');
