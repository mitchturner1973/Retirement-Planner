import { assert, baseState, calcProjection } from './_helpers.mjs';
import { getCandidateStrategies, runStrategy } from '../../src/engines/strategyEngine.js';

const state = baseState({
  currentAge: 57,
  retireAge: 67,
  endAge: 90,
  stateAge: 67,
  statePension: 12000,
  drawdown: 4,
  returnNom: 5,
  inflation: 2.5,
  salary: 70000,
  salaryGrowth: 2,
  empPct: 5,
  erPct: 3,
  pot: 500000,
  feePct: 0.6,
  dcPensions: [
    { id: 'old1', name: 'Old pension', currentValue: 120000, feePct: 0.5, priority: 50 },
  ],
});

const projection = calcProjection(state);
const straight = getCandidateStrategies(state).find((item) => item.id === 'straight-drawdown');
assert.ok(straight, 'expected straight-drawdown strategy');

const strategy = runStrategy(state, straight);

const projectionPotAt75 = projection.years.find((year) => year.age === 75)?.potEnd;

assert.ok(Math.abs(projection.potAtRet - strategy.summary.potAtRet) < 1e-6, 'pot at retirement should match projection baseline for straight drawdown');
assert.ok(Math.abs(projection.netAtRet - strategy.summary.netAtRet) < 1e-6, 'net at retirement should match projection baseline for straight drawdown');
assert.ok(Math.abs((projectionPotAt75 || 0) - strategy.metrics.potAt75) < 1e-6, 'pot at 75 should match projection baseline for straight drawdown');
