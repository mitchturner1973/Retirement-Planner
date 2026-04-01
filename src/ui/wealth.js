export function createWealthDashboard({ getEl, fmtGBP, goToInputs }) {
  const $ = getEl;

  function readNumber(id) {
    const el = $(id);
    if (!el) return null;
    const v = Number(el.value);
    return Number.isFinite(v) ? v : null;
  }

  function countCards(id) {
    const wrap = $(id);
    if (!wrap) return 0;
    return wrap.querySelectorAll('.repeatCard').length;
  }

  function render() {
    const headlineHost = $('wealthHeadline');
    const gridHost = $('wealthGrid');
    if (!headlineHost || !gridHost) return;

    const currentAge = readNumber('in_currentAge');
    const retireAge = readNumber('in_retireAge');
    const stateAge = readNumber('in_stateAge');
    const salary = readNumber('in_salary') || 0;
    const otherIncome = readNumber('in_otherIncome') || 0;
    const empPct = readNumber('in_empPct') || 0;
    const erPct = readNumber('in_erPct') || 0;
    const pot = readNumber('in_pot') || 0;
    const statePension = readNumber('in_statePension') || 0;
    const dcCount = countCards('dcPensionsWrap');
    const dbCount = countCards('dbPensionsWrap');
    const contribCount = countCards('contribEventsWrap');
    const lumpCount = countCards('lumpSumEventsWrap');

    const householdMode = $('in_householdMode')?.value || 'single';
    const isJoint = householdMode === 'joint';
    const spouseAge = readNumber('in_spouseCurrentAge');
    const spouseRetire = readNumber('in_spouseRetireAge');
    const spousePot = readNumber('in_spousePot') || 0;
    const spouseSalary = readNumber('in_spouseSalary') || 0;

    const totalPots = pot + spousePot;
    const annualIncome = salary + otherIncome + (isJoint ? spouseSalary : 0);

    const essentials = [currentAge, retireAge, stateAge, salary > 0];
    const done = essentials.filter(Boolean).length;
    const pct = Math.round((done / essentials.length) * 100);
    const progressTone = pct === 100 ? 'good' : pct >= 50 ? 'warn' : 'todo';

    headlineHost.innerHTML = `
      <div class="wealth-kpi-row">
        <div class="wealth-kpi">
          <div class="wealth-kpi-label">Pension wealth</div>
          <div class="wealth-kpi-value">${fmtGBP(totalPots)}</div>
          <div class="wealth-kpi-meta">${dcCount ? dcCount + ' extra DC pot' + (dcCount > 1 ? 's' : '') : 'Workplace pot only'}</div>
        </div>
        <div class="wealth-kpi">
          <div class="wealth-kpi-label">Annual income</div>
          <div class="wealth-kpi-value">${fmtGBP(annualIncome)}</div>
          <div class="wealth-kpi-meta">${statePension > 0 ? '+ ' + fmtGBP(statePension) + ' state pension' : 'State pension not set'}</div>
        </div>
        <div class="wealth-kpi">
          <div class="wealth-kpi-label">Input progress</div>
          <div class="wealth-kpi-value">${pct}<span class="wealth-kpi-unit">%</span></div>
          <div class="wealth-kpi-bar" data-tone="${progressTone}"><span style="width:${pct}%"></span></div>
        </div>
      </div>`;

    gridHost.innerHTML = `
      <button class="wealth-card" data-wealth-nav="personal" type="button">
        <div class="wealth-card-head">
          <span class="wealth-card-icon"><svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M12 4a4 4 0 110 8 4 4 0 010-8zm-6.5 14c0-2.49 3.58-4 6.5-4s6.5 1.51 6.5 4v2H5.5z"/></svg></span>
          <span class="wealth-card-title">Personal Profile</span>
          <span class="wealth-card-action">Edit &rarr;</span>
        </div>
        <div class="wealth-card-body">
          <div class="wealth-card-stat">${currentAge ? 'Age ' + currentAge : '<span class="wealth-card-empty">Age not set</span>'}</div>
          <div class="wealth-card-stat">${retireAge ? 'Retire at ' + retireAge : '<span class="wealth-card-empty">Retirement age not set</span>'}</div>
          <div class="wealth-card-stat">${stateAge ? 'State pension at ' + stateAge : '<span class="wealth-card-empty">State pension age not set</span>'}</div>
        </div>
      </button>

      <button class="wealth-card" data-wealth-nav="earnings" type="button">
        <div class="wealth-card-head">
          <span class="wealth-card-icon"><svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg></span>
          <span class="wealth-card-title">Earnings &amp; Buffers</span>
          <span class="wealth-card-action">Edit &rarr;</span>
        </div>
        <div class="wealth-card-body">
          <div class="wealth-card-stat">${salary > 0 ? fmtGBP(salary) + '/yr salary' : '<span class="wealth-card-empty">No salary set</span>'}</div>
          <div class="wealth-card-stat">${(empPct + erPct) > 0 ? (empPct + erPct).toFixed(1).replace(/\\.0$/, '') + '% pension saving' : '<span class="wealth-card-empty">No contributions set</span>'}</div>
          <div class="wealth-card-stat">${otherIncome > 0 ? fmtGBP(otherIncome) + '/yr other income' : '<span class="wealth-card-empty">No other income</span>'}</div>
        </div>
      </button>

      <button class="wealth-card" data-wealth-nav="pensions" type="button">
        <div class="wealth-card-head">
          <span class="wealth-card-icon"><svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M4 10h3v7H4zm6.5 0h3v7h-3zM2 19h20v3H2zm15-9h3v7h-3zM12 1L2 6v2h20V6z"/></svg></span>
          <span class="wealth-card-title">Pensions &amp; Lump Sums</span>
          <span class="wealth-card-action">Edit &rarr;</span>
        </div>
        <div class="wealth-card-body">
          <div class="wealth-card-stat">${pot > 0 ? 'Workplace pot: ' + fmtGBP(pot) : '<span class="wealth-card-empty">No pension pot set</span>'}</div>
          <div class="wealth-card-stat">${dcCount} DC pot${dcCount !== 1 ? 's' : ''} &bull; ${dbCount} DB pension${dbCount !== 1 ? 's' : ''}</div>
          <div class="wealth-card-stat">${contribCount ? contribCount + ' extra contribution' + (contribCount > 1 ? 's' : '') : 'No extra contributions'}${lumpCount ? ' &bull; ' + lumpCount + ' lump sum' + (lumpCount > 1 ? 's' : '') : ''}</div>
        </div>
      </button>

      <button class="wealth-card" data-wealth-nav="partner" type="button">
        <div class="wealth-card-head">
          <span class="wealth-card-icon"><svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg></span>
          <span class="wealth-card-title">Partner &amp; Household</span>
          <span class="wealth-card-action">Edit &rarr;</span>
        </div>
        <div class="wealth-card-body">
          ${isJoint ? `
            <div class="wealth-card-stat">${spouseAge ? 'Partner age ' + spouseAge : '<span class="wealth-card-empty">Partner age not set</span>'}</div>
            <div class="wealth-card-stat">${spouseRetire ? 'Retire at ' + spouseRetire : '<span class="wealth-card-empty">Retirement age not set</span>'}</div>
            <div class="wealth-card-stat">${spousePot > 0 ? 'Partner pot: ' + fmtGBP(spousePot) : '<span class="wealth-card-empty">No partner pot</span>'}</div>
          ` : `
            <div class="wealth-card-stat">Single person plan</div>
            <div class="wealth-card-stat wealth-card-empty">Switch to joint household to add partner details</div>
          `}
        </div>
      </button>`;

    gridHost.querySelectorAll('[data-wealth-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.wealthNav;
        const routes = {
          personal: ['you', 'you-personal', 'in_dob'],
          earnings: ['you', 'you-earnings', 'in_salary'],
          pensions: ['you', 'you-dc', 'btnAddDc'],
          partner:  ['partner', 'partner-personal', 'in_householdMode'],
        };
        const route = routes[target];
        if (route) goToInputs(...route);
      });
    });
  }

  return { render };
}
