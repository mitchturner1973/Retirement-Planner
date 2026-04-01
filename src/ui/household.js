/* ── Dynamic palette — reads CSS tokens for theme awareness ── */
function readPalette(el) {
  const s = getComputedStyle(el || document.documentElement);
  const v = name => s.getPropertyValue(name).trim();
  function parseRGB(raw) {
    if (!raw) return [99, 102, 241];
    const hex = raw.match(/^#([\da-f]{6})$/i);
    if (hex) { const n = parseInt(hex[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    const rgb = raw.match(/rgba?\(([^)]+)\)/);
    if (rgb) { const p = rgb[1].split(',').map(Number); return [p[0], p[1], p[2]]; }
    return [99, 102, 241];
  }
  const accent = v('--accent') || '#4f46e5';
  const [ar, ag, ab] = parseRGB(accent);
  return {
    accent,
    secondary: v('--text-2') || '#4b5563',
    tertiary:  v('--text-3') || '#6b7280',
    text1:     v('--text-1') || '#111827',
    text3:     v('--text-3') || '#6b7280',
    bgMuted:   v('--bg-surface-muted') || '#f8f9fb',
    grid:      v('--border-1') || '#e5e7eb',
    axis:      v('--border-2') || '#d1d5db',
    label:     v('--text-3') || '#6b7280',
    font:      'system-ui,-apple-system,sans-serif',
    areaAccent: `rgba(${ar},${ag},${ab},.14)`,
    areaAccentEnd: `rgba(${ar},${ag},${ab},.02)`,
  };
}

/* ── Helpers ── */
function fmtAxis(val) {
  if (val === 0) return '£0';
  if (val >= 1e6) { const m = val / 1e6; return '£' + (m === Math.floor(m) ? m.toFixed(0) : m.toFixed(1)) + 'M'; }
  if (val >= 1e3) return '£' + Math.round(val / 1e3) + 'k';
  return '£' + Math.round(val);
}

function niceScale(rawMax, count = 5) {
  const ceil = rawMax * 1.25;
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
  for (let i = 1; i < n - 1; i++) tan[i] = (slope[i - 1] * slope[i] <= 0) ? 0 : (slope[i - 1] + slope[i]) / 2;
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

const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* ═══════════════════════════════════════════════════════════════
   renderMultiSeriesChart — premium multi-line chart with tooltip
   ═══════════════════════════════════════════════════════════════ */
function renderMultiSeriesChart(svgEl, series, markers, { fmtValue, chartId }) {
  if (!series.length || !series[0].data.length) { svgEl.innerHTML = ''; return; }

  const P = readPalette(svgEl);
  const W = 960, H = 380;
  svgEl.removeAttribute('width');
  svgEl.removeAttribute('height');
  svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svgEl.style.width = '100%';
  svgEl.style.height = 'auto';

  const pad = { l: 72, r: 32, t: 42, b: 48 };
  const plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;

  /* Collect all data points for scale */
  let xs = [], ys = [];
  series.forEach(s => s.data.forEach(p => { xs.push(p.x); ys.push(p.y); }));
  const xmin = Math.min(...xs), xmax = Math.max(...xs);
  const rawMax = Math.max(...ys, 1);
  const ticks = niceScale(rawMax);
  const ymax = ticks[ticks.length - 1];

  const X = a => pad.l + (a - xmin) / (xmax - xmin || 1) * plotW;
  const Y = v => pad.t + (1 - Math.max(v, 0) / ymax) * plotH;
  const baseY = Y(0);

  const parts = [];
  const uid = chartId || 'hh' + Math.random().toString(36).slice(2, 6);

  /* Defs */
  const gradDefs = series.map((s, i) => {
    const [r, g, b] = parseSeriesRGB(s.color, P);
    const op = i === 0 ? ['.16', '.02'] : ['.08', '.01'];
    return `<linearGradient id="${uid}G${i}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgb(${r},${g},${b})" stop-opacity="${op[0]}"/>
      <stop offset="100%" stop-color="rgb(${r},${g},${b})" stop-opacity="${op[1]}"/>
    </linearGradient>`;
  }).join('');
  parts.push(`<defs>${gradDefs}<clipPath id="${uid}Clip"><rect x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}"/></clipPath></defs>`);

  /* Plot background */
  parts.push(`<rect x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="${P.bgMuted}" rx="4"/>`);

  /* Grid + Y-axis */
  ticks.forEach(v => {
    parts.push(`<line x1="${pad.l}" y1="${Y(v)}" x2="${W - pad.r}" y2="${Y(v)}" stroke="${P.grid}" stroke-dasharray="4,4"/>`);
    parts.push(`<text x="${pad.l - 10}" y="${Y(v) + 4}" fill="${P.label}" font-size="11" font-weight="500" text-anchor="end" font-family="${P.font}">${fmtAxis(v)}</text>`);
  });

  /* X-axis labels */
  const range = xmax - xmin;
  const step = range <= 15 ? 2 : range <= 30 ? 5 : 10;
  let xVals = [];
  for (let v = Math.ceil(xmin / step) * step; v <= xmax; v += step) xVals.push(v);
  if (!xVals.includes(xmin)) xVals.unshift(xmin);
  if (!xVals.includes(xmax)) xVals.push(xmax);
  xVals = [...new Set(xVals)].sort((a, b) => a - b).filter((v, i, a) => i === 0 || v - a[i - 1] >= step * 0.4);
  xVals.forEach(v => {
    parts.push(`<text x="${X(v)}" y="${H - pad.b + 20}" fill="${P.label}" font-size="11" font-weight="500" text-anchor="middle" font-family="${P.font}">${v}</text>`);
  });

  /* Axis lines */
  parts.push(`<line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${H - pad.b}" stroke="${P.axis}"/>`);
  parts.push(`<line x1="${pad.l}" y1="${H - pad.b}" x2="${W - pad.r}" y2="${H - pad.b}" stroke="${P.axis}"/>`);

  /* Milestone markers */
  const dedupedMarkers = [];
  const seenX = new Set();
  markers.forEach(m => {
    if (m.x >= xmin && m.x <= xmax && !seenX.has(m.x)) {
      seenX.add(m.x);
      dedupedMarkers.push(m);
    }
  });
  dedupedMarkers.forEach((m, idx) => {
    const xx = X(m.x);
    parts.push(`<line x1="${xx}" y1="${pad.t}" x2="${xx}" y2="${H - pad.b}" stroke="${P.accent}" stroke-width="1" stroke-dasharray="4,3" opacity=".35"/>`);
    const ly = pad.t + 14 + idx * 14;
    parts.push(`<text x="${xx + 5}" y="${ly}" fill="${P.label}" font-size="10" font-weight="600" font-family="${P.font}">${esc(m.label)}</text>`);
  });

  /* Series — area fills then lines (back-to-front) */
  const clipped = [];
  for (let i = series.length - 1; i >= 0; i--) {
    const s = series[i];
    if (s.data.length < 2) continue;
    const pts = s.data.map(p => [X(p.x), Y(p.y)]);
    const curve = splinePath(pts);
    const first = pts[0], last = pts[pts.length - 1];
    /* Area fill only for primary (i===0) series */
    if (i === 0) {
      clipped.push(`<path d="${curve} L${last[0].toFixed(1)},${baseY.toFixed(1)} L${first[0].toFixed(1)},${baseY.toFixed(1)} Z" fill="url(#${uid}G${i})"/>`);
    }
    const width = i === 0 ? '2.5' : '1.8';
    const dash = i > 0 ? ' stroke-dasharray="6,4"' : '';
    const opacity = i === 0 ? '1' : '.65';
    clipped.push(`<path d="${curve}" fill="none" stroke="${s.color}" stroke-width="${width}"${dash} opacity="${opacity}" stroke-linejoin="round" stroke-linecap="round"/>`);
  }
  parts.push(`<g clip-path="url(#${uid}Clip)">${clipped.join('')}</g>`);

  /* End dots */
  series.forEach((s, i) => {
    if (!s.data.length) return;
    const last = s.data[s.data.length - 1];
    const lx = X(last.x), ly = Y(last.y);
    const r = i === 0 ? 4 : 3;
    parts.push(`<circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="${r}" fill="#fff" stroke="${s.color}" stroke-width="2" opacity="${i === 0 ? 1 : .65}"/>`);
  });

  /* Hover elements */
  parts.push(`<line class="hh-vline" y1="${pad.t}" y2="${H - pad.b}" stroke="${P.grid}" stroke-width="1" style="display:none"/>`);
  parts.push(`<circle class="hh-dot" r="5.5" fill="#fff" stroke="${P.accent}" stroke-width="2.5" style="display:none"/>`);
  parts.push(`<rect class="hh-zone" x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="transparent" style="cursor:crosshair"/>`);

  svgEl.innerHTML = parts.join('');

  /* Legend below SVG */
  let legendEl = svgEl.parentElement.querySelector('.hh-legend');
  if (!legendEl) { legendEl = document.createElement('div'); legendEl.className = 'hh-legend'; svgEl.parentElement.appendChild(legendEl); }
  legendEl.innerHTML = series.map((s, i) => {
    const dash = i > 0 ? 'opacity:.65' : '';
    return `<span class="fc-phase-chip"><span class="fc-phase-dot" style="background:${s.color};${dash}"></span>${esc(s.name)}</span>`;
  }).join('');

  /* Tooltip */
  attachTooltip(svgEl, series, { xmin, xmax, ymax, pad, plotW, plotH, W, H, P, fmtValue });
}

function parseSeriesRGB(raw, P) {
  if (!raw) return [99, 102, 241];
  const hex = raw.match(/^#([\da-f]{6})$/i);
  if (hex) { const n = parseInt(hex[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const rgb = raw.match(/rgba?\(([^)]+)\)/);
  if (rgb) { const p = rgb[1].split(',').map(Number); return [p[0], p[1], p[2]]; }
  return [99, 102, 241];
}

function attachTooltip(svgEl, series, cfg) {
  const zone = svgEl.querySelector('.hh-zone');
  const dot = svgEl.querySelector('.hh-dot');
  const vline = svgEl.querySelector('.hh-vline');
  if (!zone) return;

  const wrap = svgEl.parentElement;
  wrap.style.position = 'relative';
  let tip = wrap.querySelector('.fc-tooltip');
  if (!tip) { tip = document.createElement('div'); tip.className = 'fc-tooltip'; wrap.appendChild(tip); }

  const { xmin, xmax, ymax, pad, plotW, plotH, W, H, P, fmtValue } = cfg;
  const fmt = fmtValue || fmtAxis;
  const X = a => pad.l + (a - xmin) / (xmax - xmin || 1) * plotW;
  const Y = v => pad.t + (1 - Math.max(v, 0) / ymax) * plotH;

  zone.addEventListener('mousemove', e => {
    const rect = svgEl.getBoundingClientRect();
    const svgX = (e.clientX - rect.left) / rect.width * W;
    const dataX = xmin + (svgX - pad.l) / plotW * (xmax - xmin);

    const primary = series[0].data;
    let best = primary[0], dist = Infinity;
    for (const pt of primary) { const d = Math.abs(pt.x - dataX); if (d < dist) { dist = d; best = pt; } }

    const cx = X(best.x), cy = Y(best.y);
    dot.setAttribute('cx', cx); dot.setAttribute('cy', cy);
    dot.setAttribute('stroke', series[0].color); dot.style.display = '';
    vline.setAttribute('x1', cx); vline.setAttribute('x2', cx); vline.style.display = '';

    let rows = `<div class="fc-tip-head">Age ${best.x}</div>`;
    series.forEach(s => {
      const pt = s.data.find(p => p.x === best.x);
      if (pt) rows += `<div class="fc-tip-row"><span class="fc-tip-label">${esc(s.name)}</span><span class="fc-tip-val">${fmt(pt.y)}</span></div>`;
    });
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

/* ═══════════════════════════════════════════════════════════════
   renderHouseholdTab
   ═══════════════════════════════════════════════════════════════ */
export function renderHouseholdTab({ getEl, fmtGBP }, state, household) {
  const intro = getEl('householdIntro');
  const kpiWrap = getEl('householdKpis');
  const tbody = getEl('tblHousehold')?.querySelector('tbody');
  if (!intro || !kpiWrap || !tbody) return;

  if (!household) {
    intro.style.display = 'flex';
    intro.innerHTML = `<div>ℹ️</div><div><div style="font-weight:700">Household view is off</div><div class="muted small">Switch Planner mode to <strong>Joint household</strong> on the Inputs → <strong>Partner</strong> tab to see combined retirement results.</div></div>`;
    kpiWrap.innerHTML = '';
    tbody.innerHTML = '';
    const incomeChart = getEl('chartHouseholdIncome');
    const potChart = getEl('chartHouseholdPot');
    if (incomeChart) incomeChart.innerHTML = '';
    if (potChart) potChart.innerHTML = '';
    return;
  }

  intro.style.display = 'flex';
  intro.innerHTML = `<div>🏠</div><div><div style="font-weight:700">How household mode works</div><div class="muted small">Each person is projected separately using the same projection engine, then combined into one household view. Monthly figures below are after tax, shown in today’s money, and should be read as household affordability rather than tax-optimised advice.</div></div>`;

  const partnerName = household.partnerLabel || 'Partner';
  kpiWrap.innerHTML = [
    { label: 'Combined net income when both retired', value: `${fmtGBP(household.monthlyNetAtBothRetired)}/mo` },
    { label: 'Your share when both retired', value: `${fmtGBP(household.monthlyPrimaryAtBothRetired)}/mo` },
    { label: `${partnerName} share when both retired`, value: `${fmtGBP(household.monthlyPartnerAtBothRetired)}/mo` },
    { label: 'Combined net income when both State Pensions started', value: `${fmtGBP(household.monthlyNetAtBothSP)}/mo` },
    { label: 'Combined pot when both retired', value: fmtGBP(household.combinedPotAtBothRetired) },
    { label: 'Combined pot when both State Pensions started', value: fmtGBP(household.combinedPotAtBothSP) },
  ].map((item) => `<div class="k"><div class="label">${item.label}</div><div class="value">${item.value}</div></div>`).join('');

  const keyAges = Array.from(new Set([
    state.currentAge,
    state.retireAge,
    state.partnerCurrentAge ?? state.spouseCurrentAge,
    state.partnerRetireAge ?? state.spouseRetireAge,
    state.stateAge,
    state.partnerStateAge ?? state.spouseStateAge,
    household.firstBothRetiredAge,
    household.bothSPAge,
    state.endAge,
  ])).filter((age) => age >= Math.min(state.currentAge, state.partnerCurrentAge ?? state.spouseCurrentAge) && age <= state.endAge).sort((a, b) => a - b);

  tbody.innerHTML = keyAges.map((age) => {
    const row = household.years.find((item) => item.age === age);
    return `<tr>
      <td>${age}</td>
      <td class="right">${fmtGBP((row?.primaryNet || 0) / 12)}</td>
      <td class="right">${fmtGBP((row?.partnerNet || 0) / 12)}</td>
      <td class="right">${fmtGBP((row?.householdNet || 0) / 12)}</td>
      <td class="right">${fmtGBP(row?.householdPot || 0)}</td>
      <td class="muted">${row?.notes || ''}</td>
    </tr>`;
  }).join('');

  const partnerRetireAge = state.partnerRetireAge ?? state.spouseRetireAge;
  const partnerStateAge = state.partnerStateAge ?? state.spouseStateAge;
  const markers = [
    { x: state.retireAge, label: 'You retire' },
    { x: partnerRetireAge, label: `${partnerName} retires` },
    { x: state.stateAge, label: 'Your SP' },
    { x: partnerStateAge, label: `${partnerName} SP` },
  ];

  const P = readPalette(getEl('chartHouseholdIncome'));

  renderMultiSeriesChart(getEl('chartHouseholdIncome'), [
    { name: 'Household net / month', color: P.accent, data: household.years.map((year) => ({ x: year.age, y: year.householdNet / 12 })) },
    { name: 'Your net / month', color: P.secondary, data: household.years.map((year) => ({ x: year.age, y: year.primaryNet / 12 })) },
    { name: `${partnerName} net / month`, color: P.tertiary, data: household.years.map((year) => ({ x: year.age, y: year.partnerNet / 12 })) },
  ], markers, { fmtValue: fmtGBP, chartId: 'hhIncome' });

  renderMultiSeriesChart(getEl('chartHouseholdPot'), [
    { name: 'Combined pot', color: P.accent, data: household.years.map((year) => ({ x: year.age, y: year.householdPot })) },
    { name: 'Your pot', color: P.secondary, data: household.years.map((year) => ({ x: year.age, y: year.primaryPot })) },
    { name: `${partnerName} pot`, color: P.tertiary, data: household.years.map((year) => ({ x: year.age, y: year.partnerPot })) },
  ], markers, { chartId: 'hhPot' });
}

export function renderHouseholdSummary({ getEl, fmtGBP }, state, household) {
  const wrap = getEl('householdSummary');
  if (!wrap) return;
  if (state.householdMode !== 'joint' || !household) {
    wrap.style.display = 'none';
    wrap.innerHTML = '';
    return;
  }
  const partnerName = household.partnerLabel || 'Partner';
  wrap.style.display = 'block';
  wrap.innerHTML = `
    <div style="font-weight:700">Household mode summary</div>
    <div class="muted small" style="margin-top:4px">This summary is based on two separate person projections that use the same deterministic engine, then combines the already-calculated outputs into a household view.</div>
    <div class="kpis" style="margin-top:12px">
      <div class="k"><div class="label">Combined net income when both retired</div><div class="value">${fmtGBP(household.monthlyNetAtBothRetired)}/mo</div></div>
      <div class="k"><div class="label">Your share</div><div class="value">${fmtGBP(household.monthlyPrimaryAtBothRetired)}/mo</div></div>
      <div class="k"><div class="label">${partnerName} share</div><div class="value">${fmtGBP(household.monthlyPartnerAtBothRetired)}/mo</div></div>
      <div class="k"><div class="label">Combined pot when both retired</div><div class="value">${fmtGBP(household.combinedPotAtBothRetired)}</div></div>
    </div>`;
}
