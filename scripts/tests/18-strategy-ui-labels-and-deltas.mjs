import { assert } from './_helpers.mjs';
import { renderStrategyTab } from '../../src/ui/decisionTimeline.js';

const els = {
  strategyTopCards: { innerHTML: '' },
  strategyCompareWrap: { innerHTML: '' },
  strategyTimelineWrap: { innerHTML: '' },
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
  },
  summary: { netAtRet: 20500, potAtRet: 310000 },
  state: { endAge: 72 },
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
  selectedTimeline: [],
  selectedStrategyId: 'alt',
});

assert.ok(els.strategyTopCards.innerHTML.includes('Pot at end age (72)'), 'top card should label pot metric as end-age when end age is below 75');
assert.ok(els.strategyCompareWrap.innerHTML.includes('Pot at 75 (or end age)'), 'compare table should clarify Pot at 75 fallback');
assert.ok(els.strategyCompareWrap.innerHTML.includes('Δ vs baseline net (ret)'), 'compare table should include net delta column');
assert.ok(els.strategyCompareWrap.innerHTML.includes('Δ vs baseline pot (ret)'), 'compare table should include pot delta column');
assert.ok(els.strategyCompareWrap.innerHTML.includes('+£500'), 'compare table should show positive net delta against baseline');
assert.ok(els.strategyCompareWrap.innerHTML.includes('+£10,000'), 'compare table should show positive pot delta against baseline');
