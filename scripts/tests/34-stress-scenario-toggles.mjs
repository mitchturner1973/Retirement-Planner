import { assert, calcProjection, baseState } from './_helpers.mjs';
import { buildStressScenarioResults } from '../../src/services/riskResilienceService.js';

const state = baseState({
  currentAge: 60,
  retireAge: 65,
  endAge: 85,
  pot: 300000,
  drawdown: 4,
  returnNom: 5,
  inflation: 2.5,
  stressScenarioCrash: 1,
  stressScenarioBadSeq: 0,
  stressScenarioLowerReturns: 0,
  stressScenarioHigherInflation: 0,
  stressScenarioEarlierRetire: 0,
  stressScenarioReducedContrib: 0,
  stressScenarioDrawdownPressure: 0,
  stressScenarioLaterLifeFloor: 0,
  stressScenarioHouseholdStrain: 0,
});

const base = calcProjection(state);
const summary = buildStressScenarioResults({ state, base, calcProjection });

assert.equal(summary.scenarios.length, 1, `expected one enabled scenario, got ${summary.scenarios.length}`);
assert.equal(summary.scenarios[0].key, 'crash-at-retirement', 'expected crash scenario to remain enabled');
