import { deriveAgeInputs, syncDerivedAgeInputs } from '../core/dates.js';

export function createInputStateManager({ getEl, defaults, renderRepeaters, editorReaders }) {
  const { readDcPensionsEditor, readDbPensionsEditor, readContribEventsEditor, readLumpSumEventsEditor, getEditorCollections } = editorReaders;

  function setInputsFromState(state) {
    getEl('in_dob').value = state.dob || defaults.dob || '';
    getEl('in_currentAge').value = state.currentAge;
    getEl('in_valuationDate').value = state.valuationDate || defaults.valuationDate;
    getEl('in_firstYearMonths').value = state.firstYearMonths ?? defaults.firstYearMonths;
    getEl('in_retireAge').value = state.retireAge;
    getEl('in_earlyAge').value = state.earlyAge;
    getEl('in_stateAge').value = state.stateAge;
    getEl('in_pot').value = state.pot;
    getEl('in_otherIncome').value = state.otherIncome;
    getEl('in_householdMode').value = state.householdMode || 'single';
    getEl('in_spouseDob').value = state.spouseDob || defaults.spouseDob || '';
    getEl('in_spouseValuationDate').value = state.spouseValuationDate || defaults.spouseValuationDate || defaults.valuationDate;
    getEl('in_spouseCurrentAge').value = state.spouseCurrentAge ?? defaults.spouseCurrentAge;
    getEl('in_spouseFirstYearMonths').value = state.spouseFirstYearMonths ?? defaults.spouseFirstYearMonths;
    getEl('in_spouseRetireAge').value = state.spouseRetireAge ?? defaults.spouseRetireAge;
    getEl('in_spouseStateAge').value = state.spouseStateAge ?? defaults.spouseStateAge;
    getEl('in_spousePot').value = state.spousePot ?? 0;
    getEl('in_spouseOtherIncome').value = state.spouseOtherIncome ?? 0;
    getEl('in_spouseSalary').value = state.spouseSalary ?? 0;
    getEl('in_spouseEmpPct').value = state.spouseEmpPct ?? 0;
    getEl('in_spouseErPct').value = state.spouseErPct ?? 0;
    getEl('in_spouseStatePension').value = state.spouseStatePension ?? defaults.spouseStatePension;
    getEl('in_salary').value = state.salary;
    getEl('in_salaryGrowth').value = state.salaryGrowth;
    getEl('in_empPct').value = state.empPct;
    getEl('in_erPct').value = state.erPct;
    getEl('in_return').value = state.returnNom;
    getEl('in_inflation').value = state.inflation;
    getEl('in_vol').value = state.vol;
    getEl('in_endAge').value = state.endAge;
    getEl('in_feePct').value = state.feePct ?? defaults.feePct;
    getEl('in_notes').value = state.notes;
    getEl('in_statePension').value = state.statePension;
    getEl('in_draw').value = state.drawdown;
    getEl('in_allow').value = state.allowance;
    getEl('in_basicTax').value = state.basicTax;
    getEl('in_higherTax').value = state.higherTax;
    getEl('in_higherThreshold').value = state.higherThreshold;
    getEl('in_tflsPct').value = state.tflsPct;
    getEl('in_tflsCap').value = state.tflsCap;
    renderRepeaters(state);
    getEl('in_crashPct').value = state.crashPct;
    getEl('in_badYears').value = state.badYears;
    getEl('in_badPenalty').value = state.badPenalty;
    getEl('in_successAge').value = state.successAge;
    getEl('in_floor70').value = state.floor70;
    if (getEl('in_floorTaperStartAge')) getEl('in_floorTaperStartAge').value = state.floorTaperStartAge ?? defaults.floorTaperStartAge;
    if (getEl('in_floorTaperRatePct')) getEl('in_floorTaperRatePct').value = state.floorTaperRatePct ?? defaults.floorTaperRatePct;
    if (getEl('in_floorTaperMinPct')) getEl('in_floorTaperMinPct').value = state.floorTaperMinPct ?? defaults.floorTaperMinPct;
    if (getEl('in_stressScenarioCrash')) getEl('in_stressScenarioCrash').checked = Number(state.stressScenarioCrash ?? defaults.stressScenarioCrash ?? 1) === 1;
    if (getEl('in_stressScenarioBadSeq')) getEl('in_stressScenarioBadSeq').checked = Number(state.stressScenarioBadSeq ?? defaults.stressScenarioBadSeq ?? 1) === 1;
    if (getEl('in_stressScenarioLowerReturns')) getEl('in_stressScenarioLowerReturns').checked = Number(state.stressScenarioLowerReturns ?? defaults.stressScenarioLowerReturns ?? 1) === 1;
    if (getEl('in_stressScenarioHigherInflation')) getEl('in_stressScenarioHigherInflation').checked = Number(state.stressScenarioHigherInflation ?? defaults.stressScenarioHigherInflation ?? 1) === 1;
    if (getEl('in_stressScenarioEarlierRetire')) getEl('in_stressScenarioEarlierRetire').checked = Number(state.stressScenarioEarlierRetire ?? defaults.stressScenarioEarlierRetire ?? 1) === 1;
    if (getEl('in_stressScenarioReducedContrib')) getEl('in_stressScenarioReducedContrib').checked = Number(state.stressScenarioReducedContrib ?? defaults.stressScenarioReducedContrib ?? 1) === 1;
    if (getEl('in_stressScenarioDrawdownPressure')) getEl('in_stressScenarioDrawdownPressure').checked = Number(state.stressScenarioDrawdownPressure ?? defaults.stressScenarioDrawdownPressure ?? 1) === 1;
    if (getEl('in_stressScenarioLaterLifeFloor')) getEl('in_stressScenarioLaterLifeFloor').checked = Number(state.stressScenarioLaterLifeFloor ?? defaults.stressScenarioLaterLifeFloor ?? 1) === 1;
    if (getEl('in_stressScenarioHouseholdStrain')) getEl('in_stressScenarioHouseholdStrain').checked = Number(state.stressScenarioHouseholdStrain ?? defaults.stressScenarioHouseholdStrain ?? 1) === 1;
    getEl('in_sims').value = String(state.sims);
    getEl('in_seed').value = state.seed;
    getEl('in_ruinDef').value = String(state.ruinDef);
    getEl('in_bands').value = String(state.bands);
    getEl('br_earlyAge').value = (state.earlyAge !== '' ? state.earlyAge : '');
    getEl('br_mode').value = state.bridgeMode;
    getEl('br_amount').value = state.bridgeAmount;
    getEl('br_endAge').value = state.bridgeEndAge;
    getEl('br_postDraw').value = state.bridgePostDraw;
    getEl('br_keepLifestyle').value = String(state.bridgeKeepLifestyle);
    getEl('br_crashEarly').checked = state.bridgeCrashEarly === 1;
    getEl('br_crashState').checked = state.bridgeCrashState === 1;
    getEl('br_badSeq').checked = state.bridgeBadSeq === 1;
    if (getEl('in_strategyPriorityMode')) {
      getEl('in_strategyPriorityMode').value = state.strategyPriorityMode || defaults.strategyPriorityMode;
    }
    if (getEl('in_minimumDesiredNetIncome')) {
      getEl('in_minimumDesiredNetIncome').value = state.minimumDesiredNetIncome ?? defaults.minimumDesiredNetIncome;
    }
    if (getEl('in_targetRetirementNetIncome')) {
      getEl('in_targetRetirementNetIncome').value = state.targetRetirementNetIncome ?? defaults.targetRetirementNetIncome;
    }
    if (getEl('in_minimumFlexibilityBufferAt75')) {
      getEl('in_minimumFlexibilityBufferAt75').value = state.minimumFlexibilityBufferAt75 ?? defaults.minimumFlexibilityBufferAt75;
    }
    if (getEl('in_watchoutIncomeDropPct')) {
      getEl('in_watchoutIncomeDropPct').value = state.watchoutIncomeDropPct ?? defaults.watchoutIncomeDropPct;
    }
    if (getEl('in_watchoutIncomeDropAbs')) {
      getEl('in_watchoutIncomeDropAbs').value = state.watchoutIncomeDropAbs ?? defaults.watchoutIncomeDropAbs;
    }
    if (getEl('in_watchoutLateLifePotYears')) {
      getEl('in_watchoutLateLifePotYears').value = state.watchoutLateLifePotYears ?? defaults.watchoutLateLifePotYears;
    }
    if (getEl('in_watchoutDcReliancePct')) {
      getEl('in_watchoutDcReliancePct').value = state.watchoutDcReliancePct ?? defaults.watchoutDcReliancePct;
    }
    if (getEl('in_watchoutLumpSumPctNet')) {
      getEl('in_watchoutLumpSumPctNet').value = state.watchoutLumpSumPctNet ?? defaults.watchoutLumpSumPctNet;
    }
    if (getEl('in_watchoutLowLsa')) {
      getEl('in_watchoutLowLsa').value = state.watchoutLowLsa ?? defaults.watchoutLowLsa;
    }
    if (getEl('in_dbEarlyReductionPct')) {
      getEl('in_dbEarlyReductionPct').value = state.dbEarlyReductionPct ?? defaults.dbEarlyReductionPct;
    }
    if (getEl('in_dbDeferralIncreasePct')) {
      getEl('in_dbDeferralIncreasePct').value = state.dbDeferralIncreasePct ?? defaults.dbDeferralIncreasePct;
    }
    syncDerivedAgeInputs(getEl, 'main');
    syncDerivedAgeInputs(getEl, 'spouse');
    toggleSpouseFields(state.householdMode || 'single');
  }

  function deriveCurrentAge(prefix) {
    const dob = getEl(prefix === 'main' ? 'in_dob' : 'in_spouseDob').value;
    const valuation = getEl(prefix === 'main' ? 'in_valuationDate' : 'in_spouseValuationDate').value;
    return deriveAgeInputs(dob, valuation);
  }

  function readState() {
    const intOrBlank = (value) => (value === '' || value == null ? '' : Number(value));
    const earlyVal = (getEl('br_earlyAge').value !== '' ? getEl('br_earlyAge').value : getEl('in_earlyAge').value);
    const mainAge = deriveCurrentAge('main');
    const spouseAge = deriveCurrentAge('spouse');
    const editorCollections = typeof getEditorCollections === 'function'
      ? getEditorCollections()
      : {
          primary: {
            dcPensions: readDcPensionsEditor(),
            dbPensions: readDbPensionsEditor(),
            contribEvents: readContribEventsEditor(),
            lumpSumEvents: readLumpSumEventsEditor(),
          },
          partner: {
            dcPensions: defaults.partnerDcPensions || [],
            dbPensions: defaults.partnerDbPensions || [],
            contribEvents: defaults.partnerContribEvents || [],
            lumpSumEvents: defaults.partnerLumpSumEvents || [],
          },
        };
    return {
      dob: String(getEl('in_dob').value || ''),
      currentAge: mainAge?.currentAge ?? Number(getEl('in_currentAge').value || defaults.currentAge),
      valuationDate: String(getEl('in_valuationDate').value || defaults.valuationDate),
      firstYearMonths: mainAge?.firstYearMonths ?? Number(getEl('in_firstYearMonths').value || defaults.firstYearMonths),
      retireAge: Number(getEl('in_retireAge').value || defaults.retireAge),
      earlyAge: intOrBlank(earlyVal),
      stateAge: Number(getEl('in_stateAge').value || defaults.stateAge),
      pot: Number(getEl('in_pot').value || 0),
      otherIncome: Number(getEl('in_otherIncome').value || 0),
      householdMode: String(getEl('in_householdMode').value || 'single'),
      spouseDob: String(getEl('in_spouseDob').value || ''),
      spouseValuationDate: String(getEl('in_spouseValuationDate').value || defaults.spouseValuationDate || defaults.valuationDate),
      spouseCurrentAge: spouseAge?.currentAge ?? Number(getEl('in_spouseCurrentAge').value || defaults.spouseCurrentAge),
      spouseFirstYearMonths: spouseAge?.firstYearMonths ?? Number(getEl('in_spouseFirstYearMonths').value || defaults.spouseFirstYearMonths),
      spouseRetireAge: Number(getEl('in_spouseRetireAge').value || defaults.spouseRetireAge),
      spouseStateAge: Number(getEl('in_spouseStateAge').value || defaults.spouseStateAge),
      spousePot: Number(getEl('in_spousePot').value || 0),
      spouseOtherIncome: Number(getEl('in_spouseOtherIncome').value || 0),
      spouseSalary: Number(getEl('in_spouseSalary').value || 0),
      spouseEmpPct: Number(getEl('in_spouseEmpPct').value || 0),
      spouseErPct: Number(getEl('in_spouseErPct').value || 0),
      spouseStatePension: Number(getEl('in_spouseStatePension').value || defaults.spouseStatePension),
      salary: Number(getEl('in_salary').value || 0),
      salaryGrowth: Number(getEl('in_salaryGrowth').value || 0),
      empPct: Number(getEl('in_empPct').value || 0),
      erPct: Number(getEl('in_erPct').value || 0),
      returnNom: Number(getEl('in_return').value || 0),
      inflation: Number(getEl('in_inflation').value || 0),
      vol: Number(getEl('in_vol').value || 0),
      endAge: Number(getEl('in_endAge').value || 95),
      feePct: Number(getEl('in_feePct').value || defaults.feePct),
      notes: String(getEl('in_notes').value || ''),
      dcPensions: editorCollections.primary.dcPensions || [],
      dbPensions: editorCollections.primary.dbPensions || [],
      contribEvents: editorCollections.primary.contribEvents || [],
      lumpSumEvents: editorCollections.primary.lumpSumEvents || [],
      partnerDob: String(getEl('in_spouseDob').value || ''),
      partnerValuationDate: String(getEl('in_spouseValuationDate').value || defaults.spouseValuationDate || defaults.valuationDate),
      partnerCurrentAge: spouseAge?.currentAge ?? Number(getEl('in_spouseCurrentAge').value || defaults.spouseCurrentAge),
      partnerFirstYearMonths: spouseAge?.firstYearMonths ?? Number(getEl('in_spouseFirstYearMonths').value || defaults.spouseFirstYearMonths),
      partnerRetireAge: Number(getEl('in_spouseRetireAge').value || defaults.spouseRetireAge),
      partnerStateAge: Number(getEl('in_spouseStateAge').value || defaults.spouseStateAge),
      partnerPot: Number(getEl('in_spousePot').value || 0),
      partnerOtherIncome: Number(getEl('in_spouseOtherIncome').value || 0),
      partnerSalary: Number(getEl('in_spouseSalary').value || 0),
      partnerEmpPct: Number(getEl('in_spouseEmpPct').value || 0),
      partnerErPct: Number(getEl('in_spouseErPct').value || 0),
      partnerStatePension: Number(getEl('in_spouseStatePension').value || defaults.spouseStatePension),
      partnerDcPensions: editorCollections.partner.dcPensions || defaults.partnerDcPensions || [],
      partnerDbPensions: editorCollections.partner.dbPensions || defaults.partnerDbPensions || [],
      partnerContribEvents: editorCollections.partner.contribEvents || defaults.partnerContribEvents || [],
      partnerLumpSumEvents: editorCollections.partner.lumpSumEvents || defaults.partnerLumpSumEvents || [],
      statePension: Number(getEl('in_statePension').value || 0),
      drawdown: Number(getEl('in_draw').value || 0),
      allowance: Number(getEl('in_allow').value || 0),
      basicTax: Number(getEl('in_basicTax').value || 0),
      higherTax: Number(getEl('in_higherTax').value || 0),
      higherThreshold: Number(getEl('in_higherThreshold').value || 0),
      tflsPct: Number(getEl('in_tflsPct').value || 0),
      tflsCap: Number(getEl('in_tflsCap').value || 0),
      crashPct: Number(getEl('in_crashPct').value || 30),
      badYears: Number(getEl('in_badYears').value || 5),
      badPenalty: Number(getEl('in_badPenalty').value || 5),
      successAge: Number(getEl('in_successAge').value || 90),
      floor70: Number(getEl('in_floor70').value || 0),
      floorTaperStartAge: Number(getEl('in_floorTaperStartAge')?.value || defaults.floorTaperStartAge || 85),
      floorTaperRatePct: Number(getEl('in_floorTaperRatePct')?.value || defaults.floorTaperRatePct || 0),
      floorTaperMinPct: Number(getEl('in_floorTaperMinPct')?.value || defaults.floorTaperMinPct || 100),
      stressScenarioCrash: getEl('in_stressScenarioCrash')?.checked ? 1 : 0,
      stressScenarioBadSeq: getEl('in_stressScenarioBadSeq')?.checked ? 1 : 0,
      stressScenarioLowerReturns: getEl('in_stressScenarioLowerReturns')?.checked ? 1 : 0,
      stressScenarioHigherInflation: getEl('in_stressScenarioHigherInflation')?.checked ? 1 : 0,
      stressScenarioEarlierRetire: getEl('in_stressScenarioEarlierRetire')?.checked ? 1 : 0,
      stressScenarioReducedContrib: getEl('in_stressScenarioReducedContrib')?.checked ? 1 : 0,
      stressScenarioDrawdownPressure: getEl('in_stressScenarioDrawdownPressure')?.checked ? 1 : 0,
      stressScenarioLaterLifeFloor: getEl('in_stressScenarioLaterLifeFloor')?.checked ? 1 : 0,
      stressScenarioHouseholdStrain: getEl('in_stressScenarioHouseholdStrain')?.checked ? 1 : 0,
      sims: Number(getEl('in_sims').value || 1000),
      seed: (getEl('in_seed').value || ''),
      ruinDef: Number(getEl('in_ruinDef').value || 0),
      bands: Number(getEl('in_bands').value || 1),
      extraSpend: defaults.extraSpend,
      extraStart: defaults.extraStart,
      extraEnd: defaults.extraEnd,
      floorAfter70: defaults.floorAfter70,
      bridgeMode: String(getEl('br_mode').value || 'net'),
      bridgeAmount: Number(getEl('br_amount').value || 0),
      bridgeEndAge: Number(getEl('br_endAge').value || Number(getEl('in_stateAge').value || defaults.stateAge)),
      bridgePostDraw: Number(getEl('br_postDraw').value || Number(getEl('in_draw').value || defaults.drawdown)),
      bridgeKeepLifestyle: Number(getEl('br_keepLifestyle').value || 1),
      bridgeCrashEarly: getEl('br_crashEarly').checked ? 1 : 0,
      bridgeCrashState: getEl('br_crashState').checked ? 1 : 0,
      bridgeBadSeq: getEl('br_badSeq').checked ? 1 : 0,
      strategyPriorityMode: String(getEl('in_strategyPriorityMode')?.value || defaults.strategyPriorityMode || 'balanced'),
      minimumDesiredNetIncome: Number(getEl('in_minimumDesiredNetIncome')?.value || defaults.minimumDesiredNetIncome || 18000),
      targetRetirementNetIncome: Number(getEl('in_targetRetirementNetIncome')?.value || defaults.targetRetirementNetIncome || 25000),
      minimumFlexibilityBufferAt75: Number(getEl('in_minimumFlexibilityBufferAt75')?.value || defaults.minimumFlexibilityBufferAt75 || 150000),
      watchoutIncomeDropPct: Number(getEl('in_watchoutIncomeDropPct')?.value || defaults.watchoutIncomeDropPct || 10),
      watchoutIncomeDropAbs: Number(getEl('in_watchoutIncomeDropAbs')?.value || defaults.watchoutIncomeDropAbs || 2500),
      watchoutLateLifePotYears: Number(getEl('in_watchoutLateLifePotYears')?.value || defaults.watchoutLateLifePotYears || 4),
      watchoutDcReliancePct: Number(getEl('in_watchoutDcReliancePct')?.value || defaults.watchoutDcReliancePct || 65),
      watchoutLumpSumPctNet: Number(getEl('in_watchoutLumpSumPctNet')?.value || defaults.watchoutLumpSumPctNet || 25),
      watchoutLowLsa: Number(getEl('in_watchoutLowLsa')?.value || defaults.watchoutLowLsa || 20000),
      dbEarlyReductionPct: Number(getEl('in_dbEarlyReductionPct')?.value || defaults.dbEarlyReductionPct || 4),
      dbDeferralIncreasePct: Number(getEl('in_dbDeferralIncreasePct')?.value || defaults.dbDeferralIncreasePct || 5),
    };
  }

  function toggleSpouseFields(mode) {
    const wrap = getEl('spouseFields');
    if (!wrap) return;
    wrap.style.display = mode === 'joint' ? '' : 'none';
  }

  return { setInputsFromState, readState, toggleSpouseFields, syncDerivedAgeInputs };
}
