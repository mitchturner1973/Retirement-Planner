function num(value) {
  return Number(value || 0);
}

function pct(value) {
  return Number(value || 0) / 100;
}

function findRowAtAge(rows, age) {
  return rows.find((row) => row.age === age) || null;
}

function recurringNet(row) {
  return num(row?.recurringNetIncome ?? row?.annualNetIncome ?? row?.totalNetIncome ?? row?.netIncome);
}

function normalizeSeries(series) {
  const values = Array.isArray(series) ? series.map((item) => num(item)) : [];
  const clean = values.filter((item) => Number.isFinite(item));
  return clean.length ? clean : [0, 0, 0];
}

function buildHeadlineCards(state, base, household) {
  const potSeries = normalizeSeries((base.years || []).map((row) => row.potEnd));
  const recurringSeries = normalizeSeries((base.years || []).map((row) => recurringNet(row)));
  const guaranteedSeries = normalizeSeries((base.years || []).map((row) => num(row.statePension) + num(row.dbIncome)));

  const cards = [
    {
      key: 'pot-at-retirement',
      title: 'Pot at retirement',
      value: num(base.potAtRet),
      tone: 'core',
      detail: `Age ${state.retireAge}`,
      sparkline: potSeries,
    },
    {
      key: 'net-income-at-retirement',
      title: 'Estimated total net income',
      value: num(base.netAtRet),
      tone: 'core',
      detail: 'Annual recurring (after tax)',
      sparkline: recurringSeries,
    },
    {
      key: 'guaranteed-income-at-retirement',
      title: 'Guaranteed income at retirement',
      value: num(base.stateAtRet) + num(base.dbAtRet),
      tone: 'income',
      detail: 'State Pension + DB pensions',
      sparkline: guaranteedSeries,
    },
  ];

  const age75 = findRowAtAge(base.years || [], 75);
  cards.push({
    key: 'pot-at-75',
    title: 'Pot at age 75',
    value: num(age75?.potEnd),
    tone: 'future',
    detail: age75 ? 'Later-life checkpoint' : 'Age 75 outside projection horizon',
    sparkline: potSeries,
  });

  if (state.householdMode === 'joint' && household) {
    const hhSeries = normalizeSeries((household.years || []).map((row) => row.householdNet));
    const hhRetRow = findRowAtAge(household.years || [], Math.max(household.primaryState.retireAge, household.partnerState.retireAge));
    cards.push({
      key: 'household-net-at-retirement',
      title: 'Household net at retirement',
      value: num(hhRetRow?.householdNet),
      tone: 'household',
      detail: 'Annual recurring combined',
      sparkline: hhSeries,
    });
  }

  return cards;
}

function buildIncomeComposition(base) {
  const grossDc = num(base.grossDcAtRet);
  const statePension = num(base.stateAtRet);
  const db = num(base.dbAtRet);
  const other = num(base.otherAtRet);
  const recurringGross = grossDc + statePension + db + other;
  const tax = num(base.taxAtRet);
  const recurringNetIncome = num(base.netAtRet);
  const oneOff = num(base.retirementLumpSumAtRet);

  return {
    recurringGross,
    recurringNet: recurringNetIncome,
    oneOff,
    tax,
    items: [
      { key: 'dc', label: 'DC withdrawals (gross)', value: grossDc, tone: 'dc' },
      { key: 'state', label: 'State Pension', value: statePension, tone: 'state' },
      { key: 'db', label: 'DB pensions', value: db, tone: 'db' },
      { key: 'other', label: 'Other income', value: other, tone: 'other' },
      { key: 'tax', label: 'Tax', value: tax, tone: 'tax' },
      { key: 'net', label: 'Recurring net income', value: recurringNetIncome, tone: 'net', emphasis: true },
      { key: 'lump', label: 'One-off lump sums', value: oneOff, tone: 'cash', emphasis: true },
    ],
  };
}

function findMajorIncomeDrop(base, thresholds) {
  const years = base.years || [];
  for (let i = 1; i < years.length; i += 1) {
    const prev = recurringNet(years[i - 1]);
    const curr = recurringNet(years[i]);
    if (prev <= 0) continue;
    const drop = prev - curr;
    const dropPct = drop / prev;
    if (drop >= thresholds.incomeDropAbs && dropPct >= thresholds.incomeDropPct) {
      return { age: years[i].age, drop, dropPct };
    }
  }
  return null;
}

function buildWatchouts(state, base, household, statuses, thresholds) {
  const watchouts = [];
  const age75 = findRowAtAge(base.years || [], 75);
  const majorDrop = findMajorIncomeDrop(base, thresholds);

  if (majorDrop) {
    watchouts.push({
      key: 'income-drop',
      tone: 'warn',
      title: 'Income drop detected',
      text: `Recurring income falls around age ${majorDrop.age}. Review event years in Projection.`,
      view: 'projection',
    });
  }

  const latePot = num(age75?.potEnd);
  const annualNet = Math.max(1, num(base.netAtRet));
  if (latePot > 0 && latePot < annualNet * thresholds.lowPotYears) {
    watchouts.push({
      key: 'late-pot',
      tone: 'warn',
      title: 'Later-life pot may be tight',
      text: 'Pot at age 75 is relatively low versus retirement income level.',
      view: 'projection',
    });
  }

  const recurringGross = num(base.grossDcAtRet) + num(base.stateAtRet) + num(base.dbAtRet) + num(base.otherAtRet);
  const dcShare = recurringGross > 0 ? num(base.grossDcAtRet) / recurringGross : 0;
  if (dcShare >= thresholds.dcReliancePct) {
    watchouts.push({
      key: 'dc-reliance',
      tone: 'warn',
      title: 'High reliance on DC withdrawals',
      text: 'A large share of retirement income depends on drawdown sustainability.',
      view: 'strategy',
    });
  }

  if (num(base.retirementLumpSumAtRet) > Math.max(5000, num(base.netAtRet) * thresholds.lumpSumPctNet)) {
    watchouts.push({
      key: 'lump-distortion',
      tone: 'info',
      title: 'Large one-off lump sum in retirement year',
      text: 'Separate one-off cash from recurring annual income when planning spending.',
      view: 'projection',
    });
  }

  if (num(base.remainingLsaAtRet) < thresholds.lowLsa) {
    watchouts.push({
      key: 'low-lsa',
      tone: 'warn',
      title: 'Low remaining TFLS / LSA',
      text: 'Future tax-free cash flexibility appears limited.',
      view: 'strategy',
    });
  }

  if (statuses.stress?.s === 'bad' || statuses.bridge?.base?.s === 'bad' || statuses.monte?.s === 'bad') {
    watchouts.push({
      key: 'status-red',
      tone: 'bad',
      title: 'Resilience checks need attention',
      text: 'One or more stress, bridge, or Monte checks are red.',
      view: statuses.stress?.s === 'bad' ? 'stress' : statuses.bridge?.base?.s === 'bad' ? 'bridge' : 'monte',
    });
  }

  if (state.householdMode === 'joint' && household) {
    const hhRetRow = findRowAtAge(household.years || [], Math.max(household.primaryState.retireAge, household.partnerState.retireAge));
    if (hhRetRow && num(hhRetRow.householdNet) < num(base.netAtRet) * 1.2) {
      watchouts.push({
        key: 'household-net',
        tone: 'info',
        title: 'Check household-level sufficiency',
        text: 'Household income at retirement may be close to single-person baseline assumptions.',
        view: 'household',
      });
    }
  }

  return watchouts.slice(0, 5);
}

function buildSnapshot(base, selectedStrategyId) {
  return {
    potAtRet: num(base.potAtRet),
    netAtRet: num(base.netAtRet),
    taxAtRet: num(base.taxAtRet),
    selectedStrategyId: selectedStrategyId || null,
  };
}

function buildChanges(currentSnapshot, compareSnapshot, compareLabel) {
  if (!compareSnapshot) {
    return {
      available: false,
      items: [],
      summary: 'No comparison baseline available yet. Save a scenario or recalculate after changing inputs.',
    };
  }

  const items = [
    { key: 'potAtRet', label: 'Pot at retirement', delta: currentSnapshot.potAtRet - num(compareSnapshot.potAtRet) },
    { key: 'netAtRet', label: 'Retirement net income', delta: currentSnapshot.netAtRet - num(compareSnapshot.netAtRet) },
    { key: 'taxAtRet', label: 'Tax at retirement', delta: currentSnapshot.taxAtRet - num(compareSnapshot.taxAtRet) },
  ];

  const prevStrategy = compareSnapshot.selectedStrategyId || 'none';
  const currStrategy = currentSnapshot.selectedStrategyId || 'none';
  items.push({
    key: 'strategy',
    label: 'Selected strategy',
    text: prevStrategy === currStrategy ? 'No change' : `${prevStrategy} -> ${currStrategy}`,
  });

  return {
    available: true,
    items,
    summary: `Changes versus ${compareLabel}`,
  };
}

function buildNextSteps(statuses, watchouts) {
  const steps = [];

  if (statuses.stress?.s !== 'good') {
    steps.push({ key: 'stress', title: 'Review Stress outcomes', detail: 'Check crash and bad-sequence robustness.', view: 'stress' });
  }
  if (statuses.bridge?.base?.s === 'bad' || statuses.bridge?.base?.s === 'warn') {
    steps.push({ key: 'bridge', title: 'Review Bridge sustainability', detail: 'Validate early-retirement funding path.', view: 'bridge' });
  }
  if (statuses.monte?.s !== 'good') {
    steps.push({ key: 'monte', title: 'Run or refresh Monte Carlo', detail: 'Update probability of success for current inputs.', view: 'monte' });
  }

  const projectionWatch = watchouts.find((item) => item.view === 'projection');
  if (projectionWatch) {
    steps.push({ key: 'projection', title: 'Inspect Projection event years', detail: 'Focus on milestone and attention years.', view: 'projection' });
  }

  steps.push({ key: 'strategy', title: 'Compare Strategy options', detail: 'See if ranked plans improve flexibility and tax.', view: 'strategy' });

  const unique = [];
  const seen = new Set();
  for (const step of steps) {
    if (seen.has(step.key)) continue;
    seen.add(step.key);
    unique.push(step);
  }

  return unique.slice(0, 5);
}

function buildEarlyBridgeSummary(state, base, bridgeResult, bridgeStatus) {
  if (state.earlyAge === '' || state.earlyAge == null) return null;

  if (bridgeResult?.error) {
    return {
      enabled: true,
      available: false,
      error: bridgeResult.error,
      startAge: Number(state.earlyAge),
      endAge: Number(state.stateAge),
    };
  }

  const stateRow = findRowAtAge(base.years || [], Number(state.stateAge));
  const guaranteedAtStateAge = stateRow
    ? num(stateRow.statePension) + num(stateRow.dbIncome)
    : num(base.stateAtRet) + num(base.dbAtRet);

  const baseRunOut = bridgeResult?.runOut_base;
  const lifeRunOut = bridgeResult?.runOut_life;
  const lifeEnabled = Number(state.bridgeKeepLifestyle || 0) === 1;

  return {
    enabled: true,
    available: true,
    startAge: Number(bridgeResult?.early ?? state.earlyAge),
    endAge: Number(bridgeResult?.end ?? state.stateAge),
    years: Math.max(0, Number(bridgeResult?.end ?? state.stateAge) - Number(bridgeResult?.early ?? state.earlyAge)),
    bridgeMode: String(state.bridgeMode || 'net'),
    bridgeAmount: num(state.bridgeAmount),
    potAtEarly: num(bridgeResult?.potEarly_base),
    potAtStateAge: num(bridgeResult?.potEnd_base),
    netAtStateAge: num(bridgeResult?.netEnd_base),
    guaranteedAtStateAge,
    baseHolds: baseRunOut == null,
    baseRunOutAge: baseRunOut,
    baseStatus: bridgeStatus?.base?.s || 'na',
    lifeEnabled,
    lifeHolds: lifeEnabled ? lifeRunOut == null : null,
    lifeRunOutAge: lifeEnabled ? lifeRunOut : null,
    lifeNetAtStateAge: lifeEnabled ? num(bridgeResult?.netEnd_life) : null,
    lifeStatus: lifeEnabled ? (bridgeStatus?.life?.s || 'na') : null,
  };
}

export function buildOverviewViewModel({
  state,
  base,
  household,
  bridgeResult,
  stressStatus,
  bridgeStatus,
  monteStatus,
  selectedStrategyId,
  compareSnapshot,
  compareLabel,
  compareSource,
  compareScenarioId,
  compareScenarioOptions = [],
}) {
  const thresholds = {
    incomeDropPct: Math.max(0, pct(state.watchoutIncomeDropPct || 10)),
    incomeDropAbs: Math.max(0, num(state.watchoutIncomeDropAbs || 2500)),
    lowPotYears: Math.max(0.5, num(state.watchoutLateLifePotYears || 4)),
    dcReliancePct: Math.max(0, pct(state.watchoutDcReliancePct || 65)),
    lumpSumPctNet: Math.max(0, pct(state.watchoutLumpSumPctNet || 25)),
    lowLsa: Math.max(0, num(state.watchoutLowLsa || 20000)),
  };
  const statuses = {
    stress: stressStatus,
    bridge: bridgeStatus,
    monte: monteStatus,
  };
  const currentSnapshot = buildSnapshot(base, selectedStrategyId);
  const watchouts = buildWatchouts(state, base, household, statuses, thresholds);

  return {
    horizonText: `${state.currentAge} -> ${state.endAge}`,
    headlineCards: buildHeadlineCards(state, base, household),
    incomeComposition: buildIncomeComposition(base),
    watchouts,
    earlyBridge: buildEarlyBridgeSummary(state, base, bridgeResult, bridgeStatus),
    changes: buildChanges(currentSnapshot, compareSnapshot, compareLabel),
    nextSteps: buildNextSteps(statuses, watchouts),
    snapshot: currentSnapshot,
    compareSource: compareSource || 'previous',
    compareScenarioId: compareScenarioId || '',
    compareScenarioOptions,
  };
}
