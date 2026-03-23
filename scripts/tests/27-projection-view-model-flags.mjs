import { assert, baseState, logPass } from './_helpers.mjs';
import { buildProjectionViewModel } from '../../src/services/projectionViewModel.js';

const state = baseState({
  currentAge: 60,
  retireAge: 60,
  stateAge: 67,
  endAge: 67,
});

const view = buildProjectionViewModel({
  years: [
    {
      age: 60,
      phase: 'retired',
      grossWithdrawal: 0,
      dcNetIncome: 0,
      recurringNetIncome: 0,
      totalNetIncome: 0,
      totalCashReceived: 30000,
      lumpSumGross: 30000,
      statePension: 0,
      dbIncome: 0,
      remainingLsa: 238275,
      potStart: 200000,
      potEnd: 170000,
      tax: 0,
      note: 'PCLS £30,000',
    },
    {
      age: 61,
      phase: 'retired',
      grossWithdrawal: 22000,
      dcNetIncome: 20000,
      recurringNetIncome: 20000,
      totalNetIncome: 20000,
      totalCashReceived: 20000,
      lumpSumGross: 0,
      statePension: 0,
      dbIncome: 0,
      remainingLsa: 238275,
      potStart: 170000,
      potEnd: 160000,
      tax: 2000,
      note: '',
    },
    {
      age: 65,
      phase: 'retired',
      grossWithdrawal: 15000,
      dcNetIncome: 14000,
      recurringNetIncome: 22000,
      totalNetIncome: 22000,
      totalCashReceived: 22000,
      lumpSumGross: 0,
      statePension: 0,
      dbIncome: 8000,
      remainingLsa: 238275,
      potStart: 150000,
      potEnd: 144000,
      tax: 1000,
      note: 'DB income £8,000',
    },
    {
      age: 66,
      phase: 'retired',
      grossWithdrawal: 11000,
      dcNetIncome: 10000,
      recurringNetIncome: 17000,
      totalNetIncome: 17000,
      totalCashReceived: 17000,
      lumpSumGross: 0,
      statePension: 0,
      dbIncome: 7000,
      remainingLsa: 238275,
      potStart: 144000,
      potEnd: 138000,
      tax: 1000,
      note: '',
    },
    {
      age: 67,
      phase: 'retired',
      grossWithdrawal: 9000,
      dcNetIncome: 8000,
      recurringNetIncome: 28000,
      totalNetIncome: 28000,
      totalCashReceived: 28000,
      lumpSumGross: 0,
      statePension: 12000,
      dbIncome: 8000,
      remainingLsa: 238275,
      potStart: 138000,
      potEnd: 132000,
      tax: 1000,
      note: 'State Pension starts • DB income £8,000',
    },
  ],
}, state, { mode: 'detailed' });

const age60 = view.rows.find((row) => row.age === 60);
const age65 = view.rows.find((row) => row.age === 65);
const age66 = view.rows.find((row) => row.age === 66);
const age67 = view.rows.find((row) => row.age === 67);

assert.equal(age60.flags.isRetirementStart, true);
assert.equal(age60.flags.hasLumpSum, true);
assert.equal(age65.flags.isDbStart, true);
assert.equal(age66.flags.hasMajorIncomeDrop, true);
assert.equal(age67.flags.isStatePensionStart, true);
assert.equal(view.summaryCards.some((card) => card.title === 'Retirement year'), true);
logPass('Projection view model flags milestone, lump sum, and income drop years');