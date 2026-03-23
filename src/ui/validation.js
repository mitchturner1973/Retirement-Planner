export function renderValidationSummary(getEl, v){
  const wrap = getEl('validationSummary');
  const over = getEl('overviewWarnings');
  if(!wrap || !over) return;
  const total = v.errors.length + v.warnings.length;
  if(total===0){ wrap.style.display='none'; over.style.display='none'; wrap.innerHTML=''; over.innerHTML=''; return; }

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
    in_dob: 'you-personal',
    in_valuationDate: 'you-personal',
    in_currentAge: 'you-personal',
    in_firstYearMonths: 'you-personal',
    in_retireAge: 'you-personal',
    in_earlyAge: 'you-personal',
    in_stateAge: 'you-personal',
    in_pot: 'you-personal',
    in_otherIncome: 'you-personal',
    in_salary: 'you-earnings',
    in_growth: 'you-earnings',
    in_salaryGrowth: 'you-earnings',
    in_empPct: 'you-earnings',
    in_erPct: 'you-earnings',
    in_allow: 'you-retirement',
    in_basicTax: 'you-retirement',
    in_higherTax: 'you-retirement',
    in_higherThreshold: 'you-retirement',
    in_draw: 'you-retirement',
    in_tflsPct: 'you-retirement',
    in_tflsCap: 'you-retirement',
    in_statePension: 'you-retirement',
    btnAddDc: 'you-dc',
    btnAddDb: 'you-db',
    btnAddContrib: 'you-contrib',
    btnAddLumpSum: 'you-lump',
    in_householdMode: 'partner-personal',
    in_spouseDob: 'partner-personal',
    in_spouseValuationDate: 'partner-personal',
    in_spouseCurrentAge: 'partner-personal',
    in_spouseRetireAge: 'partner-personal',
    in_spouseStateAge: 'partner-personal',
    in_spouseFirstYearMonths: 'partner-personal',
    btnAddPartnerDc: 'partner-dc',
    btnAddPartnerDb: 'partner-db',
    btnAddPartnerContrib: 'partner-contrib',
    btnAddPartnerLumpSum: 'partner-lump',
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
