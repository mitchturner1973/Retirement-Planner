import { assert, calcProjection, baseState } from './_helpers.mjs';
import { buildStressScenarioResults } from '../../src/services/riskResilienceService.js';

const state = baseState({
  currentAge: 60,
  retireAge: 65,
  endAge: 90,
  pot: 350000,
  drawdown: 5,
  returnNom: 5,
  inflation: 2.5,
  crashPct: 50,
  badYears: 5,
  badPenalty: 6,
  stressScenarioCrash: 1,
  stressScenarioBadSeq: 1,
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

assert.equal(summary.scenarios.length, 2, `expected two enabled single scenarios, got ${summary.scenarios.length}`);
assert.ok(summary.compound, 'expected a compound stacked scenario when 2+ scenarios are enabled');
assert.equal(summary.compound.key, 'compound-market-stack', 'expected compound key');
assert.ok(summary.compound.assumptions.includes('Crash at retirement'), 'compound assumptions should include crash');
assert.ok(summary.compound.assumptions.includes('Bad sequence after retirement'), 'compound assumptions should include bad-sequence');
assert.ok(Number.isFinite(summary.interactionUplift), 'interaction uplift should be a finite number');
assert.ok(Number.isFinite(summary.interactionPot75), 'interaction pot@75 uplift should be a finite number');
