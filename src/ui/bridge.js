export function createBridgeRenderer(deps){
  const {getEl, calcBridge, drawLineChart, fmtGBP} = deps;
  return function renderBridge(s){
    if(!getEl('br_endAge').value) getEl('br_endAge').value = s.stateAge;
    if(!getEl('br_postDraw').value) getEl('br_postDraw').value = s.drawdown;
    if(getEl('br_earlyAge')?.value!=='') getEl('in_earlyAge').value = getEl('br_earlyAge').value;

    const opts = {crashAtEarly:s.bridgeCrashEarly===1, crashAtState:s.bridgeCrashState===1, badSeqFromEarly:s.bridgeBadSeq===1};
    const br = calcBridge(s, opts);

    if(br.error){
      getEl('bridgeKpis').innerHTML = `<div class="k" style="grid-column:span 12"><div class="label">Bridge status</div><div class="value">${br.error}</div></div>`;
      getEl('tblBridge').querySelector('tbody').innerHTML = `<tr><td colspan="6" class="muted">${br.error}</td></tr>`;
      getEl('chartBridge').innerHTML = '';
      return br;
    }

    const okBase = (br.runOut_base===null);
    const okLife = (s.bridgeKeepLifestyle===1 ? (br.runOut_life===null) : null);

    const kpis=[];
    kpis.push({label:`Pot at start of early retirement (age ${br.early})`, value: fmtGBP(br.potEarly_base)});
    kpis.push({label:`Pot at State Pension age (age ${br.end}) — baseline`, value: fmtGBP(br.potEnd_base)});
    kpis.push({label:`Net income at age ${br.end} (after tax, incl. State Pension) — baseline`, value: fmtGBP(br.netEnd_base)});
    kpis.push({label:`Bridge result (baseline)`, value: okBase?`Holds (to age ${s.endAge})`:`Fails (runs out at age ${br.runOut_base})`});
    kpis.push({label:`Pot run-out age (baseline)`, value: okBase?`Never (to ${s.endAge})`:String(br.runOut_base)});

    if(s.bridgeKeepLifestyle===1){
      kpis.push({label:`Pot at State Pension age (age ${br.end}) — lifestyle path`, value: fmtGBP(br.potEnd_life)});
      kpis.push({label:`Net income at age ${br.end} (after tax, incl. State Pension) — lifestyle target`, value: fmtGBP(br.netEnd_life)});
      kpis.push({label:`Bridge result (lifestyle path)`, value: okLife?`Holds (to age ${s.endAge})`:`Fails (runs out at age ${br.runOut_life})`});
      kpis.push({label:`Pot run-out age (lifestyle)`, value: okLife?`Never (to ${s.endAge})`:String(br.runOut_life)});
    }

    getEl('bridgeKpis').innerHTML = kpis.map(k=>`<div class="k"><div class="label">${k.label}</div><div class="value">${k.value}</div></div>`).join('');

    const rows = br.baseline.filter(y=> y.phase==='bridge' || (y.phase==='post' && y.age===br.end));
    getEl('tblBridge').querySelector('tbody').innerHTML = rows.map(y=>`<tr>
      <td>${y.age}</td>
      <td class="right">${fmtGBP(y.gross)}</td>
      <td class="right">${fmtGBP(y.netIncome)}</td>
      <td class="right">${fmtGBP(y.potStart)}</td>
      <td class="right">${fmtGBP(y.potEnd)}</td>
      <td class="muted">${y.age===br.end?'First year incl. State Pension':''}</td>
    </tr>`).join('');

    const markers=[
      {x: br.early, label:'Early', color:'rgba(110,231,255,.35)'},
      {x: s.stateAge, label:'SP', color:'rgba(52,211,153,.35)'}
    ];
    if(br.runOut_base!==null) markers.push({x: br.runOut_base, label:'Run-out', color:'rgba(251,113,133,.40)'});

    const series=[{name:'Baseline', color:'rgba(110,231,255,.95)', data: br.baseline.map(y=>({x:y.age,y:y.potEnd}))}];
    if(br.lifestyle){
      series.push({name:'Maintain lifestyle', color:'rgba(167,139,250,.95)', data: br.lifestyle.map(y=>({x:y.age,y:y.potEnd}))});
      if(br.runOut_life!==null) markers.push({x: br.runOut_life, label:'Run-out (life)', color:'rgba(167,139,250,.40)'});
    }

    drawLineChart(getEl('chartBridge'), series, markers);
    return br;
  };
}
