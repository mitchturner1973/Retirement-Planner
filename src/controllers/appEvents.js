export function bindAppEvents({
  getEl,
  document,
  window,
  setView,
  bindNavigation,
  renderAll,
  runMonteManual,
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

  const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });

  const fmtPercent = (value = 0) => {
    const fixed = Number(value || 0).toFixed(1);
    return `${fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed}%`;
  };

  function setText(id, text) {
    const el = getEl(id);
    if (el) el.textContent = text;
  }

  function updateEarningsInsights() {
    const salary = Number(getEl('in_salary')?.value || 0);
    const growth = Number(getEl('in_salaryGrowth')?.value || 0);
    const empPct = Number(getEl('in_empPct')?.value || 0);
    const erPct = Number(getEl('in_erPct')?.value || 0);
    const otherIncome = Number(getEl('in_otherIncome')?.value || 0);
    const totalPct = empPct + erPct;
    const totalContrib = salary > 0 ? (salary * totalPct) / 100 : 0;
    const monthlyContrib = totalContrib / 12;

    setText('earningsSalaryHeadline', salary > 0 ? `${gbp.format(salary)}/yr` : '£0');
    setText('earningsSalaryNote', salary > 0 ? `Growing ${fmtPercent(growth)} nominal per year.` : 'Add your annual salary to get started.');

    setText('earningsContributionHeadline', totalContrib > 0 ? `${gbp.format(Math.round(totalContrib))}/yr` : '£0');
    setText(
      'earningsContributionNote',
      totalContrib > 0
        ? `${fmtPercent(empPct)} you • ${fmtPercent(erPct)} employer · £${Math.round(monthlyContrib).toLocaleString()} /mo`
        : 'Employee + employer total 0%.'
    );

    setText('earningsBufferHeadline', otherIncome > 0 ? `${gbp.format(otherIncome)}/yr` : '£0');
    setText(
      'earningsBufferNote',
      otherIncome > 0 ? 'Other taxable income included in plan.' : 'Other income + growth assumptions.'
    );

    let coachTip = 'Add your salary so the planner can size contribution headroom.';
    let detail1 = 'Employer match not captured.';
    let detail2 = 'Growth set to nominal rate.';

    if (salary > 0 && totalPct === 0) {
      coachTip = 'Capture how much of your pay you and your employer save.';
      detail1 = 'Contributions currently set to 0%.';
    } else if (salary > 0 && totalPct > 0) {
      coachTip = 'Looks good. Consider increasing contributions if surplus allows.';
      detail1 = `Total saving ${fmtPercent(totalPct)} (${fmtPercent(empPct)} you / ${fmtPercent(erPct)} employer).`;
    }

    if (growth > 0) {
      detail2 = `Salary grows ${fmtPercent(growth)} per year.`;
    } else if (growth === 0) {
      detail2 = 'Salary growth is flat (0%).';
    }

    if (otherIncome > 0) {
      detail2 = `${detail2} Other income £${Math.round(otherIncome).toLocaleString()} added.`;
    }

    setText('earningsCoachTip', coachTip);
    setText('earningsCoachDetail1', detail1);
    setText('earningsCoachDetail2', detail2);
  }

  function triggerFieldEvents(el) {
    if (!el) return;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function copyEarningsToPartner() {
    const salary = getEl('in_salary')?.value ?? '';
    const empPct = getEl('in_empPct')?.value ?? '';
    const erPct = getEl('in_erPct')?.value ?? '';
    const targets = [
      { id: 'in_spouseSalary', value: salary },
      { id: 'in_spouseEmpPct', value: empPct },
      { id: 'in_spouseErPct', value: erPct },
    ];
    targets.forEach(({ id, value }) => {
      const el = getEl(id);
      if (!el) return;
      el.value = value;
      triggerFieldEvents(el);
    });
    if (typeof toast === 'function') {
      toast('info', 'Copied earnings to partner inputs');
    }
    updateEarningsInsights();
  }

  function activateSubTab(subtabId) {
    if (!subtabId) return;
    const person = subtabId.startsWith('partner-') ? 'partner' : 'you';
    const container = getEl(`subtabs-${person}`);
    if (container) {
      container.querySelectorAll('button[data-subtab]').forEach(b => b.classList.remove('active'));
      const btn = container.querySelector(`button[data-subtab="${subtabId}"]`);
      if (btn) btn.classList.add('active');
    }
    document.querySelectorAll(`[id^="subtab-${person}-"]`).forEach(p => { p.style.display = 'none'; });
    const panel = getEl(`subtab-${subtabId}`);
    if (panel) panel.style.display = 'block';
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-subtab]');
    if (!btn) return;
    activateSubTab(btn.dataset.subtab);
  });

  function activateInputsTab(tabName, subTabName) {
    if (!tabName) return;
    const tabs = document.querySelectorAll('#view-inputs .tabs button');
    if (!tabs.length) return;
    tabs.forEach((b) => b.classList.remove('active'));
    const target = document.querySelector(`#view-inputs .tabs button[data-tab="${tabName}"]`);
    if (target) target.classList.add('active');
    document.querySelectorAll('#view-inputs .tab').forEach((t) => {
      t.style.display = 'none';
    });
    const panel = getEl(`tab-${tabName}`);
    if (panel) panel.style.display = 'block';
    if (subTabName) activateSubTab(subTabName);
  }

  function focusLastEditorInput(wrapId) {
    const wrap = getEl(wrapId);
    if (!wrap) return;
    const cards = wrap.querySelectorAll('.repeatCard');
    const last = cards[cards.length - 1];
    const input = last?.querySelector('input,select,textarea');
    if (input && typeof input.focus === 'function') {
      input.focus({ preventScroll: true });
      input.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  document.addEventListener('click', (event) => {
    const rawTarget = event?.target;
    const target = rawTarget && typeof rawTarget.closest === 'function' ? rawTarget.closest('[data-overview-nav]') : null;
    if (!target) return;
    const view = target.getAttribute('data-overview-nav');
    if (!view) return;
    setView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.addEventListener('click', (event) => {
    const rawTarget = event?.target;
    const target = rawTarget && typeof rawTarget.closest === 'function' ? rawTarget.closest('[data-focus-field]') : null;
    if (!target) return;
    event.preventDefault();
    const field = String(target.getAttribute('data-focus-field') || '');
    const tab = String(target.getAttribute('data-focus-tab') || '');
    const subTab = String(target.getAttribute('data-focus-subtab') || '');

    setView('inputs');
    activateInputsTab(tab, subTab);

    if (field.startsWith('btnAdd')) {
      getEl(field)?.click();
      setTimeout(() => {
        if (field === 'btnAddDc') focusLastEditorInput('dcPensionsWrap');
        if (field === 'btnAddDb') focusLastEditorInput('dbPensionsWrap');
        if (field === 'btnAddContrib') focusLastEditorInput('contribEventsWrap');
        if (field === 'btnAddLumpSum') focusLastEditorInput('lumpSumEventsWrap');
        if (field === 'btnAddPartnerDc') focusLastEditorInput('partnerDcPensionsWrap');
        if (field === 'btnAddPartnerDb') focusLastEditorInput('partnerDbPensionsWrap');
        if (field === 'btnAddPartnerContrib') focusLastEditorInput('partnerContribEventsWrap');
        if (field === 'btnAddPartnerLumpSum') focusLastEditorInput('partnerLumpSumEventsWrap');
      }, 20);
      return;
    }

    const input = getEl(field);
    if (input && typeof input.focus === 'function') {
      input.focus({ preventScroll: true });
      input.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
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
      updateEarningsInsights();
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

  getEl('btnEarningsCopyPartner')?.addEventListener('click', () => {
    copyEarningsToPartner();
  });
  getEl('btnEarningsScenario')?.addEventListener('click', () => {
    getEl('btnSaveScenario')?.click();
  });
  getEl('btnEarningsResume')?.addEventListener('click', () => {
    document.getElementById('inputsNavResumeBtn')?.click();
  });
  getEl('btnEarningsFocusContrib')?.addEventListener('click', () => {
    const target = getEl('in_erPct');
    if (target) {
      target.focus({ preventScroll: true });
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  getEl('overviewCompareSource')?.addEventListener('change', (e) => {
    if (window.__RP_APP) window.__RP_APP.overviewCompareSource = String(e.target.value || 'previous');
    renderAll(false);
  });

  getEl('overviewCompareScenario')?.addEventListener('change', (e) => {
    if (window.__RP_APP) window.__RP_APP.overviewCompareScenarioId = String(e.target.value || '');
    renderAll(false);
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

  updateEarningsInsights();

  getEl('btnAddDc')?.addEventListener('click', ()=>{
    const arr=readDcPensionsEditor('primary');
    arr.push({id:newId('dc'), name:'', provider:'', currentValue:0, feePct:0.5, returnOverride:null, priority:50});
    renderDcPensionsEditor(arr, null, 'primary');
    renderContribEventsEditor(readContribEventsEditor('primary'), readState(), 'primary');
    setTimeout(() => focusLastEditorInput('dcPensionsWrap'), 20);
    if (typeof saveAutoInputs === 'function') saveAutoInputs(readState());
  });
  getEl('btnAddPartnerDc')?.addEventListener('click', ()=>{
    const arr=readDcPensionsEditor('partner');
    arr.push({id:newId('dc'), name:'', provider:'', currentValue:0, feePct:0.5, returnOverride:null, priority:50});
    renderDcPensionsEditor(arr, null, 'partner');
    renderContribEventsEditor(readContribEventsEditor('partner'), readState(), 'partner');
    setTimeout(() => focusLastEditorInput('partnerDcPensionsWrap'), 20);
    if (typeof saveAutoInputs === 'function') saveAutoInputs(readState());
  });
  getEl('btnAddDb')?.addEventListener('click', ()=>{
    const arr=readDbPensionsEditor('primary');
    arr.push({id:newId('db'), name:'', provider:'', annualIncome:0, startAge:67, npaAge:67, increaseType:'fixed', escalationPct:0, cpiCapPct:null});
    renderDbPensionsEditor(arr, null, 'primary');
    setTimeout(() => focusLastEditorInput('dbPensionsWrap'), 20);
    if (typeof saveAutoInputs === 'function') saveAutoInputs(readState());
  });
  getEl('btnAddPartnerDb')?.addEventListener('click', ()=>{
    const arr=readDbPensionsEditor('partner');
    arr.push({id:newId('db'), name:'', provider:'', annualIncome:0, startAge:67, npaAge:67, increaseType:'fixed', escalationPct:0, cpiCapPct:null});
    renderDbPensionsEditor(arr, null, 'partner');
    setTimeout(() => focusLastEditorInput('partnerDbPensionsWrap'), 20);
    if (typeof saveAutoInputs === 'function') saveAutoInputs(readState());
  });
  getEl('btnAddContrib')?.addEventListener('click', ()=>{
    const arr=readContribEventsEditor('primary');
    arr.push({id:newId('ce'), name:'', type:'oneOff', amount:0, targetId:'current-workplace', startAge:readState().currentAge, endAge:null});
    const st=readState();
    renderContribEventsEditor(arr, st, 'primary');
    renderLumpSumEventsEditor(readLumpSumEventsEditor('primary'), st, 'primary');
    setTimeout(() => focusLastEditorInput('contribEventsWrap'), 20);
    if (typeof saveAutoInputs === 'function') saveAutoInputs(readState());
  });
  getEl('btnAddPartnerContrib')?.addEventListener('click', ()=>{
    const arr=readContribEventsEditor('partner');
    arr.push({id:newId('ce'), name:'', type:'oneOff', amount:0, targetId:'current-workplace', startAge:readState().spouseCurrentAge||60, endAge:null});
    const st=readState();
    renderContribEventsEditor(arr, st, 'partner');
    renderLumpSumEventsEditor(readLumpSumEventsEditor('partner'), st, 'partner');
    setTimeout(() => focusLastEditorInput('partnerContribEventsWrap'), 20);
    if (typeof saveAutoInputs === 'function') saveAutoInputs(readState());
  });
  getEl('btnAddLumpSum')?.addEventListener('click', ()=>{
    const arr=readLumpSumEventsEditor('primary');
    arr.push({id:newId('ls'), name:'', type:'pcls', amountType:'fixed', amount:0, targetId:'any-dc', age:readState().retireAge});
    renderLumpSumEventsEditor(arr, readState(), 'primary');
    setTimeout(() => focusLastEditorInput('lumpSumEventsWrap'), 20);
    if (typeof saveAutoInputs === 'function') saveAutoInputs(readState());
  });
  getEl('btnAddPartnerLumpSum')?.addEventListener('click', ()=>{
    const arr=readLumpSumEventsEditor('partner');
    arr.push({id:newId('ls'), name:'', type:'pcls', amountType:'fixed', amount:0, targetId:'any-dc', age:readState().spouseRetireAge||65});
    renderLumpSumEventsEditor(arr, readState(), 'partner');
    setTimeout(() => focusLastEditorInput('partnerLumpSumEventsWrap'), 20);
    if (typeof saveAutoInputs === 'function') saveAutoInputs(readState());
  });

  getEl('btnSaveScenario')?.addEventListener('click', ()=>saveCurrentScenario(true));
  getEl('btnNewScenario')?.addEventListener('click', ()=>saveCurrentScenario(true));
  getEl('btnClearScenarios')?.addEventListener('click', clearScenarios);
  getEl('btnExportReport')?.addEventListener('click', exportReport);
  getEl('btnRunMonte')?.addEventListener('click', ()=>{
    if (typeof runMonteManual === 'function') runMonteManual();
  });

  setView('overview');
}
