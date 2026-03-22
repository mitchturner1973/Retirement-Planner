import { assert, approxEqual, baseState, calcProjection, logPass } from './_helpers.mjs';

const result = calcProjection(baseState());
const row = result.years.find((year) => year.age === 67);

approxEqual(row.grossWithdrawal, 772614 * 0.05, 0.01, 'gross drawdown');
assert.equal(row.phase, 'retired');
logPass('5% drawdown at retirement gives expected gross withdrawal');
