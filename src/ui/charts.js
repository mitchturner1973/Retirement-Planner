import { fmtGBP, fmtNum } from './dom.js';

export function drawLineChart(svg, series, markers=[]){
  const w=Number(svg.getAttribute('width')), h=Number(svg.getAttribute('height'));
  const pad={l:46,r:18,t:18,b:34};
  let xs=[], ys=[];
  series.forEach(s=>s.data.forEach(p=>{xs.push(p.x); ys.push(p.y);}));
  if(xs.length===0){ svg.innerHTML=''; return; }
  const xmin=Math.min(...xs), xmax=Math.max(...xs);
  const ymax=Math.max(...ys), ymin=0;
  const X=(x)=>pad.l+(x-xmin)/(xmax-xmin||1)*(w-pad.l-pad.r);
  const Y=(y)=>pad.t+(1-(y-ymin)/(ymax-ymin||1))*(h-pad.t-pad.b);

  const grid = Array.from({length:6}, (_,i)=>{
    const yy=pad.t+i*(h-pad.t-pad.b)/5;
    return `<line x1="${pad.l}" y1="${yy}" x2="${w-pad.r}" y2="${yy}" stroke="rgba(255,255,255,.07)" />`;
  }).join('');

  const yLabels = Array.from({length:6}, (_,i)=>{
    const val = ymax - i*(ymax)/5;
    const yy=pad.t+i*(h-pad.t-pad.b)/5;
    return `<text x="${pad.l-10}" y="${yy+4}" fill="rgba(231,238,252,.70)" font-size="11" text-anchor="end">${fmtNum(val/1000)}k</text>`;
  }).join('');

  const xLabels = [xmin, Math.round((xmin+xmax)/2), xmax].map(a=>`<text x="${X(a)}" y="${h-12}" fill="rgba(231,238,252,.70)" font-size="11" text-anchor="middle">${a}</text>`).join('');

  const lines = series.map(s=>{
    const d=s.data.map((p,i)=>`${i?'L':'M'} ${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(' ');
    return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.4" />`;
  }).join('');

  const legend = series.map((s,i)=>{
    const lx=pad.l+i*190;
    return `<g transform="translate(${lx},14)"><rect width="10" height="10" fill="${s.color}" rx="2" />
      <text x="14" y="10" fill="rgba(231,238,252,.85)" font-size="12">${s.name}</text></g>`;
  }).join('');

  const markerSvgs = markers.map((m, idx)=>{
    const xx=X(m.x);
    const col=m.color || 'rgba(255,255,255,.25)';
    const yTop=pad.t;
    const yBot=h-pad.b;
    const yLab=pad.t + 12 + (idx*12);
    return `<g>
      <line x1="${xx}" y1="${yTop}" x2="${xx}" y2="${yBot}" stroke="${col}" stroke-dasharray="4,4" />
      <text x="${xx+4}" y="${yLab}" fill="rgba(231,238,252,.70)" font-size="11">${m.label||''}</text>
    </g>`;
  }).join('');

  svg.innerHTML = `
    <rect x="0" y="0" width="${w}" height="${h}" fill="transparent" />
    ${grid}
    <line x1="${pad.l}" y1="${h-pad.b}" x2="${w-pad.r}" y2="${h-pad.b}" stroke="rgba(255,255,255,.12)" />
    <line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${h-pad.b}" stroke="rgba(255,255,255,.12)" />
    ${markerSvgs}
    ${yLabels}
    ${xLabels}
    ${lines}
    ${legend}
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

export function drawBands(svg, bands, showBands=true){
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
    return `<line x1="${pad.l}" y1="${yy}" x2="${w-pad.r}" y2="${yy}" stroke="rgba(255,255,255,.07)" />`;
  }).join('');

  const yLabels = Array.from({length:6}, (_,i)=>{
    const val = ymax - i*(ymax)/5;
    const yy=pad.t+i*(h-pad.t-pad.b)/5;
    return `<text x="${pad.l-10}" y="${yy+4}" fill="rgba(231,238,252,.70)" font-size="11" text-anchor="end">${fmtNum(val/1000)}k</text>`;
  }).join('');

  const xLabels = [xmin, Math.round((xmin+xmax)/2), xmax].map(a=>`<text x="${X(a)}" y="${h-12}" fill="rgba(231,238,252,.70)" font-size="11" text-anchor="middle">${a}</text>`).join('');

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
    <line x1="${pad.l}" y1="${h-pad.b}" x2="${w-pad.r}" y2="${h-pad.b}" stroke="rgba(255,255,255,.12)" />
    <line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${h-pad.b}" stroke="rgba(255,255,255,.12)" />
    ${yLabels}
    ${xLabels}
    ${showBands?`<path d="${band10_90}" fill="rgba(167,139,250,.12)" stroke="none" />`:''}
    ${showBands?`<path d="${band25_75}" fill="rgba(110,231,255,.14)" stroke="none" />`:''}
    <path d="${path('p50')}" fill="none" stroke="rgba(231,238,252,.85)" stroke-width="2.2" />
  `;
}
