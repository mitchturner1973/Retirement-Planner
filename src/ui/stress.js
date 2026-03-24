const SCENARIO_IDS = [
  'in_stressScenarioCrash',
  'in_stressScenarioBadSeq',
  'in_stressScenarioLowerReturns',
  'in_stressScenarioHigherInflation',
  'in_stressScenarioEarlierRetire',
  'in_stressScenarioReducedContrib',
  'in_stressScenarioDrawdownPressure',
  'in_stressScenarioLaterLifeFloor',
  'in_stressScenarioHouseholdStrain',
];

const PRESETS = {
  core:     ['in_stressScenarioCrash', 'in_stressScenarioBadSeq'],
  balanced: ['in_stressScenarioCrash', 'in_stressScenarioBadSeq', 'in_stressScenarioLowerReturns', 'in_stressScenarioHigherInflation', 'in_stressScenarioEarlierRetire'],
  all:      SCENARIO_IDS,
  none:     [],
};

const PALETTE = [
  'rgba(220,38,38,.85)',   // red
  'rgba(217,119,6,.85)',   // amber
  'rgba(5,150,105,.85)',   // emerald
  'rgba(124,58,237,.85)',  // violet
  'rgba(2,132,199,.85)',   // sky
  'rgba(219,39,119,.85)',  // pink
  'rgba(101,163,13,.85)',  // lime
  'rgba(234,88,12,.85)',   // orange
  'rgba(20,184,166,.85)',  // teal
];

export function createStressRenderer(deps){
  const {getEl, calcProjection, computeStressStatus, badge, drawLineChart, fmtGBP = (v) => `£${Math.round(v || 0).toLocaleString()}`} = deps;

  let stressChartMode = 'core';
  let lastSeries = [];
  let lastMarkers = [];
  let wired = false;

  function renderStressLegend(series){
    const wrap = getEl('stressChartLegend');
    if (!wrap) return;
    const chips = series.map((s) => {
      const dashed = s.dashed ? ' is-dashed' : '';
      const shortName = s.name
        .replace('Combined (market stack)', 'Stacked stress')
        .replace('Baseline', 'Base plan')
        .replace('Crash at retirement', 'Crash')
        .replace('Bad sequence after retirement', 'Bad sequence')
        .replace('Lower long-run returns', 'Lower returns')
        .replace('Higher inflation', 'Higher inflation')
        .replace(' (isolated)', '');
      return `<span class="stress-legend-chip" title="${s.name}"><span class="stress-legend-swatch${dashed}" style="border-top-color:${s.color}"></span>${shortName}</span>`;
    }).join('');
    wrap.innerHTML = chips;
  }

  function redrawChart(){
    const el = getEl('chartStress');
    if (!el || !lastSeries.length) return;
    const baseline = lastSeries[0];
    const combined = lastSeries.find((x) => x.key === 'combined') || null;
    const isolated = lastSeries.filter((x) => x.key !== 'baseline' && x.key !== 'combined');
    const seriesToDraw = stressChartMode === 'core'
      ? (combined ? [baseline, combined] : [baseline, ...(isolated.slice(0, 1))])
      : [baseline, ...(combined ? [combined] : []), ...isolated];
    drawLineChart(el, seriesToDraw, lastMarkers, {theme: 'light', emphasizeBaseline: true, showLegend: false});
    renderStressLegend(seriesToDraw);
  }

  function wireControls(){
    if (wired) return;
    wired = true;

    // Preset buttons
    document.querySelectorAll('.stress-preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ids = PRESETS[btn.dataset.preset] || [];
        SCENARIO_IDS.forEach((id) => {
          const el = getEl(id);
          if (el && !el.disabled) el.checked = ids.includes(id);
        });
        const trigger = getEl(SCENARIO_IDS[0]);
        if (trigger) trigger.dispatchEvent(new Event('change', {bubbles: true}));
      });
    });

    // Chart mode toggle
    document.querySelectorAll('.stress-chart-mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        stressChartMode = btn.dataset.mode;
        document.querySelectorAll('.stress-chart-mode-btn').forEach((b) => {
          b.classList.toggle('active', b.dataset.mode === stressChartMode);
        });
        redrawChart();
      });
    });
  }

  return function renderStress(s, base, stressSummary = null){
    // Household strain toggle: disabled if not joint mode
    const householdToggle = getEl('in_stressScenarioHouseholdStrain');
    if (householdToggle) {
      const enabled = s.householdMode === 'joint';
      householdToggle.disabled = !enabled;
      const chip = document.getElementById('stress-chip-household');
      if (chip) chip.style.opacity = enabled ? '' : '0.45';
    }

    const crash = calcProjection(s, {crashAtAge: s.retireAge, crashPct: s.crashPct});
    const badseq = calcProjection(s, {badYears: s.badYears, badPenalty: s.badPenalty});

    const survives = (res) => {
      const okPot = res.years.filter(y => y.age <= s.successAge).every(y => y.potEnd > 0);
      const okFloor = res.years.filter(y => y.age >= 70 && y.netIncome > 0).every(y => y.netIncome >= s.floor70);
      return okPot && okFloor;
    };

    const passBase = survives(base);
    const passCrash = survives(crash);
    const passBad = survives(badseq);

    const enabledScenarios = stressSummary?.scenarios || [];
    const enabledCount = enabledScenarios.length;
    const failedCount = enabledScenarios.filter((x) => !x.metrics?.pass).length;

    let st;
    if (!passBase) {
      st = { s: 'bad', text: 'Stress: Action', reason: 'Baseline fails before stress is applied' };
    } else if (enabledCount === 0) {
      st = { s: 'warn', text: 'Stress: Select scenarios', reason: 'Enable at least one stress scenario to assess downside risk' };
    } else if (failedCount === 0) {
      st = { s: 'good', text: 'Stress: OK', reason: `All ${enabledCount} enabled stress scenarios pass` };
    } else if (failedCount === 1) {
      st = { s: 'warn', text: 'Stress: Watch', reason: 'One enabled stress scenario fails' };
    } else {
      st = { s: 'bad', text: 'Stress: Action', reason: `${failedCount} enabled stress scenarios fail` };
    }

    const crashItem = enabledScenarios.find((x) => x.key === 'crash-at-retirement') || null;
    const badItem   = enabledScenarios.find((x) => x.key === 'bad-sequence') || null;
    const combinedItem = stressSummary?.compound || null;

    const classifyCombined = (item) => {
      if (!item || !item.metrics) return { sev: 'warn', outcome: 'N/A', reason: 'No stacked run available' };
      if (item.metrics.pass) return { sev: 'good', outcome: 'Pass', reason: 'Passes pot and income-floor checks' };
      if (item.metrics.passPot && !item.metrics.passFloor) {
        return { sev: 'warn', outcome: 'Watch', reason: 'Income-floor shortfall only (pot remains above zero)' };
      }
      return { sev: 'bad', outcome: 'Fail', reason: 'Pot depletion or combined resilience failure' };
    };
    const runOutLabel = (item) => {
      const age = item?.metrics?.runOutAge;
      return age === null || age === undefined
        ? `No pot depletion by age ${s.endAge}`
        : `Pot runs out at age ${age}`;
    };

    getEl('stressBadge').innerHTML    = badge(st.s, st.text, st.reason);
    getEl('stressBaseline').innerHTML = badge(passBase ? 'good' : 'bad', `Baseline: ${passBase ? 'Pass' : 'Fail'}`, '');
    getEl('stressCrash').innerHTML    = crashItem
      ? badge(crashItem.metrics.pass ? 'good' : 'bad', `Crash (isolated): ${crashItem.metrics.pass ? 'Pass' : 'Fail'}`, crashItem.assumptions)
      : badge('warn', 'Crash: Off', 'Enable this scenario in the Scenarios panel');
    getEl('stressBadSeq').innerHTML   = badItem
      ? badge(badItem.metrics.pass ? 'good' : 'bad', `Bad seq (isolated): ${badItem.metrics.pass ? 'Pass' : 'Fail'}`, badItem.assumptions)
      : badge('warn', 'Bad seq: Off', 'Enable this scenario in the Scenarios panel');
    const combinedBadge = getEl('stressCombinedBadge');
    if (combinedBadge) {
      if (combinedItem) {
        const cc = classifyCombined(combinedItem);
        combinedBadge.innerHTML = badge(
          cc.sev,
          `Combined (market stack): ${cc.outcome}`,
          `${combinedItem.scenarioCount} linked market scenarios are applied together in one run. ${cc.reason}. ${runOutLabel(combinedItem)}.`,
        );
      } else {
        combinedBadge.innerHTML = badge('warn', 'Combined (market stack): N/A', 'Enable at least two linked market scenarios to evaluate knock-on effects');
      }
    }

    const metaEl = getEl('stressScenarioMeta');
    if (metaEl) {
      metaEl.innerHTML = enabledCount > 0
        ? `<span class="badge"><span class="ico">🧪</span>${enabledCount} scenario${enabledCount === 1 ? '' : 's'} enabled</span>`
        : `<span class="badge warn"><span class="ico">⚠️</span>No scenarios enabled</span>`;
    }

    // Ranking table
    const summaryWrap = getEl('stressScenarioSummary');
    const watchWrap   = getEl('stressWatchouts');
    const compoundWrap = getEl('stressCompoundSummary');
    const explainWrap = getEl('stressRankingExplain');
    const decisionWrap = getEl('stressDecisionSentence');
    if (stressSummary && summaryWrap && watchWrap) {
      const ranked = stressSummary.ranked || [];
      if (explainWrap) {
        explainWrap.innerHTML = 'This table answers: "If only one stress happened, would I still be OK?" Use the right-hand panel for the stacked market-stress answer.';
      }
      if (ranked.length === 0) {
        summaryWrap.innerHTML = '<p class="muted small">No stress scenarios enabled.</p>';
      } else {
        const thead = `<tr>
          <th>#</th><th>Scenario</th><th>Isolated result</th>
          <th>ΔPot @ret (vs base)</th><th>ΔPot @75 (vs base)</th><th>First weak age</th>
        </tr>`;
        const tbodyRows = ranked.map((item, idx) => {
          const sevClass   = item.metrics.pass ? 'sev-pass' : 'sev-fail';
          const worstAge   = item.metrics.weakYears?.[0] ?? '—';
          const dRet = item.impact.dropRetPot > 0 ? `-${fmtGBP(item.impact.dropRetPot)}` : '—';
          const d75  = item.impact.dropPot75  > 0 ? `-${fmtGBP(item.impact.dropPot75)}`  : '—';
          return `<tr class="${sevClass}">
            <td>${idx + 1}</td>
            <td><div class="rank-label">${item.label}</div><div class="rank-assum">${item.assumptions}</div></td>
            <td><span class="badge ${item.metrics.pass ? 'good' : 'bad'}">${item.metrics.pass ? 'Pass (isolated)' : 'Fail (isolated)'}</span></td>
            <td>${dRet}</td><td>${d75}</td><td>${worstAge}</td>
          </tr>`;
        }).join('');
        summaryWrap.innerHTML = `<table class="stress-rank-table"><thead>${thead}</thead><tbody>${tbodyRows}</tbody></table>`;
      }

      if (compoundWrap) {
        const compound = stressSummary.compound;
        const interactionPot75 = Number(stressSummary.interactionPot75 || 0);
        if (!compound) {
          compoundWrap.innerHTML = '<p class="muted small">Enable at least two linked market scenarios (Crash, Bad sequence, Lower returns, Higher inflation) to view compound knock-on effects.</p>';
          if (decisionWrap) {
            decisionWrap.innerHTML = 'Decision sentence: isolated sensitivity is available, but stacked downside is not available until 2+ scenarios are enabled.';
          }
          watchWrap.innerHTML = '';
        } else {
          const cc = classifyCombined(compound);
          const sevClass = cc.sev === 'good' ? 'good' : (cc.sev === 'bad' ? 'bad' : 'warn');
          const upliftLabel = interactionPot75 >= 0 ? 'Amplification @75' : 'Diversification @75';
          const upliftAmount = `${interactionPot75 >= 0 ? '+' : '-'}${fmtGBP(Math.abs(interactionPot75))}`;
          const weakFrom = compound.metrics.weakYears?.[0] ?? 'None';
          const potAt75Abs = compound.metrics?.potAt75 ?? 0;
          const runOut = runOutLabel(compound);
          const recurring75 = compound.result?.years?.find((y) => y.age === 75)?.recurringNetIncome ?? 0;
          const recurring85 = compound.result?.years?.find((y) => y.age === 85)?.recurringNetIncome ?? 0;
          const weakLabel = (!compound.metrics.pass && compound.metrics.passPot && !compound.metrics.passFloor)
            ? 'First floor shortfall age'
            : 'Weak from age';
          const incomeCardClass = cc.sev === 'bad' ? 'bad' : (cc.sev === 'warn' ? 'warn' : 'good');
          const floorText = cc.sev === 'warn'
            ? `Income target first missed at age ${weakFrom}`
            : (cc.sev === 'good' ? 'Income target stays on track' : `${weakLabel}: ${weakFrom}`);
          compoundWrap.innerHTML = `
            <div class="stress-outcome-grid">
              <div class="stress-outcome-card ${compound.metrics.passPot ? 'good' : 'bad'}">
                <div class="stress-outcome-label">Will pot last?</div>
                <div class="stress-outcome-value">${runOut}</div>
              </div>
              <div class="stress-outcome-card ${incomeCardClass}">
                <div class="stress-outcome-label">Income target after 70 (£${Math.round(s.floor70).toLocaleString()})</div>
                <div class="stress-outcome-value">${floorText}</div>
              </div>
              <div class="stress-outcome-card info">
                <div class="stress-outcome-label">Estimated recurring net under stacked stress</div>
                <div class="stress-outcome-value">Age 75: ${fmtGBP(recurring75)} | Age 85: ${fmtGBP(recurring85)}</div>
              </div>
            </div>
            <details class="stress-advanced-details">
              <summary>Advanced details</summary>
              <div class="small muted" style="margin-top:8px">${compound.scenarioCount} linked market scenarios are applied in one run. ${cc.reason}.</div>
              <div class="row" style="gap:8px; margin-top:8px; flex-wrap:wrap">
                <span class="badge">Pot @75 (stacked): ${fmtGBP(potAt75Abs)}</span>
                <span class="badge">ΔPot @75 (vs base): -${fmtGBP(compound.impact.dropPot75)}</span>
                <span class="badge">${upliftLabel}: ${upliftAmount}</span>
              </div>
            </details>`;
          if (decisionWrap) {
            const isolatedPasses = ranked.filter((x) => x.metrics.pass).length;
            const isolatedCount = ranked.length;
            decisionWrap.innerHTML = `Bottom line: ${runOut}. ${cc.sev === 'warn' ? `Income falls below your £${Math.round(s.floor70).toLocaleString()} target from age ${weakFrom}.` : (cc.sev === 'good' ? 'Income target stays on track under stacked stress.' : `Stacked stress breaks resilience from age ${weakFrom}.`)} (${isolatedPasses}/${isolatedCount} isolated scenarios still pass.)`;
          }

          const watchLines = (stressSummary.watchouts || []).map(
            (w) => `<div class="risk-watchout risk-watchout-${w.severity}"><strong>${w.title}</strong><div class="small muted">${w.detail}</div></div>`
          ).join('');
          watchWrap.innerHTML = `<details class="stress-advanced-details"><summary>Diagnostic watchouts</summary><div style="margin-top:8px">${watchLines || '<p class="muted small">No additional watchouts.</p>'}</div></details>`;
        }
      }
    }

    // Build chart series — use darker colours that read on the light panel background
    const series = [
      {key: 'baseline', name: 'Baseline', color: 'rgba(37,99,235,.9)', dashed: false, data: base.years.map(y => ({x: y.age, y: y.potEnd}))},
    ];
    if (stressSummary?.compound?.result?.years?.length) {
      series.push({
        key: 'combined',
        name: 'Combined (market stack)',
        color: 'rgba(15,23,42,.82)',
        dashed: false,
        data: stressSummary.compound.result.years.map((y) => ({x: y.age, y: y.potEnd})),
      });
    }
    enabledScenarios.forEach((item, idx) => {
      series.push({
        key: `isolated:${item.key}`,
        name:  `${item.label} (isolated)`,
        color: PALETTE[idx % PALETTE.length],
        dashed: true,
        data:  item.result.years.map((y) => ({x: y.age, y: y.potEnd})),
      });
    });

    lastSeries  = series;
    lastMarkers = [{x: s.retireAge, label: 'Retire', color: 'rgba(15,23,42,.28)'}];
    redrawChart();

    // Wire interactive controls (idempotent after first render)
    wireControls();

    return {survives, crash, badseq, passBase, passCrash, passBad, enabledCount, status: st};
  };
}
