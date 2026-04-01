import { fmtGBP as defaultFmtGBP } from './dom.js';

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
  const accent  = v('--accent')  || '#4f46e5';
  const warning = v('--warning') || '#d97706';
  const danger  = v('--danger')  || '#e11d48';
  const success = v('--success') || '#16a34a';
  const [ar, ag, ab] = parseRGB(accent);
  const [sr, sg, sb] = parseRGB(success);
  const [dr, dg, db] = parseRGB(danger);
  return {
    accent, warning, danger, success,
    secondary: v('--text-3') || '#6b7280',
    text1: v('--text-1') || '#111827',
    text3: v('--text-3') || '#6b7280',
    bgMuted: v('--bg-surface-muted') || '#f8f9fb',
    grid: v('--border-1') || '#e5e7eb',
    axis: v('--border-2') || '#d1d5db',
    label: v('--text-3') || '#6b7280',
    font: 'system-ui,-apple-system,sans-serif',
    bandAccum: `rgba(${ar},${ag},${ab},.05)`,
    bandBridge: `rgba(${dr},${dg},${db},.04)`,
    bandPost: `rgba(${sr},${sg},${sb},.04)`,
    bandDepleted: `rgba(${dr},${dg},${db},.08)`,
  };
}

/* ── Helpers ── */
const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

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

/* ═══════════════════════════════════════════════════════════════
   createBridgeRenderer(deps)
   ═══════════════════════════════════════════════════════════════ */
export function createBridgeRenderer(deps) {
  const { getEl, calcBridge, fmtGBP } = deps;

  return function renderBridge(s) {
    if (!getEl('br_endAge').value) getEl('br_endAge').value = s.stateAge;
    if (!getEl('br_postDraw').value) getEl('br_postDraw').value = s.drawdown;
    if (getEl('br_earlyAge')?.value !== '') getEl('in_earlyAge').value = getEl('br_earlyAge').value;

    const opts = { crashAtEarly: s.bridgeCrashEarly === 1, crashAtState: s.bridgeCrashState === 1, badSeqFromEarly: s.bridgeBadSeq === 1 };
    const br = calcBridge(s, opts);

    if (br.error) {
      getEl('bridgeKpis').innerHTML = `<div class="bridge-kpi-grid"><div class="bridge-kpi bridge-kpi--result-bad" style="grid-column:span 12"><div class="label">Bridge status</div><div class="value">${esc(br.error)}</div></div></div>`;
      getEl('tblBridge').querySelector('tbody').innerHTML = `<tr><td colspan="6" class="muted">${esc(br.error)}</td></tr>`;
      getEl('chartBridge').innerHTML = '';
      return br;
    }

    /* ── KPIs ── */
    const okBase = (br.runOut_base === null);
    const marginalBase = okBase && Number(s.bridgeAmount) > 0 && br.potEnd_base < Number(s.bridgeAmount) * 5;
    const okLife = (s.bridgeKeepLifestyle === 1 ? (br.runOut_life === null) : null);

    const kpis = [];
    kpis.push({ label: `Pot at start of early retirement (age ${br.early})`, value: fmtGBP(br.potEarly_base) });
    kpis.push({ label: `Pot at State Pension age (age ${br.end}) — baseline`, value: fmtGBP(br.potEnd_base) });
    kpis.push({ label: `Net income at age ${br.end} (after tax, incl. State Pension) — baseline`, value: fmtGBP(br.netEnd_base) });
    kpis.push({ label: `Bridge result (baseline)`, value: marginalBase ? `Barely holds — only ${fmtGBP(br.potEnd_base)} left at ${br.end}` : okBase ? `Holds (to age ${s.endAge})` : `Fails (runs out at age ${br.runOut_base})` });
    kpis.push({ label: `Pot run-out age (baseline)`, value: marginalBase ? `Effective: ~${br.end}` : okBase ? `Never (to ${s.endAge})` : String(br.runOut_base) });

    if (s.bridgeKeepLifestyle === 1) {
      kpis.push({ label: `Pot at State Pension age (age ${br.end}) — lifestyle path`, value: fmtGBP(br.potEnd_life) });
      kpis.push({ label: `Net income at age ${br.end} (after tax, incl. State Pension) — lifestyle target`, value: fmtGBP(br.netEnd_life) });
      kpis.push({ label: `Bridge result (lifestyle path)`, value: okLife ? `Holds (to age ${s.endAge})` : `Fails (runs out at age ${br.runOut_life})` });
      kpis.push({ label: `Pot run-out age (lifestyle)`, value: okLife ? `Never (to ${s.endAge})` : String(br.runOut_life) });
    }

    getEl('bridgeKpis').innerHTML = `<div class="bridge-kpi-grid">${kpis.map(k => {
      const key = String(k.label || '').toLowerCase();
      const isResult = key.includes('bridge result');
      const isFail = isResult && String(k.value || '').toLowerCase().includes('fails');
      const cls = isResult ? (isFail ? ' bridge-kpi--result-bad' : ' bridge-kpi--result-good') : '';
      return `<div class="bridge-kpi${cls}"><div class="label">${esc(k.label)}</div><div class="value">${esc(k.value)}</div></div>`;
    }).join('')}</div>`;

    /* ── Table ── */
    const rows = br.baseline.filter(y => y.phase === 'bridge' || (y.phase === 'post' && y.age === br.end));
    getEl('tblBridge').querySelector('tbody').innerHTML = rows.map(y => `<tr>
      <td>${y.age}</td>
      <td class="right">${fmtGBP(y.gross)}</td>
      <td class="right">${fmtGBP(y.netIncome)}</td>
      <td class="right">${fmtGBP(y.potStart)}</td>
      <td class="right">${fmtGBP(y.potEnd)}</td>
      <td class="muted">${y.age === br.end ? 'First year incl. State Pension' : ''}</td>
    </tr>`).join('');

    /* ── Chart ── */
    renderChart(getEl('chartBridge'), br, s);
    return br;
  };

  /* ═══════════════════════════════════════════════════════════════
     Premium bridge chart renderer
     ═══════════════════════════════════════════════════════════════ */
  function renderChart(svgEl, br, s) {
    const P = readPalette(svgEl);
    const W = 960, H = 380;
    svgEl.removeAttribute('width');
    svgEl.removeAttribute('height');
    svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svgEl.style.width = '100%';
    svgEl.style.height = 'auto';

    const pad = { l: 72, r: 32, t: 42, b: 48 };
    const plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;

    /* Collect all data for scale computation */
    const baseline = br.baseline.map(y => ({ x: y.age, y: y.potEnd }));
    const lifestyle = br.lifestyle ? br.lifestyle.map(y => ({ x: y.age, y: y.potEnd })) : null;
    const allPts = lifestyle ? [...baseline, ...lifestyle] : baseline;
    if (!allPts.length) { svgEl.innerHTML = ''; return; }

    const xmin = Math.min(...allPts.map(p => p.x));
    const xmax = Math.max(...allPts.map(p => p.x));
    const rawMax = Math.max(...allPts.map(p => p.y), 1);
    const ticks = niceScale(rawMax);
    const ymax = ticks[ticks.length - 1];

    const X = a => pad.l + (a - xmin) / (xmax - xmin || 1) * plotW;
    const Y = v => pad.t + (1 - Math.max(v, 0) / ymax) * plotH;
    const baseY = Y(0);

    const parts = [];

    /* ── Defs: gradients + clip ── */
    parts.push(`<defs>
      <linearGradient id="brG-base" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${P.accent}" stop-opacity=".18"/>
        <stop offset="100%" stop-color="${P.accent}" stop-opacity=".02"/>
      </linearGradient>
      <linearGradient id="brG-life" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${P.secondary}" stop-opacity=".12"/>
        <stop offset="100%" stop-color="${P.secondary}" stop-opacity=".01"/>
      </linearGradient>
      <clipPath id="brClip"><rect x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}"/></clipPath>
    </defs>`);

    /* ── Plot background ── */
    parts.push(`<rect x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="${P.bgMuted}" rx="4"/>`);

    /* ── Phase bands ── */
    const earlyAge = br.early;
    const spAge = s.stateAge || br.end;
    const runOutBase = br.runOut_base;

    const edges = [xmin];
    if (earlyAge > xmin && earlyAge <= xmax) edges.push(earlyAge);
    if (spAge > xmin && spAge <= xmax && spAge !== earlyAge) edges.push(spAge);
    if (runOutBase && runOutBase > xmin && runOutBase <= xmax) edges.push(runOutBase);
    edges.push(xmax);
    const uniqEdges = [...new Set(edges)].sort((a, b) => a - b);

    for (let i = 0; i < uniqEdges.length - 1; i++) {
      const a0 = uniqEdges[i], a1 = uniqEdges[i + 1], mid = (a0 + a1) / 2;
      let fill = P.bandAccum;
      if (runOutBase && mid >= runOutBase) fill = P.bandDepleted;
      else if (mid >= spAge) fill = P.bandPost;
      else if (mid >= earlyAge) fill = P.bandBridge;
      const bx = Math.max(pad.l, X(a0)), bw = Math.min(X(a1), pad.l + plotW) - bx;
      if (bw > 0) parts.push(`<rect x="${bx}" y="${pad.t}" width="${bw}" height="${plotH}" fill="${fill}"/>`);
    }

    /* ── Grid + Y-axis ── */
    ticks.forEach(v => {
      parts.push(`<line x1="${pad.l}" y1="${Y(v)}" x2="${W - pad.r}" y2="${Y(v)}" stroke="${P.grid}" stroke-dasharray="4,4"/>`);
      parts.push(`<text x="${pad.l - 10}" y="${Y(v) + 4}" fill="${P.label}" font-size="11" font-weight="500" text-anchor="end" font-family="${P.font}">${fmtAxis(v)}</text>`);
    });

    /* ── X-axis labels ── */
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

    /* ── Axis lines ── */
    parts.push(`<line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${H - pad.b}" stroke="${P.axis}"/>`);
    parts.push(`<line x1="${pad.l}" y1="${H - pad.b}" x2="${W - pad.r}" y2="${H - pad.b}" stroke="${P.axis}"/>`);

    /* ── Series rendering (clipped) ── */
    const clipped = [];

    /* Lifestyle first (behind baseline) */
    if (lifestyle && lifestyle.length >= 2) {
      const pts = lifestyle.map(p => [X(p.x), Y(p.y)]);
      const curve = splinePath(pts);
      const first = pts[0], last = pts[pts.length - 1];
      clipped.push(`<path d="${curve} L${last[0].toFixed(1)},${baseY.toFixed(1)} L${first[0].toFixed(1)},${baseY.toFixed(1)} Z" fill="url(#brG-life)"/>`);
      clipped.push(`<path d="${curve}" fill="none" stroke="${P.secondary}" stroke-width="2" stroke-dasharray="6,4" stroke-linejoin="round" stroke-linecap="round" opacity=".7"/>`);
    }

    /* Baseline */
    if (baseline.length >= 2) {
      const pts = baseline.map(p => [X(p.x), Y(p.y)]);
      const curve = splinePath(pts);
      const first = pts[0], last = pts[pts.length - 1];
      clipped.push(`<path d="${curve} L${last[0].toFixed(1)},${baseY.toFixed(1)} L${first[0].toFixed(1)},${baseY.toFixed(1)} Z" fill="url(#brG-base)"/>`);
      clipped.push(`<path d="${curve}" fill="none" stroke="${P.accent}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`);
    }

    parts.push(`<g clip-path="url(#brClip)">${clipped.join('')}</g>`);

    /* ── Milestone markers ── */
    const milestones = [];
    if (earlyAge >= xmin && earlyAge <= xmax) milestones.push({ age: earlyAge, label: 'Early', color: P.accent });
    if (spAge >= xmin && spAge <= xmax) milestones.push({ age: spAge, label: 'State Pension', color: P.success });
    if (runOutBase && runOutBase >= xmin && runOutBase <= xmax) milestones.push({ age: runOutBase, label: 'Run-out', color: P.danger });
    if (br.runOut_life && br.runOut_life >= xmin && br.runOut_life <= xmax) milestones.push({ age: br.runOut_life, label: 'Run-out (lifestyle)', color: P.danger });

    milestones.forEach((m, idx) => {
      const xx = X(m.age);
      parts.push(`<line x1="${xx}" y1="${pad.t}" x2="${xx}" y2="${H - pad.b}" stroke="${m.color}" stroke-width="1.5" stroke-dasharray="4,3" opacity=".5"/>`);
      /* Find Y on baseline for the dot */
      const bpt = baseline.find(p => p.x === m.age);
      if (bpt) {
        const cy = Y(bpt.y);
        parts.push(`<circle cx="${xx.toFixed(1)}" cy="${cy.toFixed(1)}" r="5" fill="#fff" stroke="${m.color}" stroke-width="2"/>`);
      }
      /* Label — staggered vertically */
      const ly = pad.t + 14 + idx * 16;
      parts.push(`<text x="${xx + 6}" y="${ly}" fill="${m.color}" font-size="10" font-weight="700" font-family="${P.font}">${m.label}</text>`);
    });

    /* End dot on baseline */
    if (baseline.length) {
      const last = baseline[baseline.length - 1];
      const lx = X(last.x), ly = Y(last.y);
      parts.push(`<circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="4" fill="#fff" stroke="${P.accent}" stroke-width="2"/>`);
    }

    /* ── Hover elements ── */
    parts.push(`<line class="br-vline" y1="${pad.t}" y2="${H - pad.b}" stroke="${P.grid}" stroke-width="1" style="display:none"/>`);
    parts.push(`<circle class="br-dot" r="5.5" fill="#fff" stroke="${P.accent}" stroke-width="2.5" style="display:none"/>`);
    parts.push(`<rect class="br-zone" x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="transparent" style="cursor:crosshair"/>`);

    svgEl.innerHTML = parts.join('');

    /* ── Legend (HTML below SVG) ── */
    const legendEl = svgEl.parentElement.querySelector('.br-legend');
    if (legendEl) legendEl.remove();
    const leg = document.createElement('div');
    leg.className = 'br-legend';
    const chips = [`<span class="fc-phase-chip"><span class="fc-phase-dot" style="background:${P.accent}"></span>Baseline</span>`];
    if (lifestyle) chips.push(`<span class="fc-phase-chip"><span class="fc-phase-dot" style="background:${P.secondary};opacity:.7"></span>Maintain lifestyle</span>`);
    leg.innerHTML = chips.join('');
    svgEl.parentElement.appendChild(leg);

    /* ── Interactive tooltip ── */
    attachTooltip(svgEl, baseline, lifestyle, {
      xmin, xmax, ymax, pad, plotW, plotH, W, H, P, fmtGBP,
      earlyAge, spAge, runOutBase
    });
  }

  function attachTooltip(svgEl, baseline, lifestyle, cfg) {
    const zone = svgEl.querySelector('.br-zone');
    const dot = svgEl.querySelector('.br-dot');
    const vline = svgEl.querySelector('.br-vline');
    if (!zone) return;

    const wrap = svgEl.parentElement;
    wrap.style.position = 'relative';
    let tip = wrap.querySelector('.fc-tooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'fc-tooltip';
      wrap.appendChild(tip);
    }

    const { xmin, xmax, ymax, pad, plotW, plotH, W, H, P, fmtGBP: fmt, earlyAge, spAge, runOutBase } = cfg;
    const X = a => pad.l + (a - xmin) / (xmax - xmin || 1) * plotW;
    const Y = v => pad.t + (1 - Math.max(v, 0) / ymax) * plotH;

    function phaseLabel(age) {
      if (runOutBase && age >= runOutBase) return 'Pot depleted';
      if (age >= spAge) return 'Post-SP';
      if (age >= earlyAge) return 'Bridge';
      return 'Working';
    }

    zone.addEventListener('mousemove', e => {
      const rect = svgEl.getBoundingClientRect();
      const svgX = (e.clientX - rect.left) / rect.width * W;
      const dataX = xmin + (svgX - pad.l) / plotW * (xmax - xmin);
      let best = baseline[0], dist = Infinity;
      for (const pt of baseline) { const d = Math.abs(pt.x - dataX); if (d < dist) { dist = d; best = pt; } }

      const cx = X(best.x), cy = Y(best.y);
      const phase = phaseLabel(best.x);
      const phaseCol = runOutBase && best.x >= runOutBase ? P.danger : best.x >= spAge ? P.success : best.x >= earlyAge ? P.accent : P.accent;

      dot.setAttribute('cx', cx); dot.setAttribute('cy', cy);
      dot.setAttribute('stroke', phaseCol); dot.style.display = '';
      vline.setAttribute('x1', cx); vline.setAttribute('x2', cx); vline.style.display = '';

      let rows = `<div class="fc-tip-head">Age ${best.x}<span class="fc-tip-phase" style="color:${phaseCol}">${phase}</span></div>`;
      rows += `<div class="fc-tip-row"><span class="fc-tip-label">Baseline pot</span><span class="fc-tip-val">${fmt(best.y)}</span></div>`;
      if (lifestyle) {
        const lpt = lifestyle.find(p => p.x === best.x);
        if (lpt) rows += `<div class="fc-tip-row fc-tip-row--sub"><span class="fc-tip-label">Lifestyle pot</span><span class="fc-tip-val">${fmt(lpt.y)}</span></div>`;
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
}
