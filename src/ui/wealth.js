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

  /* ── SVG donut for input progress ── */
  function progressDonut(pct, tone) {
    const r = 32, cx = 40, cy = 40, sw = 6;
    const circ = 2 * Math.PI * r;
    const offset = circ - (circ * pct / 100);
    const col = tone === 'good' ? 'var(--success)' : tone === 'warn' ? 'var(--warning)' : 'var(--accent)';
    return `<svg viewBox="0 0 80 80" class="wealth-donut">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border-1)" stroke-width="${sw}" />
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${col}" stroke-width="${sw}"
        stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
        transform="rotate(-90 ${cx} ${cy})" style="transition:stroke-dashoffset .6s ease" />
      <text x="${cx}" y="${cy + 1}" text-anchor="middle" dominant-baseline="central"
        font-size="14" font-weight="700" fill="var(--heading)">${pct}%</text>
    </svg>`;
  }

  /* ── Retirement countdown bar ── */
  function countdownBar(currentAge, retireAge) {
    if (!currentAge || !retireAge || retireAge <= currentAge) return '';
    const yrs = retireAge - currentAge;
    const pct = Math.min(100, Math.round((currentAge / retireAge) * 100));
    return `<div class="wealth-countdown">
      <div class="wealth-countdown-labels">
        <span>Age ${currentAge}</span>
        <span class="wealth-countdown-mid">${yrs} year${yrs !== 1 ? 's' : ''} to retirement</span>
        <span>Age ${retireAge}</span>
      </div>
      <div class="wealth-countdown-track"><div class="wealth-countdown-fill" style="width:${pct}%"></div></div>
    </div>`;
  }

  /* ── Wealth allocation bar ── */
  function allocationBar(segs) {
    const total = segs.reduce((s, x) => s + x.value, 0) || 1;
    const bars = segs.filter(s => s.value > 0).map(s => {
      const w = Math.max(3, (s.value / total) * 100);
      return `<div class="wealth-alloc-seg" style="width:${w}%;background:${s.color}" title="${s.label}: ${fmtGBP(s.value)}"></div>`;
    }).join('');
    const legend = segs.filter(s => s.value > 0).map(s =>
      `<div class="wealth-alloc-legend-item">
        <span class="wealth-alloc-dot" style="background:${s.color}"></span>
        <span class="wealth-alloc-legend-label">${s.label}</span>
        <strong>${fmtGBP(s.value)}</strong>
      </div>`
    ).join('');
    return `<div class="wealth-alloc-bar">${bars}</div><div class="wealth-alloc-legend">${legend}</div>`;
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

    /* Pension wealth = workplace pot + partner pot */
    const totalPensionWealth = pot + spousePot;

    /* Working income (excludes state pension — that starts later) */
    const workingIncome = salary + otherIncome + (isJoint ? spouseSalary : 0);

    /* Contribution rate */
    const totalContribPct = empPct + erPct;
    const annualContrib = salary > 0 ? Math.round(salary * totalContribPct / 100) : 0;
    const monthlyContrib = Math.round(annualContrib / 12);

    /* Input completeness */
    const essentials = [currentAge, retireAge, stateAge, salary > 0];
    const done = essentials.filter(Boolean).length;
    const pct = Math.round((done / essentials.length) * 100);
    const progressTone = pct === 100 ? 'good' : pct >= 50 ? 'warn' : 'todo';

    /* Allocation segments */
    const allocSegs = [];
    if (pot > 0) allocSegs.push({ label: 'Workplace DC', value: pot, color: '#6366f1' });
    if (spousePot > 0) allocSegs.push({ label: 'Partner pot', value: spousePot, color: '#818cf8' });

    /* ── Hero + stats ── */
    headlineHost.innerHTML = `
      <div class="wealth-hero">
        <div class="wealth-hero-main">
          <div class="wealth-hero-eyebrow">Total pension wealth</div>
          <div class="wealth-hero-value">${fmtGBP(totalPensionWealth)}</div>
          <div class="wealth-hero-tags">
            ${pot > 0 ? '<span class="wealth-tag">🏦 Workplace: ' + fmtGBP(pot) + '</span>' : ''}
            ${spousePot > 0 ? '<span class="wealth-tag">👫 Partner: ' + fmtGBP(spousePot) + '</span>' : ''}
            ${dcCount > 0 ? '<span class="wealth-tag">📦 ' + dcCount + ' extra DC pot' + (dcCount > 1 ? 's' : '') + '</span>' : ''}
            ${dbCount > 0 ? '<span class="wealth-tag">🏆 ' + dbCount + ' DB scheme' + (dbCount > 1 ? 's' : '') + '</span>' : ''}
          </div>
        </div>
        <div class="wealth-hero-donut">
          ${progressDonut(pct, progressTone)}
          <div class="wealth-hero-donut-label">Inputs</div>
        </div>
      </div>

      ${allocSegs.length > 1 ? '<div class="wealth-alloc">' + allocationBar(allocSegs) + '</div>' : ''}

      ${countdownBar(currentAge, retireAge)}

      <div class="wealth-stat-row">
        <div class="wealth-stat">
          <div class="wealth-stat-icon">💼</div>
          <div class="wealth-stat-body">
            <div class="wealth-stat-label">Working income</div>
            <div class="wealth-stat-value">${fmtGBP(workingIncome)}<span class="wealth-stat-unit"> /yr</span></div>
            <div class="wealth-stat-meta">${salary > 0 ? fmtGBP(salary) + ' salary' : 'No salary'}${otherIncome > 0 ? ' + ' + fmtGBP(otherIncome) + ' other' : ''}${isJoint && spouseSalary > 0 ? ' + ' + fmtGBP(spouseSalary) + ' partner' : ''}</div>
          </div>
        </div>
        <div class="wealth-stat">
          <div class="wealth-stat-icon">💰</div>
          <div class="wealth-stat-body">
            <div class="wealth-stat-label">Pension saving</div>
            <div class="wealth-stat-value">${fmtGBP(monthlyContrib)}<span class="wealth-stat-unit"> /mo</span></div>
            <div class="wealth-stat-meta">${totalContribPct > 0 ? totalContribPct.toFixed(1).replace(/\.0$/, '') + '% of salary (' + fmtGBP(annualContrib) + '/yr)' : 'No contributions set'}</div>
          </div>
        </div>
        <div class="wealth-stat">
          <div class="wealth-stat-icon">🏠</div>
          <div class="wealth-stat-body">
            <div class="wealth-stat-label">State pension</div>
            <div class="wealth-stat-value">${statePension > 0 ? fmtGBP(statePension) : '—'}<span class="wealth-stat-unit">${statePension > 0 ? ' /yr' : ''}</span></div>
            <div class="wealth-stat-meta">${stateAge ? 'Starts at age ' + stateAge : 'Age not set'}</div>
          </div>
        </div>
      </div>`;

    /* ── Build unified detail items ── */
    const personalItems = [];
    personalItems.push(currentAge ? '🎂 Age ' + currentAge : '🎂 <em>Age not set</em>');
    personalItems.push(retireAge ? '🎯 Retire at ' + retireAge : '🎯 <em>Retirement age not set</em>');
    personalItems.push(stateAge ? '🏠 State pension at ' + stateAge : '🏠 <em>SP age not set</em>');
    if (isJoint) {
      if (spouseAge) personalItems.push('👫 Partner age ' + spouseAge);
      if (spouseRetire) personalItems.push('👫 Partner retires at ' + spouseRetire);
    }

    const earningsItems = [];
    earningsItems.push(salary > 0 ? '💵 ' + fmtGBP(salary) + '/yr salary' : '💵 <em>No salary set</em>');
    earningsItems.push(totalContribPct > 0 ? '🎯 You ' + empPct + '% + Employer ' + erPct + '%' : '🎯 <em>No contributions</em>');
    if (otherIncome > 0) earningsItems.push('📊 ' + fmtGBP(otherIncome) + '/yr other income');
    if (isJoint && spouseSalary > 0) earningsItems.push('👫 Partner: ' + fmtGBP(spouseSalary) + '/yr');

    const pensionItems = [];
    pensionItems.push(pot > 0 ? '🏦 Workplace DC: ' + fmtGBP(pot) : '🏦 <em>No workplace pot</em>');
    if (dcCount > 0) pensionItems.push('📦 ' + dcCount + ' extra DC pot' + (dcCount > 1 ? 's' : ''));
    if (dbCount > 0) pensionItems.push('🏆 ' + dbCount + ' DB scheme' + (dbCount > 1 ? 's' : ''));
    if (contribCount > 0) pensionItems.push('➕ ' + contribCount + ' extra contribution' + (contribCount > 1 ? 's' : ''));
    if (lumpCount > 0) pensionItems.push('💸 ' + lumpCount + ' lump sum' + (lumpCount > 1 ? 's' : ''));
    if (isJoint && spousePot > 0) pensionItems.push('👫 Partner pot: ' + fmtGBP(spousePot));

    const listHTML = items => items.map(i => '<div class="wealth-detail-item">' + i + '</div>').join('');

    /* ── Unified details card ── */
    gridHost.innerHTML = `
      <div class="wealth-details-card">
        <div class="wealth-details-section" data-wealth-nav="personal">
          <div class="wealth-details-head">
            <span class="wealth-details-icon">👤</span>
            <h4>Personal &amp; Timeline</h4>
            <button class="wealth-details-edit" type="button" data-wealth-nav="personal">Edit →</button>
          </div>
          <div class="wealth-details-body">${listHTML(personalItems)}</div>
        </div>
        <div class="wealth-details-divider"></div>
        <div class="wealth-details-section" data-wealth-nav="earnings">
          <div class="wealth-details-head">
            <span class="wealth-details-icon">💼</span>
            <h4>Earnings &amp; Contributions</h4>
            <button class="wealth-details-edit" type="button" data-wealth-nav="earnings">Edit →</button>
          </div>
          <div class="wealth-details-body">${listHTML(earningsItems)}</div>
        </div>
        <div class="wealth-details-divider"></div>
        <div class="wealth-details-section" data-wealth-nav="pensions">
          <div class="wealth-details-head">
            <span class="wealth-details-icon">🏦</span>
            <h4>Pensions &amp; Lump Sums</h4>
            <button class="wealth-details-edit" type="button" data-wealth-nav="pensions">Edit →</button>
          </div>
          <div class="wealth-details-body">${listHTML(pensionItems)}</div>
        </div>
        ${isJoint ? `
        <div class="wealth-details-divider"></div>
        <div class="wealth-details-section" data-wealth-nav="partner">
          <div class="wealth-details-head">
            <span class="wealth-details-icon">👫</span>
            <h4>Partner &amp; Household</h4>
            <button class="wealth-details-edit" type="button" data-wealth-nav="partner">Edit →</button>
          </div>
          <div class="wealth-details-body">
            <div class="wealth-detail-item">${spouseAge ? '🎂 Partner age ' + spouseAge : '🎂 <em>Partner age not set</em>'}</div>
            <div class="wealth-detail-item">${spouseRetire ? '🎯 Retire at ' + spouseRetire : '🎯 <em>Retirement age not set</em>'}</div>
            <div class="wealth-detail-item">${spousePot > 0 ? '🏦 Partner pot: ' + fmtGBP(spousePot) : '🏦 <em>No partner pot</em>'}</div>
            ${spouseSalary > 0 ? '<div class="wealth-detail-item">💵 Partner salary: ' + fmtGBP(spouseSalary) + '/yr</div>' : ''}
          </div>
        </div>` : ''}
      </div>`;

    gridHost.querySelectorAll('[data-wealth-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.wealthNav;
        const routes = {
          personal: ['you', 'drawer-personal', 'in_dob'],
          earnings: ['you', 'drawer-employment', 'in_salary'],
          pensions: ['you', 'drawer-pensions', 'btnAddDc'],
          partner:  ['partner', 'drawer-partner', 'in_householdMode'],
        };
        const route = routes[target];
        if (route) goToInputs(...route);
      });
    });
  }

  return { render };
}
