import { assert, baseState, calcProjection, logPass } from './_helpers.mjs';

const annual = calcProjection(baseState({
  currentAge: 42,
  firstYearMonths: 12,
  retireAge: 67,
  endAge: 42,
  pot: 100000,
  salary: 60000,
  empPct: 5,
  erPct: 5,
  returnNom: 5,
}));

const stub = calcProjection(baseState({
  currentAge: 42,
  firstYearMonths: 6,
  retireAge: 67,
  endAge: 42,
  pot: 100000,
  salary: 60000,
  empPct: 5,
  erPct: 5,
  returnNom: 5,
}));

const annualRow = annual.years[0];
const stubRow = stub.years[0];

assert.ok(stubRow.contrib < annualRow.contrib, 'stub contribution should be lower');
assert.ok(stubRow.potEnd < annualRow.potEnd, 'stub end pot should be lower');
logPass('First-year stub period reduces growth and contributions');
