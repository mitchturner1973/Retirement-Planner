export function renderHouseholdTab({ getEl, fmtGBP, drawLineChart }, state, household) {
  const intro = getEl('householdIntro');
  const kpiWrap = getEl('householdKpis');
  const tbody = getEl('tblHousehold')?.querySelector('tbody');
  if (!intro || !kpiWrap || !tbody) return;

  if (!household) {
    intro.style.display = 'flex';
    intro.innerHTML = `<div>ℹ️</div><div><div style="font-weight:700">Household view is off</div><div class="muted small">Switch Planner mode to <strong>Joint household</strong> on the Inputs → <strong>Partner</strong> tab to see combined retirement results.</div></div>`;
    kpiWrap.innerHTML = '';
    tbody.innerHTML = '';
    const incomeChart = getEl('chartHouseholdIncome');
    const potChart = getEl('chartHouseholdPot');
    if (incomeChart) incomeChart.innerHTML = '';
    if (potChart) potChart.innerHTML = '';
    return;
  }

  intro.style.display = 'flex';
  intro.innerHTML = `<div>🏠</div><div><div style="font-weight:700">How household mode works</div><div class="muted small">Each person is projected separately using the same projection engine, then combined into one household view. Monthly figures below are after tax, shown in today’s money, and should be read as household affordability rather than tax-optimised advice.</div></div>`;

  const partnerName = household.partnerLabel || 'Partner';
  kpiWrap.innerHTML = [
    { label: 'Combined net income when both retired', value: `${fmtGBP(household.monthlyNetAtBothRetired)}/mo` },
    { label: 'Your share when both retired', value: `${fmtGBP(household.monthlyPrimaryAtBothRetired)}/mo` },
    { label: `${partnerName} share when both retired`, value: `${fmtGBP(household.monthlyPartnerAtBothRetired)}/mo` },
    { label: 'Combined net income when both State Pensions started', value: `${fmtGBP(household.monthlyNetAtBothSP)}/mo` },
    { label: 'Combined pot when both retired', value: fmtGBP(household.combinedPotAtBothRetired) },
    { label: 'Combined pot when both State Pensions started', value: fmtGBP(household.combinedPotAtBothSP) },
  ].map((item) => `<div class="k"><div class="label">${item.label}</div><div class="value">${item.value}</div></div>`).join('');

  const keyAges = Array.from(new Set([
    state.currentAge,
    state.retireAge,
    state.partnerCurrentAge ?? state.spouseCurrentAge,
    state.partnerRetireAge ?? state.spouseRetireAge,
    state.stateAge,
    state.partnerStateAge ?? state.spouseStateAge,
    household.firstBothRetiredAge,
    household.bothSPAge,
    state.endAge,
  ])).filter((age) => age >= Math.min(state.currentAge, state.partnerCurrentAge ?? state.spouseCurrentAge) && age <= state.endAge).sort((a, b) => a - b);

  tbody.innerHTML = keyAges.map((age) => {
    const row = household.years.find((item) => item.age === age);
    return `<tr>
      <td>${age}</td>
      <td class="right">${fmtGBP((row?.primaryNet || 0) / 12)}</td>
      <td class="right">${fmtGBP((row?.partnerNet || 0) / 12)}</td>
      <td class="right">${fmtGBP((row?.householdNet || 0) / 12)}</td>
      <td class="right">${fmtGBP(row?.householdPot || 0)}</td>
      <td class="muted">${row?.notes || ''}</td>
    </tr>`;
  }).join('');

  const partnerRetireAge = state.partnerRetireAge ?? state.spouseRetireAge;
  const partnerStateAge = state.partnerStateAge ?? state.spouseStateAge;
  const markers = [
    { x: state.retireAge, label: 'You retire', color: 'rgba(110,231,255,.28)' },
    { x: partnerRetireAge, label: `${partnerName} retires`, color: 'rgba(167,139,250,.28)' },
    { x: state.stateAge, label: 'Your SP', color: 'rgba(52,211,153,.28)' },
    { x: partnerStateAge, label: `${partnerName} SP`, color: 'rgba(251,191,36,.28)' },
  ];

  drawLineChart(getEl('chartHouseholdIncome'), [
    { name: 'Household net / month', color: 'rgba(110,231,255,.95)', data: household.years.map((year) => ({ x: year.age, y: year.householdNet / 12 })) },
    { name: 'Your net / month', color: 'rgba(52,211,153,.95)', data: household.years.map((year) => ({ x: year.age, y: year.primaryNet / 12 })) },
    { name: `${partnerName} net / month`, color: 'rgba(167,139,250,.95)', data: household.years.map((year) => ({ x: year.age, y: year.partnerNet / 12 })) },
  ], markers);

  drawLineChart(getEl('chartHouseholdPot'), [
    { name: 'Combined pot', color: 'rgba(110,231,255,.95)', data: household.years.map((year) => ({ x: year.age, y: year.householdPot })) },
    { name: 'Your pot', color: 'rgba(52,211,153,.95)', data: household.years.map((year) => ({ x: year.age, y: year.primaryPot })) },
    { name: `${partnerName} pot`, color: 'rgba(167,139,250,.95)', data: household.years.map((year) => ({ x: year.age, y: year.partnerPot })) },
  ], markers);
}

export function renderHouseholdSummary({ getEl, fmtGBP }, state, household) {
  const wrap = getEl('householdSummary');
  if (!wrap) return;
  if (state.householdMode !== 'joint' || !household) {
    wrap.style.display = 'none';
    wrap.innerHTML = '';
    return;
  }
  const partnerName = household.partnerLabel || 'Partner';
  wrap.style.display = 'block';
  wrap.innerHTML = `
    <div style="font-weight:700">Household mode summary</div>
    <div class="muted small" style="margin-top:4px">This summary is based on two separate person projections that use the same deterministic engine, then combines the already-calculated outputs into a household view.</div>
    <div class="kpis" style="margin-top:12px">
      <div class="k"><div class="label">Combined net income when both retired</div><div class="value">${fmtGBP(household.monthlyNetAtBothRetired)}/mo</div></div>
      <div class="k"><div class="label">Your share</div><div class="value">${fmtGBP(household.monthlyPrimaryAtBothRetired)}/mo</div></div>
      <div class="k"><div class="label">${partnerName} share</div><div class="value">${fmtGBP(household.monthlyPartnerAtBothRetired)}/mo</div></div>
      <div class="k"><div class="label">Combined pot when both retired</div><div class="value">${fmtGBP(household.combinedPotAtBothRetired)}</div></div>
    </div>`;
}
