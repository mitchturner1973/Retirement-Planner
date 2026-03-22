import assert from 'node:assert/strict';
import { calcProjection } from '../../src/projection.js';
import { calcHouseholdProjection } from '../../src/engines/householdEngine.js';
import { buildDcTaxResult } from '../../src/engines/taxEngine.js';
import { dbIncomeAtAge } from '../../src/engines/dbEngine.js';
import { getRulesPack } from '../../src/services/rulesRegistry.js';

export { assert, calcProjection, calcHouseholdProjection, buildDcTaxResult, dbIncomeAtAge, getRulesPack };

export function baseState(overrides = {}) {
  return {
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
    householdMode: 'single',
    ...overrides,
  };
}

export function approxEqual(actual, expected, tolerance = 0.01, label = 'value') {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label} expected ${expected} ± ${tolerance}, got ${actual}`,
  );
}

export function logPass(_name) {
  // PASS/FAIL output is handled centrally by scripts/run-all-tests.mjs
}
