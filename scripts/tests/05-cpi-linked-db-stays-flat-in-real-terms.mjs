import { approxEqual, baseState, dbIncomeAtAge, logPass } from './_helpers.mjs';

const state = baseState({ currentAge: 67, firstYearMonths: 12, inflation: 2.5 });
const db = [{ annualIncome: 10000, startAge: 67, increaseType: 'cpi' }];

const age67 = dbIncomeAtAge(state, db, 67);
const age68 = dbIncomeAtAge(state, db, 68);

approxEqual(age67, 10000, 0.01, 'age 67 CPI DB');
approxEqual(age68, 10000, 0.01, 'age 68 CPI DB');
logPass('CPI-linked DB stays flat in today\'s money');
