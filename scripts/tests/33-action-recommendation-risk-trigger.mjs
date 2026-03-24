import { assert } from './_helpers.mjs';
import { createActionRecommendationService } from '../../src/services/actionRecommendations.js';

let nextState = null;
const currentState = {
  bridgeAmount: 25000,
  endAge: 90,
  empPct: 6,
  drawdown: 4,
  retireAge: 67,
  earlyAge: '',
  crashPct: 30,
  badYears: 5,
  badPenalty: 5,
  successAge: 90,
  floor70: 18000,
};

const suggestLevers = createActionRecommendationService({
  readState: () => currentState,
  setInputsFromState: (patch) => { nextState = patch; },
  renderAll: () => {},
  calcBridge: () => ({ error: null, runOut_life: null, runOut_base: null }),
  calcProjection: () => ({ years: [] }),
  fmtGBP: (v) => `£${Math.round(v)}`,
});

const recs = suggestLevers(
  currentState,
  {
    overall: { s: 'good' },
    stress: { s: 'good' },
    bridgeBase: { s: 'good' },
    bridgeLife: null,
  },
  {
    stress: {
      worstScenario: {
        key: 'earlier-retirement',
        label: 'Retire earlier',
        metrics: { pass: false },
      },
    },
    monte: { confidence: { band: 'moderate' } },
  },
);

assert.ok(recs.length >= 1, 'expected at least one recommendation from risk trigger');
assert.ok(recs[0].title.toLowerCase().includes('retirement'), 'expected retirement-related recommendation title');

recs[0].apply();
assert.ok(nextState, 'expected recommendation apply to set state');
assert.equal(nextState.retireAge, currentState.retireAge + 1, 'expected apply to increment retirement age');
