import { fmtGBP, fmtNum } from './dom.js';

/* ═══════════════════════════════════════════════════════════════
   Shared chart design tokens — mirrors :root in main.css
   Only change colours here; every chart reads from this palette.
   ═══════════════════════════════════════════════════════════════ */
const C = {
  accent:     '#2563eb',
  accentHover:'#1d4ed8',
  accentSoft: 'rgba(37,99,235,.10)',
  success:    '#15803d',
  warning:    '#b45309',
  danger:     '#be123c',
  text1:      '#0f172a',
  text2:      '#334155',
  text3:      '#64748b',
  border1:    '#e2e8f0',
  border2:    '#cbd5e1',
  bgMuted:    '#f8fafc',
  grid:       'rgba(226,232,240,.50)',
  axis:       'rgba(203,213,225,.70)',
  label:      'rgba(100,116,139,.72)',
  marker:     'rgba(203,213,225,.55)',
  markerLbl:  'rgba(100,116,139,.72)',
  areaFill0:  'rgba(37,99,235,.12)',
  areaFill1:  'rgba(37,99,235,.04)',
  band10:     'rgba(37,99,235,.08)',
  band25:     'rgba(37,99,235,.16)',
  median:     '#0f172a',
  font:       'system-ui,-apple-system,sans-serif',
};

/** Format a value for Y-axis: £450k, £1.4M etc. */
function fmtAxis(val){
  if(val >= 1e6){
    const m = val / 1e6;
    return '£' + (m === Math.floor(m) ? m.toFixed(0) : m.toFixed(1)) + 'M';
  }
  if(val >= 1e3) return '£' + Math.round(val/1e3) + 'k';
  if(val === 0) return '£0';
  return '£' + String(Math.round(val));
}

/**
 * Pick nice Y-axis tick values.
 * Uses 1-2-5 sequence for clean financial increments.
 * headroom: fraction above rawMax to add (e.g. 0.30 = 30%)
 */
function niceScale(maxVal, count=5, headroom=0){
  const ceil = maxVal * (1 + headroom);
  if(ceil <= 0) return [0];
  const rough = ceil / count;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const residual = rough / mag;
  let nice;
  if(residual <= 1.5) nice = 1 * mag;
  else if(residual <= 3) nice = 2 * mag;
  else if(residual <= 7) nice = 5 * mag;
  else nice = 10 * mag;
  const ticks = [];
  for(let v=0; v<=ceil+nice*0.01; v+=nice) ticks.push(Math.round(v));
  // Ensure the top tick provides at least 10% headroom above rawMax
  if(ticks[ticks.length-1] < maxVal * 1.10){
    ticks.push(ticks[ticks.length-1] + nice);
  }
  return ticks;
}

export function drawLineChart(svg, series, markers=[], opts={}){
  const light = opts.theme === 'light';
  const fancy = opts.fancy === true;
  const emphasizeBaseline = opts.emphasizeBaseline === true;
  const showLegend = opts.showLegend !== false;

  // Delegate to modern renderer for fancy mode
  if(fancy) return _drawFancyChart(svg, series, markers, opts);

  const gridColor      = C.grid;
  const axisColor      = C.axis;
  const labelColor     = C.label;
  const legendColor    = C.text2;
  const markerColor    = C.marker;
  const markerLblColor = C.markerLbl;

  const w=Number(svg.getAttribute('width')), h=Number(svg.getAttribute('height'));
  const basePad={l:52,r:18,t:28,b:34};
  let xs=[], ys=[];
  series.forEach(s=>s.data.forEach(p=>{xs.push(p.x); ys.push(p.y);}));
  if(xs.length===0){ svg.innerHTML=''; return; }
  const xmin=Math.min(...xs), xmax=Math.max(...xs);
  const rawYmax=Math.max(...ys);
  const ymax=rawYmax, ymin=0;

  const perRow = 4;
  const legendItemW = Math.min(190, Math.floor((w - basePad.l - basePad.r) / perRow));
  const legendRows = Math.ceil(series.length / perRow);
  const showLeg = showLegend && series.length > 1;
  const legendH = showLeg ? legendRows * 16 : 0;
  const legend = showLeg ? series.map((s,i)=>{
    const col = i % perRow, row = Math.floor(i / perRow);
    const lx = basePad.l + col * legendItemW, ly = 12 + row * 16;
    return `<g transform="translate(${lx},${ly})"><rect width="12" height="3" y="4" fill="${s.color}" rx="1.5" /><text x="16" y="10" fill="${legendColor}" font-size="11" font-weight="500" font-family="${C.font}">${s.name}</text></g>`;
  }).join('') : '';

  const pad = Object.assign({}, basePad, {t: basePad.t + legendH});
  const X=(x)=>pad.l+(x-xmin)/(xmax-xmin||1)*(w-pad.l-pad.r);
  const Y=(y)=>pad.t+(1-(y-ymin)/(ymax-ymin||1))*(h-pad.t-pad.b);

  const gridLines=Array.from({length:6}, (_,i)=>{
    const yy=pad.t+i*(h-pad.t-pad.b)/5;
    return `<line x1="${pad.l}" y1="${yy}" x2="${w-pad.r}" y2="${yy}" stroke="${gridColor}" stroke-dasharray="4,4" />`;
  }).join('');
  const yLabels=Array.from({length:6}, (_,i)=>{
    const val = ymax - i*(ymax)/5;
    const yy=pad.t+i*(h-pad.t-pad.b)/5;
    return `<text x="${pad.l-8}" y="${yy+4}" fill="${labelColor}" font-size="11" font-weight="500" font-family="${C.font}" text-anchor="end">${fmtNum(val/1000)}k</text>`;
  }).join('');
  const xTickValues = [xmin, Math.round((xmin+xmax)/2), xmax];
  const xLabels = xTickValues.map(a=>
    `<text x="${X(a)}" y="${h-12}" fill="${labelColor}" font-size="11" font-weight="500" font-family="${C.font}" text-anchor="middle">${a}</text>`
  ).join('');

  const lines = series.map((s, si)=>{
    const d = s.data.map((p,i)=>`${i?'L':'M'} ${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(' ');
    const col = s.color;
    const width = emphasizeBaseline ? (si === 0 ? '2.8' : '2') : '2.4';
    const dashRequested = s.dashed === true;
    const defaultDash = (emphasizeBaseline && si !== 0);
    const dash  = (dashRequested || defaultDash) ? 'stroke-dasharray="6,3"' : '';
    return `<path d="${d}" fill="none" stroke="${col}" stroke-width="${width}" ${dash} stroke-linejoin="round" stroke-linecap="round" />`;
  }).join('');

  const markerSvgs = markers.map((m, idx)=>{
    const xx=X(m.x);
    const col=m.color || markerColor;
    return `<g>
      <line x1="${xx}" y1="${pad.t}" x2="${xx}" y2="${h-pad.b}" stroke="${col}" stroke-dasharray="4,4" />
      <text x="${xx+4}" y="${pad.t+12+(idx*12)}" fill="${markerLblColor}" font-size="11">${m.label||''}</text>
    </g>`;
  }).join('');

  const axes = `<line x1="${pad.l}" y1="${h-pad.b}" x2="${w-pad.r}" y2="${h-pad.b}" stroke="${axisColor}" stroke-width="1" />
     <line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${h-pad.b}" stroke="${axisColor}" stroke-width="1" />`;

  svg.innerHTML = `
    <rect x="0" y="0" width="${w}" height="${h}" fill="transparent" />
    ${legend} ${gridLines} ${axes} ${markerSvgs} ${lines} ${yLabels} ${xLabels}
  `;
}

/* ═══════════════════════════════════════════════════════════════════
   HorizonLens-style chart — smooth area with interactive tooltip
   ═══════════════════════════════════════════════════════════════════ */
function _drawFancyChart(svg, series, markers, opts){
  const W = 900, H = 380;
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.style.overflow = 'hidden';

  const pad = {l:72, r:40, t:38, b:48};
  const plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;

  // ── Collect data ──
  let xs=[], ys=[];
  series.forEach(s=>s.data.forEach(p=>{xs.push(p.x); ys.push(p.y);}));
  if(!xs.length){ svg.innerHTML=''; return; }
  const xmin=Math.min(...xs), xmax=Math.max(...xs);
  const rawMax=Math.max(...ys);

  // 30% headroom via niceScale — guarantees the line never touches the top
  const ticks = niceScale(rawMax, 5, 0.30);
  const ymax = ticks[ticks.length-1];

  // ── Scale helpers ──
  const X = v => pad.l + (v-xmin)/(xmax-xmin||1) * plotW;
  const Y = v => pad.t + (1 - v/ymax) * plotH;

  // ── Data points ──
  const s0 = series[0];
  const color = s0?.color || C.accent;
  const pts = (s0?.data || []).map(p=>({x:p.x, y:p.y, sx:X(p.x), sy:Y(p.y)}));

  // ── Monotone cubic Hermite spline (no overshoot, smooth curves) ──
  function monotonePath(points){
    const n = points.length;
    if(n < 2) return points.map((p,i)=>`${i?'L':'M'}${p.sx.toFixed(1)},${p.sy.toFixed(1)}`).join(' ');
    if(n === 2) return `M${points[0].sx.toFixed(1)},${points[0].sy.toFixed(1)} L${points[1].sx.toFixed(1)},${points[1].sy.toFixed(1)}`;
    const dx=[], slope=[];
    for(let i=0;i<n-1;i++){
      dx[i] = points[i+1].sx - points[i].sx;
      slope[i] = dx[i] ? (points[i+1].sy - points[i].sy) / dx[i] : 0;
    }
    // Tangents — zero at sign changes (monotonicity)
    const tan=new Array(n);
    tan[0] = slope[0];
    for(let i=1;i<n-1;i++){
      if(slope[i-1]*slope[i] <= 0) tan[i]=0;
      else tan[i] = (slope[i-1]+slope[i]) / 2;
    }
    tan[n-1] = slope[n-2];
    // Fritsch-Carlson overshoot prevention
    for(let i=0;i<n-1;i++){
      if(Math.abs(slope[i]) < 1e-10){ tan[i]=0; tan[i+1]=0; continue; }
      const a=tan[i]/slope[i], b=tan[i+1]/slope[i];
      if(a<0) tan[i]=0;
      if(b<0) tan[i+1]=0;
      const mag = a*a + b*b;
      if(mag > 9){ const s=3/Math.sqrt(mag); tan[i]=s*a*slope[i]; tan[i+1]=s*b*slope[i]; }
    }
    // Build SVG path
    let d = `M${points[0].sx.toFixed(1)},${points[0].sy.toFixed(1)}`;
    for(let i=0;i<n-1;i++){
      const seg = dx[i]/3;
      d += ` C${(points[i].sx+seg).toFixed(1)},${(points[i].sy+tan[i]*seg).toFixed(1)} ${(points[i+1].sx-seg).toFixed(1)},${(points[i+1].sy-tan[i+1]*seg).toFixed(1)} ${points[i+1].sx.toFixed(1)},${points[i+1].sy.toFixed(1)}`;
    }
    return d;
  }

  const curvePath = monotonePath(pts);
  const bottomY = Y(0);
  const firstPt = pts[0], lastPt = pts[pts.length-1];

  // ── SVG defs ──
  const defs = `<defs>
    <linearGradient id="hlGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="${color}" stop-opacity="0.18"/>
      <stop offset="50%"  stop-color="${color}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0.01"/>
    </linearGradient>
    <clipPath id="hlClip"><rect x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}"/></clipPath>
  </defs>`;

  // ── Plot background rect (subtle frame inside the SVG) ──
  const plotBg = `<rect x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="${C.bgMuted}" rx="4"/>`;

  // ── Horizontal grid lines ──
  const grid = ticks.map(v =>
    `<line x1="${pad.l}" y1="${Y(v)}" x2="${W-pad.r}" y2="${Y(v)}" stroke="${C.grid}" stroke-dasharray="4,4"/>`
  ).join('');

  // ── Left axis line ──
  const axisL = `<line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${H-pad.b}" stroke="${C.axis}"/>`;

  // ── Y labels ──
  const yLabels = ticks.map(v =>
    `<text x="${pad.l-10}" y="${Y(v)+4}" fill="${C.label}" font-size="12" font-weight="500" text-anchor="end" font-family="${C.font}">${fmtAxis(v)}</text>`
  ).join('');

  // ── X labels ──
  const range = xmax - xmin;
  const step = range <= 20 ? 5 : 10;
  let xVals = [];
  const first = Math.ceil(xmin / step) * step;
  for(let v=first; v<=xmax; v+=step) xVals.push(v);
  if(xVals[0] !== xmin) xVals.unshift(xmin);
  if(xVals[xVals.length-1] !== xmax) xVals.push(xmax);
  xVals = xVals.filter((v,i,a) => i===0 || v - a[i-1] >= step*0.5);
  const xLabels = xVals.map(v =>
    `<text x="${X(v)}" y="${H-pad.b+20}" fill="${C.label}" font-size="12" font-weight="500" text-anchor="middle" font-family="${C.font}">${v}</text>`
  ).join('');

  // ── Markers — vertical reference lines with labels ──
  const mkrs = markers.map((m, idx)=>{
    const xx = X(m.x);
    const label = m.label ? `<text x="${xx+5}" y="${pad.t+14+(idx*14)}" fill="${C.markerLbl}" font-size="11" font-weight="600" font-family="${C.font}">${m.label}</text>` : '';
    return `<line x1="${xx}" y1="${pad.t}" x2="${xx}" y2="${H-pad.b}" stroke="${C.marker}" stroke-dasharray="3,4"/>${label}`;
  }).join('');

  // ── Area fill + smooth line (clipped to plot area) ──
  const areaD = `${curvePath} L${lastPt.sx.toFixed(1)},${bottomY.toFixed(1)} L${firstPt.sx.toFixed(1)},${bottomY.toFixed(1)} Z`;
  const endDot = `<circle cx="${lastPt.sx.toFixed(1)}" cy="${lastPt.sy.toFixed(1)}" r="4" fill="#fff" stroke="${color}" stroke-width="2"/>`;
  const plot = `<g clip-path="url(#hlClip)">
    <path d="${areaD}" fill="url(#hlGrad)"/>
    <path d="${curvePath}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
    ${endDot}
  </g>`;

  // ── Interactive hover elements ──
  const hover = `
    <line class="hl-vline" y1="${pad.t}" y2="${H-pad.b}" stroke="${C.grid}" stroke-width="1" style="display:none"/>
    <circle class="hl-dot" r="5" fill="#fff" stroke="${color}" stroke-width="2.5" style="display:none"/>
    <rect class="hl-zone" x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="transparent" style="cursor:crosshair"/>
  `;

  svg.innerHTML = `${defs}${plotBg}${grid}${axisL}${mkrs}${plot}${yLabels}${xLabels}${hover}`;

  _attachFancyTooltip(svg, {
    data: s0?.data || [], xmin, xmax, ymax, pad, plotW, plotH, W, H, color
  });
}

/** Interactive tooltip — snaps to nearest age, positions in CSS pixels */
function _attachFancyTooltip(svg, cfg){
  const zone  = svg.querySelector('.hl-zone');
  const dot   = svg.querySelector('.hl-dot');
  const vLine = svg.querySelector('.hl-vline');
  if(!zone) return;

  const wrap = svg.parentElement;
  wrap.style.position = 'relative';
  let tip = wrap.querySelector('.chart-tooltip');
  if(!tip){
    tip = document.createElement('div');
    tip.className = 'chart-tooltip';
    wrap.appendChild(tip);
  }

  const {data, xmin, xmax, ymax, pad, plotW, plotH, W, H} = cfg;
  const X = v => pad.l + (v-xmin)/(xmax-xmin||1)*plotW;
  const Y = v => pad.t + (1-v/ymax)*plotH;

  zone.addEventListener('mousemove', e=>{
    const rect = svg.getBoundingClientRect();
    const svgX = (e.clientX - rect.left) / rect.width * W;
    const dataX = xmin + (svgX - pad.l)/plotW * (xmax-xmin);

    let best=data[0], dist=Infinity;
    for(const pt of data){ const d=Math.abs(pt.x-dataX); if(d<dist){dist=d; best=pt;} }

    const cx = X(best.x), cy = Y(best.y);
    dot.setAttribute('cx', cx);
    dot.setAttribute('cy', cy);
    dot.style.display = '';
    vLine.setAttribute('x1', cx);
    vLine.setAttribute('x2', cx);
    vLine.style.display = '';

    const tipPxX = cx / W * rect.width;
    const tipPxY = cy / H * rect.height;
    tip.innerHTML = `<strong>Age ${best.x}</strong><br>Pot&nbsp;&nbsp;${fmtGBP(best.y)}`;
    tip.style.left = tipPxX + 'px';
    tip.style.top  = (tipPxY - 58) + 'px';
    tip.style.setProperty('opacity','1','important');
  });

  zone.addEventListener('mouseleave', ()=>{
    dot.style.display = 'none';
    vLine.style.display = 'none';
    tip.style.setProperty('opacity','0','important');
  });
}

export function drawBarBreakdown(svg, data){
  const w=Number(svg.getAttribute('width')), h=Number(svg.getAttribute('height'));
  const pad={l:18,r:18,t:18,b:18};
  const grossItems = data.grossItems || [];
  const grossTotal = grossItems.reduce((a,b)=>a+b.value,0) || 1;
  const netTotal = data.netTotal || 0;
  const tax = data.tax || 0;
  const barW=w-pad.l-pad.r;
  let x=pad.l;
  const y=90, barH=24;

  const segs = grossItems.map(it=>{
    const ww = barW*(it.value/grossTotal);
    const seg = `<rect x="${x}" y="${y}" width="${ww}" height="${barH}" rx="10" fill="${it.color}" opacity="0.95"/>`;
    x += ww;
    return seg;
  }).join('');

  const legendItems = [
    ...grossItems,
    {label:'Tax', value:-tax, color:'rgba(190,18,60,.65)'},
    {label:'Total net income', value:netTotal, color:C.border2}
  ];

  const legend = legendItems.map((it,i)=>{
    const yy = 150 + i*18;
    return `<g>
      <rect x="${pad.l}" y="${yy-10}" width="10" height="10" rx="2" fill="${it.color}" />
      <text x="${pad.l+14}" y="${yy}" fill="${C.text2}" font-size="12" font-family="${C.font}">${it.label}</text>
      <text x="${w-pad.r}" y="${yy}" fill="${C.text2}" font-size="12" font-family="${C.font}" text-anchor="end">${it.value < 0 ? '−' + fmtGBP(Math.abs(it.value)).replace('£','£') : fmtGBP(it.value)}</text>
    </g>`;
  }).join('');

  svg.innerHTML = `
    <rect x="0" y="0" width="${w}" height="${h}" fill="transparent" />
    <text x="${pad.l}" y="34" fill="${C.text1}" font-size="26" font-weight="700" font-family="${C.font}">${fmtGBP(netTotal)}</text>
    <text x="${pad.l}" y="54" fill="${C.text3}" font-size="12" font-family="${C.font}">Gross income sources less tax = total net income</text>
    ${segs}
    ${legend}
  `;
}

export function drawBands(svg, bands, showBands=true, opts={}){
  const gridColor  = C.grid;
  const axisColor  = C.axis;
  const labelColor = C.label;
  const medianColor = C.median;
  const band10Color = C.band10;
  const band25Color = C.band25;
  const w=Number(svg.getAttribute('width')), h=Number(svg.getAttribute('height'));
  const pad={l:46,r:18,t:18,b:34};
  const xs=bands.map(b=>b.age);
  const ys=[]; bands.forEach(b=>ys.push(b.p10,b.p50,b.p90));
  const xmin=Math.min(...xs), xmax=Math.max(...xs);
  const ymax=Math.max(...ys), ymin=0;
  const X=(x)=>pad.l+(x-xmin)/(xmax-xmin||1)*(w-pad.l-pad.r);
  const Y=(y)=>pad.t+(1-(y-ymin)/(ymax-ymin||1))*(h-pad.t-pad.b);

  const grid = Array.from({length:6}, (_,i)=>{
    const yy=pad.t+i*(h-pad.t-pad.b)/5;
    return `<line x1="${pad.l}" y1="${yy}" x2="${w-pad.r}" y2="${yy}" stroke="${gridColor}" stroke-dasharray="4,4" />`;
  }).join('');

  const yLabels = Array.from({length:6}, (_,i)=>{
    const val = ymax - i*(ymax)/5;
    const yy=pad.t+i*(h-pad.t-pad.b)/5;
    return `<text x="${pad.l-10}" y="${yy+4}" fill="${labelColor}" font-size="11" font-weight="500" font-family="${C.font}" text-anchor="end">${fmtNum(val/1000)}k</text>`;
  }).join('');

  const xLabels = [xmin, Math.round((xmin+xmax)/2), xmax].map(a=>`<text x="${X(a)}" y="${h-12}" fill="${labelColor}" font-size="11" font-weight="500" font-family="${C.font}" text-anchor="middle">${a}</text>`).join('');

  const path = (key)=> bands.map((b,i)=>`${i?'L':'M'} ${X(b.age).toFixed(1)} ${Y(b[key]).toFixed(1)}`).join(' ');

  const band25_75 = `M ${X(bands[0].age)} ${Y(bands[0].p25)} ` +
    bands.slice(1).map(b=>`L ${X(b.age)} ${Y(b.p25)}`).join(' ') +
    ' ' + bands.slice().reverse().map((b,i)=>`${i?'L':'L'} ${X(b.age)} ${Y(b.p75)}`).join(' ') + ' Z';

  const band10_90 = `M ${X(bands[0].age)} ${Y(bands[0].p10)} ` +
    bands.slice(1).map(b=>`L ${X(b.age)} ${Y(b.p10)}`).join(' ') +
    ' ' + bands.slice().reverse().map((b,i)=>`${i?'L':'L'} ${X(b.age)} ${Y(b.p90)}`).join(' ') + ' Z';

  svg.innerHTML = `
    <rect x="0" y="0" width="${w}" height="${h}" fill="transparent" />
    ${grid}
    <line x1="${pad.l}" y1="${h-pad.b}" x2="${w-pad.r}" y2="${h-pad.b}" stroke="${axisColor}" />
    <line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${h-pad.b}" stroke="${axisColor}" />
    ${yLabels}
    ${xLabels}
    ${showBands?`<path d="${band10_90}" fill="${band10Color}" stroke="none" />`:''}
    ${showBands?`<path d="${band25_75}" fill="${band25Color}" stroke="none" />`:''}
    <path d="${path('p50')}" fill="none" stroke="${medianColor}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />
  `;
}
