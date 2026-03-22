export const clamp = (x, min, max) => Math.min(max, Math.max(min, x));

export function realRate(nominalRate, inflationRate) {
  return ((1 + nominalRate) / (1 + inflationRate)) - 1;
}

export function compoundPeriodRate(annualRate, fractionOfYear = 1) {
  const fraction = clamp(Number(fractionOfYear || 1), 0.0001, 1);
  const rate = Math.max(-0.9999, Number(annualRate || 0));
  return Math.pow(1 + rate, fraction) - 1;
}

export function yearFracForAge(state, age) {
  return age === state.currentAge
    ? clamp(Number(state.firstYearMonths || 12) / 12, 0.0001, 1)
    : 1;
}
