import { assert, baseState, calcProjection, logPass } from './_helpers.mjs';

const result = calcProjection(baseState({
  currentAge: 60,
  retireAge: 67,
  endAge: 60,
  pot: 200000,
  lumpSumEvents: [
    { type: 'pcls', amountType: 'fixed', amount: 30000, targetId: 'current-workplace', age: 60 },
  ],
}));

const row = result.years[0];
assert.equal(row.pclsGross, 30000);
assert.equal(row.remainingLsa, 268275 - 30000);
logPass('PCLS reduces remaining LSA');
