import { assert, calcProjection, baseState } from './_helpers.mjs';
import { buildStressScenarioResults } from '../../src/services/riskResilienceService.js';

const state = baseState({
  currentAge: 60,
  firstYearMonths: 12,
  retireAge: 65,
  endAge: 85,
  pot: 420000,
  salary: 0,
  empPct: 0,
  erPct: 0,
  drawdown: 4.5,
  returnNom: 4.5,
  inflation: 2.5,
  crashPct: 30,
  badYears: 5,
  badPenalty: 5,
  successAge: 85,
  floor70: 18000,
  householdMode: 'single',
});

const base = calcProjection(state);
const summary = buildStressScenarioResults({ state, base, calcProjection });

assert.ok(Array.isArray(summary.scenarios), 'expected scenarios array');
assert.ok(summary.scenarios.length >= 8, `expected at least 8 scenarios, got ${summary.scenarios.length}`);
assert.ok(Array.isArray(summary.ranked) && summary.ranked.length === summary.scenarios.length, 'expected ranked scenarios');
assert.ok(summary.worstScenario, 'expected worst scenario');
assert.equal(summary.worstScenario.key, summary.ranked[0].key, 'worst scenario should match top ranked item');

for (let i = 1; i < summary.ranked.length; i += 1) {
  assert.ok(
    summary.ranked[i - 1].damageScore >= summary.ranked[i].damageScore,
    `ranking should be descending by damage score at index ${i}`,
  );
}

const keys = summary.scenarios.map((x) => x.key);
assert.ok(keys.includes('lower-returns'), 'expected lower-returns scenario');
assert.ok(keys.includes('higher-inflation'), 'expected higher-inflation scenario');
assert.ok(keys.includes('drawdown-pressure'), 'expected drawdown-pressure scenario');
