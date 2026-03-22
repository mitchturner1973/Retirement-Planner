export function renderOverviewKpis({ getEl, fmtGBP }, res, state) {
  const kpis = [
    { label: 'Retirement age', value: String(state.retireAge) },
    { label: 'Pot at start of retirement', value: fmtGBP(res.potAtRet) },
    { label: 'First-year net income at retirement (after tax, incl. State Pension + DB)', value: fmtGBP(res.netAtRet) },
    { label: 'Pot at start of early retirement', value: (state.earlyAge !== '' ? fmtGBP(res.potAtEarly) : 'N/A') },
    { label: 'Pension run-out age', value: (res.runOutAge == null ? `Never (to ${state.endAge})` : String(res.runOutAge)) },
  ];
  const kpiWrap = getEl('kpis');
  if (kpiWrap) {
    kpiWrap.innerHTML = kpis.map((item) => `<div class="k"><div class="label">${item.label}</div><div class="value">${item.value}</div></div>`).join('');
  }
  const horizon = getEl('horizonLbl');
  if (horizon) horizon.textContent = `${state.currentAge} → ${state.endAge}`;
}

export function renderRetirementLumpSumCard({ getEl, fmtGBP }, base) {
  const card = getEl('retirementLumpSumCard');
  const wrap = getEl('retirementLumpSumSummary');
  if (!card || !wrap) return;
  const total = Number(base.retirementLumpSumAtRet || 0);
  if (total <= 0) {
    card.style.display = 'none';
    wrap.innerHTML = '';
    return;
  }
  card.style.display = '';
  const items = [
    { label: 'PCLS at retirement', value: Number(base.pclsAtRet || 0) },
    { label: 'UFPLS at retirement', value: Number(base.ufplsAtRet || 0) },
    { label: 'Taxable lump sum at retirement', value: Number(base.taxableLumpAtRet || 0) },
    { label: 'Total one-off DC lump sums', value: total },
    { label: 'Remaining TFLS / LSA after retirement year', value: Number(base.remainingLsaAtRet || 0) },
  ].filter((item) => item.value > 0 || item.label.includes('Remaining TFLS'));
  wrap.innerHTML = items.map((item) => `<div class="k"><div class="label">${item.label}</div><div class="value">${fmtGBP(item.value)}</div></div>`).join('');
}
