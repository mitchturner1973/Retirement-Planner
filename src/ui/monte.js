export function createMonteRenderer(deps){
  const {app, getEl, fmtNum, fmtPct, fmtGBP, runMonteCarloAsync, statusFromScore, drawBands, toast, updateFreshness, badge, buildMonteInterpretation} = deps;

  function setRunButtonState(running){
    const btn = getEl('btnRunMonte');
    if(!btn) return;
    btn.disabled = running;
    btn.textContent = running ? 'Running…' : 'Run Monte';
  }
  function renderMonteUI(s, res){
    const mcStatus = statusFromScore(res.successProb);
    const interpretation = typeof buildMonteInterpretation === 'function' ? buildMonteInterpretation(res, s) : null;
    getEl('monteBadge').innerHTML = badge(mcStatus.s, `Monte Carlo: ${mcStatus.label}`, mcStatus.reason);
    const worst = (res.worstDepletionAge===null? 'Never (to '+s.endAge+')' : 'Age '+res.worstDepletionAge);

    const decisionWrap = getEl('monteDecisionCards');
    const bottomLineWrap = getEl('monteBottomLine');
    if (decisionWrap) {
      const confidence = res.successProb >= 0.85 ? 'Strong' : (res.successProb >= 0.65 ? 'Moderate' : 'Weak');
      const confClass = res.successProb >= 0.85 ? 'good' : (res.successProb >= 0.65 ? 'warn' : 'bad');
      const expected75 = res.bands?.find((b) => b.age === 75)?.p50 ?? null;
      const expected85 = res.bands?.find((b) => b.age === 85)?.p50 ?? null;
      decisionWrap.innerHTML = `
        <div class="monte-outcome-card ${confClass}">
          <div class="monte-outcome-label">Chance plan lasts to age ${s.endAge}</div>
          <div class="monte-outcome-value">${fmtPct(res.successProb)} (${confidence} confidence)</div>
        </div>
        <div class="monte-outcome-card ${res.worstDepletionAge === null ? 'good' : 'bad'}">
          <div class="monte-outcome-label">Likely depletion</div>
          <div class="monte-outcome-value">${worst}</div>
        </div>
        <div class="monte-outcome-card info">
          <div class="monte-outcome-label">Typical recurring outcome snapshot</div>
          <div class="monte-outcome-value">Median pot at 75: ${expected75 === null ? 'n/a' : fmtGBP(expected75)} | at 85: ${expected85 === null ? 'n/a' : fmtGBP(expected85)}</div>
        </div>`;
    }
    if (bottomLineWrap) {
      bottomLineWrap.innerHTML = res.worstDepletionAge === null
        ? `Bottom line: in this simulation set, your plan is likely to last to age ${s.endAge}.`
        : `Bottom line: in downside paths your pot can run out around age ${res.worstDepletionAge}, so resilience improvements are recommended.`;
    }

    getEl('mcKpis').innerHTML = [
      {label:'Success probability', value: fmtPct(res.successProb)},
      {label:'Worst-case depletion age', value: worst},
      {label:'P10 terminal pot', value: fmtGBP(res.p10Terminal)},
      {label:'Simulations', value: fmtNum(res.n)},
      {label:'Ruin count', value: fmtNum(res.ruinedCount)},
      {label:'Seed', value: String(res.seed)}
    ].map(k=>`<div class="k"><div class="label">${k.label}</div><div class="value">${k.value}</div></div>`).join('');

    const deltaWrap = getEl('mcDelta');
    const prev = app.mc.prevResult;
    if (deltaWrap) {
      if (prev && Number.isFinite(prev.successProb)) {
        const delta = res.successProb - prev.successProb;
        const potDelta = (res.p10Terminal || 0) - (prev.p10Terminal || 0);
        const sev = delta > 0.01 ? 'good' : delta < -0.01 ? 'bad' : 'warn';
        const sign = delta > 0 ? '+' : '';
        const potSign = potDelta > 0 ? '+' : '';
        deltaWrap.innerHTML = badge(sev, `Delta vs previous run: ${sign}${fmtPct(delta)}`, `P10 terminal pot: ${potSign}${fmtGBP(Math.abs(potDelta))}`);
      } else {
        deltaWrap.innerHTML = badge('warn', 'Delta vs previous run: n/a', 'Run Monte Carlo again after changing inputs to compare movement.');
      }
    }

    const interpWrap = getEl('monteInterpretation');
    const actWrap = getEl('monteActions');
    if (interpWrap && actWrap) {
      if (!interpretation) {
        interpWrap.innerHTML = '';
        actWrap.innerHTML = '';
      } else {
        const band = interpretation.confidence;
        const watchouts = (interpretation.watchouts || []).map((w) => `<div class="risk-watchout risk-watchout-${w.severity}"><strong>${w.title}</strong><div class="small muted">${w.detail}</div></div>`).join('');
        interpWrap.innerHTML = `<div class="risk-shell"><div class="risk-head"><div style="font-weight:700">Confidence interpretation</div><div class="small muted">${interpretation.successDefinition}</div></div><div class="risk-pill"><strong>${band.label}</strong><div class="small muted">${band.detail}</div></div><div class="small" style="margin-top:8px">Growth dependency: <strong>${interpretation.growthDependency}</strong></div><div style="margin-top:8px">${watchouts || '<div class="small muted">No major Monte watchouts triggered.</div>'}</div></div>`;
        actWrap.innerHTML = `<div class="risk-shell"><div class="risk-head"><div style="font-weight:700">Next-step suggestions</div><div class="small muted">Action-oriented improvements</div></div><div class="risk-list">${(interpretation.suggestions || []).map((sug) => `<div class="risk-row"><div class="small">${sug}</div></div>`).join('')}</div></div>`;
      }
    }

    drawBands(getEl('chartMC'), res.bands, s.bands===1, {theme:'light'});
  }

  function renderMonte(s, force=false){
    const key = JSON.stringify({
      pot:s.pot, salary:s.salary, empPct:s.empPct, erPct:s.erPct,
      returnNom:s.returnNom, inflation:s.inflation, vol:s.vol,
      retireAge:s.retireAge, stateAge:s.stateAge, drawdown:s.drawdown,
      endAge:s.endAge, sims:s.sims, seed:s.seed, ruinDef:s.ruinDef, bands:s.bands,
      dcPensions:s.dcPensions||[], dbPensions:s.dbPensions||[], contribEvents:s.contribEvents||[], lumpSumEvents:s.lumpSumEvents||[]
    });

    const keyMatches = app.mc.lastKey===key && app.mc.result;
    const shouldSkip = keyMatches && !force;
    if(shouldSkip){
      setRunButtonState(false);
      renderMonteUI(s, app.mc.result);
      return;
    }

    if(app.mc.running){
      setRunButtonState(true);
      return;
    }

    app.mc.running=true;
    app.mc.cancel=false;
    app.mc.lastKey=key;
    setRunButtonState(true);
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
        setRunButtonState(false);
        return;
      }
      app.mc.prevResult = app.mc.result;
      app.mc.result=res;
      app.lastMonteAt = new Date();
      updateFreshness('Monte Carlo updated');
      toast('good','Monte Carlo updated ✓', `Seed ${res.seed} • ${fmtPct(res.successProb)} success`);
      renderMonteUI(s, res);
      setRunButtonState(false);
    });
  }

  return { renderMonte, renderMonteUI };
}
