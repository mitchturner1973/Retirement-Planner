/**
 * chartCard.js — Premium forecast snapshot chart card
 *
 * Self-contained SVG renderer with phase-coloured line segments,
 * background phase bands, milestone dots, rich tooltip,
 * and responsive mode/range controls.
 *
 * Usage:
 *   const card = createChartCard(containerEl, { formatMoney });
 *   card.update({ years, currentAge, earlyAge, stateAge, retireAge, endAge, runOutAge });
 *   card.destroy();
 */

import { fmtGBP } from './dom.js';

/* ── Palette ── */
const P = {
  accumulation: '#2563eb',
  drawdown:     '#b45309',
  depleting:    '#be123c',
  safe:         '#15803d',
  text1: '#0f172a', text2: '#334155', text3: '#64748b',
  bgMuted:  '#f8fafc',
  grid:     'rgba(226,232,240,.55)',
  axis:     'rgba(203,213,225,.70)',
  label:    'rgba(100,116,139,.72)',
  font:     'system-ui,-apple-system,sans-serif',
  bandWork:    'rgba(37,99,235,.04)',
  bandEarly:   'rgba(180,83,9,.04)',
  bandRetired: 'rgba(21,128,61,.03)',
  bandDanger:  'rgba(190,18,60,.05)',
};

/* ── Helpers ── */
const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

function fmtAxis(val) {
  if (val === 0) return '£0';
  if (val >= 1e6) {
    const m = val / 1e6;
    return '£' + (m === Math.floor(m) ? m.toFixed(0) : m.toFixed(1)) + 'M';
  }
  if (val >= 1e3) return '£' + Math.round(val / 1e3) + 'k';
  return '£' + Math.round(val);
}

function niceScale(rawMax, count = 5) {
  const ceil = rawMax * 1.30;
  if (ceil <= 0) return [0];
  const rough = ceil / count;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const res = rough / mag;
  let nice;
  if (res <= 1.5) nice = mag;
  else if (res <= 3) nice = 2 * mag;
  else if (res <= 7) nice = 5 * mag;
  else nice = 10 * mag;
  const ticks = [];
  for (let v = 0; v <= ceil + nice * 0.01; v += nice) ticks.push(Math.round(v));
  if (ticks[ticks.length - 1] < rawMax * 1.10) ticks.push(ticks[ticks.length - 1] + nice);
  return ticks;
}

function splinePath(points) {
  const n = points.length;
  if (n < 2) return points.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  if (n === 2) return `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)} L${points[1][0].toFixed(1)},${points[1][1].toFixed(1)}`;
  const dx = [], slope = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = points[i + 1][0] - points[i][0];
    slope[i] = dx[i] ? (points[i + 1][1] - points[i][1]) / dx[i] : 0;
  }
  const tan = new Array(n);
  tan[0] = slope[0];
  for (let i = 1; i < n - 1; i++) {
    tan[i] = (slope[i - 1] * slope[i] <= 0) ? 0 : (slope[i - 1] + slope[i]) / 2;
  }
  tan[n - 1] = slope[n - 2];
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(slope[i]) < 1e-10) { tan[i] = 0; tan[i + 1] = 0; continue; }
    const a = tan[i] / slope[i], b = tan[i + 1] / slope[i];
    if (a < 0) tan[i] = 0;
    if (b < 0) tan[i + 1] = 0;
    const mag = a * a + b * b;
    if (mag > 9) { const s = 3 / Math.sqrt(mag); tan[i] = s * a * slope[i]; tan[i + 1] = s * b * slope[i]; }
  }
  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const seg = dx[i] / 3;
    d += ` C${(points[i][0] + seg).toFixed(1)},${(points[i][1] + tan[i] * seg).toFixed(1)} ` +
         `${(points[i + 1][0] - seg).toFixed(1)},${(points[i + 1][1] - tan[i + 1] * seg).toFixed(1)} ` +
         `${points[i + 1][0].toFixed(1)},${points[i + 1][1].toFixed(1)}`;
  }
  return d;
}

/* ═══════════════════════════════════════════════════════════════
   createChartCard(container, cfg)
   ═══════════════════════════════════════════════════════════════ */
export function createChartCard(container, cfg = {}) {
  const {
    formatMoney   = fmtGBP,
    emptyMessage  = 'No projection data yet — enter your details and recalculate',
  } = cfg;

  /* ── Inner state ── */
  let S = {
    mode: 'pot', range: 'all', person: 'you',
    years: [], householdYears: null, loading: false,
    currentAge: null, earlyAge: null, stateAge: null, retireAge: null,
    endAge: null, runOutAge: null,
    partnerRetireAge: null, partnerStateAge: null, partnerEarlyAge: null,
    partnerLabel: 'Partner', firstBothRetiredAge: null,
  };

  const W = 960, H = 420;
  const pad = { l: 78, r: 34, t: 52, b: 52 };
  const plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;

  /* ── Build DOM ── */
  const el = document.createElement('div');
  el.className = 'fc-card';
  container.replaceChildren(el);

  el.innerHTML = `
    <div class="fc-header">
      <h4 class="fc-title">Forecast Snapshot</h4>
    </div>
    <div class="fc-body">
      <div class="fc-loading" style="display:none"><div class="fc-spinner"></div><span>Calculating\u2026</span></div>
      <div class="fc-empty" style="display:none">${esc(emptyMessage)}</div>
      <div class="fc-plot"></div>
    </div>
    <div class="fc-phase-legend"></div>
    <div class="fc-controls fc-controls--footer">
      <div class="fc-control-group fc-control-group--person">
        <div class="fc-control-label">Focus</div>
        <div class="fc-toggle fc-person-toggle" data-fc-group="person" style="display:none">
          <button class="fc-toggle-btn is-active" data-fc-action="person" data-fc-value="you">You</button>
          <button class="fc-toggle-btn" data-fc-action="person" data-fc-value="household">Household</button>
        </div>
      </div>
      <div class="fc-control-group">
        <div class="fc-control-label">Metric</div>
        <div class="fc-toggle" data-fc-group="mode">
          <button class="fc-toggle-btn is-active" data-fc-action="mode" data-fc-value="pot">Pot value</button>
          <button class="fc-toggle-btn" data-fc-action="mode" data-fc-value="income">Net income</button>
        </div>
      </div>
      <div class="fc-control-group fc-control-group--range">
        <div class="fc-control-label">Range</div>
        <div class="fc-toggle" data-fc-group="range">
          <button class="fc-toggle-btn is-active" data-fc-action="range" data-fc-value="all">All ages</button>
          <button class="fc-toggle-btn" data-fc-action="range" data-fc-value="retirement">Retirement</button>
          <button class="fc-toggle-btn" data-fc-action="range" data-fc-value="next10">Next 10 yrs</button>
        </div>
        <select class="fc-range-select" aria-label="Age range">
          <option value="all">All ages</option>
          <option value="retirement">Retirement</option>
          <option value="next10">Next 10 yrs</option>
        </select>
      </div>
    </div>
  `;

  const $plot        = el.querySelector('.fc-plot');
  const $loading     = el.querySelector('.fc-loading');
  const $empty       = el.querySelector('.fc-empty');
  const $phaseLeg    = el.querySelector('.fc-phase-legend');
  const $rangeSelect = el.querySelector('.fc-range-select');

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Forecast Snapshot chart');
  $plot.appendChild(svg);

  const tip = document.createElement('div');
  tip.className = 'fc-tooltip';
  $plot.appendChild(tip);

  /* ── Events ── */
  el.addEventListener('click', e => {
    const btn = e.target.closest('[data-fc-action]');
    if (!btn) return;
    const { fcAction: action, fcValue: value } = btn.dataset;
    if (action === 'mode') S.mode = value;
    if (action === 'range') S.range = value;
    if (action === 'person') S.person = value;
    refreshToggles();
    render();
  });

  if ($rangeSelect) {
    $rangeSelect.addEventListener('change', () => {
      S.range = $rangeSelect.value;
      refreshToggles();
      render();
    });
  }

  /* ── Phase helpers ── */
  function phaseColor(age) {
    if (S.runOutAge && age >= S.runOutAge) return P.depleting;
    if (S.person === 'household') {
      const bothRet = S.firstBothRetiredAge || Math.max(S.retireAge || 67, S.partnerRetireAge || 67);
      const firstRet = Math.min(S.earlyAge || S.retireAge || 67, S.partnerEarlyAge || S.partnerRetireAge || 67);
      if (age < firstRet) return P.accumulation;
      if (age < bothRet) return P.drawdown;
      return P.safe;
    }
    const retAge = S.earlyAge || S.retireAge || S.stateAge || 67;
    if (age < retAge) return P.accumulation;
    const bridgeEnd = S.stateAge || S.retireAge || 67;
    if (S.earlyAge && age >= S.earlyAge && age < bridgeEnd) return P.drawdown;
    if (S.stateAge && age < S.stateAge) return P.drawdown;
    return P.safe;
  }

  function phaseLabel(age) {
    if (S.runOutAge && age >= S.runOutAge) return 'Pot depleted';
    if (S.person === 'household') {
      const bothRet = S.firstBothRetiredAge || Math.max(S.retireAge || 67, S.partnerRetireAge || 67);
      const firstRet = Math.min(S.earlyAge || S.retireAge || 67, S.partnerEarlyAge || S.partnerRetireAge || 67);
      if (age < firstRet) return 'Both working';
      if (age < bothRet) return 'Partially retired';
      return 'Both retired';
    }
    const retAge = S.earlyAge || S.retireAge || S.stateAge || 67;
    if (age < retAge) return 'Accumulation';
    const bridgeEnd = S.stateAge || S.retireAge || 67;
    if (S.earlyAge && age >= S.earlyAge && age < bridgeEnd) return 'Bridge / early drawdown';
    if (S.stateAge && age < S.stateAge) return 'Early drawdown';
    return 'Retired';
  }

  function yValue(yr) {
    const hh = S.person === 'household';
    if (S.mode === 'income') return hh ? (yr.householdNet || 0) : (yr.recurringNetIncome || yr.annualNetIncome || 0);
    return hh ? (yr.householdPot || 0) : yr.potEnd;
  }

  function activeYears() {
    return S.person === 'household' && S.householdYears ? S.householdYears : S.years;
  }

  function visibleYears() {
    let yrs = activeYears();
    if (S.range === 'retirement') {
      const retAge = S.earlyAge || S.retireAge || S.stateAge || 67;
      yrs = yrs.filter(y => y.age >= retAge);
    } else if (S.range === 'next10') {
      const ca = S.currentAge || yrs[0]?.age || 0;
      yrs = yrs.filter(y => y.age >= ca && y.age <= ca + 10);
    }
    return yrs;
  }

  /* ── Toggle refresh ── */
  function refreshToggles() {
    el.querySelectorAll('[data-fc-action="mode"]').forEach(b =>
      b.classList.toggle('is-active', b.dataset.fcValue === S.mode));
    el.querySelectorAll('[data-fc-action="range"]').forEach(b =>
      b.classList.toggle('is-active', b.dataset.fcValue === S.range));
    el.querySelectorAll('[data-fc-action="person"]').forEach(b =>
      b.classList.toggle('is-active', b.dataset.fcValue === S.person));
    if ($rangeSelect) $rangeSelect.value = S.range;
    /* show person toggle only when household data exists */
    const $pt = el.querySelector('.fc-person-toggle');
    if ($pt) $pt.style.display = S.householdYears ? '' : 'none';
  }


  /* ── Main render ── */
  function render() {
    const vis = visibleYears();
    const hasData = vis.length > 0;

    $loading.style.display = S.loading ? '' : 'none';
    $empty.style.display   = (!S.loading && !hasData) ? '' : 'none';
    $plot.style.display    = (hasData && !S.loading) ? '' : 'none';
    if (!hasData || S.loading) return;

    const ages = vis.map(y => y.age);
    const vals = vis.map(y => yValue(y));
    const xmin = Math.min(...ages), xmax = Math.max(...ages);
    const rawMax = Math.max(...vals, 1);
    const ticks = niceScale(rawMax);
    const ymax = ticks[ticks.length - 1];

    const X = a => pad.l + (a - xmin) / (xmax - xmin || 1) * plotW;
    const Y = v => pad.t + (1 - v / ymax) * plotH;

    const parts = [];

    /* ── Defs ── */
    parts.push(`<defs>
      <linearGradient id="fcG-acc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${P.accumulation}" stop-opacity=".16"/><stop offset="100%" stop-color="${P.accumulation}" stop-opacity=".02"/></linearGradient>
      <linearGradient id="fcG-draw" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${P.drawdown}" stop-opacity=".14"/><stop offset="100%" stop-color="${P.drawdown}" stop-opacity=".02"/></linearGradient>
      <linearGradient id="fcG-safe" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${P.safe}" stop-opacity=".12"/><stop offset="100%" stop-color="${P.safe}" stop-opacity=".02"/></linearGradient>
      <linearGradient id="fcG-dep" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${P.depleting}" stop-opacity=".16"/><stop offset="100%" stop-color="${P.depleting}" stop-opacity=".02"/></linearGradient>
      <clipPath id="fcClip"><rect x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}"/></clipPath>
    </defs>`);

    /* ── Plot background ── */
    parts.push(`<rect x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="${P.bgMuted}" rx="4"/>`);

    /* ── Phase bands ── */
    const retAge = S.earlyAge || S.retireAge || S.stateAge || 67;
    const edges = [xmin];
    if (S.earlyAge && S.earlyAge > xmin && S.earlyAge <= xmax) edges.push(S.earlyAge);
    else if (S.retireAge && S.retireAge > xmin && S.retireAge <= xmax) edges.push(S.retireAge);
    if (S.stateAge && S.stateAge > xmin && S.stateAge <= xmax) edges.push(S.stateAge);
    if (S.runOutAge && S.runOutAge > xmin && S.runOutAge <= xmax) edges.push(S.runOutAge);
    edges.push(xmax);
    const uniqEdges = [...new Set(edges)].sort((a, b) => a - b);

    for (let i = 0; i < uniqEdges.length - 1; i++) {
      const a0 = uniqEdges[i], a1 = uniqEdges[i + 1], mid = (a0 + a1) / 2;
      let fill = P.bandWork;
      if (S.runOutAge && mid >= S.runOutAge) fill = P.bandDanger;
      else if (mid >= (S.stateAge || 999)) fill = P.bandRetired;
      else if (mid >= retAge) fill = P.bandEarly;
      const bx = Math.max(pad.l, X(a0)), bw = Math.min(X(a1), pad.l + plotW) - bx;
      if (bw > 0) parts.push(`<rect x="${bx}" y="${pad.t}" width="${bw}" height="${plotH}" fill="${fill}"/>`);
    }

    /* ── Grid + axes ── */
    ticks.forEach(v => {
      parts.push(`<line x1="${pad.l}" y1="${Y(v)}" x2="${W - pad.r}" y2="${Y(v)}" stroke="${P.grid}" stroke-dasharray="4,4"/>`);
      parts.push(`<text x="${pad.l - 12}" y="${Y(v) + 4}" fill="${P.label}" font-size="11" font-weight="500" text-anchor="end" font-family="${P.font}">${fmtAxis(v)}</text>`);
    });

    const range = xmax - xmin;
    const step = range <= 15 ? 2 : range <= 30 ? 5 : 10;
    let xVals = [];
    for (let v = Math.ceil(xmin / step) * step; v <= xmax; v += step) xVals.push(v);
    if (!xVals.includes(xmin)) xVals.unshift(xmin);
    if (!xVals.includes(xmax)) xVals.push(xmax);
    xVals = [...new Set(xVals)].sort((a, b) => a - b).filter((v, i, a) => i === 0 || v - a[i - 1] >= step * 0.4);
    xVals.forEach(v => {
      parts.push(`<text x="${X(v)}" y="${H - pad.b + 22}" fill="${P.label}" font-size="11" font-weight="500" text-anchor="middle" font-family="${P.font}">${v}</text>`);
    });

    parts.push(`<line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${H - pad.b}" stroke="${P.axis}"/>`);
    parts.push(`<line x1="${pad.l}" y1="${H - pad.b}" x2="${W - pad.r}" y2="${H - pad.b}" stroke="${P.axis}"/>`);

    /* ── Phase-segmented line + area ── */
    const pts = vis.map(y => [X(y.age), Y(yValue(y))]);
    const baseY = Y(0);
    const clipped = [];

    const segments = [];
    let segStart = 0;
    for (let i = 1; i <= vis.length; i++) {
      const prevCol = phaseColor(vis[i - 1].age);
      const curCol = i < vis.length ? phaseColor(vis[i].age) : null;
      if (curCol !== prevCol || i === vis.length) {
        segments.push({ start: segStart, end: i - 1, color: prevCol,
          grad: prevCol === P.accumulation ? 'fcG-acc' : prevCol === P.drawdown ? 'fcG-draw' : prevCol === P.depleting ? 'fcG-dep' : 'fcG-safe',
        });
        segStart = i > 0 ? i - 1 : i;
      }
    }

    segments.forEach(seg => {
      const segPts = [];
      for (let i = seg.start; i <= seg.end; i++) segPts.push(pts[i]);
      if (segPts.length < 2) return;
      const curve = splinePath(segPts);
      const first = segPts[0], last = segPts[segPts.length - 1];
      clipped.push(`<path d="${curve} L${last[0].toFixed(1)},${baseY.toFixed(1)} L${first[0].toFixed(1)},${baseY.toFixed(1)} Z" fill="url(#${seg.grad})"/>`);
      clipped.push(`<path d="${curve}" fill="none" stroke="${seg.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`);
    });

    parts.push(`<g clip-path="url(#fcClip)">${clipped.join('')}</g>`);

    /* ── Milestone dots ── */
    const milestones = [];
    const hh = S.person === 'household';
    const pLabel = S.partnerLabel || 'Partner';
    if (S.currentAge != null) milestones.push({ age: S.currentAge, label: 'Now', pri: 3 });
    if (hh) {
      /* In household mode, use compact labels to avoid overlap */
      const pShort = pLabel.length > 6 ? pLabel.slice(0, 1) + '.' : pLabel;
      if (S.earlyAge) milestones.push({ age: S.earlyAge, label: 'You ret.', pri: 2 });
      else if (S.retireAge) milestones.push({ age: S.retireAge, label: 'You ret.', pri: 2 });
      if (S.partnerEarlyAge) milestones.push({ age: S.partnerEarlyAge, label: `${pShort} ret.`, pri: 2 });
      else if (S.partnerRetireAge) milestones.push({ age: S.partnerRetireAge, label: `${pShort} ret.`, pri: 2 });
      if (S.stateAge) milestones.push({ age: S.stateAge, label: 'You SP', pri: 1 });
      if (S.partnerStateAge) milestones.push({ age: S.partnerStateAge, label: `${pShort} SP`, pri: 1 });
    } else {
      if (S.earlyAge) milestones.push({ age: S.earlyAge, label: 'Retire', pri: 2 });
      else if (S.retireAge) milestones.push({ age: S.retireAge, label: 'Retire', pri: 2 });
      if (S.stateAge) milestones.push({ age: S.stateAge, label: 'SP', pri: 2 });
    }
    if (S.runOutAge) milestones.push({ age: S.runOutAge, label: 'Run-out', pri: 1 });

    let peakAge = null, peakVal = -Infinity;
    vis.forEach(y => { const v = yValue(y); if (v > peakVal) { peakVal = v; peakAge = y.age; } });
    if (peakAge != null && !milestones.some(m => m.age === peakAge)) {
      milestones.push({ age: peakAge, label: 'Peak', pri: 0 });
    }

    const lastYr = vis[vis.length - 1];
    if (lastYr) {
      const lx = X(lastYr.age), ly = Y(yValue(lastYr));
      parts.push(`<circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="4" fill="#fff" stroke="${phaseColor(lastYr.age)}" stroke-width="2"/>`);
    }

    /* Build positioned label list for collision detection */
    const labels = [];
    milestones.forEach(m => {
      const yr = vis.find(y => y.age === m.age);
      if (!yr) return;
      const cx = X(m.age), cy = Y(yValue(yr));
      const col = phaseColor(m.age);
      const isNow = m.label === 'Now';
      const r = isNow ? 7 : 5;
      /* Draw dot + pulse */
      parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}" fill="#fff" stroke="${col}" stroke-width="${isNow ? 3 : 2}"/>`);
      if (isNow) {
        parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="12" fill="none" stroke="${col}" stroke-width="1.5" opacity=".3"><animate attributeName="r" from="7" to="16" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" from=".4" to="0" dur="2s" repeatCount="indefinite"/></circle>`);
      }
      const estW = m.label.length * 6.2 + 4; // rough px width at font-size 10
      labels.push({ cx, cy, r, col, text: m.label, w: estW, pri: m.pri });
    });

    /* De-collide labels: sort by x, then push overlapping ones to staggered tiers */
    labels.sort((a, b) => a.cx - b.cx || b.pri - a.pri);
    const minGap = 6; // min horizontal gap between label edges
    const tierStep = 14; // vertical offset per tier
    for (let i = 0; i < labels.length; i++) {
      const lb = labels[i];
      lb.tier = 0; // 0 = directly above dot
      /* Check against all earlier labels for overlap */
      let tries = 0;
      while (tries < 4) {
        const labelY = lb.cy - lb.r - 8 - lb.tier * tierStep;
        let collision = false;
        for (let j = 0; j < i; j++) {
          const other = labels[j];
          const otherY = other.cy - other.r - 8 - other.tier * tierStep;
          const hOverlap = Math.abs(lb.cx - other.cx) < (lb.w + other.w) / 2 + minGap;
          const vOverlap = Math.abs(labelY - otherY) < 13;
          if (hOverlap && vOverlap) { collision = true; break; }
        }
        if (!collision) break;
        lb.tier++;
        tries++;
      }
    }

    /* Render labels with leader lines for staggered ones */
    labels.forEach(lb => {
      const ty = lb.cy - lb.r - 8 - lb.tier * tierStep;
      if (lb.tier > 0) {
        /* Small leader line from dot to label */
        parts.push(`<line x1="${lb.cx.toFixed(1)}" y1="${(lb.cy - lb.r - 2).toFixed(1)}" x2="${lb.cx.toFixed(1)}" y2="${(ty + 4).toFixed(1)}" stroke="${lb.col}" stroke-width=".8" opacity=".4"/>`);
      }
      parts.push(`<text x="${lb.cx.toFixed(1)}" y="${ty.toFixed(1)}" fill="${lb.col}" font-size="10" font-weight="700" text-anchor="middle" font-family="${P.font}">${lb.text}</text>`);
    });

    /* ── Hover elements ── */
    parts.push(`<line class="fc-vline" y1="${pad.t}" y2="${H - pad.b}" stroke="${P.grid}" stroke-width="1" style="display:none"/>`);
    parts.push(`<circle class="fc-dot" r="6" fill="#fff" stroke="${P.accumulation}" stroke-width="2.5" style="display:none"/>`);
    parts.push(`<rect class="fc-zone" x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="transparent" style="cursor:crosshair"/>`);

    svg.innerHTML = parts.join('');
    attachHover(vis, xmin, xmax, ymax);

    renderPhaseLegend(vis);
  }

  /* ── Phase legend ── */
  function renderPhaseLegend(vis) {
    const phases = new Set(vis.map(y => phaseLabel(y.age)));
    const map = [
      { label: 'Accumulation', color: P.accumulation },
      { label: 'Both working', color: P.accumulation },
      { label: 'Bridge / early drawdown', color: P.drawdown },
      { label: 'Early drawdown', color: P.drawdown },
      { label: 'Partially retired', color: P.drawdown },
      { label: 'Retired', color: P.safe },
      { label: 'Both retired', color: P.safe },
      { label: 'Pot depleted', color: P.depleting },
    ];
    $phaseLeg.innerHTML = map.filter(m => phases.has(m.label)).map(m => `
      <span class="fc-phase-chip"><span class="fc-phase-dot" style="background:${m.color}"></span>${m.label}</span>
    `).join('');
  }

  /* ── Hover tooltip ── */
  function attachHover(vis, xmin, xmax, ymax) {
    const zone = svg.querySelector('.fc-zone');
    const dot = svg.querySelector('.fc-dot');
    const vline = svg.querySelector('.fc-vline');
    if (!zone) return;

    $plot.style.position = 'relative';

    const X = a => pad.l + (a - xmin) / (xmax - xmin || 1) * plotW;
    const Y = v => pad.t + (1 - v / ymax) * plotH;

    zone.addEventListener('mousemove', e => {
      const rect = svg.getBoundingClientRect();
      const svgX = (e.clientX - rect.left) / rect.width * W;
      const dataX = xmin + (svgX - pad.l) / plotW * (xmax - xmin);
      let best = vis[0], dist = Infinity;
      for (const yr of vis) { const d = Math.abs(yr.age - dataX); if (d < dist) { dist = d; best = yr; } }

      const cx = X(best.age), cy = Y(yValue(best));
      const col = phaseColor(best.age);

      dot.setAttribute('cx', cx); dot.setAttribute('cy', cy);
      dot.setAttribute('stroke', col); dot.style.display = '';
      vline.setAttribute('x1', cx); vline.setAttribute('x2', cx); vline.style.display = '';

      const hh = S.person === 'household';
      const pot = hh ? (best.householdPot || 0) : best.potEnd;
      const income = hh ? (best.householdNet || 0) : (best.recurringNetIncome || best.annualNetIncome || 0);
      let rows = `
        <div class="fc-tip-head">Age ${best.age}<span class="fc-tip-phase" style="color:${col}">${phaseLabel(best.age)}</span></div>
        <div class="fc-tip-row"><span class="fc-tip-label">${hh ? 'Combined pot' : 'Pot'}</span><span class="fc-tip-val">${formatMoney(pot)}</span></div>
        <div class="fc-tip-row"><span class="fc-tip-label">${hh ? 'Combined income' : 'Net income'}</span><span class="fc-tip-val">${formatMoney(income)}/yr</span></div>`;
      if (hh) {
        rows += `<div class="fc-tip-row fc-tip-row--sub"><span class="fc-tip-label">Your pot</span><span class="fc-tip-val">${formatMoney(best.primaryPot || 0)}</span></div>`;
        rows += `<div class="fc-tip-row fc-tip-row--sub"><span class="fc-tip-label">${esc(S.partnerLabel)} pot</span><span class="fc-tip-val">${formatMoney(best.partnerPot || 0)}</span></div>`;
        rows += `<div class="fc-tip-row fc-tip-row--sub"><span class="fc-tip-label">Your income</span><span class="fc-tip-val">${formatMoney(best.primaryNet || 0)}/yr</span></div>`;
        rows += `<div class="fc-tip-row fc-tip-row--sub"><span class="fc-tip-label">${esc(S.partnerLabel)} income</span><span class="fc-tip-val">${formatMoney(best.partnerNet || 0)}/yr</span></div>`;
      } else {
        if (best.statePension) rows += `<div class="fc-tip-row fc-tip-row--sub"><span class="fc-tip-label">State pension</span><span class="fc-tip-val">${formatMoney(best.statePension)}/yr</span></div>`;
        if (best.dbIncome) rows += `<div class="fc-tip-row fc-tip-row--sub"><span class="fc-tip-label">DB pension</span><span class="fc-tip-val">${formatMoney(best.dbIncome)}/yr</span></div>`;
      }
      tip.innerHTML = rows;

      const tipPxX = cx / W * rect.width;
      const tipPxY = cy / H * rect.height;
      tip.style.left = tipPxX + 'px';
      tip.style.top = (tipPxY - 10) + 'px';
      tip.classList.add('is-visible');
    });

    zone.addEventListener('mouseleave', () => {
      dot.style.display = 'none'; vline.style.display = 'none';
      tip.classList.remove('is-visible');
    });
  }

  /* ── Public API ── */
  function update(patch) {
    if ('years' in patch)           S.years = patch.years || [];
    if ('householdYears' in patch)  S.householdYears = patch.householdYears || null;
    if ('currentAge' in patch)      S.currentAge = patch.currentAge;
    if ('earlyAge' in patch)        S.earlyAge = patch.earlyAge || null;
    if ('stateAge' in patch)        S.stateAge = patch.stateAge;
    if ('retireAge' in patch)       S.retireAge = patch.retireAge;
    if ('endAge' in patch)          S.endAge = patch.endAge;
    if ('runOutAge' in patch)       S.runOutAge = patch.runOutAge || null;
    if ('loading' in patch)         S.loading = patch.loading;
    if ('partnerRetireAge' in patch) S.partnerRetireAge = patch.partnerRetireAge || null;
    if ('partnerStateAge' in patch)  S.partnerStateAge = patch.partnerStateAge || null;
    if ('partnerEarlyAge' in patch)  S.partnerEarlyAge = patch.partnerEarlyAge || null;
    if ('partnerLabel' in patch)     S.partnerLabel = patch.partnerLabel || 'Partner';
    if ('firstBothRetiredAge' in patch) S.firstBothRetiredAge = patch.firstBothRetiredAge || null;
    /* if household data was removed, fall back to 'you' */
    if (!S.householdYears && S.person === 'household') S.person = 'you';
    refreshToggles();
    render();
  }

  function setLoading(v) { update({ loading: !!v }); }
  function destroy() { el.remove(); }

  return { update, setLoading, destroy, el };
}
