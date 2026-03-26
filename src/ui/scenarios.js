export function createScenariosRenderer(deps){
  const {app, getEl, defaults, loadScenarios, saveScenarios, readState, setInputsFromState, renderAll, toast, calcProjection, calcBridge, computeStressStatus, computeBridgeStatus, statusFromScore, computeOverall, fmtGBP, badge, buildModelSignature, appMc} = deps;

  function renderScenariosUI(currentState, computed){
    const list = loadScenarios();
    const idSet = new Set(list.map(s=>s.id));
    app.comparePicked = app.comparePicked.filter(id=>idSet.has(id));
    const wrap=getEl('scenarioList');

    if(list.length===0){
      wrap.innerHTML = `<div class="muted">No saved scenarios yet. Click “Save current as new”.</div>`;
    } else {
      wrap.innerHTML = list.map(sc=>`<div class="callout" style="margin-top:10px"><div class="dot" style="background:rgba(167,139,250,.9)"></div><div style="flex:1">
          <div class="row" style="justify-content:space-between">
            <strong>${sc.name}</strong>
            <span class="muted small">${new Date(sc.updatedAt).toLocaleString()}</span>
          </div>
          <div class="row" style="margin-top:8px">
            <button class="btn" data-load="${sc.id}">Load</button>
            <button class="btn" data-rename="${sc.id}">Rename</button>
            <button class="btn" data-del="${sc.id}">Delete</button>
            <label class="badge" style="cursor:pointer"><input type="checkbox" data-pick="${sc.id}" ${app.comparePicked.includes(sc.id)?"checked":""} style="margin-right:6px"/>Compare</label>
          </div>
        </div></div>`).join('');

      wrap.querySelectorAll('button[data-load]').forEach(b=>b.onclick=()=>{
        const sc=list.find(x=>x.id===b.getAttribute('data-load'));
        if(!sc) return;
        setInputsFromState({...defaults, ...sc.inputs});
        renderAll(true);
        toast('good','Scenario loaded', sc.name);
      });
      wrap.querySelectorAll('button[data-rename]').forEach(b=>b.onclick=()=>{
        const id=b.getAttribute('data-rename');
        const sc=list.find(x=>x.id===id); if(!sc) return;
        const name=prompt('Scenario name', sc.name);
        if(!name) return;
        sc.name=name; sc.updatedAt=Date.now();
        saveScenarios(list);
        renderScenariosUI(readState(), computed);
        toast('good','Renamed scenario', name);
      });
      wrap.querySelectorAll('button[data-del]').forEach(b=>b.onclick=()=>{
        const id=b.getAttribute('data-del');
        const next=list.filter(x=>x.id!==id);
        saveScenarios(next);
        renderScenariosUI(readState(), computed);
        toast('warn','Deleted scenario','');
      });
      wrap.querySelectorAll('input[data-pick]').forEach(cb=>{
        cb.onchange = ()=>{
          const id = cb.getAttribute('data-pick');
          if(cb.checked){
            if(!app.comparePicked.includes(id)) app.comparePicked.push(id);
            if(app.comparePicked.length>3){
              const removed = app.comparePicked.shift();
              const dropped = wrap.querySelector(`input[data-pick="${removed}"]`);
              if(dropped) dropped.checked = false;
              toast('warn','Compare limit','Only 3 scenarios can be compared');
            }
          } else {
            app.comparePicked = app.comparePicked.filter(x=>x!==id);
          }
          renderScenarioCompare(list);
        };
      });
    }

    function renderScenarioCompare(list){
      const compareWrap=getEl('scenarioCompare');
      const pickedIds = app.comparePicked.slice(0,3);
      const picked = list.filter(s=>pickedIds.includes(s.id)).slice(0,3);
      if(picked.length===0){
        compareWrap.innerHTML = `<div class="muted" style="margin-top:10px">Tick “Compare” on up to 3 scenarios.</div>`;
        return;
      }
      const cols = picked.map(sc=>{
        const s={...defaults, ...sc.inputs};
        const base=calcProjection(s);
        const br=calcBridge(s,{crashAtEarly:false,crashAtState:false,badSeqFromEarly:false});
        const crash=calcProjection(s,{crashAtAge:s.retireAge,crashPct:s.crashPct});
        const bad=calcProjection(s,{badYears:s.badYears,badPenalty:s.badPenalty});
        const pass=(res)=>res.years.filter(y=>y.age<=s.successAge).every(y=>y.potEnd>0) && res.years.filter(y=>y.age>=70 && y.netIncome>0).every(y=>y.netIncome>=s.floor70);
        const st=computeStressStatus(pass(base), pass(crash), pass(bad));
        const bridge = (s.earlyAge==='') ? {base:{s:'na', text:'Bridge: Not applicable', reason:'No early retirement age set'}, life:null} : computeBridgeStatus(br.runOut_base, (s.bridgeKeepLifestyle===1? br.runOut_life : undefined), s.endAge, 75, { potAtEnd: br.potEnd_base, bridgeAmount: Number(s.bridgeAmount) || 0 });
        const mc = (appMc.result && appMc.lastKey===buildModelSignature(s, 'monte')) ? statusFromScore(appMc.result.successProb) : {s:'warn', label:(appMc.result?'Out of date':'Not run'), reason:(appMc.result?'Run Monte for this scenario':'Open Monte tab to run')};
        const overall=computeOverall(st, bridge.base, bridge.life, mc);
        const potAtDraw = (s.earlyAge!=='' && !br.error) ? br.potEarly_base : base.potAtRet;
        return {name:sc.name, s, br, st, mc, overall, potAtDraw};
      });
      const row = (label, getter)=>`<tr><th>${label}</th>${cols.map(c=>`<td>${getter(c)}</td>`).join('')}</tr>`;
      compareWrap.innerHTML = `<div style="overflow:auto; margin-top:10px"><table><thead><tr><th></th>${cols.map(c=>`<th>${c.name}</th>`).join('')}</tr></thead><tbody>
        ${row('Overall readiness', c=>badge(c.overall.s, c.overall.text.replace('Overall: ',''), c.overall.reason))}
        ${row('Pot at first draw age', c=> (c.s.earlyAge!=='' && c.br.error)?'—':fmtGBP(c.potAtDraw))}
        ${row('Pot at State Pension age (bridge baseline)', c=> c.br.error?'—':fmtGBP(c.br.potEnd_base))}
        ${row('Net income at SP age', c=> c.br.error?'—':fmtGBP(c.br.netEnd_base))}
        ${row('Bridge run-out (baseline)', c=> c.br.error?'—':(c.br.runOut_base===null?`Never (to ${c.s.endAge})`:`Age ${c.br.runOut_base}`))}
        ${row('Stress status', c=>badge(c.st.s, c.st.text.replace('Stress: ',''), c.st.reason))}
        ${row('Monte status', c=>badge(c.mc.s||'warn', c.mc.label||'N/A', c.mc.reason||''))}
      </tbody></table></div>`;
    }
    renderScenarioCompare(list);
  }

  return { renderScenariosUI };
}
