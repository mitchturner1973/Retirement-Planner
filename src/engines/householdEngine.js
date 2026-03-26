import { calcProjection } from './projectionEngine.js';

function buildLegacyPersonState(state, role) {
  const partner = role === 'partner';
  return {
    ...state,
    currentAge: partner ? (state.partnerCurrentAge ?? state.spouseCurrentAge) : state.currentAge,
    dob: partner ? (state.partnerDob ?? state.spouseDob ?? '') : state.dob,
    valuationDate: partner ? (state.partnerValuationDate ?? state.spouseValuationDate ?? state.valuationDate) : state.valuationDate,
    firstYearMonths: partner ? (state.partnerFirstYearMonths ?? state.spouseFirstYearMonths) : state.firstYearMonths,
    retireAge: partner ? (state.partnerRetireAge ?? state.spouseRetireAge) : state.retireAge,
    stateAge: partner ? (state.partnerStateAge ?? state.spouseStateAge) : state.stateAge,
    pot: partner ? (state.partnerPot ?? state.spousePot ?? 0) : state.pot,
    salary: partner ? (state.partnerSalary ?? state.spouseSalary ?? 0) : state.salary,
    empPct: partner ? (state.partnerEmpPct ?? state.spouseEmpPct ?? 0) : state.empPct,
    erPct: partner ? (state.partnerErPct ?? state.spouseErPct ?? 0) : state.erPct,
    statePension: partner ? (state.partnerStatePension ?? state.spouseStatePension ?? 0) : state.statePension,
    otherIncome: partner ? (state.partnerOtherIncome ?? state.spouseOtherIncome ?? 0) : state.otherIncome,
    dcPensions: partner ? (state.partnerDcPensions ?? []) : (state.dcPensions ?? []),
    dbPensions: partner ? (state.partnerDbPensions ?? []) : (state.dbPensions ?? []),
    contribEvents: partner ? (state.partnerContribEvents ?? []) : (state.contribEvents ?? []),
    lumpSumEvents: partner ? (state.partnerLumpSumEvents ?? []) : (state.lumpSumEvents ?? []),
    earlyAge: partner ? '' : state.earlyAge,
    bridgeEndAge: partner ? (state.partnerStateAge ?? state.spouseStateAge ?? state.stateAge) : state.bridgeEndAge,
  };
}

export function buildHouseholdPersonState(state, role) {
  const profile = role === 'partner' ? state.partnerProfile : state.primaryProfile;
  if (profile && typeof profile === 'object') {
    return {
      ...state,
      ...profile,
      householdMode: state.householdMode,
      endAge: profile.endAge ?? state.endAge,
    };
  }
  return buildLegacyPersonState(state, role);
}

export function calcHouseholdProjection(state) {
  if (state.householdMode !== 'joint') return null;
  const primaryState = buildHouseholdPersonState(state, 'primary');
  const partnerState = buildHouseholdPersonState(state, 'partner');

  const primary = calcProjection(primaryState);
  const partner = calcProjection(partnerState);

  const startAge = Math.min(primaryState.currentAge, partnerState.currentAge);
  const endAge = Math.max(primaryState.endAge ?? state.endAge, partnerState.endAge ?? state.endAge);
  const ageDiff = primaryState.currentAge - partnerState.currentAge; // positive = primary older
  const years = [];

  for (let age = startAge; age <= endAge; age += 1) {
    // Align by calendar year: when the loop age matches primary's scale,
    // the partner's age at that same calendar year is (age - ageDiff).
    const primaryAge = age;
    const partnerAge = age - ageDiff;
    const p = primary.years.find((year) => year.age === primaryAge) || { potEnd: 0, netIncome: 0 };
    const q = partner.years.find((year) => year.age === partnerAge) || { potEnd: 0, netIncome: 0 };
    const notes = [];
    if (age === primaryState.retireAge) notes.push('You retire');
    if (partnerAge === partnerState.retireAge) notes.push('Partner retires');
    if (age === primaryState.stateAge) notes.push('Your State Pension starts');
    if (partnerAge === partnerState.stateAge) notes.push('Partner State Pension starts');
    if (age === (primaryState.earlyAge || 0) && primaryState.earlyAge) notes.push('You take early retirement');
    if (partnerAge === (partnerState.earlyAge || 0) && partnerState.earlyAge) notes.push('Partner takes early retirement');

    years.push({
      age,
      primaryNet: p.netIncome || 0,
      partnerNet: q.netIncome || 0,
      householdNet: (p.netIncome || 0) + (q.netIncome || 0),
      primaryPot: p.potEnd ?? p.pot ?? 0,
      partnerPot: q.potEnd ?? q.pot ?? 0,
      householdPot: (p.potEnd ?? p.pot ?? 0) + (q.potEnd ?? q.pot ?? 0),
      notes: notes.join(' • '),
    });
  }

  const firstBothRetiredAge = Math.max(primaryState.retireAge, partnerState.retireAge + ageDiff);
  const firstBothRetired = years.find((year) => year.age === firstBothRetiredAge) || years[years.length - 1];
  const bothSPAge = Math.max(primaryState.stateAge, partnerState.stateAge + ageDiff);
  const bothSP = years.find((year) => year.age === bothSPAge) || years[years.length - 1];

  return {
    primary,
    partner,
    years,
    primaryState,
    partnerState,
    partnerLabel: partnerState.displayName || state.partnerLabel || 'Partner',
    firstBothRetiredAge,
    bothSPAge,
    monthlyNetAtBothRetired: (firstBothRetired.householdNet || 0) / 12,
    monthlyNetAtBothSP: (bothSP.householdNet || 0) / 12,
    monthlyPrimaryAtBothRetired: (firstBothRetired.primaryNet || 0) / 12,
    monthlyPartnerAtBothRetired: (firstBothRetired.partnerNet || 0) / 12,
    combinedPotAtBothRetired: firstBothRetired.householdPot || 0,
    combinedPotAtBothSP: bothSP.householdPot || 0,
  };
}
