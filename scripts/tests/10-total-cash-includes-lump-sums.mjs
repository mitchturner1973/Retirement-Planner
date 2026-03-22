import { assert, baseState, calcProjection, logPass } from './_helpers.mjs';

const result = calcProjection(baseState({
  currentAge: 60,
  firstYearMonths: 12,
  retireAge: 67,
  endAge: 60,
  pot: 200000,
  lumpSumEvents: [
    { type: 'pcls', amountType: 'fixed', amount: 30000, targetId: 'current-workplace', age: 60 },
  ],
}));

const row = result.years[0];
assert.equal(row.recurringNetIncome, 0);
assert.equal(row.totalCashReceived, 30000);
assert.ok(row.totalCashReceived > row.totalNetIncome);
logPass('Total cash received includes lump sums in the event year');
