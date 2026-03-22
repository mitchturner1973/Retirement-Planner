import rules2025_26 from '../rules/uk/2025-26/pensionRules.js';
import rules2026_27 from '../rules/uk/2026-27/pensionRules.js';

const RULES = {
  UK: {
    '2025-26': rules2025_26,
    '2026-27': rules2026_27,
  },
};

export function getRulesPack({ country = 'UK', taxYear = '2025-26' } = {}) {
  const countryRules = RULES[country];
  if (!countryRules) {
    throw new Error(`No rules registered for country: ${country}`);
  }
  const pack = countryRules[taxYear];
  if (!pack) {
    throw new Error(`No rules pack registered for ${country} ${taxYear}`);
  }
  return pack;
}

export function applyRulesDefaults(state = {}) {
  const pack = getRulesPack({ country: state.country || 'UK', taxYear: state.taxYear || '2025-26' });
  return {
    ...state,
    allowance: state.allowance ?? pack.incomeTax.personalAllowance,
    higherThreshold: state.higherThreshold ?? pack.incomeTax.higherRateThreshold,
    basicTax: state.basicTax ?? pack.incomeTax.basicRatePct,
    higherTax: state.higherTax ?? pack.incomeTax.higherRatePct,
    tflsCap: state.tflsCap ?? pack.pensionAllowances.lumpSumAllowance,
    tflsPct: state.tflsPct ?? pack.pensionAllowances.taxFreePortionPctDefault,
  };
}
