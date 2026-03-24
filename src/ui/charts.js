import { fmtGBP, fmtNum } from './dom.js';

export function drawLineChart(svg, series, markers=[], opts={}){
  const light = opts.theme === 'light';
  const emphasizeBaseline = opts.emphasizeBaseline === true;
  const showLegend = opts.showLegend !== false;
  const gridColor      = light ? 'rgba(15,23,42,.07)'    : 'rgba(255,255,255,.07)';
  const axisColor      = light ? 'rgba(15,23,42,.15)'    : 'rgba(255,255,255,.12)';
  const labelColor     = light ? 'rgba(30,41,59,.60)'    : 'rgba(231,238,252,.70)';
  const legendColor    = light ? 'rgba(15,23,42,.82)'    : 'rgba(231,238,252,.85)';
  const markerColor    = light ? 'rgba(15,23,42,.35)'    : 'rgba(255,255,255,.25)';
  const markerLblColor = light ? 'rgba(30,41,59,.60)'    : 'rgba(231,238,252,.70)';

  const w=Number(svg.getAttribute('width')), h=Number(svg.getAttribute('height'));
  const basePad={l:52,r:18,t:28,b:34};
  let xs=[], ys=[];
  series.forEach(s=>s.data.forEach(p=>{xs.push(p.x); ys.push(p.y);}));
  if(xs.length===0){ svg.innerHTML=''; return; }
  const xmin=Math.min(...xs), xmax=Math.max(...xs);
  const ymax=Math.max(...ys), ymin=0;

  // Legend: wraps into rows of up to 4 items
  const perRow = 4;
  const legendItemW = Math.min(190, Math.floor((w - basePad.l - basePad.r) / perRow));
  const legendRows = Math.ceil(series.length / perRow);
  const legendH = showLegend ? legendRows * 16 : 0;
  const legend = series.map((s,i)=>{
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    const lx = basePad.l + col * legendItemW;
    const ly = 12 + row * 16;
    return `<g transform="translate(${lx},${ly})"><rect width="12" height="3" y="4" fill="${s.color}" rx="1.5" /><text x="16" y="10" fill="${legendColor}" font-size="11">${s.name}</text></g>`;
  }).join('');

  // Plot area sits below the legend
  const pad = Object.assign({}, basePad, {t: basePad.t + legendH});
  const X=(x)=>pad.l+(x-xmin)/(xmax-xmin||1)*(w-pad.l-pad.r);
  const Y=(y)=>pad.t+(1-(y-ymin)/(ymax-ymin||1))*(h-pad.t-pad.b);

  const grid = Array.from({length:6}, (_,i)=>{
    const yy=pad.t+i*(h-pad.t-pad.b)/5;
    return `<line x1="${pad.l}" y1="${yy}" x2="${w-pad.r}" y2="${yy}" stroke="${gridColor}" />`;
  }).join('');

  const yLabels = Array.from({length:6}, (_,i)=>{
    const val = ymax - i*(ymax)/5;
    const yy=pad.t+i*(h-pad.t-pad.b)/5;
    return `<text x="${pad.l-8}" y="${yy+4}" fill="${labelColor}" font-size="11" text-anchor="end">${fmtNum(val/1000)}k</text>`;
  }).join('');

  const xLabels = [xmin, Math.round((xmin+xmax)/2), xmax]
    .map(a=>`<text x="${X(a)}" y="${h-10}" fill="${labelColor}" font-size="11" text-anchor="middle">${a}</text>`)
    .join('');

  const lines = series.map((s, si)=>{
    const d=s.data.map((p,i)=>`${i?'L':'M'} ${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(' ');
    const width = emphasizeBaseline ? (si === 0 ? '2.8' : '2') : '2.4';
    const dashRequested = s.dashed === true;
    const defaultDash = (emphasizeBaseline && si !== 0);
    const dash  = (dashRequested || defaultDash) ? 'stroke-dasharray="6,3"' : '';
    return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${width}" ${dash} stroke-linejoin="round" />`;
  }).join('');

  const markerSvgs = markers.map((m, idx)=>{
    const xx=X(m.x);
    const col=m.color || markerColor;
    return `<g>
      <line x1="${xx}" y1="${pad.t}" x2="${xx}" y2="${h-pad.b}" stroke="${col}" stroke-dasharray="4,4" />
      <text x="${xx+4}" y="${pad.t+12+(idx*12)}" fill="${markerLblColor}" font-size="11">${m.label||''}</text>
    </g>`;
  }).join('');

  svg.innerHTML = `
    <rect x="0" y="0" width="${w}" height="${h}" fill="transparent" />
    ${showLegend ? legend : ''}
    ${grid}
    <line x1="${pad.l}" y1="${h-pad.b}" x2="${w-pad.r}" y2="${h-pad.b}" stroke="${axisColor}" />
    <line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${h-pad.b}" stroke="${axisColor}" />
    ${markerSvgs}
    ${yLabels}
    ${xLabels}
    ${lines}
  `;
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
    {label:'Tax', value:-tax, color:'rgba(248,113,113,.85)'},
    {label:'Total net income', value:netTotal, color:'rgba(231,238,252,.90)'}
  ];

  const legend = legendItems.map((it,i)=>{
    const yy = 150 + i*18;
    return `<g>
      <rect x="${pad.l}" y="${yy-10}" width="10" height="10" rx="2" fill="${it.color}" />
      <text x="${pad.l+14}" y="${yy}" fill="rgba(231,238,252,.85)" font-size="12">${it.label}</text>
      <text x="${w-pad.r}" y="${yy}" fill="rgba(231,238,252,.85)" font-size="12" text-anchor="end">${it.value < 0 ? '−' + fmtGBP(Math.abs(it.value)).replace('£','£') : fmtGBP(it.value)}</text>
    </g>`;
  }).join('');

  svg.innerHTML = `
    <rect x="0" y="0" width="${w}" height="${h}" fill="transparent" />
    <text x="${pad.l}" y="34" fill="rgba(231,238,252,.85)" font-size="26" font-weight="700">${fmtGBP(netTotal)}</text>
    <text x="${pad.l}" y="54" fill="rgba(231,238,252,.65)" font-size="12">Gross income sources less tax = total net income</text>
    ${segs}
    ${legend}
  `;
}

export function drawBands(svg, bands, showBands=true, opts={}){
  const light = opts.theme === 'light';
  const gridColor = light ? 'rgba(15,23,42,.07)' : 'rgba(255,255,255,.07)';
  const axisColor = light ? 'rgba(15,23,42,.15)' : 'rgba(255,255,255,.12)';
  const labelColor = light ? 'rgba(30,41,59,.60)' : 'rgba(231,238,252,.70)';
  const medianColor = light ? 'rgba(30,41,59,.92)' : 'rgba(231,238,252,.85)';
  const band10Color = light ? 'rgba(99,102,241,.16)' : 'rgba(167,139,250,.12)';
  const band25Color = light ? 'rgba(59,130,246,.18)' : 'rgba(110,231,255,.14)';
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
    return `<line x1="${pad.l}" y1="${yy}" x2="${w-pad.r}" y2="${yy}" stroke="${gridColor}" />`;
  }).join('');

  const yLabels = Array.from({length:6}, (_,i)=>{
    const val = ymax - i*(ymax)/5;
    const yy=pad.t+i*(h-pad.t-pad.b)/5;
    return `<text x="${pad.l-10}" y="${yy+4}" fill="${labelColor}" font-size="11" text-anchor="end">${fmtNum(val/1000)}k</text>`;
  }).join('');

  const xLabels = [xmin, Math.round((xmin+xmax)/2), xmax].map(a=>`<text x="${X(a)}" y="${h-12}" fill="${labelColor}" font-size="11" text-anchor="middle">${a}</text>`).join('');

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
    <path d="${path('p50')}" fill="none" stroke="${medianColor}" stroke-width="2.2" />
  `;
}
