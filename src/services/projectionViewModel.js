const MAJOR_INCOME_DROP_PCT = 0.1;
const MAJOR_INCOME_DROP_ABS = 2500;

const SUMMARY_CARD_META = {
  'retirement-year': { tone: 'milestone', icon: '↗' },
  'state-pension-year': { tone: 'income', icon: '◎' },
  'age-75': { tone: 'default', icon: '⏳' },
  'age-75-checkpoint': { tone: 'default', icon: '⏳' },
  'end-age': { tone: 'future', icon: '🏁' },
};

const TONE_ICON_FALLBACK = {
  milestone: '↗',
  income: '◎',
  cash: '◍',
  attention: '!',
  future: '🏁',
  default: '•',
};

function formatDelta(value) {
  const amount = Math.round(Number(value || 0));
  if (!amount) return 'Flat versus previous year';
  return `${amount > 0 ? '+' : '−'}£${Math.abs(amount).toLocaleString(undefined, { maximumFractionDigits: 0 })} versus previous year`;
}

function splitNote(note) {
  return String(note || '')
    .split(' • ')
    .map((part) => part.trim())
    .filter(Boolean);
}

function recurringNetForRow(row) {
  return Number(row.recurringNetIncome ?? row.totalNetIncome ?? row.annualNetIncome ?? 0);
}

function totalCashForRow(row) {
  return Number(row.totalCashReceived ?? row.netIncome ?? 0);
}

function buildEventBadges(row, flags) {
  const badges = [];
  if (flags.isRetirementStart) badges.push({ key: 'retirement-start', label: 'Retirement starts', tone: 'milestone' });
  if (flags.isStatePensionStart) badges.push({ key: 'state-pension-start', label: 'State Pension starts', tone: 'income' });
  if (flags.isDbStart) badges.push({ key: 'db-start', label: 'DB pension starts', tone: 'income' });
  if (flags.hasLumpSum) badges.push({ key: 'lump-sum', label: 'One-off lump sum', tone: 'cash' });
  if (flags.hasMajorIncomeDrop) badges.push({ key: 'income-drop', label: 'Recurring income drop', tone: 'attention' });
  return badges;
}

function buildRowView(row, previousRow, state) {
  const recurringNetIncome = recurringNetForRow(row);
  const totalCashReceived = totalCashForRow(row);
  const previousRecurringNetIncome = previousRow ? recurringNetForRow(previousRow) : 0;
  const recurringIncomeDelta = recurringNetIncome - previousRecurringNetIncome;
  const isRetirementStart = row.age === state.retireAge;
  const isStatePensionStart = Number(row.statePension || 0) > 0 && Number(previousRow?.statePension || 0) <= 0;
  const isDbStart = Number(row.dbIncome || 0) > 0 && Number(previousRow?.dbIncome || 0) <= 0;
  const hasLumpSum = Number(row.lumpSumGross || 0) > 0;
  const hasMajorIncomeDrop = !!previousRow
    && previousRecurringNetIncome > 0
    && recurringIncomeDelta <= -MAJOR_INCOME_DROP_ABS
    && recurringNetIncome <= previousRecurringNetIncome * (1 - MAJOR_INCOME_DROP_PCT);
  const hasCash = row.phase === 'retired'
    || Number(row.lumpSumGross || 0) > 0
    || Number(row.statePension || 0) > 0
    || Number(row.dbIncome || 0) > 0
    || recurringNetIncome > 0
    || totalCashReceived > 0;

  const flags = {
    isRetirementStart,
    isStatePensionStart,
    isDbStart,
    hasLumpSum,
    hasMajorIncomeDrop,
    recurringIncomeDelta,
  };

  return {
    ...row,
    hasCash,
    recurringNetIncome,
    totalCashReceived,
    previousRecurringNetIncome,
    flags,
    eventBadges: buildEventBadges(row, flags),
    noteParts: splitNote(row.note),
    detailItems: [
      { label: 'Recurring total net income', value: recurringNetIncome },
      { label: 'Total cash received', value: totalCashReceived },
      { label: 'Tax paid', value: Number(row.tax || 0) },
      { label: 'Remaining TFLS / LSA', value: Number(row.remainingLsa || 0) },
      ...(Number(row.pclsGross || 0) > 0 ? [{ label: 'PCLS taken', value: Number(row.pclsGross || 0) }] : []),
      ...(Number(row.ufplsGross || 0) > 0 ? [{ label: 'UFPLS taken', value: Number(row.ufplsGross || 0) }] : []),
      ...(Number(row.taxableLumpGross || 0) > 0 ? [{ label: 'Taxable lump sum taken', value: Number(row.taxableLumpGross || 0) }] : []),
      ...(previousRow ? [{ label: 'Recurring income change', text: formatDelta(recurringIncomeDelta) }] : []),
    ],
    phaseLabel: (row.phase === 'retired' || row.phase === 'bridge') ? 'Retired' : 'Working',
    rowTone: hasMajorIncomeDrop ? 'attention' : hasLumpSum ? 'cash' : (isRetirementStart || isStatePensionStart || isDbStart) ? 'milestone' : 'default',
  };
}

function resolveSummaryCardMeta(key, row) {
  const primaryBadge = row?.eventBadges?.[0];
  const base = SUMMARY_CARD_META[key] || {};
  const tone = primaryBadge?.tone || base.tone || 'default';
  const icon = base.icon || TONE_ICON_FALLBACK[tone] || TONE_ICON_FALLBACK.default;
  return { tone, icon };
}

function buildSummaryCards(rows, state) {
  const cards = [];
  const seenAges = new Set();

  const addCard = (key, title, row, fallbackText = '') => {
    if (!row || seenAges.has(row.age)) return;
    seenAges.add(row.age);
    const meta = resolveSummaryCardMeta(key, row);
    cards.push({
      key,
      title,
      age: row.age,
      recurringNetIncome: row.recurringNetIncome,
      totalCashReceived: row.totalCashReceived,
      potEnd: Number(row.potEnd || 0),
      highlight: row.eventBadges[0]?.label || row.noteParts[0] || fallbackText,
      tone: meta.tone,
      icon: meta.icon,
    });
  };

  addCard('retirement-year', 'Retirement year', rows.find((row) => row.age === state.retireAge), 'Drawdown starts');
  addCard('state-pension-year', 'State Pension start', rows.find((row) => row.flags.isStatePensionStart), 'State income begins');
  addCard('age-75', 'Age 75 checkpoint', rows.find((row) => row.age === 75), 'Mid-retirement checkpoint');
  addCard('end-age', 'End age', rows.find((row) => row.age === state.endAge), 'Projection horizon');

  return cards;
}

function buildRangeMeta(rows, state, selectedRange) {
  const options = [
    { key: 'all', label: 'All years' },
    { key: 'retirement', label: 'Retirement onward' },
    { key: 'milestones', label: 'Milestones only' },
  ];
  const selected = options.some((option) => option.key === selectedRange) ? selectedRange : 'all';

  const visibleRows = rows.filter((row) => {
    if (selected === 'retirement') return row.age >= state.retireAge;
    if (selected === 'milestones') {
      return row.flags.isRetirementStart
        || row.flags.isStatePensionStart
        || row.flags.isDbStart
        || row.flags.hasLumpSum
        || row.flags.hasMajorIncomeDrop;
    }
    return true;
  });

  return {
    selected,
    options,
    visibleRows,
    label: options.find((option) => option.key === selected)?.label || 'All years',
  };
}

export function buildProjectionViewModel(projection, state, options = {}) {
  const rows = projection.years.map((row, index, list) => buildRowView(row, list[index - 1], state));
  const range = buildRangeMeta(rows, state, options.range);
  const personView = options.personView || 'primary';
  const householdMode = options.householdMode || 'single';
  const partnerLabel = options.partnerLabel || 'Partner';
  const personLabel = (householdMode === 'joint' && personView === 'partner') ? partnerLabel : 'You';
  return {
    mode: options.mode === 'compact' ? 'compact' : 'detailed',
    range: range.selected,
    rangeOptions: range.options,
    visibleRows: range.visibleRows,
    helpText: '',
    rows,
    summaryCards: buildSummaryCards(rows, state),
    rowCountText: `${range.visibleRows.length} of ${rows.length} years shown • ${range.label}`,
    legendItems: [],
    personView,
    householdMode,
    partnerLabel,
    personLabel,
  };
}
