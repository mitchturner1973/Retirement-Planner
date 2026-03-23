import { assert, baseState, logPass } from './_helpers.mjs';
import { buildProjectionViewModel } from '../../src/services/projectionViewModel.js';

const state = baseState({ currentAge: 60, retireAge: 65, stateAge: 67, endAge: 68 });
const projection = {
  years: [
    { age: 60, phase: 'work', recurringNetIncome: 0, totalCashReceived: 0, statePension: 0, dbIncome: 0, lumpSumGross: 0, note: '', potEnd: 200000 },
    { age: 65, phase: 'retired', recurringNetIncome: 20000, totalCashReceived: 20000, statePension: 0, dbIncome: 0, lumpSumGross: 0, note: '', potEnd: 180000 },
    { age: 67, phase: 'retired', recurringNetIncome: 32000, totalCashReceived: 32000, statePension: 12000, dbIncome: 0, lumpSumGross: 0, note: 'State Pension starts', potEnd: 150000 },
    { age: 68, phase: 'retired', recurringNetIncome: 22000, totalCashReceived: 22000, statePension: 12000, dbIncome: 0, lumpSumGross: 0, note: '', potEnd: 140000 },
  ],
};

const allView = buildProjectionViewModel(projection, state, { range: 'all' });
const retirementView = buildProjectionViewModel(projection, state, { range: 'retirement' });
const milestonesView = buildProjectionViewModel(projection, state, { range: 'milestones' });

assert.equal(allView.visibleRows.length, 4);
assert.deepEqual(retirementView.visibleRows.map((row) => row.age), [65, 67, 68]);
assert.deepEqual(milestonesView.visibleRows.map((row) => row.age), [65, 67, 68]);
assert.match(milestonesView.rowCountText, /3 of 4 years shown/);
logPass('Projection view model range filter narrows visible rows cleanly');