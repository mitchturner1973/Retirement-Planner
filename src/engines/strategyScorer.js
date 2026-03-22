function clampScore(value) {
  return Math.max(0, Math.min(100, value));
}

function normaliseRange(values, invert = false) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return (value) => {
    if (max === min) return 100;
    const scaled = ((value - min) / (max - min)) * 100;
    return clampScore(invert ? 100 - scaled : scaled);
  };
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
    const balancedScore = clampScore((taxScore * 0.35) + (sustainabilityScore * 0.45) + (pot75Norm(result.metrics.potAt75) * 0.2));
    return {
      ...result,
      scores: {
        tax: Math.round(taxScore),
        sustainable: Math.round(sustainabilityScore),
        balanced: Math.round(balancedScore),
      },
    };
  }).sort((a, b) => b.scores.balanced - a.scores.balanced);

  const bestTax = [...ranked].sort((a, b) => b.scores.tax - a.scores.tax)[0] || null;
  const bestSustainable = [...ranked].sort((a, b) => b.scores.sustainable - a.scores.sustainable)[0] || null;
  const bestBalanced = ranked[0] || null;

  return { ranked, bestTax, bestSustainable, bestBalanced };
}
