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

function objectiveWeights(objective = 'balanced') {
  const key = String(objective || 'balanced');
  if (key === 'tax') {
    return { tax: 0.5, sustainable: 0.3, pot: 0.2 };
  }
  if (key === 'pot') {
    return { tax: 0.2, sustainable: 0.35, pot: 0.45 };
  }
  return { tax: 0.35, sustainable: 0.45, pot: 0.2 };
}

export function scoreStrategies(results) {
  if (!results || results.length === 0) {
    return { ranked: [], bestTax: null, bestSustainable: null, bestBalanced: null };
  }

  const taxNorm = normaliseRange(results.map((r) => r.metrics.totalTax), true);
  const retIncomeNorm = normaliseRange(results.map((r) => r.metrics.netAtRet));
  const lowIncomeNorm = normaliseRange(results.map((r) => r.metrics.lowestIncomeAfterRet));
  const pot75Norm = normaliseRange(results.map((r) => r.metrics.potAt75));
  const potEndNorm = normaliseRange(results.map((r) => r.metrics.potAtEnd));
  const lsaNorm = normaliseRange(results.map((r) => r.metrics.remainingLsaAtRet));

  const ranked = results.map((result) => {
    const taxScore = clampScore((taxNorm(result.metrics.totalTax) * 0.55) + (lsaNorm(result.metrics.remainingLsaAtRet) * 0.2) + (lowIncomeNorm(result.metrics.lowestIncomeAfterRet) * 0.25));
    const sustainabilityScore = clampScore((retIncomeNorm(result.metrics.netAtRet) * 0.35) + (lowIncomeNorm(result.metrics.lowestIncomeAfterRet) * 0.35) + (pot75Norm(result.metrics.potAt75) * 0.2) + (potEndNorm(result.metrics.potAtEnd) * 0.1));
    const weights = objectiveWeights(result.strategy?.objective);
    const balancedScore = clampScore((taxScore * weights.tax) + (sustainabilityScore * weights.sustainable) + (pot75Norm(result.metrics.potAt75) * weights.pot));
    return {
      ...result,
      scores: {
        tax: Math.round(taxScore),
        sustainable: Math.round(sustainabilityScore),
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

  return { ranked, bestTax, bestSustainable, bestBalanced };
}
