const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const sumBy = (list, getter) => list.reduce((sum, item) => sum + Number(getter(item) || 0), 0);

function formatStatusTone(level) {
  if (level === 'best') return 'good';
  if (level === 'worth' || level === 'info') return 'info';
  if (level === 'warn' || level === 'caution') return 'warn';
  if (level === 'bad') return 'bad';
  return 'info';
}

function buildSummaryCards(context) {
  const {
    strategyName,
    strategySummary,
    taxEfficiencyScore,
    mpaaRisk,
    mpaaDetail,
    taxFreeTiming,
    taxFreeDetail,
    pressurePoint,
    keyRecommendation,
  } = context;

  return [
    {
      title: 'Estimated best-fit strategy',
      value: strategyName,
      detail: strategySummary,
      tone: 'info',
    },
    {
      title: 'Tax efficiency rating',
      value: `${taxEfficiencyScore}/100`,
      detail: 'Lower higher-rate exposure and smoother allowance usage improves this score.',
      tone: taxEfficiencyScore >= 80 ? 'good' : taxEfficiencyScore >= 60 ? 'info' : 'warn',
    },
    {
      title: 'MPAA risk status',
      value: mpaaRisk,
      detail: mpaaDetail,
      tone: mpaaRisk === 'High' ? 'bad' : mpaaRisk === 'Medium' ? 'warn' : 'info',
    },
    {
      title: 'Use of tax-free cash',
      value: taxFreeTiming,
      detail: taxFreeDetail,
      tone: 'info',
    },
    {
      title: 'Main tax pressure point',
      value: pressurePoint.title,
      detail: pressurePoint.detail,
      tone: pressurePoint.tone,
    },
    {
      title: 'Key recommendation',
      value: keyRecommendation.title,
      detail: keyRecommendation.detail,
      tone: keyRecommendation.tone,
    },
  ];
}

function buildWithdrawalOrder(model) {
  const order = [];
  const add = (item) => order.push(item);

  add({
    label: 'Guaranteed income first',
    source: 'State Pension & DB income',
    reason: `Provides about £${model.guaranteedIncome.toFixed(0)} a year of predictable income, automatically filling the personal allowance first.`,
    taxTreatment: 'Taxable pension income using allowance and basic-rate band.',
    flexibility: 'Low – once in payment it cannot be paused.',
    tradeOff: 'Limits scope to dial income down later but keeps income stable.',
    tone: 'info',
  });

  if (model.bridgeCapacity > 0) {
    add({
      label: 'Bridge from ISA / cash reserves',
      source: 'ISA, cash or taxable savings',
      reason: `Around £${model.bridgeCapacity.toFixed(0)} per year earmarked as a bridge can cover early spending without triggering taxable DC drawdown.`,
      taxTreatment: 'Tax-free withdrawals preserve pension tax bands.',
      flexibility: 'High – bridge assets can be tapered or paused.',
      tradeOff: 'Runs down liquid reserves faster; needs replenishment before later shocks.',
      tone: 'good',
    });
  }

  if (model.taxFreeCapacity > 0) {
    add({
      label: 'Use tax-free cash (PCLS/TFLS)',
      source: 'DC tax-free allowance',
      reason: `Roughly £${model.taxFreeCapacity.toFixed(0)} of tax-free allowance is still available.`,
      taxTreatment: '25% tax-free within the Lump Sum Allowance.',
      flexibility: 'Medium – upfront PCLS reduces later income; phased TFLS keeps options open.',
      tradeOff: 'Large PCLS may reduce future growth and can crystallise MPAA if followed by UFPLS.',
      tone: 'info',
    });
  }

  add({
    label: 'DC drawdown up to personal allowance/basic-rate band',
    source: 'Flexible DC drawdown',
    reason: `Keeping taxable DC withdrawals near £${model.allowanceTarget.toFixed(0)} avoids higher-rate tax for most of retirement.`,
    taxTreatment: 'Taxed as pension income but can sit fully in the personal allowance/basic-rate band.',
    flexibility: 'High – dial withdrawals each year.',
    tradeOff: 'Requires regular adjustments and awareness of other income sources.',
    tone: 'good',
  });

  add({
    label: 'Higher-rate drawdown only when required',
    source: 'Additional DC or taxable accounts',
    reason: model.higherRateRisk > 0
      ? `About £${model.higherRateRisk.toFixed(0)} a year currently leaks into higher-rate tax.`
      : 'No higher-rate exposure detected yet — keep monitoring when State Pension and DB start.',
    taxTreatment: 'Subject to 40% tax if above higher-rate threshold.',
    flexibility: 'Medium – can postpone large one-offs or phase UFPLS to stay below threshold.',
    tradeOff: 'Accepting higher-rate withdrawals reduces long-term efficiency.',
    tone: model.higherRateRisk > 0 ? 'warn' : 'info',
  });

  return order;
}

function buildComparisonCards(model) {
  const cards = [
    {
      id: 'pcls-drawdown',
      title: 'PCLS + drawdown',
      description: 'Take a targeted PCLS at retirement, then run flexible taxable drawdown.',
      pros: ['Front-loads cash for goals', 'Keeps taxable income lower afterwards'],
      risks: ['Less capital left invested', 'Large PCLS can overshoot the income gap'],
      taxImpact: 'Tax-free lump sum now, lower taxable income later.',
      flexibility: 'Medium',
      mpaa: 'No if only PCLS taken; drawdown still counts as flexible access.',
      status: model.pclsNow ? 'best' : model.taxFreeCapacity > 0 ? 'worth' : 'info',
    },
    {
      id: 'ufpls',
      title: 'UFPLS pulses',
      description: 'Take UFPLS slices where each withdrawal is 25% tax-free and 75% taxable.',
      pros: ['Simple to model', 'Keeps pot uncrystallised until used'],
      risks: ['Each payment mixes taxable income in the same year', 'Triggers MPAA immediately'],
      taxImpact: 'Tax-free + taxable in one hit, harder to stay below thresholds.',
      flexibility: 'High',
      mpaa: 'High likelihood',
      status: model.ufplsTotal > 0 ? 'warn' : 'caution',
    },
    {
      id: 'defer-tf',
      title: 'No tax-free cash yet',
      description: 'Leave all TFLS unused so it can support later life or partner needs.',
      pros: ['Keeps Lump Sum Allowance intact', 'Supports future reshaping'],
      risks: ['Loses inflation-adjusted value if unused', 'No cash boost for near-term goals'],
      taxImpact: 'None now; future withdrawals still available.',
      flexibility: 'High',
      mpaa: 'None until flexible withdrawals start',
      status: model.taxFreeCapacity > 1000 && !model.pclsNow && model.ufplsTotal === 0 ? 'good' : 'info',
    },
    {
      id: 'isa-bridge',
      title: 'ISA / cash bridge first',
      description: 'Spend ISA or cash savings to cover early retirement years.',
      pros: ['Zero tax drag', 'Buys time before triggering MPAA'],
      risks: ['Depletes emergency funds sooner', 'Needs discipline to stop at State Pension start'],
      taxImpact: 'None – keeps allowances for later.',
      flexibility: 'High',
      mpaa: 'None',
      status: model.bridgeCapacity > 0 ? 'best' : 'worth',
    },
    {
      id: 'tax-band-aware',
      title: 'Tax-band aware drawdown',
      description: 'Dynamic drawdown that fills the personal allowance/basic band each year.',
      pros: ['Minimises lifetime tax', 'Smooths income'],
      risks: ['Needs annual review', 'Complex when DB/State Pension start'],
      taxImpact: 'Keeps marginal rate to 20% or lower.',
      flexibility: 'Medium',
      mpaa: 'Medium once flexible access begins',
      status: model.higherRateYears > 0 ? 'best' : 'good',
    },
    {
      id: 'early-bridge',
      title: 'Early retirement bridge approach',
      description: 'Use bridge inputs before State Pension, then switch to taxable drawdown.',
      pros: ['Avoids higher-rate spikes', 'Aligns with target spend'],
      risks: ['Bridge must be large enough', 'DC pot untouched until later'],
      taxImpact: 'Keeps taxable income low before State Pension.',
      flexibility: 'Medium',
      mpaa: 'Low as long as only TFLS used before bridge ends',
      status: model.bridgeCapacity > 0 && model.earlyGap ? 'good' : 'info',
    },
  ];

  return cards.map((card) => ({
    ...card,
    tone: formatStatusTone(card.status),
  }));
}

function buildFindings(model) {
  const findings = [];
  if (model.guaranteedIncome >= model.personalAllowance) {
    findings.push('State Pension and DB income already consume most of the personal allowance. DC drawdown will be taxed immediately unless offset with tax-free cash.');
  }
  if (model.higherRateYears > 0) {
    findings.push('Higher-rate tax appears in parts of retirement, mainly once guaranteed income stacks with DC drawdown.');
  }
  if (model.bridgeCapacity > 0) {
    findings.push('Using the configured bridge (ISA/cash) could keep taxable income below higher-rate bands before State Pension starts.');
  }
  if (model.ufplsTotal > 0) {
    findings.push('UFPLS withdrawals mix taxable and tax-free cash, so each payment needs monitoring to avoid MPAA issues.');
  }
  if (model.taxFreeCapacity > 50000 && !model.pclsNow) {
    findings.push('A large Lump Sum Allowance remains unused, so there is no rush to take the full PCLS immediately.');
  }
  if (model.taxFreeCapacity < 10000 && model.pclsNow) {
    findings.push('Little Lump Sum Allowance remains after the current strategy, meaning future tax-free reshaping options are limited.');
  }
  if (findings.length === 0) {
    findings.push('Current plan uses allowances efficiently. Keep monitoring when DB or State Pension phases boost taxable income.');
  }
  return findings;
}

function buildPclsVsUfplsSummary(model) {
  return {
    pcls: {
      title: 'PCLS (tax-free cash)',
      bullets: [
        'Up to 25% of crystallised DC pot is tax-free within the Lump Sum Allowance.',
        'You control the timing and can take it in stages linked to each crystallisation.',
        model.pclsNow
          ? 'Plan already unlocks PCLS around retirement, lowering future taxable drawdown.'
          : 'No large PCLS scheduled yet, so allowance can be used later if needed.',
      ],
    },
    ufpls: {
      title: 'UFPLS (Uncrystallised Funds Pension Lump Sum)',
      bullets: [
        'Each UFPLS payment is 25% tax-free and 75% taxed as pension income.',
        'Automatically triggers MPAA once the first payment is taken.',
        model.ufplsTotal > 0
          ? 'Plan currently relies on UFPLS, so MPAA is likely already in force.'
          : 'UFPLS is not used right now, so MPAA can still be avoided.',
      ],
    },
    highlight: model.ufplsTotal > 0
      ? 'Consider switching UFPLS events to phased PCLS + drawdown to keep taxable income controllable.'
      : 'Phased PCLS plus taxable drawdown keeps income controllable while avoiding UFPLS-driven MPAA.',
    mpaaNote: 'MPAA usually triggers when you take UFPLS or taxable flexible drawdown. Keeping withdrawals to PCLS-only until contributions stop helps avoid it.',
  };
}

function buildTaxBandUsage(model) {
  const basicBandLimit = Math.max(0, Number(model.higherThreshold) - model.personalAllowance);
  const allowanceFill = Math.min(model.personalAllowance, model.grossTaxableIncome);
  const basicFill = clamp(model.basicBandUsed, 0, basicBandLimit);
  const higherFill = Math.max(0, model.grossTaxableIncome - allowanceFill - basicFill);
  return {
    allowanceFill,
    basicFill,
    higherFill,
    personalAllowance: model.personalAllowance,
    basicBandLimit,
    total: allowanceFill + basicFill + higherFill,
    guaranteedIncome: model.guaranteedIncome,
    dcTaxable: model.dcTaxable,
    taxFreeCashAtRet: model.pclsFirstYear,
  };
}

function buildRecommendedActions(model) {
  const actions = [];
  if (model.higherRateYears > 0 || model.higherRateRisk > 0) {
    actions.push({
      title: 'Cap DC withdrawals before basic-rate threshold',
      detail: 'Model scenarios where taxable DC drawdown stops at the personal allowance/basic-rate ceiling, using ISA or tax-free cash to cover any remaining gap.',
      tone: 'warn',
    });
  }
  if (model.taxFreeCapacity > 30000 && !model.pclsNow) {
    actions.push({
      title: 'Test phased PCLS rather than one-off UFPLS',
      detail: 'Phasing PCLS keeps flexibility and delays MPAA, whereas UFPLS mixes taxable income into every withdrawal.',
      tone: 'info',
    });
  }
  if (model.bridgeCapacity > 0) {
    actions.push({
      title: 'Use ISA / cash bridge before taxable drawdown',
      detail: 'Spending bridge assets first keeps taxable income lower until State Pension and DB start.',
      tone: 'good',
    });
  }
  if (model.mpaaRiskLevel === 'High') {
    actions.push({
      title: 'Avoid flexible withdrawals while still contributing',
      detail: 'Switch to PCLS-only or wait until contributions cease to prevent a permanent MPAA reduction.',
      tone: 'bad',
    });
  }
  if (actions.length === 0) {
    actions.push({
      title: 'Continue annual tax-efficiency review',
      detail: 'Re-run the plan whenever DB or State Pension amounts change to ensure drawdown stays tax aware.',
      tone: 'info',
    });
  }
  return actions;
}

export function buildTaxOptimisationAnalysis({ state, selectedResult }) {
  if (!selectedResult || !Array.isArray(selectedResult.years)) return null;

  const years = selectedResult.years;
  const retireAge = Number(selectedResult.state?.retireAge || state.retireAge || state.stateAge || 67);
  const retirementYears = years.filter((row) => Number(row.age) >= retireAge);
  if (retirementYears.length === 0) return null;
  const firstRetYear = retirementYears[0];

  const guaranteedIncome = Number(firstRetYear.guaranteedIncome || 0);
  const statePension = Number(firstRetYear.statePension || 0);
  const dbIncome = Number(firstRetYear.dbIncome || 0);
  const dcTaxable = Number(firstRetYear.drawdownGross || 0);
  const grossTaxableIncome = Number(firstRetYear.grossTaxableIncome || 0);
  const basicBandUsed = Number(firstRetYear.basicBand || 0);
  const higherBandUsed = Number(firstRetYear.higherBand || 0);
  const personalAllowance = Math.max(0, Number(state.allowance || selectedResult.state?.allowance || 12570));
  const higherThreshold = Number(state.higherThreshold || selectedResult.state?.higherThreshold || 50270);
  const bridgeCapacity = Number(state.bridgeAmount || 0);
  const earlyGap = Number(state.earlyAge || 0) && Number(state.stateAge || 0) && Number(state.earlyAge || 0) < Number(state.stateAge || 0);
  const pclsTotal = sumBy(retirementYears, (row) => row.pclsGross);
  const ufplsTotal = sumBy(retirementYears, (row) => row.ufplsGross);
  const pclsFirstYear = Number(firstRetYear.pclsGross || 0);
  const taxFreeCapacity = Math.max(0, Number(selectedResult.metrics?.remainingLsaAtRet || 0));
  const higherRateYears = Number(selectedResult.metrics?.higherRateYears || 0);
  const higherRateShare = retirementYears.length ? higherRateYears / retirementYears.length : 0;
  const taxSpike = Number(selectedResult.metrics?.taxSpikeAtStateOrDbStart || 0);
  const mpaaTriggeredByUfpls = ufplsTotal > 0;
  const contributionsWhileWorking = Number(state.empPct || 0) + Number(state.erPct || 0);
  const mpaaRiskLevel = mpaaTriggeredByUfpls ? 'High' : contributionsWhileWorking > 0 ? 'Medium' : 'Low';
  const mpaaDetail = mpaaRiskLevel === 'High'
    ? 'UFPLS or taxable flexible access usually triggers MPAA immediately.'
    : mpaaRiskLevel === 'Medium'
      ? 'Flexible drawdown later could trigger MPAA once you start, so finish contributions first.'
      : 'No flexible withdrawals yet, so MPAA should remain untouched.';

  const taxEfficiencyScore = clamp(Math.round(90 - higherRateShare * 35 - Math.min(15, taxSpike / 800) - (mpaaTriggeredByUfpls ? 5 : 0)), 40, 95);

  const taxFreeTiming = pclsFirstYear > 0
    ? 'Using PCLS now'
    : ufplsTotal > 0
      ? 'UFPLS pulses'
      : taxFreeCapacity > 0
        ? 'Deferred tax-free cash'
        : 'No tax-free cash planned';
  const taxFreeDetail = pclsFirstYear > 0
    ? `About £${pclsFirstYear.toFixed(0)} of PCLS is released near retirement.`
    : ufplsTotal > 0
      ? 'UFPLS mixes tax-free and taxable elements every time.'
      : taxFreeCapacity > 0
        ? 'Lump Sum Allowance remains unused for future reshaping.'
        : 'All tax-free cash appears to be consumed already.';

  const pressurePoint = higherBandUsed > 0 || higherRateYears > 0
    ? { title: 'Higher-rate exposure', detail: 'Guaranteed income plus DC drawdown is already breaking into the higher-rate band.', tone: 'warn' }
    : grossTaxableIncome >= personalAllowance
      ? { title: 'Allowance fully used', detail: 'Personal allowance is already filled by guaranteed income.', tone: 'info' }
      : { title: 'Unused allowance', detail: 'Some personal allowance remains before DC drawdown is taxed.', tone: 'good' };

  const keyRecommendation = bridgeCapacity > 0 && (higherBandUsed > 0 || higherRateYears > 0)
    ? { title: 'Lean on bridge assets first', detail: 'Cover early spending from ISA/cash so DC drawdown can stay below higher-rate tax.', tone: 'warn' }
    : taxFreeCapacity > 30000
      ? { title: 'Phase tax-free cash', detail: 'Release tax-free cash gradually to avoid large one-off crystallisations.', tone: 'info' }
      : { title: 'Monitor guaranteed income stacking', detail: 'Revisit withdrawal order when State Pension and DB start to keep tax efficient.', tone: 'info' };

  const allowanceTarget = personalAllowance + Math.max(0, Math.min(basicBandUsed, higherThreshold - personalAllowance));
  const higherRateRisk = Math.max(0, grossTaxableIncome - (personalAllowance + Math.max(0, higherThreshold - personalAllowance)));

  const context = {
    guaranteedIncome,
    bridgeCapacity,
    taxFreeCapacity,
    allowanceTarget,
    higherRateRisk,
    higherRateYears,
    higherThreshold,
    personalAllowance,
    grossTaxableIncome,
    basicBandUsed,
    dcTaxable,
    pclsFirstYear,
    earlyGap,
    ufplsTotal,
    pclsNow: pclsFirstYear > 0,
    mpaaRiskLevel,
  };

  const summaryCards = buildSummaryCards({
    strategyName: selectedResult.strategy?.name || 'No selected strategy',
    strategySummary: selectedResult.strategy?.summary || 'Select a strategy to populate this tab.',
    taxEfficiencyScore,
    mpaaRisk: mpaaRiskLevel,
    mpaaDetail,
    taxFreeTiming,
    taxFreeDetail,
    pressurePoint,
    keyRecommendation,
  });

  const withdrawalOrder = buildWithdrawalOrder({
    guaranteedIncome,
    bridgeCapacity,
    taxFreeCapacity,
    allowanceTarget,
    higherRateRisk,
  });

  const comparisonCards = buildComparisonCards({
    pclsNow: context.pclsNow,
    taxFreeCapacity,
    ufplsTotal,
    bridgeCapacity,
    earlyGap,
    higherRateYears,
  });

  const findings = buildFindings({
    guaranteedIncome,
    personalAllowance,
    higherRateYears,
    bridgeCapacity,
    ufplsTotal,
    taxFreeCapacity,
    pclsNow: context.pclsNow,
  });

  const pclsVsUfpls = buildPclsVsUfplsSummary({
    pclsNow: context.pclsNow,
    ufplsTotal,
  });

  const taxBandUsage = buildTaxBandUsage({
    personalAllowance,
    higherThreshold,
    grossTaxableIncome,
    basicBandUsed,
    guaranteedIncome,
    dcTaxable,
    pclsFirstYear,
  });

  const recommendedActions = buildRecommendedActions({
    higherRateYears,
    higherRateRisk,
    taxFreeCapacity,
    pclsNow: context.pclsNow,
    bridgeCapacity,
    mpaaRiskLevel,
  });

  return {
    summaryCards,
    withdrawalOrder,
    comparisonCards,
    findings,
    pclsVsUfpls,
    taxBandUsage,
    recommendedActions,
  };
}
