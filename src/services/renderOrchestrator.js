export function createRenderOrchestrator(deps){
  const {
    getState,
    defaults,
    loadScenarios,
    toggleSpouseFields,
    validateState,
    app,
    renderValidationSummary,
    getEl,
    calcProjection,
    buildHouseholdProjection,
    buildOverviewViewModel,
    renderOverviewDashboard,
    renderHouseholdSummary,
    renderHouseholdTab,
    drawLineChart,
    buildProjectionViewModel,
    renderProjectionTable,
    evaluateStrategies,
    scoreStrategies,
    buildDecisionTimeline,
    renderStrategyTab,
    renderStress,
    buildStressScenarioResults,
    buildMonteInterpretation,
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
    forecastCard,
    buildTaxOptimisationAnalysis,
    renderStrategyTaxOptimisation,
    renderWealth,
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
    renderHouseholdSummary(s, hh);
    renderHouseholdTab(s, hh);

    const potMarkers=[];
    if(s.earlyAge!=='') potMarkers.push({x:s.earlyAge,label:'Early',color:'rgba(203,213,225,.55)'});
    potMarkers.push({x:s.stateAge,label:'SP',color:'rgba(203,213,225,.55)'});

    if(forecastCard){
      const runOut = base.years.find(y => y.potEnd <= 0.000001 && y.age >= (s.earlyAge || s.retireAge || s.stateAge));
      const ageDiff = hh ? (hh.primaryState.currentAge - hh.partnerState.currentAge) : 0;
      forecastCard.update({
        years: base.years,
        householdYears: hh ? hh.years : null,
        currentAge: s.currentAge,
        earlyAge: s.earlyAge !== '' ? s.earlyAge : null,
        stateAge: s.stateAge,
        retireAge: s.retireAge,
        endAge: s.endAge,
        runOutAge: runOut ? runOut.age : null,
        partnerRetireAge: hh ? hh.partnerState.retireAge + ageDiff : null,
        partnerStateAge:  hh ? hh.partnerState.stateAge + ageDiff : null,
        partnerEarlyAge:  hh && hh.partnerState.earlyAge ? hh.partnerState.earlyAge + ageDiff : null,
        partnerLabel:     hh ? (hh.partnerLabel || 'Partner') : null,
        firstBothRetiredAge: hh ? hh.firstBothRetiredAge : null,
      });
    } else {
      drawLineChart(getEl('chartPot'), [{name:'Baseline', color:'#2563eb', data: base.years.map(y=>({x:y.age,y:y.potEnd}))}], potMarkers, {theme:'light', fancy:true, showLegend:false});
    }

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
    if (!app.strategySelectedId) {
      const defaultStrategyId = strategyScores.bestBalanced?.strategy?.id
        || strategyScores.ranked[0]?.strategy?.id
        || null;
      if (defaultStrategyId) app.strategySelectedId = defaultStrategyId;
    }
    let selected = null;
    if (app.strategySelectedId) {
      selected = strategyScores.ranked.find((r) => r.strategy.id === app.strategySelectedId) || null;
      if (!selected) app.strategySelectedId = null;
    }
    const strategyTimeline = selected ? buildDecisionTimeline(selected) : [];


    
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
      stateMeta: {
        earlyAge: s.earlyAge,
        retireAge: s.retireAge,
        stateAge: s.stateAge,
      },
    });

    const taxAnalysis = buildTaxOptimisationAnalysis({
      state: s,
      selectedResult: selected,
    });
    renderStrategyTaxOptimisation(taxAnalysis);

    const stressSummary = typeof buildStressScenarioResults === 'function'
      ? buildStressScenarioResults({ state: s, base, calcProjection })
      : null;
    const stressRes = renderStress(s, base, stressSummary);
    const br = renderBridge(s);

    const bridgeStatus = (s.earlyAge==='')
      ? {base:{s:'na', text:'Bridge: Not applicable', reason:'No early retirement age set'}, life:null}
      : (br.error
          ? {base:{s:'warn', text:'Bridge: N/A', reason: br.error}, life:null}
          : computeBridgeStatus(br.runOut_base, (s.bridgeKeepLifestyle===1? br.runOut_life : undefined), s.endAge, 75, { potAtEnd: br.potEnd_base, bridgeAmount: Number(s.bridgeAmount) || 0 }));

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
      if(getEl('mcDelta')) getEl('mcDelta').innerHTML = '';
    }

    app.riskSummary = {
      stress: stressSummary,
      monte: monteCurrent && app.mc.result && typeof buildMonteInterpretation === 'function'
        ? buildMonteInterpretation(app.mc.result, s)
        : null,
    };

    let overview = null;
    try {
      const compareSource = app.overviewCompareSource || 'previous';
      const compareScenarioId = app.overviewCompareScenarioId || '';
      const scenarios = loadScenarios?.() || [];
      const scenarioOptions = scenarios.map((scenario) => ({ id: scenario.id, name: scenario.name }));
      let compareSnapshot = app.overviewLastSnapshot;
      let compareLabel = 'previous recalculation';
      if (compareSource === 'scenario' && compareScenarioId) {
        const picked = scenarios.find((scenario) => scenario.id === compareScenarioId);
        if (picked?.inputs) {
          const baseline = calcProjection({ ...defaults, ...picked.inputs });
          compareSnapshot = {
            potAtRet: baseline.potAtRet,
            netAtRet: baseline.netAtRet,
            taxAtRet: baseline.taxAtRet,
            selectedStrategyId: picked.inputs?.strategySelectedId || null,
          };
          compareLabel = `saved scenario "${picked.name}"`;
        }
      }

      overview = buildOverviewViewModel({
        state: s,
        base,
        basePlan: (s.earlyAge !== '' && isFinite(s.earlyAge)) ? calcProjection({ ...s, earlyAge: '' }) : null,
        household: hh,
        bridgeResult: br,
        riskSummary: app.riskSummary,
        stressStatus: stressRes.status,
        bridgeStatus,
        monteStatus,
        selectedStrategyId: selected?.strategy?.id || null,
        compareSnapshot,
        compareLabel,
        compareSource,
        compareScenarioId,
        compareScenarioOptions: scenarioOptions,
      });
      renderOverviewDashboard(overview);
      app.overviewLastSnapshot = overview.snapshot;
    } catch (error) {
      console.error('Overview render failed', error);
    }

    try { renderWealth?.(); } catch (e) { console.error('Wealth render failed', e); }

    renderOverallAndActions(s, stressRes.status, bridgeStatus, monteStatus);

    updateFreshness(showToast?'Recalculated':'' );

    if(getEl('scenarioList')){
      renderScenariosUI(s, {base, stress: stressRes, bridge: bridgeStatus, monte: monteStatus});
    }

    const monteView = getEl('view-monte');
    const monteComputed = monteView && monteView.ownerDocument?.defaultView ? monteView.ownerDocument.defaultView.getComputedStyle(monteView) : null;
    const monteVisible = !!(monteView && ((monteComputed && monteComputed.display !== 'none') || (!monteComputed && monteView.style.display !== 'none')));
    const shouldForceMonte = monteVisible || !app.mc?.result;
    renderMonte(s, shouldForceMonte);

    window.__RP_STATE = {s, base};
    return {s, base, projectionView, overview, stress: stressRes.status, bridge: bridgeStatus, monte: monteStatus, overall: computeOverall(stressRes.status, bridgeStatus.base, bridgeStatus.life, monteStatus)};
  };
}
