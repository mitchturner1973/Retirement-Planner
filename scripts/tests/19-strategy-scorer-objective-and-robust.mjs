import { assert } from './_helpers.mjs';
import { scoreStrategies } from '../../src/engines/strategyScorer.js';

function makeResult(id, objective, metrics) {
  return {
    strategy: { id, name: id, objective },
    metrics: {
      totalTax: 0,
      netAtRet: 0,
      lowestIncomeAfterRet: 0,
      potAt75: 0,
      potAtEnd: 0,
      remainingLsaAtRet: 0,
      totalLumpSums: 0,
      ...metrics,
    },
    summary: { potAtRet: 0, netAtRet: 0 },
    years: [],
    actions: [],
    state: { endAge: 90 },
  };
}

// Objective weighting should influence balanced score when component strengths differ.
const objectiveResults = [
  makeResult('tax-objective', 'tax', {
    totalTax: 10000,
    netAtRet: 16000,
    lowestIncomeAfterRet: 14000,
    potAt75: 90000,
    potAtEnd: 70000,
    remainingLsaAtRet: 260000,
  }),
  makeResult('balanced-objective', 'balanced', {
    totalTax: 10000,
    netAtRet: 16000,
    lowestIncomeAfterRet: 14000,
    potAt75: 90000,
    potAtEnd: 70000,
    remainingLsaAtRet: 260000,
  }),
  makeResult('pot-heavy-peer', 'pot', {
    totalTax: 50000,
    netAtRet: 30000,
    lowestIncomeAfterRet: 26000,
    potAt75: 300000,
    potAtEnd: 260000,
    remainingLsaAtRet: 200000,
  }),
];

const objectiveScored = scoreStrategies(objectiveResults);
const taxObj = objectiveScored.ranked.find((item) => item.strategy.id === 'tax-objective');
const balObj = objectiveScored.ranked.find((item) => item.strategy.id === 'balanced-objective');
assert.ok(taxObj && balObj, 'expected objective test strategies in ranked results');
assert.ok(
  taxObj.scores.balanced > balObj.scores.balanced,
  `expected tax objective to lift balanced score for tax-strong profile, got tax=${taxObj.scores.balanced} balanced=${balObj.scores.balanced}`,
);

// Robust normalization should avoid collapsing non-outlier strategies when one outlier exists.
const robustResults = [
  makeResult('t10', 'balanced', { totalTax: 10, netAtRet: 25000, lowestIncomeAfterRet: 23000, potAt75: 200000, potAtEnd: 180000, remainingLsaAtRet: 220000 }),
  makeResult('t11', 'balanced', { totalTax: 11, netAtRet: 25000, lowestIncomeAfterRet: 23000, potAt75: 200000, potAtEnd: 180000, remainingLsaAtRet: 220000 }),
  makeResult('t12', 'balanced', { totalTax: 12, netAtRet: 25000, lowestIncomeAfterRet: 23000, potAt75: 200000, potAtEnd: 180000, remainingLsaAtRet: 220000 }),
  makeResult('t13', 'balanced', { totalTax: 13, netAtRet: 25000, lowestIncomeAfterRet: 23000, potAt75: 200000, potAtEnd: 180000, remainingLsaAtRet: 220000 }),
  makeResult('t14', 'balanced', { totalTax: 14, netAtRet: 25000, lowestIncomeAfterRet: 23000, potAt75: 200000, potAtEnd: 180000, remainingLsaAtRet: 220000 }),
  makeResult('outlier', 'balanced', { totalTax: 1000, netAtRet: 25000, lowestIncomeAfterRet: 23000, potAt75: 200000, potAtEnd: 180000, remainingLsaAtRet: 220000 }),
];

const robustScored = scoreStrategies(robustResults);
const t10 = robustScored.ranked.find((item) => item.strategy.id === 't10');
const t14 = robustScored.ranked.find((item) => item.strategy.id === 't14');
assert.ok(t10 && t14, 'expected robust normalization test strategies in ranked results');
assert.ok(
  t10.scores.tax > t14.scores.tax,
  `expected lower tax strategy to retain higher tax score despite outlier, got t10=${t10.scores.tax} t14=${t14.scores.tax}`,
);
assert.ok(
  (t10.scores.tax - t14.scores.tax) >= 20,
  `expected meaningful score spread among non-outlier strategies, got spread=${t10.scores.tax - t14.scores.tax}`,
);
