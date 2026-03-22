import { assert, baseState, calcProjection, logPass } from './_helpers.mjs';

const result = calcProjection(baseState({
  currentAge: 59,
  firstYearMonths: 12,
  retireAge: 67,
  endAge: 61,
  pot: 200000,
  lumpSumEvents: [
    { type: 'pcls', amountType: 'fixed', amount: 30000, targetId: 'current-workplace', age: 60 },
  ],
}));

const age59 = result.years.find((year) => year.age === 59);
const age60 = result.years.find((year) => year.age === 60);
const age61 = result.years.find((year) => year.age === 61);

assert.equal(age59.lumpSumGross, 0);
assert.equal(age60.lumpSumGross, 30000);
assert.equal(age61.lumpSumGross, 0);
assert.match(age60.note, /PCLS £30,000/);
logPass('One-off lump sum appears at the correct age');
