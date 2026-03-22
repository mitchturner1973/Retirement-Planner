import { yearFracForAge } from '../core/math.js';

export function dbRealEscRate(state, pension) {
  const inflation = Number(state.inflation || 0) / 100;
  const increaseType = String(pension.increaseType || 'fixed');
  let nominalEscalation = 0;

  if (increaseType === 'cpi') {
    nominalEscalation = inflation;
  } else if (increaseType === 'cpiCap') {
    const cap = (pension.cpiCapPct == null || pension.cpiCapPct === '')
      ? inflation
      : Number(pension.cpiCapPct || 0) / 100;
    nominalEscalation = Math.min(inflation, cap);
  } else if (increaseType === 'none') {
    nominalEscalation = 0;
  } else {
    nominalEscalation = Number(pension.escalationPct || 0) / 100;
  }

  return ((1 + nominalEscalation) / (1 + inflation)) - 1;
}

export function dbIncomeAtAge(state, dbPensions, age) {
  const fraction = yearFracForAge(state, age);
  return (dbPensions || []).reduce((sum, pension) => {
    if (age < pension.startAge) return sum;
    const yearsSinceStart = age - pension.startAge;
    const realEscalation = dbRealEscRate(state, pension);
    let income = pension.annualIncome * Math.pow(1 + realEscalation, Math.max(0, yearsSinceStart));
    if (age === state.currentAge) income *= fraction;
    return sum + income;
  }, 0);
}
