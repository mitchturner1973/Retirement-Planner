import { assert, baseState, calcProjection, logPass } from './_helpers.mjs';

const result = calcProjection(baseState({
  currentAge: 66,
  retireAge: 66,
  endAge: 67,
  stateAge: 67,
  statePension: 12000,
}));

const age66 = result.years.find((year) => year.age === 66);
const age67 = result.years.find((year) => year.age === 67);

assert.equal(age66.statePension, 0);
assert.equal(age67.statePension, 12000);
assert.match(age67.note, /State Pension starts/);
logPass('State Pension starts at the correct age');
