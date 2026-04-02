/**
 * Expenses page: take-home pay, monthly bills, one-offs, category breakdown.
 * UK-focused categories, quick-add presets, inline edit, grouped list.
 */
export function createExpensesPanel({ getEl, fmtGBP }) {
  const $ = getEl;

  /* ── UK-focused categories (bills) ── */
  const CAT_META = {
    mortgage:      { icon: '🏠', label: 'Mortgage / Rent',    color: '#6366f1', group: 'Housing',      essential: true },
    council_tax:   { icon: '🏛️', label: 'Council Tax',        color: '#818cf8', group: 'Housing',      essential: true },
    energy:        { icon: '⚡', label: 'Gas & Electric',     color: '#f59e0b', group: 'Utilities',    essential: true },
    water:         { icon: '💧', label: 'Water',               color: '#06b6d4', group: 'Utilities',    essential: true },
    broadband:     { icon: '🌐', label: 'Broadband / Internet', color: '#8b5cf6', group: 'Utilities',   essential: true },
    mobile:        { icon: '📱', label: 'Mobile Phone',        color: '#a78bfa', group: 'Utilities',    essential: true },
    tv_licence:    { icon: '📺', label: 'TV Licence',          color: '#c084fc', group: 'Utilities',    essential: true },
    food:          { icon: '🛒', label: 'Food & Groceries',    color: '#ef4444', group: 'Living',       essential: true },
    dining:        { icon: '🍽️', label: 'Dining Out',         color: '#f97316', group: 'Living',       essential: false },
    fuel:          { icon: '⛽', label: 'Fuel / Petrol',       color: '#22c55e', group: 'Transport',    essential: true },
    car_insurance: { icon: '🚗', label: 'Car Insurance',       color: '#10b981', group: 'Transport',    essential: true },
    car_tax:       { icon: '🚙', label: 'Car Tax (VED)',       color: '#14b8a6', group: 'Transport',    essential: true },
    car_finance:   { icon: '🔑', label: 'Car Finance / Lease', color: '#059669', group: 'Transport',    essential: true },
    public_trans:  { icon: '🚆', label: 'Public Transport',    color: '#34d399', group: 'Transport',    essential: true },
    home_ins:      { icon: '🏡', label: 'Home Insurance',      color: '#ec4899', group: 'Insurance',    essential: true },
    life_ins:      { icon: '🛡️', label: 'Life Insurance',     color: '#f472b6', group: 'Insurance',    essential: true },
    pet_ins:       { icon: '🐾', label: 'Pet Insurance',       color: '#fb7185', group: 'Insurance',    essential: false },
    gym:           { icon: '💪', label: 'Gym / Fitness',       color: '#14b8a6', group: 'Lifestyle',    essential: false },
    streaming:     { icon: '🎬', label: 'Streaming / Subs',    color: '#e879f9', group: 'Lifestyle',    essential: false },
    clothing:      { icon: '👕', label: 'Clothing',             color: '#c084fc', group: 'Lifestyle',    essential: false },
    entertainment: { icon: '🎭', label: 'Entertainment',       color: '#38bdf8', group: 'Lifestyle',    essential: false },
    health:        { icon: '💊', label: 'Health / Dental',     color: '#fb923c', group: 'Health',       essential: true },
    childcare:     { icon: '👶', label: 'Childcare / School',  color: '#06b6d4', group: 'Family',       essential: true },
    pet:           { icon: '🐕', label: 'Pet Costs',           color: '#a3e635', group: 'Family',       essential: false },
    debt:          { icon: '💳', label: 'Debt Repayments',     color: '#f43f5e', group: 'Financial',    essential: true },
    other:         { icon: '📦', label: 'Other',                color: '#94a3b8', group: 'Other',        essential: true },
  };

  /* ── Savings & goals categories ── */
  const SAVINGS_CATS = {
    ss_isa:        { icon: '📈', label: 'Stocks & Shares ISA',  color: '#6366f1' },
    cash_isa:      { icon: '🏦', label: 'Cash ISA',             color: '#818cf8' },
    lisa:          { icon: '🏠', label: 'Lifetime ISA (LISA)',   color: '#a78bfa' },
    emergency:     { icon: '🛟', label: 'Emergency Fund',       color: '#f59e0b' },
    premium_bonds: { icon: '🎰', label: 'Premium Bonds',        color: '#fbbf24' },
    general:       { icon: '💰', label: 'General Savings',      color: '#4ade80' },
    home_repairs:  { icon: '🔧', label: 'Home Repairs Fund',    color: '#f97316' },
    holidays:      { icon: '✈️', label: 'Holidays & Fun',       color: '#3b82f6' },
    new_car:       { icon: '🚗', label: 'Next Car Fund',        color: '#22c55e' },
    children:      { icon: '👶', label: 'Children (Jr ISA etc)', color: '#06b6d4' },
    education:     { icon: '📚', label: 'Education / Training', color: '#8b5cf6' },
    pension_extra: { icon: '🏛️', label: 'Extra Pension (SIPP)', color: '#ec4899' },
    charity:       { icon: '💝', label: 'Charity / Giving',     color: '#f472b6' },
    other:         { icon: '📦', label: 'Other Savings',        color: '#94a3b8' },
  };

  /* ── One-off categories ── */
  const ONEOFF_CATS = {
    holiday:    { icon: '✈️', label: 'Holiday',          color: '#3b82f6' },
    home_imp:   { icon: '🔨', label: 'Home Improvement', color: '#a78bfa' },
    car:        { icon: '🚗', label: 'Car Purchase/Repair', color: '#22c55e' },
    appliance:  { icon: '🏠', label: 'Appliance',        color: '#f59e0b' },
    wedding:    { icon: '💒', label: 'Wedding / Event',  color: '#f472b6' },
    christmas:  { icon: '🎄', label: 'Christmas',        color: '#ef4444' },
    gift:       { icon: '🎁', label: 'Gift',             color: '#fb923c' },
    medical:    { icon: '🏥', label: 'Medical / Dental', color: '#06b6d4' },
    education:  { icon: '📚', label: 'Education / Course', color: '#8b5cf6' },
    other:      { icon: '📦', label: 'Other',            color: '#94a3b8' },
  };

  /* ── Subscription categories ── */
  const SUBS_CATS = {
    streaming:    { icon: '🎬', label: 'Streaming',          color: '#e879f9' },
    music:        { icon: '🎵', label: 'Music',              color: '#a78bfa' },
    gaming:       { icon: '🎮', label: 'Gaming',             color: '#34d399' },
    tv:           { icon: '📺', label: 'TV / Sport',         color: '#f97316' },
    gym:          { icon: '💪', label: 'Gym / Fitness',      color: '#14b8a6' },
    health_app:   { icon: '🧘', label: 'Health & Wellbeing', color: '#06b6d4' },
    cloud:        { icon: '☁️', label: 'Cloud Storage',      color: '#3b82f6' },
    software:     { icon: '💻', label: 'Software / Apps',    color: '#6366f1' },
    vpn:          { icon: '🔒', label: 'VPN / Security',     color: '#ef4444' },
    news:         { icon: '📰', label: 'News',               color: '#64748b' },
    learning:     { icon: '📚', label: 'Learning',           color: '#8b5cf6' },
    prime:        { icon: '📦', label: 'Amazon Prime',       color: '#f59e0b' },
    delivery:     { icon: '🛵', label: 'Delivery Pass',      color: '#22c55e' },
    charity_sub:  { icon: '💝', label: 'Charity / Donations', color: '#f472b6' },
    other_sub:    { icon: '📋', label: 'Other Subscription',  color: '#94a3b8' },
  };

  /* ── Quick-add UK presets ── */
  const PRESETS = [
    { name: 'Mortgage',          amount: 1200, freq: 'monthly', cat: 'mortgage' },
    { name: 'Council Tax',       amount: 180,  freq: 'monthly', cat: 'council_tax' },
    { name: 'Gas & Electric',    amount: 150,  freq: 'monthly', cat: 'energy' },
    { name: 'Water',             amount: 40,   freq: 'monthly', cat: 'water' },
    { name: 'Broadband',         amount: 35,   freq: 'monthly', cat: 'broadband' },
    { name: 'Mobile Phone',      amount: 30,   freq: 'monthly', cat: 'mobile' },
    { name: 'TV Licence',        amount: 170,  freq: 'annual',  cat: 'tv_licence' },
    { name: 'Food Shop',         amount: 500,  freq: 'monthly', cat: 'food' },
    { name: 'Car Insurance',     amount: 500,  freq: 'annual',  cat: 'car_insurance' },
    { name: 'Car Tax',           amount: 190,  freq: 'annual',  cat: 'car_tax' },
    { name: 'Fuel',              amount: 150,  freq: 'monthly', cat: 'fuel' },
    { name: 'Home Insurance',    amount: 350,  freq: 'annual',  cat: 'home_ins' },
    { name: 'Life Insurance',    amount: 30,   freq: 'monthly', cat: 'life_ins' },
    { name: 'Streaming (Netflix etc)', amount: 25, freq: 'monthly', cat: 'streaming' },
    { name: 'Gym Membership',    amount: 40,   freq: 'monthly', cat: 'gym' },
    { name: 'Dining Out',        amount: 100,  freq: 'monthly', cat: 'dining' },
  ];

  let expenses = [];
  let oneoffs = [];
  let subscriptions = [];
  let savingsItems = [];
  let _nextId = 1;
  let editingId = null;

  function uid() { return 'exp_' + (_nextId++); }

  /* ── UK 2025-26 take-home pay ── */
  function calcTakeHome(gross) {
    if (gross <= 0) return { gross: 0, incomeTax: 0, ni: 0, net: 0, pensionDeduction: 0 };

    const empPct = Number($('in_empPct')?.value || 0);
    const pensionDeduction = Math.round(gross * empPct / 100);
    const taxableGross = gross - pensionDeduction;

    let allowance = 12570;
    if (taxableGross > 100000) allowance = Math.max(0, 12570 - Math.floor((taxableGross - 100000) / 2));

    const taxable = Math.max(0, taxableGross - allowance);
    const basicBand = 37700;
    const additionalThreshold = 125140;
    let tax = 0;
    if (taxable <= basicBand) {
      tax = taxable * 0.20;
    } else if (taxableGross <= additionalThreshold) {
      tax = basicBand * 0.20 + (taxable - basicBand) * 0.40;
    } else {
      const higherBand = additionalThreshold - allowance - basicBand;
      tax = basicBand * 0.20 + Math.max(0, higherBand) * 0.40 + Math.max(0, taxable - basicBand - Math.max(0, higherBand)) * 0.45;
    }

    const weeklyGross = taxableGross / 52;
    const primaryThreshold = 242;
    const upperLimit = 967;
    let weeklyNI = 0;
    if (weeklyGross > primaryThreshold) {
      weeklyNI = Math.min(weeklyGross, upperLimit) - primaryThreshold;
      weeklyNI *= 0.08;
      if (weeklyGross > upperLimit) weeklyNI += (weeklyGross - upperLimit) * 0.02;
    }
    const ni = Math.round(weeklyNI * 52);

    return {
      gross,
      pensionDeduction,
      incomeTax: Math.round(tax),
      ni,
      net: gross - Math.round(tax) - ni - pensionDeduction,
    };
  }

  function toMonthly(amount, freq) {
    if (freq === 'weekly') return amount * 52 / 12;
    if (freq === 'annual') return amount / 12;
    return amount;
  }

  function save() {
    const el = $('in_expenses');
    if (el) el.value = JSON.stringify(expenses);
    const el2 = $('in_oneoffs');
    if (el2) el2.value = JSON.stringify(oneoffs);
    const el3 = $('in_savings');
    if (el3) el3.value = JSON.stringify(savingsItems);
    const el4 = $('in_subs');
    if (el4) el4.value = JSON.stringify(subscriptions);
    // Trigger auto-save (programmatic .value sets don't fire events)
    (el || el2 || el3 || el4)?.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function load() {
    try { expenses = JSON.parse($('in_expenses')?.value || '[]'); } catch { expenses = []; }
    try { oneoffs = JSON.parse($('in_oneoffs')?.value || '[]'); } catch { oneoffs = []; }
    try { savingsItems = JSON.parse($('in_savings')?.value || '[]'); } catch { savingsItems = []; }
    try { subscriptions = JSON.parse($('in_subs')?.value || '[]'); } catch { subscriptions = []; }
    expenses.forEach(e => { if (!e.id) e.id = uid(); });
    oneoffs.forEach(e => { if (!e.id) e.id = uid(); });
    savingsItems.forEach(e => { if (!e.id) e.id = uid(); });
    subscriptions.forEach(e => { if (!e.id) e.id = uid(); });
  }

  /* ── SVG donut ── */
  function categoryDonut(catTotals) {
    const entries = Object.entries(catTotals).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return '';
    const total = entries.reduce((s, [, v]) => s + v, 0);
    const r = 60, cx = 80, cy = 80, sw = 22;
    const circ = 2 * Math.PI * r;
    let offset = 0;
    const allMeta = { ...CAT_META, ...ONEOFF_CATS, ...SAVINGS_CATS, ...SUBS_CATS };
    const arcs = entries.map(([cat, val]) => {
      const pct = val / total;
      const dash = circ * pct;
      const gap = circ - dash;
      const meta = allMeta[cat] || CAT_META.other;
      const arc = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${meta.color}" stroke-width="${sw}"
        stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-offset}"
        transform="rotate(-90 ${cx} ${cy})" />`;
      offset += dash;
      return arc;
    }).join('');
    const legend = entries.map(([cat, val]) => {
      const meta = allMeta[cat] || CAT_META.other;
      const pct = Math.round((val / total) * 100);
      return `<div class="exp-legend-item">
        <span class="exp-legend-dot" style="background:${meta.color}"></span>
        <span class="exp-legend-label">${meta.icon} ${meta.label}</span>
        <span class="exp-legend-value">${fmtGBP(Math.round(val))}/mo</span>
        <span class="exp-legend-pct">${pct}%</span>
      </div>`;
    }).join('');

    return `<div class="exp-chart-wrap">
      <div class="exp-donut-wrap">
        <svg viewBox="0 0 160 160" class="exp-donut">${arcs}
          <text x="${cx}" y="${cy - 6}" text-anchor="middle" dominant-baseline="central" font-size="16" font-weight="700" fill="var(--text-1)">${fmtGBP(Math.round(total))}</text>
          <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="10" fill="var(--text-3)">per month</text>
        </svg>
      </div>
      <div class="exp-legend">${legend}</div>
    </div>`;
  }

  /* ── Budget bar (income vs spend) ── */
  function budgetBar(income, spend) {
    if (income <= 0) return '';
    const usedPct = Math.min(100, Math.round((spend / income) * 100));
    const tone = usedPct >= 100 ? 'danger' : usedPct >= 80 ? 'warn' : 'good';
    return `<div class="exp-budget-bar-wrap">
      <div class="exp-budget-labels">
        <span>Budget used</span>
        <span class="exp-budget-pct exp-budget-pct--${tone}">${usedPct}%</span>
      </div>
      <div class="exp-budget-track">
        <div class="exp-budget-fill exp-budget-fill--${tone}" style="width:${usedPct}%"></div>
      </div>
      <div class="exp-budget-labels exp-budget-labels--sub">
        <span>${fmtGBP(Math.round(spend))} spent</span>
        <span>${fmtGBP(Math.round(income))} income</span>
      </div>
    </div>`;
  }

  /* ── Render ── */
  function render() {
    load();
    const heroHost = $('expHero');
    const listHost = $('expList');
    const chartHost = $('expChart');
    const retHost = $('expRetirement');
    if (!heroHost) return;

    const salary = Number($('in_salary')?.value || 0);
    const otherIncome = Number($('in_otherIncome')?.value || 0);
    const takeHome = calcTakeHome(salary);
    const monthlyNet = Math.round(takeHome.net / 12);
    const monthlyOther = Math.round(otherIncome / 12);
    const totalMonthlyIncome = monthlyNet + monthlyOther;

    const totalMonthlyBills = expenses.reduce((s, e) => s + toMonthly(e.amount, e.freq), 0);
    const totalMonthlyOneoffs = oneoffs.reduce((s, e) => s + e.amount / 12, 0);
    const totalMonthlySavings = savingsItems.reduce((s, e) => s + toMonthly(e.amount, e.freq), 0);
    const totalMonthlySubs = subscriptions.reduce((s, e) => s + toMonthly(e.amount, e.freq), 0);
    const totalMonthlySpend = totalMonthlyBills + totalMonthlyOneoffs + totalMonthlySubs;
    const totalOut = totalMonthlySpend + totalMonthlySavings;
    const surplus = totalMonthlyIncome - totalOut;

    const essentialTotal = expenses.filter(e => e.type === 'essential').reduce((s, e) => s + toMonthly(e.amount, e.freq), 0);
    const discretionaryTotal = expenses.filter(e => e.type !== 'essential').reduce((s, e) => s + toMonthly(e.amount, e.freq), 0);

    const surplusTone = surplus >= 500 ? 'good' : surplus >= 0 ? 'warn' : 'danger';
    const surplusLabel = surplus >= 0 ? 'Surplus' : 'Deficit';

    heroHost.innerHTML = `
      <div class="exp-hero-row">
        <div class="exp-hero-card exp-hero-card--income">
          <div class="exp-hero-eyebrow">Monthly take-home</div>
          <div class="exp-hero-value">${fmtGBP(monthlyNet)}</div>
          <div class="exp-hero-meta">
            ${fmtGBP(salary)}/yr gross → ${fmtGBP(takeHome.net)}/yr net
          </div>
          <div class="exp-hero-breakdown">
            <span>Tax: ${fmtGBP(takeHome.incomeTax)}</span>
            <span>NI: ${fmtGBP(takeHome.ni)}</span>
            ${takeHome.pensionDeduction > 0 ? '<span>Pension: ' + fmtGBP(takeHome.pensionDeduction) + '</span>' : ''}
          </div>
        </div>
        <div class="exp-hero-card exp-hero-card--spend">
          <div class="exp-hero-eyebrow">Monthly outgoings</div>
          <div class="exp-hero-value">${fmtGBP(Math.round(totalOut))}</div>
          <div class="exp-hero-meta">
            ${expenses.length} bill${expenses.length !== 1 ? 's' : ''} + ${subscriptions.length} sub${subscriptions.length !== 1 ? 's' : ''} + ${oneoffs.length} one-off${oneoffs.length !== 1 ? 's' : ''} + ${savingsItems.length} saving${savingsItems.length !== 1 ? 's' : ''}
          </div>
          <div class="exp-hero-breakdown">
            <span>Bills: ${fmtGBP(Math.round(totalMonthlyBills))}</span>
            <span>Subs: ${fmtGBP(Math.round(totalMonthlySubs))}</span>
            <span>Savings: ${fmtGBP(Math.round(totalMonthlySavings))}</span>
          </div>
        </div>
        <div class="exp-hero-card exp-hero-card--surplus exp-hero-card--${surplusTone}">
          <div class="exp-hero-eyebrow">${surplusLabel}</div>
          <div class="exp-hero-value">${fmtGBP(Math.abs(Math.round(surplus)))}</div>
          <div class="exp-hero-meta">
            ${surplus >= 0 ? 'Left over each month' : 'Over budget each month'}
          </div>
          ${monthlyOther > 0 ? '<div class="exp-hero-breakdown"><span>Includes ' + fmtGBP(monthlyOther) + '/mo other income</span></div>' : ''}
        </div>
      </div>
      ${budgetBar(totalMonthlyIncome, totalOut)}`;

    // ── Grouped expense list ──
    const allMeta = { ...CAT_META, ...ONEOFF_CATS, ...SAVINGS_CATS, ...SUBS_CATS };
    let billsHTML = '';
    if (expenses.length > 0) {
      // Group by CAT_META group
      const groups = {};
      expenses.forEach(e => {
        const meta = CAT_META[e.cat] || CAT_META.other;
        const g = meta.group || 'Other';
        if (!groups[g]) groups[g] = [];
        groups[g].push(e);
      });

      const groupOrder = ['Housing', 'Utilities', 'Living', 'Transport', 'Insurance', 'Health', 'Family', 'Lifestyle', 'Financial', 'Other'];
      const sortedGroups = groupOrder.filter(g => groups[g]);

      const groupsHTML = sortedGroups.map(g => {
        const items = groups[g];
        const groupTotal = items.reduce((s, e) => s + toMonthly(e.amount, e.freq), 0);
        const rows = items.map(e => {
          const meta = CAT_META[e.cat] || CAT_META.other;
          const mo = toMonthly(e.amount, e.freq);
          const freqLabel = e.freq === 'weekly' ? '/wk' : e.freq === 'annual' ? '/yr' : '/mo';
          const isEditing = editingId === e.id;
          if (isEditing) {
            return `<div class="exp-row exp-row--editing" data-exp-id="${e.id}">
              <span class="exp-row-icon">${meta.icon}</span>
              <input class="exp-edit-name" type="text" value="${escapeAttr(e.name)}" data-edit-field="name" />
              <input class="exp-edit-amount" type="number" value="${e.amount}" min="0" step="1" data-edit-field="amount" />
              <select class="exp-edit-freq" data-edit-field="freq">
                <option value="monthly"${e.freq === 'monthly' ? ' selected' : ''}>Monthly</option>
                <option value="weekly"${e.freq === 'weekly' ? ' selected' : ''}>Weekly</option>
                <option value="annual"${e.freq === 'annual' ? ' selected' : ''}>Annual</option>
              </select>
              <button class="exp-edit-save" type="button" data-save-exp="${e.id}">✓ Save</button>
              <button class="exp-edit-cancel" type="button" data-cancel-edit>✕</button>
            </div>`;
          }
          return `<div class="exp-row" data-exp-id="${e.id}">
            <span class="exp-row-icon">${meta.icon}</span>
            <span class="exp-row-name">${escapeText(e.name)}</span>
            <span class="exp-row-badge exp-row-badge--${e.type === 'essential' ? 'essential' : 'disc'}">${e.type === 'essential' ? 'Essential' : 'Nice-to-have'}</span>
            <span class="exp-row-amount">${fmtGBP(e.amount)}${freqLabel}</span>
            <span class="exp-row-monthly">${fmtGBP(Math.round(mo))}/mo</span>
            <button class="exp-row-edit" type="button" data-edit-exp="${e.id}" title="Edit">✎</button>
            <button class="exp-row-del" type="button" data-del-exp="${e.id}" title="Remove">✕</button>
          </div>`;
        }).join('');
        return `<div class="exp-group">
          <div class="exp-group-head">
            <span class="exp-group-label">${g}</span>
            <span class="exp-group-total">${fmtGBP(Math.round(groupTotal))}/mo</span>
          </div>
          ${rows}
        </div>`;
      }).join('');

      billsHTML = `
        <div class="exp-list-section">
          <div class="exp-list-head">
            <h4 class="exp-section-title">Monthly bills</h4>
            <span class="exp-list-total">${fmtGBP(Math.round(totalMonthlyBills))}/mo</span>
          </div>
          <div class="exp-list">${groupsHTML}</div>
        </div>`;
    }

    let oneoffHTML = '';
    if (oneoffs.length > 0) {
      const rows = oneoffs.map(e => {
        const meta = ONEOFF_CATS[e.cat] || ONEOFF_CATS.other;
        return `<div class="exp-row" data-oneoff-id="${e.id}">
          <span class="exp-row-icon">${meta.icon}</span>
          <span class="exp-row-name">${escapeText(e.name)}</span>
          <span class="exp-row-badge exp-row-badge--oneoff">One-off</span>
          <span class="exp-row-amount">${fmtGBP(e.amount)} total</span>
          <span class="exp-row-monthly">${fmtGBP(Math.round(e.amount / 12))}/mo</span>
          <button class="exp-row-del" type="button" data-del-oneoff="${e.id}" title="Remove">✕</button>
        </div>`;
      }).join('');
      oneoffHTML = `
        <div class="exp-list-section">
          <div class="exp-list-head">
            <h4 class="exp-section-title">One-off payments <span class="exp-list-note">(spread over 12 months)</span></h4>
            <span class="exp-list-total">${fmtGBP(Math.round(totalMonthlyOneoffs))}/mo</span>
          </div>
          <div class="exp-list">${rows}</div>
        </div>`;
    }

    // ── Subscriptions list ──
    let subsHTML = '';
    if (subscriptions.length > 0) {
      const rows = subscriptions.map(e => {
        const meta = SUBS_CATS[e.cat] || SUBS_CATS.other_sub;
        const mo = toMonthly(e.amount, e.freq);
        const freqLabel = e.freq === 'weekly' ? '/wk' : e.freq === 'annual' ? '/yr' : '/mo';
        return `<div class="exp-row" data-sub-id="${e.id}">
          <span class="exp-row-icon">${meta.icon}</span>
          <span class="exp-row-name">${escapeText(e.name)}</span>
          <span class="exp-row-badge exp-row-badge--sub">Subscription</span>
          <span class="exp-row-amount">${fmtGBP(e.amount)}${freqLabel}</span>
          <span class="exp-row-monthly">${fmtGBP(Math.round(mo))}/mo</span>
          <button class="exp-row-del" type="button" data-del-sub="${e.id}" title="Remove">\u2715</button>
        </div>`;
      }).join('');
      subsHTML = `
        <div class="exp-list-section exp-list-section--subs">
          <div class="exp-list-head">
            <h4 class="exp-section-title">\ud83d\udd01 Subscriptions</h4>
            <span class="exp-list-total">${fmtGBP(Math.round(totalMonthlySubs))}/mo</span>
          </div>
          <div class="exp-list">${rows}</div>
        </div>`;
    }

    // ── Savings list ──
    let savingsHTML = '';
    if (savingsItems.length > 0) {
      const savCatOptions = Object.entries(SAVINGS_CATS).map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join('');
      const rows = savingsItems.map(e => {
        const meta = SAVINGS_CATS[e.cat] || SAVINGS_CATS.other;
        const mo = toMonthly(e.amount, e.freq);
        const freqLabel = e.freq === 'weekly' ? '/wk' : e.freq === 'annual' ? '/yr' : '/mo';
        const isEditing = editingId === e.id;
        if (isEditing) {
          return `<div class="exp-row exp-row--editing" data-sav-id="${e.id}">
            <span class="exp-row-icon">${meta.icon}</span>
            <input class="exp-edit-name" type="text" value="${escapeAttr(e.name)}" data-edit-field="name" />
            <input class="exp-edit-amount" type="number" value="${e.amount}" min="0" step="1" data-edit-field="amount" />
            <select class="exp-edit-freq" data-edit-field="freq">
              <option value="monthly"${e.freq === 'monthly' ? ' selected' : ''}>Monthly</option>
              <option value="weekly"${e.freq === 'weekly' ? ' selected' : ''}>Weekly</option>
              <option value="annual"${e.freq === 'annual' ? ' selected' : ''}>Annual</option>
            </select>
            <select class="exp-edit-freq" data-edit-field="cat">
              ${savCatOptions.replace(`value="${e.cat}"`, `value="${e.cat}" selected`)}
            </select>
            <button class="exp-edit-save" type="button" data-save-sav="${e.id}">✓ Save</button>
            <button class="exp-edit-cancel" type="button" data-cancel-edit>✕</button>
          </div>`;
        }
        return `<div class="exp-row" data-sav-id="${e.id}">
          <span class="exp-row-icon">${meta.icon}</span>
          <span class="exp-row-name">${escapeText(e.name)}</span>
          <span class="exp-row-badge exp-row-badge--saving">Saving</span>
          <span class="exp-row-amount">${fmtGBP(e.amount)}${freqLabel}</span>
          <span class="exp-row-monthly">${fmtGBP(Math.round(mo))}/mo</span>
          <button class="exp-row-edit" type="button" data-edit-sav="${e.id}" title="Edit">✎</button>
          <button class="exp-row-del" type="button" data-del-sav="${e.id}" title="Remove">✕</button>
        </div>`;
      }).join('');
      savingsHTML = `
        <div class="exp-list-section exp-list-section--savings">
          <div class="exp-list-head">
            <h4 class="exp-section-title">💰 Savings & goals</h4>
            <span class="exp-list-total">${fmtGBP(Math.round(totalMonthlySavings))}/mo</span>
          </div>
          <div class="exp-list">${rows}</div>
        </div>`;
    }

    if (!expenses.length && !oneoffs.length && !savingsItems.length && !subscriptions.length) {
      billsHTML = `<div class="exp-empty">
        <div class="exp-empty-icon">📋</div>
        <div class="exp-empty-title">No expenses yet</div>
        <div class="exp-empty-sub">Use the buttons above to start building your budget</div>
      </div>`;
    }

    if (listHost) listHost.innerHTML = billsHTML + subsHTML + savingsHTML + oneoffHTML;

    // ── Category charts ──
    if (chartHost) {
      const spendTotals = {};
      expenses.forEach(e => {
        const mo = toMonthly(e.amount, e.freq);
        spendTotals[e.cat] = (spendTotals[e.cat] || 0) + mo;
      });
      oneoffs.forEach(e => {
        spendTotals[e.cat] = (spendTotals[e.cat] || 0) + e.amount / 12;
      });
      subscriptions.forEach(e => {
        spendTotals[e.cat] = (spendTotals[e.cat] || 0) + toMonthly(e.amount, e.freq);
      });
      const savTotals = {};
      savingsItems.forEach(e => {
        savTotals[e.cat] = (savTotals[e.cat] || 0) + toMonthly(e.amount, e.freq);
      });
      let chartsHTML = '';
      if (Object.keys(spendTotals).length > 0) {
        chartsHTML += `
          <div class="exp-chart-section">
            <h4 class="exp-section-title">Spending breakdown</h4>
            ${categoryDonut(spendTotals)}
          </div>`;
      }
      if (Object.keys(savTotals).length > 0) {
        chartsHTML += `
          <div class="exp-chart-section">
            <h4 class="exp-section-title">Savings breakdown</h4>
            ${categoryDonut(savTotals)}
          </div>`;
      }
      if (chartsHTML) {
        chartHost.innerHTML = `<div class="exp-charts-grid">${chartsHTML}</div>`;
      } else {
        chartHost.innerHTML = '';
      }
    }

    // ── Retirement estimate ──
    if (retHost && totalMonthlySpend > 0) {
      const housingTotal = expenses.filter(e => (CAT_META[e.cat] || {}).group === 'Housing')
        .reduce((s, e) => s + toMonthly(e.amount, e.freq), 0);
      const nonHousing = totalMonthlyBills - housingTotal;
      const retPct = 75;
      const retMonthly = Math.round(nonHousing * (retPct / 100) + housingTotal * 0.2);
      const retAnnual = retMonthly * 12;
      retHost.innerHTML = `
        <div class="exp-retirement-card">
          <div class="exp-retirement-icon">🎯</div>
          <div class="exp-retirement-body">
            <h4>Estimated retirement spending</h4>
            <div class="exp-retirement-value">${fmtGBP(retMonthly)}/mo <span class="exp-retirement-annual">(${fmtGBP(retAnnual)}/yr)</span></div>
            <div class="exp-retirement-note">Based on ${retPct}% of non-housing spend (${fmtGBP(Math.round(nonHousing))}/mo) + 20% of housing costs (${fmtGBP(Math.round(housingTotal))}/mo, assuming mortgage paid off). Use this to set your Strategy target income.</div>
          </div>
        </div>`;
    } else if (retHost) {
      retHost.innerHTML = '';
    }

    /* ── Update drawer action-button counts ── */
    const cBills = $('expCountBills');
    const cOneoffs = $('expCountOneoffs');
    const cSubs = $('expCountSubs');
    const cSavings = $('expCountSavings');
    if (cBills)   cBills.textContent   = expenses.length || '';
    if (cOneoffs) cOneoffs.textContent  = oneoffs.length || '';
    if (cSubs)    cSubs.textContent     = subscriptions.length || '';
    if (cSavings) cSavings.textContent  = savingsItems.length || '';
  }

  function escapeText(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }
  function escapeAttr(s) {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ── Event binding ── */
  function init() {
    const shell = document.getElementById('view-expenses');
    if (!shell) return;

    /* ── Drawer open/close ── */
    const expOverlay = $('expOverlay');
    let _openDrawerId = null;

    function openExpDrawer(id) {
      closeExpDrawer();
      const drawer = document.getElementById(id);
      if (!drawer) return;
      drawer.classList.add('open');
      expOverlay?.classList.add('open');
      document.body.style.overflow = 'hidden';
      _openDrawerId = id;
    }

    function closeExpDrawer() {
      if (_openDrawerId) {
        document.getElementById(_openDrawerId)?.classList.remove('open');
      }
      expOverlay?.classList.remove('open');
      document.body.style.overflow = '';
      _openDrawerId = null;
    }

    // Action buttons open drawers
    shell.querySelectorAll('[data-exp-drawer]').forEach(btn => {
      btn.addEventListener('click', () => openExpDrawer(btn.dataset.expDrawer));
    });
    // Close buttons inside drawers
    shell.querySelectorAll('[data-close-exp-drawer]').forEach(btn => {
      btn.addEventListener('click', closeExpDrawer);
    });
    // Overlay click closes drawer
    expOverlay?.addEventListener('click', closeExpDrawer);
    // Escape key closes drawer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && _openDrawerId) closeExpDrawer();
    });

    // Add bill
    $('btnAddExpense')?.addEventListener('click', () => {
      const name = $('exp_name')?.value.trim();
      const amount = Number($('exp_amount')?.value || 0);
      const freq = $('exp_freq')?.value || 'monthly';
      const cat = $('exp_cat')?.value || 'other';
      const catMeta = CAT_META[cat];
      const type = catMeta ? (catMeta.essential ? 'essential' : 'discretionary') : ($('exp_essential')?.value || 'essential');
      if (!name || amount <= 0) return;
      expenses.push({ id: uid(), name, amount, freq, cat, type });
      save();
      render();
      if ($('exp_name')) $('exp_name').value = '';
      if ($('exp_amount')) $('exp_amount').value = '';
    });

    // Add one-off
    $('btnAddOneoff')?.addEventListener('click', () => {
      const name = $('exp_oneoff_name')?.value.trim();
      const amount = Number($('exp_oneoff_amount')?.value || 0);
      const cat = $('exp_oneoff_cat')?.value || 'other';
      if (!name || amount <= 0) return;
      oneoffs.push({ id: uid(), name, amount, cat });
      save();
      render();
      if ($('exp_oneoff_name')) $('exp_oneoff_name').value = '';
      if ($('exp_oneoff_amount')) $('exp_oneoff_amount').value = '';
    });

    // Quick-add preset
    shell.addEventListener('click', (e) => {
      const presetBtn = e.target.closest('[data-preset-idx]');
      if (presetBtn) {
        const idx = Number(presetBtn.dataset.presetIdx);
        const p = PRESETS[idx];
        if (!p) return;
        const catMeta = CAT_META[p.cat];
        expenses.push({
          id: uid(), name: p.name, amount: p.amount, freq: p.freq, cat: p.cat,
          type: catMeta?.essential ? 'essential' : 'discretionary',
        });
        save();
        render();
        return;
      }

      // Delete saving
      const delSav = e.target.closest('[data-del-sav]');
      if (delSav) {
        savingsItems = savingsItems.filter(x => x.id !== delSav.dataset.delSav);
        save(); render(); return;
      }
      // Delete subscription
      const delSub = e.target.closest('[data-del-sub]');
      if (delSub) {
        subscriptions = subscriptions.filter(x => x.id !== delSub.dataset.delSub);
        save(); render(); return;
      }
      // Delete expense
      const delExp = e.target.closest('[data-del-exp]');
      if (delExp) {
        expenses = expenses.filter(x => x.id !== delExp.dataset.delExp);
        save(); render(); return;
      }
      // Delete one-off
      const delOne = e.target.closest('[data-del-oneoff]');
      if (delOne) {
        oneoffs = oneoffs.filter(x => x.id !== delOne.dataset.delOneoff);
        save(); render(); return;
      }
      // Edit expense
      const editBtn = e.target.closest('[data-edit-exp]');
      if (editBtn) {
        editingId = editBtn.dataset.editExp;
        render(); return;
      }
      // Save edit
      const saveBtn = e.target.closest('[data-save-exp]');
      if (saveBtn) {
        const id = saveBtn.dataset.saveExp;
        const row = shell.querySelector(`.exp-row[data-exp-id="${id}"]`);
        if (row) {
          const exp = expenses.find(x => x.id === id);
          if (exp) {
            const nameInput = row.querySelector('[data-edit-field="name"]');
            const amountInput = row.querySelector('[data-edit-field="amount"]');
            const freqInput = row.querySelector('[data-edit-field="freq"]');
            if (nameInput?.value.trim()) exp.name = nameInput.value.trim();
            const newAmt = Number(amountInput?.value || 0);
            if (newAmt > 0) exp.amount = newAmt;
            if (freqInput) exp.freq = freqInput.value;
          }
        }
        editingId = null;
        save(); render(); return;
      }
      // Edit saving
      const editSav = e.target.closest('[data-edit-sav]');
      if (editSav) {
        editingId = editSav.dataset.editSav;
        render(); return;
      }
      // Save saving edit
      const saveSav = e.target.closest('[data-save-sav]');
      if (saveSav) {
        const id = saveSav.dataset.saveSav;
        const row = shell.querySelector(`.exp-row[data-sav-id="${id}"]`);
        if (row) {
          const sav = savingsItems.find(x => x.id === id);
          if (sav) {
            const nameInput = row.querySelector('[data-edit-field="name"]');
            const amountInput = row.querySelector('[data-edit-field="amount"]');
            const freqInput = row.querySelector('[data-edit-field="freq"]');
            const catInput = row.querySelector('[data-edit-field="cat"]');
            if (nameInput?.value.trim()) sav.name = nameInput.value.trim();
            const newAmt = Number(amountInput?.value || 0);
            if (newAmt > 0) sav.amount = newAmt;
            if (freqInput) sav.freq = freqInput.value;
            if (catInput) sav.cat = catInput.value;
          }
        }
        editingId = null;
        save(); render(); return;
      }
      // Cancel edit
      const cancelBtn = e.target.closest('[data-cancel-edit]');
      if (cancelBtn) {
        editingId = null;
        render(); return;
      }
    });

    // Add saving
    $('btnAddSaving')?.addEventListener('click', () => {
      const name = $('exp_sav_name')?.value.trim();
      const amount = Number($('exp_sav_amount')?.value || 0);
      const freq = $('exp_sav_freq')?.value || 'monthly';
      const cat = $('exp_sav_cat')?.value || 'general';
      if (!name || amount <= 0) return;
      savingsItems.push({ id: uid(), name, amount, freq, cat });
      save();
      render();
      if ($('exp_sav_name')) $('exp_sav_name').value = '';
      if ($('exp_sav_amount')) $('exp_sav_amount').value = '';
    });

    // Add subscription
    $('btnAddSub')?.addEventListener('click', () => {
      const name = $('exp_sub_name')?.value.trim();
      const amount = Number($('exp_sub_amount')?.value || 0);
      const freq = $('exp_sub_freq')?.value || 'monthly';
      const cat = $('exp_sub_cat')?.value || 'other_sub';
      if (!name || amount <= 0) return;
      subscriptions.push({ id: uid(), name, amount, freq, cat });
      save();
      render();
      if ($('exp_sub_name')) $('exp_sub_name').value = '';
      if ($('exp_sub_amount')) $('exp_sub_amount').value = '';
    });

    // Enter key in add forms
    $('exp_amount')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); $('btnAddExpense')?.click(); }
    });
    $('exp_name')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); $('btnAddExpense')?.click(); }
    });
    $('exp_oneoff_amount')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); $('btnAddOneoff')?.click(); }
    });
    $('exp_oneoff_name')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); $('btnAddOneoff')?.click(); }
    });
    $('exp_sav_amount')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); $('btnAddSaving')?.click(); }
    });
    $('exp_sav_name')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); $('btnAddSaving')?.click(); }
    });
    $('exp_sub_amount')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); $('btnAddSub')?.click(); }
    });
    $('exp_sub_name')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); $('btnAddSub')?.click(); }
    });

    load();
  }

  return { init, render };
}
