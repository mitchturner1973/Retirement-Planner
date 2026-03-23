export function bindAppEvents({
  getEl,
  document,
  window,
  setView,
  bindNavigation,
  renderAll,
  syncDerivedAgeInputs,
  setInputsFromState,
  readState,
  defaults,
  readDcPensionsEditor,
  readDbPensionsEditor,
  readContribEventsEditor,
  readLumpSumEventsEditor,
  renderDcPensionsEditor,
  renderDbPensionsEditor,
  renderContribEventsEditor,
  renderLumpSumEventsEditor,
  newId,
  toast,
  nowTime,
  saveCurrentScenario,
  clearScenarios,
  exportInputs,
  importInputs,
  exportReport,
  saveAutoInputs = () => true,
  resetInputsToDefaults = () => {},
}) {
  bindNavigation({
    save: () => getEl('btnSave')?.click(),
    load: () => getEl('btnLoad')?.click(),
    saveScenario: () => getEl('btnSaveScenario')?.click(),
    report: () => getEl('btnExportReport')?.click(),
    recalc: () => getEl('btnRecalc')?.click(),
    reset: () => getEl('btnResetInputs')?.click(),
    print: () => window.print(),
  });

  getEl('btnRecalc')?.addEventListener('click', ()=>{
    const t0=performance.now();
    getEl('btnRecalc').disabled=true;
    getEl('btnRecalc').textContent='Recalculating…';
    setTimeout(()=>{
      renderAll(true);
      const dt=(performance.now()-t0)/1000;
      getEl('btnRecalc').disabled=false;
      getEl('btnRecalc').textContent='Recalculate';
      toast('good','Recalculation complete ✓', `${dt.toFixed(2)}s • Updated ${nowTime()}`);
    }, 0);
  });

  ['in_dob','in_valuationDate','in_spouseDob','in_spouseValuationDate'].forEach(id=>{
    const el=getEl(id);
    if(!el) return;
    const sync = ()=> id.startsWith('in_spouse') ? syncDerivedAgeInputs(getEl, 'spouse') : syncDerivedAgeInputs(getEl, 'main');
    el.addEventListener('input', sync);
    el.addEventListener('change', sync);
  });

  let debounce=null;
  let persistDebounce=null;
  document.querySelectorAll('input,select,textarea').forEach(el=>{
    const onChange = ()=>{
      clearTimeout(debounce);
      debounce=setTimeout(()=>renderAll(false), 250);
      clearTimeout(persistDebounce);
      persistDebounce=setTimeout(()=>{
        if (typeof saveAutoInputs === 'function') saveAutoInputs(readState());
      }, 400);
    };
    el.addEventListener('input', onChange);
    el.addEventListener('change', onChange);
  });

  getEl('strategySelect')?.addEventListener('change', (e)=>{
    window.__RP_APP && (window.__RP_APP.strategySelectedId = e.target.value || null);
    renderAll(false);
  });

  getEl('btnProjectionCompact')?.addEventListener('click', () => {
    if (window.__RP_APP) window.__RP_APP.projectionViewMode = 'compact';
    renderAll(false);
  });

  getEl('btnProjectionDetailed')?.addEventListener('click', () => {
    if (window.__RP_APP) window.__RP_APP.projectionViewMode = 'detailed';
    renderAll(false);
  });

  ['all', 'retirement', 'milestones'].forEach((range) => {
    getEl(`btnProjectionRange_${range}`)?.addEventListener('click', () => {
      if (window.__RP_APP) window.__RP_APP.projectionRange = range;
      renderAll(false);
    });
  });

  ['primary', 'partner'].forEach((person) => {
    getEl(`btnProjectionPerson_${person}`)?.addEventListener('click', () => {
      if (window.__RP_APP) window.__RP_APP.projectionPersonView = person;
      renderAll(false);
    });
  });

  getEl('btnProjectionJumpToRetirement')?.addEventListener('click', () => {
    const retirementRow = document.querySelector('.is-retirement-start');
    retirementRow?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  ['in_strategyPriorityMode', 'in_minimumDesiredNetIncome', 'in_targetRetirementNetIncome', 'in_minimumFlexibilityBufferAt75', 'in_dbEarlyReductionPct', 'in_dbDeferralIncreasePct'].forEach((id) => {
    getEl(id)?.addEventListener('change', () => {
      if (window.__RP_APP) window.__RP_APP.strategySelectedId = null;
      renderAll(false);
    });
  });

  getEl('btnSave')?.addEventListener('click', exportInputs);
  getEl('btnLoad')?.addEventListener('click', ()=> getEl('fileLoad').click());
  getEl('fileLoad')?.addEventListener('change', importInputs);
  getEl('btnResetInputs')?.addEventListener('click', () => {
    if (typeof resetInputsToDefaults === 'function') resetInputsToDefaults();
  });

  getEl('btnAddDc')?.addEventListener('click', ()=>{
    const arr=readDcPensionsEditor();
    arr.push({id:newId('dc'), name:'', provider:'', currentValue:0, feePct:0.5, returnOverride:null, priority:50});
    renderDcPensionsEditor(arr);
    renderContribEventsEditor(readContribEventsEditor(), readState());
    if (typeof saveAutoInputs === 'function') saveAutoInputs(readState());
  });
  getEl('btnAddDb')?.addEventListener('click', ()=>{
    const arr=readDbPensionsEditor();
    arr.push({id:newId('db'), name:'', provider:'', annualIncome:0, startAge:67, npaAge:67, increaseType:'fixed', escalationPct:0, cpiCapPct:null});
    renderDbPensionsEditor(arr);
    if (typeof saveAutoInputs === 'function') saveAutoInputs(readState());
  });
  getEl('btnAddContrib')?.addEventListener('click', ()=>{
    const arr=readContribEventsEditor();
    arr.push({id:newId('ce'), name:'', type:'oneOff', amount:0, targetId:'current-workplace', startAge:readState().currentAge, endAge:null});
    const st=readState();
    renderContribEventsEditor(arr, st);
    renderLumpSumEventsEditor(readLumpSumEventsEditor(), st);
    if (typeof saveAutoInputs === 'function') saveAutoInputs(readState());
  });
  getEl('btnAddLumpSum')?.addEventListener('click', ()=>{
    const arr=readLumpSumEventsEditor();
    arr.push({id:newId('ls'), name:'', type:'pcls', amountType:'fixed', amount:0, targetId:'any-dc', age:readState().retireAge});
    renderLumpSumEventsEditor(arr, readState());
    if (typeof saveAutoInputs === 'function') saveAutoInputs(readState());
  });

  getEl('btnSaveScenario')?.addEventListener('click', ()=>saveCurrentScenario(true));
  getEl('btnNewScenario')?.addEventListener('click', ()=>saveCurrentScenario(true));
  getEl('btnClearScenarios')?.addEventListener('click', clearScenarios);
  getEl('btnExportReport')?.addEventListener('click', exportReport);

  setView('overview');
}
