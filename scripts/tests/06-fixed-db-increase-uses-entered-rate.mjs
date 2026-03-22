import { assert, approxEqual, baseState, dbIncomeAtAge, logPass } from './_helpers.mjs';

const state = baseState({ currentAge: 67, firstYearMonths: 12, inflation: 2.5 });
const db = [{ annualIncome: 10000, startAge: 67, increaseType: 'fixed', escalationPct: 5 }];

const age67 = dbIncomeAtAge(state, db, 67);
const age68 = dbIncomeAtAge(state, db, 68);
const expectedAge68 = 10000 * ((1.05 / 1.025));

approxEqual(age67, 10000, 0.01, 'age 67 fixed DB');
approxEqual(age68, expectedAge68, 0.01, 'age 68 fixed DB');
assert.ok(age68 > age67);
logPass('Fixed DB increase uses the entered rate in real terms');
