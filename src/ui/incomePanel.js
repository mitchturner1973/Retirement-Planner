/**
 * Income card-grid, slide-out drawers, slider sync, and live chip updates.
 */
export function createIncomePanel({ getEl }) {
  const gbp = new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'GBP', maximumFractionDigits: 0,
  });

  function setText(id, text) {
    const el = getEl(id);
    if (el) el.textContent = text;
  }

  function val(id) { return Number(getEl(id)?.value || 0); }
  function fmtGBP(v) { return v > 0 ? gbp.format(v) : '£0'; }

  function countChildren(wrapId) {
    const w = getEl(wrapId);
    return w ? w.querySelectorAll('.repeatCard').length : 0;
  }

  /* ---- Drawer open / close ---- */
  let openId = null;
  const overlay = () => document.getElementById('inpOverlay');

  function openDrawer(id) {
    closeDrawer();
    const drawer = document.getElementById(id);
    if (!drawer) return;
    drawer.classList.add('open');
    overlay()?.classList.add('open');
    openId = id;
    document.body.style.overflow = 'hidden';
    const first = drawer.querySelector('input,select,textarea');
    if (first) setTimeout(() => first.focus(), 50);
  }

  function closeDrawer() {
    if (openId) {
      document.getElementById(openId)?.classList.remove('open');
      openId = null;
    }
    overlay()?.classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ---- Slider display sync ---- */
  const sliderMap = [
    ['in_retireAge',        'sliderRetireVal',       '', ''],
    ['in_stateAge',         'sliderStateVal',        '', ''],
    ['in_salaryGrowth',     'sliderGrowthVal',       '', '%'],
    ['in_empPct',           'sliderEmpVal',          '', '%'],
    ['in_erPct',            'sliderErVal',           '', '%'],
    ['in_draw',             'sliderDrawVal',         '', '%'],
    ['in_tflsPct',          'sliderTflsVal',         '', '%'],
    ['in_basicTax',         'sliderBasicVal',        '', '%'],
    ['in_higherTax',        'sliderHigherVal',       '', '%'],
    ['in_spouseRetireAge',  'sliderSpouseRetireVal', '', ''],
    ['in_spouseStateAge',   'sliderSpouseStateVal',  '', ''],
    ['in_spouseEmpPct',     'sliderSpouseEmpVal',    '', '%'],
    ['in_spouseErPct',      'sliderSpouseErVal',     '', '%'],
  ];

  function syncSliders() {
    for (const [inputId, displayId, prefix, suffix] of sliderMap) {
      const el = getEl(inputId);
      if (!el) continue;
      const display = getEl(displayId);
      if (display) display.textContent = prefix + el.value + suffix;
    }
  }

  function bindSliders() {
    for (const [inputId, displayId, prefix, suffix] of sliderMap) {
      const el = getEl(inputId);
      if (!el) continue;
      el.addEventListener('input', () => {
        const display = getEl(displayId);
        if (display) display.textContent = prefix + el.value + suffix;
      });
    }
  }

  /* ---- Live chip updates on cards ---- */
  function updateChips() {
    const age = val('in_currentAge');
    const retire = val('in_retireAge');
    setText('chipAge', age > 0 ? 'Age ' + age : 'Age —');
    setText('chipRetire', retire > 0 ? 'Retire ' + retire : 'Retire —');

    const salary = val('in_salary');
    const empPct = val('in_empPct');
    const erPct = val('in_erPct');
    setText('chipSalary', salary > 0 ? fmtGBP(salary) : '£0');
    setText('chipContribPct', (empPct + erPct).toFixed(0) + '%');

    const totalContrib = salary > 0 ? (salary * (empPct + erPct)) / 100 : 0;
    setText('kpiTotalContrib', fmtGBP(Math.round(totalContrib)) + '/yr');
    setText('kpiMonthlyContrib', fmtGBP(Math.round(totalContrib / 12)) + '/mo');

    const pot = val('in_pot');
    const dcCount = countChildren('dcPensionsWrap');
    setText('chipPot', pot > 0 ? fmtGBP(pot) : '£0');
    setText('chipDcCount', dcCount > 0 ? dcCount + ' extra' : '0 extra');

    const sp = val('in_statePension');
    setText('chipSP', sp > 0 ? fmtGBP(sp) : '£0');
    setText('chipDraw', val('in_draw') + '%');

    setText('chipAllowance', fmtGBP(val('in_allow')));
    setText('chipBasicTax', val('in_basicTax') + '%');

    setText('chipOther', fmtGBP(val('in_otherIncome')));

    const mode = getEl('in_householdMode');
    const isJoint = mode && mode.value === 'joint';
    setText('chipPartnerMode', isJoint ? 'Joint household' : 'Single person');
    if (isJoint) {
      setText('chipPartnerSalary', fmtGBP(val('in_spouseSalary')));
      setText('chipPartnerPot', fmtGBP(val('in_spousePot')));
    } else {
      setText('chipPartnerSalary', '—');
      setText('chipPartnerPot', '—');
    }

    // Hidden compat elements
    setText('incomeKpiSalary', fmtGBP(salary));
    setText('incomeKpiRetirement', fmtGBP(sp));
    const pensionParts = [];
    if (pot > 0) pensionParts.push(fmtGBP(pot));
    if (dcCount > 0) pensionParts.push(dcCount + ' DC');
    const dbCount = countChildren('dbPensionsWrap');
    if (dbCount > 0) pensionParts.push(dbCount + ' DB');
    setText('incomeKpiPensions', pensionParts.length ? pensionParts.join(' · ') : '£0');
    setText('incomeKpiOther', fmtGBP(val('in_otherIncome')));
    setText('incomePersonalAgeBadge', age > 0 ? 'Age ' + age : 'Age —');
    setText('incomePersonalRetireBadge', retire > 0 ? 'Retire ' + retire : 'Retire —');

    setText('incomeStatSP', sp > 0 ? fmtGBP(sp) + '/yr' : '£0');
    setText('incomeStatDraw', val('in_draw') > 0 ? val('in_draw') + '%/yr' : '£0');
    setText('incomeStatPot', pot > 0 ? fmtGBP(pot) : '£0');
    setText('incomeStatDcExtra', dcCount > 0 ? dcCount + ' pension' + (dcCount > 1 ? 's' : '') : 'None');
    setText('incomeStatDb', dbCount > 0 ? dbCount + ' scheme' + (dbCount > 1 ? 's' : '') : 'None');

    setText('partnerKpiSalary', fmtGBP(val('in_spouseSalary')));
    const pPot = val('in_spousePot');
    const pDc = countChildren('partnerDcPensionsWrap');
    const pDb = countChildren('partnerDbPensionsWrap');
    const pParts = [];
    if (pPot > 0) pParts.push(fmtGBP(pPot));
    if (pDc > 0) pParts.push(pDc + ' DC');
    if (pDb > 0) pParts.push(pDb + ' DB');
    setText('partnerKpiPensions', pParts.length ? pParts.join(' · ') : '£0');
    setText('partnerKpiIncome', fmtGBP(val('in_spouseStatePension') + val('in_spouseOtherIncome')));
    const spouseAge = val('in_spouseCurrentAge');
    const spouseRetire = val('in_spouseRetireAge');
    setText('incomePartnerAgeBadge', spouseAge > 0 ? 'Age ' + spouseAge : 'Age —');
    setText('incomePartnerRetireBadge', spouseRetire > 0 ? 'Retire ' + spouseRetire : 'Retire —');
  }

  /* ---- Household mode toggle ---- */
  function bindHouseholdToggle() {
    const sel = getEl('in_householdMode');
    if (!sel) return;
    const show = () => {
      const fields = document.getElementById('spouseFields');
      if (fields) fields.style.display = sel.value === 'joint' ? '' : 'none';
    };
    sel.addEventListener('change', show);
    show();
  }

  /* ---- Event binding ---- */
  function init() {
    const root = document.getElementById('view-inputs');
    if (!root) return;

    root.addEventListener('click', (e) => {
      const card = e.target.closest('[data-drawer]');
      if (card) {
        openDrawer(card.dataset.drawer);
        return;
      }
      const close = e.target.closest('[data-close-drawer]');
      if (close) {
        closeDrawer();
        return;
      }
    });

    overlay()?.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && openId) closeDrawer();
    });

    bindSliders();
    syncSliders();
    bindHouseholdToggle();
  }

  function updateKPIs() {
    updateChips();
    syncSliders();
  }

  return { init, updateKPIs, openDrawer, closeDrawer };
}
