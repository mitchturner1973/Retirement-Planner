export function createRenderOrchestrator(deps){
  const {
    getState,
    toggleSpouseFields,
    validateState,
    app,
    renderValidationSummary,
    getEl,
    calcProjection,
    buildHouseholdProjection,
    renderOverviewKpis,
    renderHouseholdSummary,
    renderHouseholdTab,
    drawLineChart,
    drawBarBreakdown,
    renderRetirementLumpSumCard,
    buildProjectionViewModel,
    renderProjectionTable,
    evaluateStrategies,
    scoreStrategies,
    buildDecisionTimeline,
    renderStrategyTab,
    renderStress,
    renderBridge,
    computeBridgeStatus,
    statusFromScore,
    buildModelSignature,
    computeOverall,
    renderOverallAndActions,
    updateFreshness,
    renderScenariosUI,
    renderMonte,
    fmtGBP,
  } = deps;

  return function renderAll(showToast = false){
    const s = getState();
    toggleSpouseFields?.(s.householdMode);
    const validation = validateState(s);
    app.validation = validation;
    renderValidationSummary(validation);

    if(!getEl('br_endAge').value) getEl('br_endAge').value = s.stateAge;
    if(!getEl('br_postDraw').value) getEl('br_postDraw').value = s.drawdown;

    const base = calcProjection(s);
    const hh = buildHouseholdProjection(s);
    renderOverviewKpis(base, s);
    renderHouseholdSummary(s, hh);
    renderHouseholdTab(s, hh);

    const potMarkers=[];
    if(s.earlyAge!=='') potMarkers.push({x:s.earlyAge,label:'Early',color:'rgba(110,231,255,.30)'});
    potMarkers.push({x:s.stateAge,label:'SP',color:'rgba(52,211,153,.30)'});

    drawLineChart(getEl('chartPot'), [{name:'Baseline', color:'rgba(110,231,255,.95)', data: base.years.map(y=>({x:y.age,y:y.potEnd}))}], potMarkers);

    drawBarBreakdown(getEl('chartIncome'), {
      netTotal: base.netAtRet,
      tax: base.taxAtRet || 0,
      grossItems: [
        {label:'Gross DC withdrawal', value: base.grossDcAtRet || 0, color:'rgba(110,231,255,.90)'},
        {label:'State pension', value: base.stateAtRet || 0, color:'rgba(52,211,153,.85)'},
        {label:'Other income', value: base.otherAtRet || 0, color:'rgba(167,139,250,.80)'},
        {label:'DB pensions', value: base.dbAtRet || 0, color:'rgba(251,191,36,.80)'}
      ].filter(x=>x.value>0)
    });
    renderRetirementLumpSumCard(base);
    const projectionPersonView = app.projectionPersonView || 'primary';
    const projectionData = (projectionPersonView === 'partner' && hh) ? hh.partner : base;
    const projectionState = (projectionPersonView === 'partner' && hh) ? hh.partnerState : s;
    const projectionView = buildProjectionViewModel(projectionData, projectionState, {
      mode: app.projectionViewMode,
      range: app.projectionRange,
      personView: projectionPersonView,
      householdMode: s.householdMode,
      partnerLabel: hh?.partnerLabel || 'Partner',
    });
    renderProjectionTable(projectionView);

    const strategyEval = evaluateStrategies(s);
    const strategyScores = scoreStrategies(strategyEval, {
      priorityMode: s.strategyPriorityMode,
      targets: {
        minimumDesiredNetIncome: s.minimumDesiredNetIncome,
        targetRetirementNetIncome: s.targetRetirementNetIncome,
        minimumFlexibilityBufferAt75: s.minimumFlexibilityBufferAt75,
      },
    });
    if (!app.strategySelectedId && strategyScores.bestBalanced) app.strategySelectedId = strategyScores.bestBalanced.strategy.id;
    const selected = strategyScores.ranked.find((r) => r.strategy.id === app.strategySelectedId) || strategyScores.bestBalanced || strategyScores.ranked[0] || null;
    const strategyTimeline = buildDecisionTimeline(selected);


    
  renderStrategyTab({
  ranked: strategyScores.ranked,
  bestTax: strategyScores.bestTax,
  bestSustainable: strategyScores.bestSustainable,
  bestBalanced: strategyScores.bestBalanced,
  selectedTimeline: strategyTimeline,
  selectedStrategyId: selected?.strategy?.id || null,
  selectedResult: selected,
  priorityMode: s.strategyPriorityMode,
  targets: {
    minimumDesiredNetIncome: s.minimumDesiredNetIncome,
    targetRetirementNetIncome: s.targetRetirementNetIncome,
    minimumFlexibilityBufferAt75: s.minimumFlexibilityBufferAt75,
  },
});

    const stressRes = renderStress(s, base);
    const br = renderBridge(s);

    const bridgeStatus = (s.earlyAge==='')
      ? {base:{s:'na', text:'Bridge: Not applicable', reason:'No early retirement age set'}, life:null}
      : (br.error
          ? {base:{s:'warn', text:'Bridge: N/A', reason: br.error}, life:null}
          : computeBridgeStatus(br.runOut_base, (s.bridgeKeepLifestyle===1? br.runOut_life : undefined), s.endAge));

    let monteStatus=null;
    const monteCurrent = app.mc.result && app.mc.lastKey===buildModelSignature(s, 'monte');
    if(monteCurrent){
      const ms = statusFromScore(app.mc.result.successProb);
      monteStatus={s:ms.s,label:ms.label,reason:ms.reason};
    } else {
      monteStatus={s:'warn',label:(app.mc.result?'Out of date':'Not run'),reason:(app.mc.result?'Inputs changed since last run':'Open Monte Carlo tab to run')};
      if(getEl('monteBadge')) getEl('monteBadge').innerHTML = deps.badge('warn',`Monte Carlo: ${monteStatus.label}`,monteStatus.reason);
      if(getEl('mcKpis')) getEl('mcKpis').innerHTML = '';
      if(getEl('chartMC')) getEl('chartMC').innerHTML = '';
    }

    renderOverallAndActions(s, stressRes.status, bridgeStatus, monteStatus);

    updateFreshness(showToast?'Recalculated':'' );

    if(getEl('scenarioList')){
      renderScenariosUI(s, {base, stress: stressRes, bridge: bridgeStatus, monte: monteStatus});
    }

    renderMonte(s, false);

    window.__RP_STATE = {s, base};
    return {s, base, projectionView, stress: stressRes.status, bridge: bridgeStatus, monte: monteStatus, overall: computeOverall(stressRes.status, bridgeStatus.base, bridgeStatus.life, monteStatus)};
  };
}
