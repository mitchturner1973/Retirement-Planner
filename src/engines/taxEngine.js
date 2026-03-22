import { applyRulesDefaults } from '../services/rulesRegistry.js';

function normaliseTaxState(state) {
  return applyRulesDefaults(state);
}

export function taxAndNetFromGrossPension(inputState, grossPension, stateIncome, otherIncome, tflsUsed) {
  const state = normaliseTaxState(inputState);
  let taxFreeThisWithdrawal = grossPension * (state.tflsPct / 100);
  const remaining = Math.max(0, state.tflsCap - tflsUsed);
  if (taxFreeThisWithdrawal > remaining) taxFreeThisWithdrawal = remaining;

  const taxablePension = grossPension - taxFreeThisWithdrawal;
  const taxableTotal = Math.max(0, taxablePension + stateIncome + otherIncome - state.allowance);
  const higherBand = Math.max(0, taxableTotal - state.higherThreshold);
  const basicBand = taxableTotal - higherBand;
  const tax = basicBand * (state.basicTax / 100) + higherBand * (state.higherTax / 100);
  const net = (grossPension + stateIncome + otherIncome) - tax;

  return {
    net,
    tax,
    tflsThis: taxFreeThisWithdrawal,
    tflsUsedNew: tflsUsed + taxFreeThisWithdrawal,
  };
}

export function buildDcTaxResult(inputState, flows, stateIncome, dbIncome, otherIncome, tflsUsed) {
  const state = normaliseTaxState(inputState);
  let remaining = Math.max(0, Number(state.tflsCap || 0) - Number(tflsUsed || 0));

  const pclsTaxFree = Math.min(Math.max(0, flows.pclsGross || 0), remaining);
  remaining -= pclsTaxFree;

  const drawdownTaxFree = Math.min(
    Math.max(0, (flows.drawdownGross || 0) * (Number(state.tflsPct || 0) / 100)),
    remaining,
  );
  remaining -= drawdownTaxFree;

  const ufplsTaxFree = Math.min(Math.max(0, (flows.ufplsGross || 0) * 0.25), remaining);
  remaining -= ufplsTaxFree;

  const taxablePension =
    Math.max(0, (flows.drawdownGross || 0) - drawdownTaxFree) +
    Math.max(0, (flows.ufplsGross || 0) - ufplsTaxFree) +
    Math.max(0, flows.taxableLumpGross || 0);

  const taxableTotal = Math.max(0, taxablePension + stateIncome + dbIncome + otherIncome - Number(state.allowance || 0));
  const higherBand = Math.max(0, taxableTotal - Number(state.higherThreshold || 0));
  const basicBand = taxableTotal - higherBand;
  const tax = basicBand * (Number(state.basicTax || 0) / 100) + higherBand * (Number(state.higherTax || 0) / 100);
  const grossDc =
    Math.max(0, flows.drawdownGross || 0) +
    Math.max(0, flows.pclsGross || 0) +
    Math.max(0, flows.ufplsGross || 0) +
    Math.max(0, flows.taxableLumpGross || 0);

  return {
    grossDc,
    tax,
    net: grossDc + stateIncome + dbIncome + otherIncome - tax,
    tflsThis: pclsTaxFree + drawdownTaxFree + ufplsTaxFree,
    pclsTf: pclsTaxFree,
    drawTf: drawdownTaxFree,
    ufplsTf: ufplsTaxFree,
    tflsUsedNew: Number(tflsUsed || 0) + pclsTaxFree + drawdownTaxFree + ufplsTaxFree,
  };
}

export function solveGrossForNetTarget(inputState, pot, targetNet, stateIncome, otherIncome, tflsUsed) {
  const state = normaliseTaxState(inputState);
  const maxGross = Math.max(0, pot);
  let lo = 0;
  let hi = maxGross;
  const all = taxAndNetFromGrossPension(state, hi, stateIncome, otherIncome, tflsUsed);

  if (all.net < targetNet) {
    return { gross: hi, net: all.net, tflsUsedNew: all.tflsUsedNew };
  }

  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    const result = taxAndNetFromGrossPension(state, mid, stateIncome, otherIncome, tflsUsed);
    if (result.net >= targetNet) hi = mid; else lo = mid;
  }

  const result = taxAndNetFromGrossPension(state, hi, stateIncome, otherIncome, tflsUsed);
  return { gross: hi, net: result.net, tflsUsedNew: result.tflsUsedNew };
}
