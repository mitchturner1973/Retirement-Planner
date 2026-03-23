import { assert, calcHouseholdProjection, logPass } from './_helpers.mjs';

const base = {
  householdMode: 'joint',
  currentAge: 64,
  retireAge: 65,
  stateAge: 67,
  valuationDate: '2026-03-23',
  firstYearMonths: 12,
  pot: 0,
  salary: 0,
  empPct: 0,
  erPct: 0,
  statePension: 0,
  otherIncome: 0,
  salaryGrowth: 0,
  returnNom: 0,
  inflation: 2.5,
  drawdown: 4,
  endAge: 66,
  allowance: 12570,
  basicTax: 20,
  higherTax: 40,
  higherThreshold: 50270,
  tflsPct: 25,
  tflsCap: 268275,
  feePct: 0,
  dcPensions: [],
  dbPensions: [],
  contribEvents: [],
  lumpSumEvents: [],
  partnerCurrentAge: 64,
  partnerRetireAge: 65,
  partnerStateAge: 67,
  partnerValuationDate: '2026-03-23',
  partnerFirstYearMonths: 12,
  partnerPot: 0,
  partnerSalary: 0,
  partnerEmpPct: 0,
  partnerErPct: 0,
  partnerStatePension: 0,
  partnerOtherIncome: 0,
  partnerContribEvents: [],
  partnerLumpSumEvents: [],
};

const withPartnerSources = calcHouseholdProjection({
  ...base,
  partnerDcPensions: [{ id: 'p-dc-1', name: 'Partner extra DC', currentValue: 100000, feePct: 0, priority: 40 }],
  partnerDbPensions: [{ id: 'p-db-1', name: 'Partner DB', annualIncome: 5000, startAge: 65, increaseType: 'none' }],
});

const withoutPartnerSources = calcHouseholdProjection({
  ...base,
  partnerDcPensions: [],
  partnerDbPensions: [],
});

const withRow = withPartnerSources.years.find((year) => year.age === 65);
const withoutRow = withoutPartnerSources.years.find((year) => year.age === 65);

assert.ok(withRow.partnerNet > withoutRow.partnerNet + 1000, `Expected partner net with partner arrays to be materially higher. got with=${withRow.partnerNet}, without=${withoutRow.partnerNet}`);
assert.ok(withRow.householdNet > withoutRow.householdNet + 1000, `Expected household net to reflect partner arrays. got with=${withRow.householdNet}, without=${withoutRow.householdNet}`);

logPass('Household projection uses partner DC/DB arrays when present');
