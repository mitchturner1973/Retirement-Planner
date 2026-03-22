import { calcProjection } from '../src/projection.js';

const state = {
  currentAge: 67,
  firstYearMonths: 12,
  retireAge: 67,
  endAge: 68,
  drawdown: 5,
  pot: 772614,
  feePct: 0,
  dcPensions: [],
  dbPensions: [],
  contribEvents: [],
  lumpSumEvents: [],
  statePension: 12000,
  stateAge: 67,
  salary: 0,
  salaryGrowth: 0,
  empPct: 0,
  erPct: 0,
  returnNom: 0,
  inflation: 2.5,
  otherIncome: 0,
  tflsPct: 25,
  tflsCap: 268275,
  allowance: 12570,
  higherThreshold: 37700,
  basicTax: 20,
  higherTax: 40,
};

const result = calcProjection(state);
console.log('Age 67 row');
console.log(result.years.find((row) => row.age === 67));
