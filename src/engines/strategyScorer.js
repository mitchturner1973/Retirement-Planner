function clampScore(value) {
  return Math.max(0, Math.min(100, value));
}

function quantile(sortedValues, q) {
  if (sortedValues.length === 0) return 0;
  const clamped = Math.max(0, Math.min(1, Number(q || 0)));
  const pos = (sortedValues.length - 1) * clamped;
  const base = Math.floor(pos);
  const rest = pos - base;
  const left = sortedValues[base];
  const right = sortedValues[Math.min(base + 1, sortedValues.length - 1)];
  return left + (right - left) * rest;
}

function normaliseRange(values, invert = false, { lowerPct = 0.2, upperPct = 0.8 } = {}) {
  const nums = values.map((value) => Number(value || 0)).sort((a, b) => a - b);
  const min = quantile(nums, lowerPct);
  const max = quantile(nums, upperPct);
  return (value) => {
    const n = Number(value || 0);
    if (max === min) return 100;
    const clipped = Math.max(min, Math.min(max, n));
    const scaled = ((clipped - min) / (max - min)) * 100;
    return clampScore(invert ? 100 - scaled : scaled);
  };
}

function priorityWeights(mode = 'balanced') {
  const key = String(mode || 'balanced');
  if (key === 'minimise-tax') {
    return { taxEfficiency: 0.42, incomeSustainability: 0.2, incomeSmoothness: 0.1, flexibility: 0.12, guaranteedIncomeStrength: 0.08, potEfficiency: 0.08 };
  }
  if (key === 'maximise-stable-income') {
    return { taxEfficiency: 0.1, incomeSustainability: 0.34, incomeSmoothness: 0.28, flexibility: 0.12, guaranteedIncomeStrength: 0.1, potEfficiency: 0.06 };
  }
  if (key === 'preserve-flexibility') {
    return { taxEfficiency: 0.1, incomeSustainability: 0.2, incomeSmoothness: 0.08, flexibility: 0.4, guaranteedIncomeStrength: 0.08, potEfficiency: 0.14 };
  }
  if (key === 'prioritise-guaranteed-income') {
    return { taxEfficiency: 0.08, incomeSustainability: 0.24, incomeSmoothness: 0.14, flexibility: 0.1, guaranteedIncomeStrength: 0.34, potEfficiency: 0.1 };
  }
  return { taxEfficiency: 0.2, incomeSustainability: 0.24, incomeSmoothness: 0.16, flexibility: 0.16, guaranteedIncomeStrength: 0.12, potEfficiency: 0.12 };
}

function deriveTargets(options = {}) {
  const targets = options.targets || {};
  return {
    minimumDesiredNetIncome: Math.max(0, Number(targets.minimumDesiredNetIncome ?? 18000)),
    targetRetirementNetIncome: Math.max(0, Number(targets.targetRetirementNetIncome ?? 25000)),
    minimumFlexibilityBufferAt75: Math.max(0, Number(targets.minimumFlexibilityBufferAt75 ?? 150000)),
  };
}

function deriveRawFactors(result, targets) {
  const retirementYears = (result.years || []).filter((row) => Number(row.age) >= Number(result.state?.retireAge || 0));
  const yearsBelowMinimumDesired = retirementYears.filter((row) => Number(row.recurringNetIncome || 0) < targets.minimumDesiredNetIncome).length;
  const retirementIncomeGap = Math.max(0, targets.targetRetirementNetIncome - Number(result.metrics?.netAtRet || 0));
  const flexibilityBufferGap = Math.max(0, targets.minimumFlexibilityBufferAt75 - Number(result.metrics?.potAt75 || 0));
  const guaranteedCoverageRatio = retirementYears.length > 0
    ? Number(result.metrics?.guaranteedFloorCoverageYears || 0) / retirementYears.length
    : 0;

  return {
    totalTax: Number(result.metrics?.totalTax || 0),
    higherRateYears: Number(result.metrics?.higherRateYears || 0),
    wastedAllowanceYears: Number(result.metrics?.wastedAllowanceYears || 0),
    taxSpikeAtStateOrDbStart: Number(result.metrics?.taxSpikeAtStateOrDbStart || 0),
    lowestIncomeAfterRet: Number(result.metrics?.lowestIncomeAfterRet || 0),
    yearsBelowMinimumDesired,
    retirementIncomeGap,
    potAt75: Number(result.metrics?.potAt75 || 0),
    potAtEnd: Number(result.metrics?.potAtEnd || 0),
    dcRelianceLaterLife: Number(result.metrics?.dcRelianceLaterLife || 0),
    incomeVolatility: Number(result.metrics?.incomeVolatility || 0),
    maxIncomeDropPct: Number(result.metrics?.maxIncomeDropPct || 0),
    cliffEdgeCount: Number(result.metrics?.cliffEdgeCount || 0),
    potAtRet: Number(result.summary?.potAtRet || 0),
    remainingLsaAtRet: Number(result.metrics?.remainingLsaAtRet || 0),
    lsaUsedByRet: Number(result.metrics?.lsaUsedByRet || 0),
    maxWithdrawalShare: Number(result.metrics?.maxWithdrawalShare || 0),
    guaranteedIncomeRatioAtRet: Number(result.metrics?.guaranteedIncomeRatioAtRet || 0),
    guaranteedCoverageRatio,
    totalFees: Number(result.metrics?.totalFees || 0),
    oneOffLumpSpikeAtRet: Number(result.metrics?.oneOffLumpSpikeAtRet || 0),
    flexibilityBufferGap,
  };
}

function addWatchout(watchouts, id, severity, title, detail, value, penalty) {
  watchouts.push({ id, severity, title, detail, value: Number(value || 0), penalty: Number(penalty || 0) });
}

function toPctWeight(weight) {
  return Math.round(Number(weight || 0) * 100);
}

function buildWatchouts(result, factors, targets) {
  const watchouts = [];

  if (factors.maxIncomeDropPct >= 0.2 || factors.cliffEdgeCount >= 2) {
    addWatchout(watchouts, 'income-cliff', factors.maxIncomeDropPct >= 0.3 ? 'high' : 'medium', 'Large income cliff edge risk', 'Material income drops appear between adjacent retirement years.', factors.maxIncomeDropPct, factors.maxIncomeDropPct >= 0.3 ? 14 : 8);
  }

  if (factors.potAt75 < targets.minimumFlexibilityBufferAt75) {
    addWatchout(watchouts, 'low-later-life-pot', factors.potAt75 < (targets.minimumFlexibilityBufferAt75 * 0.7) ? 'high' : 'medium', 'Low later-life flexibility buffer', `Projected pot at 75 is below the flexibility target of ${targets.minimumFlexibilityBufferAt75.toLocaleString()}.`, factors.potAt75, factors.potAt75 < (targets.minimumFlexibilityBufferAt75 * 0.7) ? 16 : 10);
  }

  if (factors.maxWithdrawalShare >= 0.75) {
    addWatchout(watchouts, 'single-pot-dependency', factors.maxWithdrawalShare >= 0.9 ? 'high' : 'medium', 'Excessive dependency on one DC pot', 'Most retirement drawdown is concentrated in a single pot, reducing diversification of withdrawal risk.', factors.maxWithdrawalShare, factors.maxWithdrawalShare >= 0.9 ? 12 : 7);
  }

  const lsaCap = Number(result.state?.tflsCap || 0);
  if (lsaCap > 0 && factors.remainingLsaAtRet < (lsaCap * 0.2) && factors.oneOffLumpSpikeAtRet > 0) {
    addWatchout(watchouts, 'early-lsa-use', factors.remainingLsaAtRet < (lsaCap * 0.1) ? 'high' : 'medium', 'LSA mostly used early', 'A large portion of lump sum allowance is consumed by retirement, which may limit later optionality.', factors.remainingLsaAtRet, factors.remainingLsaAtRet < (lsaCap * 0.1) ? 10 : 6);
  }

  const retIncome = Math.max(1, Number(result.metrics?.netAtRet || 0));
  if (factors.oneOffLumpSpikeAtRet > retIncome * 0.4) {
    addWatchout(watchouts, 'one-off-spike', 'medium', 'Headline income supported by one-off lump sums', 'Retirement-year cash is materially boosted by one-off lump sums rather than recurring income.', factors.oneOffLumpSpikeAtRet, 7);
  }

  if (factors.yearsBelowMinimumDesired > 0) {
    addWatchout(watchouts, 'below-minimum-income', factors.yearsBelowMinimumDesired >= 5 ? 'high' : 'medium', 'Income falls below minimum desired level', `${factors.yearsBelowMinimumDesired} retirement year(s) are below the configured minimum desired net income.`, factors.yearsBelowMinimumDesired, factors.yearsBelowMinimumDesired >= 5 ? 12 : 6);
  }

  const totalPenalty = watchouts.reduce((sum, watchout) => sum + Number(watchout.penalty || 0), 0);
  return { watchouts, totalPenalty };
}

export function scoreStrategies(results, options = {}) {
  if (!results || results.length === 0) {
    return { ranked: [], bestTax: null, bestSustainable: null, bestBalanced: null };
  }

  const priorityMode = String(options.priorityMode || 'balanced');
  const targets = deriveTargets(options);
  const weights = priorityWeights(priorityMode);

  const factorsByResult = results.map((result) => ({ result, factors: deriveRawFactors(result, targets) }));

  const taxCostNorm = normaliseRange(factorsByResult.map((item) => item.factors.totalTax), true);
  const higherRateNorm = normaliseRange(factorsByResult.map((item) => item.factors.higherRateYears), true);
  const wastedAllowanceNorm = normaliseRange(factorsByResult.map((item) => item.factors.wastedAllowanceYears), true);
  const taxSpikeNorm = normaliseRange(factorsByResult.map((item) => item.factors.taxSpikeAtStateOrDbStart), true);

  const lowIncomeNorm = normaliseRange(factorsByResult.map((item) => item.factors.lowestIncomeAfterRet));
  const belowMinYearsNorm = normaliseRange(factorsByResult.map((item) => item.factors.yearsBelowMinimumDesired), true);
  const targetRetGapNorm = normaliseRange(factorsByResult.map((item) => item.factors.retirementIncomeGap), true);
  const pot75Norm = normaliseRange(factorsByResult.map((item) => item.factors.potAt75));
  const potEndNorm = normaliseRange(factorsByResult.map((item) => item.factors.potAtEnd));
  const dcRelianceNorm = normaliseRange(factorsByResult.map((item) => item.factors.dcRelianceLaterLife), true);

  const volatilityNorm = normaliseRange(factorsByResult.map((item) => item.factors.incomeVolatility), true);
  const dropNorm = normaliseRange(factorsByResult.map((item) => item.factors.maxIncomeDropPct), true);
  const cliffNorm = normaliseRange(factorsByResult.map((item) => item.factors.cliffEdgeCount), true);

  const potRetNorm = normaliseRange(factorsByResult.map((item) => item.factors.potAtRet));
  const lsaRemainNorm = normaliseRange(factorsByResult.map((item) => item.factors.remainingLsaAtRet));
  const lsaUsedNorm = normaliseRange(factorsByResult.map((item) => item.factors.lsaUsedByRet), true);
  const flexGapNorm = normaliseRange(factorsByResult.map((item) => item.factors.flexibilityBufferGap), true);

  const guaranteedRatioNorm = normaliseRange(factorsByResult.map((item) => item.factors.guaranteedIncomeRatioAtRet));
  const guaranteedCoverageNorm = normaliseRange(factorsByResult.map((item) => item.factors.guaranteedCoverageRatio));

  const withdrawalConcentrationNorm = normaliseRange(factorsByResult.map((item) => item.factors.maxWithdrawalShare), true);
  const feesNorm = normaliseRange(factorsByResult.map((item) => item.factors.totalFees), true);

  const ranked = factorsByResult.map(({ result, factors }) => {
    const taxEfficiency = clampScore((taxCostNorm(factors.totalTax) * 0.5) + (higherRateNorm(factors.higherRateYears) * 0.2) + (wastedAllowanceNorm(factors.wastedAllowanceYears) * 0.15) + (taxSpikeNorm(factors.taxSpikeAtStateOrDbStart) * 0.15));

    const incomeSustainability = clampScore((lowIncomeNorm(factors.lowestIncomeAfterRet) * 0.28) + (belowMinYearsNorm(factors.yearsBelowMinimumDesired) * 0.2) + (targetRetGapNorm(factors.retirementIncomeGap) * 0.2) + (pot75Norm(factors.potAt75) * 0.16) + (potEndNorm(factors.potAtEnd) * 0.08) + (dcRelianceNorm(factors.dcRelianceLaterLife) * 0.08));

    const incomeSmoothness = clampScore((volatilityNorm(factors.incomeVolatility) * 0.4) + (dropNorm(factors.maxIncomeDropPct) * 0.4) + (cliffNorm(factors.cliffEdgeCount) * 0.2));

    const flexibility = clampScore((potRetNorm(factors.potAtRet) * 0.28) + (pot75Norm(factors.potAt75) * 0.28) + (lsaRemainNorm(factors.remainingLsaAtRet) * 0.2) + (lsaUsedNorm(factors.lsaUsedByRet) * 0.12) + (flexGapNorm(factors.flexibilityBufferGap) * 0.12));

    const guaranteedIncomeStrength = clampScore((guaranteedRatioNorm(factors.guaranteedIncomeRatioAtRet) * 0.6) + (guaranteedCoverageNorm(factors.guaranteedCoverageRatio) * 0.4));

    const potEfficiency = clampScore((feesNorm(factors.totalFees) * 0.45) + (withdrawalConcentrationNorm(factors.maxWithdrawalShare) * 0.35) + (potEndNorm(factors.potAtEnd) * 0.2));

    const { watchouts, totalPenalty } = buildWatchouts(result, factors, targets);

    const weightedContribution = {
      taxEfficiency: taxEfficiency * weights.taxEfficiency,
      incomeSustainability: incomeSustainability * weights.incomeSustainability,
      incomeSmoothness: incomeSmoothness * weights.incomeSmoothness,
      flexibility: flexibility * weights.flexibility,
      guaranteedIncomeStrength: guaranteedIncomeStrength * weights.guaranteedIncomeStrength,
      potEfficiency: potEfficiency * weights.potEfficiency,
    };

    const topDrivers = Object.entries(weightedContribution)
      .map(([dimension, points]) => ({
        dimension,
        points: Number(points || 0),
        weightPct: toPctWeight(weights[dimension]),
      }))
      .sort((a, b) => b.points - a.points);

    const penaltyBreakdown = watchouts
      .map((watchout) => ({ id: watchout.id, title: watchout.title, severity: watchout.severity, penalty: Number(watchout.penalty || 0) }))
      .sort((a, b) => b.penalty - a.penalty);

    const blended =
      (taxEfficiency * weights.taxEfficiency)
      + (incomeSustainability * weights.incomeSustainability)
      + (incomeSmoothness * weights.incomeSmoothness)
      + (flexibility * weights.flexibility)
      + (guaranteedIncomeStrength * weights.guaranteedIncomeStrength)
      + (potEfficiency * weights.potEfficiency);

    const balancedScore = clampScore(blended - totalPenalty);
    const sustainableScore = clampScore((incomeSustainability * 0.7) + (incomeSmoothness * 0.3));

    return {
      ...result,
      priorityMode,
      targets,
      penalties: { total: Math.round(totalPenalty) },
      watchouts,
      rankingExplanation: {
        mode: priorityMode,
        weights: {
          taxEfficiency: toPctWeight(weights.taxEfficiency),
          incomeSustainability: toPctWeight(weights.incomeSustainability),
          incomeSmoothness: toPctWeight(weights.incomeSmoothness),
          flexibility: toPctWeight(weights.flexibility),
          guaranteedIncomeStrength: toPctWeight(weights.guaranteedIncomeStrength),
          potEfficiency: toPctWeight(weights.potEfficiency),
        },
        topDrivers,
        penaltyBreakdown,
      },
      dimensionScores: {
        taxEfficiency: Math.round(taxEfficiency),
        incomeSustainability: Math.round(incomeSustainability),
        incomeSmoothness: Math.round(incomeSmoothness),
        flexibility: Math.round(flexibility),
        guaranteedIncomeStrength: Math.round(guaranteedIncomeStrength),
        potEfficiency: Math.round(potEfficiency),
      },
      scores: {
        tax: Math.round(taxEfficiency),
        sustainable: Math.round(sustainableScore),
        balanced: Math.round(balancedScore),
      },
    };
  }).sort((a, b) => {
    if (b.scores.balanced !== a.scores.balanced) return b.scores.balanced - a.scores.balanced;
    if (b.scores.sustainable !== a.scores.sustainable) return b.scores.sustainable - a.scores.sustainable;
    if (b.scores.tax !== a.scores.tax) return b.scores.tax - a.scores.tax;
    return String(a.strategy?.name || '').localeCompare(String(b.strategy?.name || ''));
  });

  const bestTax = [...ranked].sort((a, b) => b.scores.tax - a.scores.tax)[0] || null;
  const bestSustainable = [...ranked].sort((a, b) => b.scores.sustainable - a.scores.sustainable)[0] || null;
  const bestBalanced = ranked[0] || null;

  return { ranked, bestTax, bestSustainable, bestBalanced, priorityMode, targets };
}
