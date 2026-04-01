export function renderValidationSummary(getEl, v){
  const wrap = getEl('validationSummary');
  const over = getEl('overviewWarnings');
  if(!wrap || !over) return;
  const total = v.errors.length + v.warnings.length;
  const setCounts = (node) => {
    if(!node) return;
    node.dataset.errorCount = String(v.errors.length);
    node.dataset.warningCount = String(v.warnings.length);
  };
  const clearCounts = (node) => {
    if(!node) return;
    delete node.dataset.errorCount;
    delete node.dataset.warningCount;
  };
  if(total===0){
    clearCounts(wrap);
    clearCounts(over);
    wrap.style.display='none'; over.style.display='none'; wrap.innerHTML=''; over.innerHTML=''; return;
  }
  setCounts(wrap);
  setCounts(over);

  const fieldToTab = {
    in_dob: 'you',
    in_valuationDate: 'you',
    in_currentAge: 'you',
    in_retireAge: 'you',
    in_stateAge: 'you',
    in_earlyAge: 'you',
    in_firstYearMonths: 'you',
    in_salary: 'you',
    in_growth: 'you',
    in_employeePct: 'you',
    in_employerPct: 'you',
    in_bonus: 'you',
    in_extraMonthly: 'you',
    in_allow: 'you',
    in_basicTax: 'you',
    in_higherTax: 'you',
    in_higherThreshold: 'you',
    in_draw: 'you',
    in_tflsPct: 'you',
    in_tflsCap: 'you',
    br_endAge: 'you',
    in_endAge: 'assumptions',
    in_return: 'assumptions',
    in_feePct: 'assumptions',
    in_vol: 'assumptions',
    in_infl: 'assumptions',
    in_householdMode: 'partner',
    in_spouseDob: 'partner',
    in_spouseCurrentAge: 'partner',
    in_spouseRetireAge: 'partner',
    in_spouseStateAge: 'partner',
    in_spouseFirstYearMonths: 'partner',
    btnAddDc: 'you',
    btnAddDb: 'you',
    btnAddContrib: 'you',
    btnAddLumpSum: 'you',
    btnAddPartnerDc: 'partner',
    btnAddPartnerDb: 'partner',
    btnAddPartnerContrib: 'partner',
    btnAddPartnerLumpSum: 'partner',
  };

  const fieldToSubTab = {
    in_dob: 'drawer-personal',
    in_valuationDate: 'drawer-personal',
    in_currentAge: 'drawer-personal',
    in_firstYearMonths: 'drawer-personal',
    in_retireAge: 'drawer-personal',
    in_earlyAge: 'drawer-personal',
    in_stateAge: 'drawer-personal',
    in_pot: 'drawer-pensions',
    in_otherIncome: 'drawer-other',
    in_salary: 'drawer-employment',
    in_growth: 'drawer-employment',
    in_salaryGrowth: 'drawer-employment',
    in_empPct: 'drawer-employment',
    in_erPct: 'drawer-employment',
    in_allow: 'drawer-tax',
    in_basicTax: 'drawer-tax',
    in_higherTax: 'drawer-tax',
    in_higherThreshold: 'drawer-tax',
    in_draw: 'drawer-retirement',
    in_tflsPct: 'drawer-retirement',
    in_tflsCap: 'drawer-retirement',
    in_statePension: 'drawer-retirement',
    btnAddDc: 'drawer-pensions',
    btnAddDb: 'drawer-pensions',
    btnAddContrib: 'drawer-pensions',
    btnAddLumpSum: 'drawer-pensions',
    in_householdMode: 'drawer-partner',
    in_spouseDob: 'drawer-partner',
    in_spouseValuationDate: 'drawer-partner',
    in_spouseCurrentAge: 'drawer-partner',
    in_spouseRetireAge: 'drawer-partner',
    in_spouseStateAge: 'drawer-partner',
    in_spouseFirstYearMonths: 'drawer-partner',
    btnAddPartnerDc: 'drawer-partner',
    btnAddPartnerDb: 'drawer-partner',
    btnAddPartnerContrib: 'drawer-partner',
    btnAddPartnerLumpSum: 'drawer-partner',
  };

  const items = [
    ...v.errors.map(x=>({severity:'error', label:'Error',...x})),
    ...v.warnings.map(x=>({severity:'warning', label:'Warning',...x})),
  ].slice(0,8);

  const itemLines = items.map((it)=>{
    const focusField = it.field || '';
    const tab = fieldToTab[focusField] || '';
    const subTab = fieldToSubTab[focusField] || '';
    return `<li class="validation-item validation-item--${it.severity}"><span class="validation-item-type">${it.label}</span><span class="validation-item-msg">${it.msg}</span><button type="button" class="btn validation-focus-btn" data-focus-field="${focusField}" data-focus-tab="${tab}" data-focus-subtab="${subTab}">Review</button></li>`;
  }).join('');

  const infoLine = v.infos?.length
    ? `<details class="validation-info"><summary>${v.infos.length} guidance note${v.infos.length===1?'':'s'}</summary><ul>${v.infos.slice(0,4).map(info=>`<li>${info.msg}</li>`).join('')}</ul></details>`
    : '';

  const html = `<div class="validation-shell"><div class="validation-head"><div style="font-weight:700">Input checks</div><div class="validation-badges"><span class="badge bad">${v.errors.length} error${v.errors.length===1?'':'s'}</span><span class="badge warn">${v.warnings.length} warning${v.warnings.length===1?'':'s'}</span></div></div><ol class="validation-list">${itemLines}</ol>${items.length < total ? `<div class="muted small" style="margin-top:6px">Showing first ${items.length} items.</div>` : ''}${infoLine}</div>`;
  wrap.style.display='flex'; wrap.innerHTML=html;
  over.style.display='flex'; over.innerHTML=html;
}
