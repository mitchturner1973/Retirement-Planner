import { assert } from './_helpers.mjs';
import { renderStrategyTab } from '../../src/ui/decisionTimeline.js';

const els = {
  strategyLabList: { innerHTML: '', querySelectorAll: () => [] },
  strategyDetailWrap: { innerHTML: '', querySelectorAll: () => [] },
  strategySelect: { innerHTML: '', disabled: false },
};

const baseline = {
  strategy: { id: 'straight-drawdown', name: 'Straight drawdown', summary: 'Baseline strategy' },
  scores: { tax: 60, sustainable: 60, balanced: 60 },
  metrics: {
    totalTax: 100000,
    netAtRet: 20000,
    lowestIncomeAfterRet: 18000,
    potAt75: 250000,
    totalLumpSums: 0,
    remainingLsaAtRet: 250000,
  },
  summary: { netAtRet: 20000, potAtRet: 300000 },
  state: { endAge: 90 },
};

const candidate = {
  strategy: { id: 'alt', name: 'Alternative', summary: 'Alternative strategy' },
  scores: { tax: 70, sustainable: 72, balanced: 71 },
  metrics: {
    totalTax: 90000,
    netAtRet: 20500,
    lowestIncomeAfterRet: 18500,
    potAt75: 260000,
    totalLumpSums: 10000,
    remainingLsaAtRet: 240000,
    withdrawalByPotTotals: { 'current-workplace': 50000 },
    lumpSumByPotTotals: { 'current-workplace': 10000 },
  },
  summary: { netAtRet: 20500, potAtRet: 310000 },
  state: { endAge: 72, feePct: 0.3, pot: 250000 },
};

renderStrategyTab({
  getEl: (id) => els[id],
  fmtGBP: (value) => Number(value).toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }),
  badge: (_tone, label) => `<span>${label}</span>`,
}, {
  ranked: [candidate, baseline],
  bestTax: candidate,
  bestSustainable: candidate,
  bestBalanced: candidate,
  selectedTimeline: [
    { age: 67, items: [{ action: 'Take £50k PCLS', reason: 'Fund home remodel', category: 'pcls' }] },
  ],
  selectedStrategyId: 'alt',
});

assert.ok(els.strategyDetailWrap.innerHTML.includes('Selected plan'), 'detail stack should include the hero summary');
assert.ok(els.strategyDetailWrap.innerHTML.includes('Score breakdown'), 'detail stack should include the diagnostics card');
assert.ok(els.strategyDetailWrap.innerHTML.includes('Withdrawal plumbing'), 'detail stack should surface the DC + DB plan section');
assert.ok(els.strategyDetailWrap.innerHTML.includes('Lump sum sources'), 'detail stack should list lump sum sourcing when present');
assert.ok(els.strategyDetailWrap.innerHTML.includes('One-off moves'), 'detail stack should show a condensed action timeline');
