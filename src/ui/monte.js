export function createMonteRenderer(deps){
  const {document, app, getEl, fmtNum, fmtPct, fmtGBP, runMonteCarloAsync, statusFromScore, drawBands, toast, updateFreshness, badge} = deps;
  function renderMonteUI(s, res){
    const mcStatus = statusFromScore(res.successProb);
    getEl('monteBadge').innerHTML = badge(mcStatus.s, `Monte Carlo: ${mcStatus.label}`, mcStatus.reason);
    const worst = (res.worstDepletionAge===null? 'Never (to '+s.endAge+')' : 'Age '+res.worstDepletionAge);
    getEl('mcKpis').innerHTML = [
      {label:'Success probability', value: fmtPct(res.successProb)},
      {label:'Worst-case depletion age', value: worst},
      {label:'P10 terminal pot', value: fmtGBP(res.p10Terminal)},
      {label:'Simulations', value: fmtNum(res.n)},
      {label:'Ruin count', value: fmtNum(res.ruinedCount)},
      {label:'Seed', value: String(res.seed)}
    ].map(k=>`<div class="k"><div class="label">${k.label}</div><div class="value">${k.value}</div></div>`).join('');
    drawBands(getEl('chartMC'), res.bands, s.bands===1);
  }

  function renderMonte(s, force=false){
    const active = document.querySelector('.nav button.active')?.dataset.view;
    if(active!=='monte' && !force) return;

    const key = JSON.stringify({
      pot:s.pot, salary:s.salary, empPct:s.empPct, erPct:s.erPct,
      returnNom:s.returnNom, inflation:s.inflation, vol:s.vol,
      retireAge:s.retireAge, stateAge:s.stateAge, drawdown:s.drawdown,
      endAge:s.endAge, sims:s.sims, seed:s.seed, ruinDef:s.ruinDef, bands:s.bands,
      dcPensions:s.dcPensions||[], dbPensions:s.dbPensions||[], contribEvents:s.contribEvents||[], lumpSumEvents:s.lumpSumEvents||[]
    });

    if(app.mc.running) return;
    if(app.mc.lastKey===key && app.mc.result){
      renderMonteUI(s, app.mc.result);
      return;
    }

    app.mc.running=true;
    app.mc.cancel=false;
    app.mc.lastKey=key;
    getEl('mcProgressWrap').style.display='inline-flex';
    getEl('mcProgressText').textContent = `Running 0/${s.sims}…`;
    getEl('mcProgressBar').style.width='0%';
    getEl('btnRecalc').disabled = true;
    toast('warn', 'Monte Carlo running…', `Simulating ${fmtNum(s.sims)} paths`);

    runMonteCarloAsync(s, (p)=>{
      const done = Math.round(p*s.sims);
      getEl('mcProgressText').textContent = `Running ${done}/${s.sims}…`;
      getEl('mcProgressBar').style.width = (p*100).toFixed(0)+'%';
    }, (res)=>{
      app.mc.running=false;
      getEl('mcProgressWrap').style.display='none';
      getEl('btnRecalc').disabled = false;
      if(res.cancelled){
        toast('warn','Monte Carlo cancelled','');
        return;
      }
      app.mc.result=res;
      app.lastMonteAt = new Date();
      updateFreshness('Monte Carlo updated');
      toast('good','Monte Carlo updated ✓', `Seed ${res.seed} • ${fmtPct(res.successProb)} success`);
      renderMonteUI(s, res);
    });
  }

  return { renderMonte, renderMonteUI };
}
