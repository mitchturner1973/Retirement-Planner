

function renderIncomeBarChart(retiredYears, minIncome, stateAge) {
  if (!retiredYears || retiredYears.length === 0) return '<div class="small muted">No retirement data available.</div>';
  const W = 400, H = 80;
  const incomes = retiredYears.map((y) => Math.max(0, Number(y.recurringNetIncome || 0)));
  const maxIncome = Math.max(...incomes, Number(minIncome || 0) * 1.3, 1);
  const barW = W / retiredYears.length;
  const bars = retiredYears.map((y, i) => {
    const v = Math.max(0, Number(y.recurringNetIncome || 0));
    const barH = Math.round((v / maxIncome) * H);
    const x = (i * barW).toFixed(1);
    const yPos = (H - barH);
    const bw = Math.max(1, barW - 0.5).toFixed(1);
    const belowMin = minIncome > 0 && v < minIncome;
    const afterSp = Number(y.age) >= Number(stateAge);
    const fill = belowMin ? 'rgba(190,18,60,.65)' : afterSp ? 'rgba(21,128,61,.55)' : 'rgba(37,99,235,.55)';
    return `<rect x="${x}" y="${yPos}" width="${bw}" height="${barH}" fill="${fill}" rx="1"/>`;
  }).join('');
  const minLineY = minIncome > 0 ? (H - Math.round((minIncome / maxIncome) * H)) : null;
  const minLineEl = minLineY != null
    ? `<line x1="0" y1="${minLineY}" x2="${W}" y2="${minLineY}" stroke="rgba(180,83,9,.70)" stroke-width="1.5" stroke-dasharray="5,3"/>`
    : '';
  const spIdx = retiredYears.findIndex((y) => Number(y.age) >= Number(stateAge));
  const spLineEl = spIdx > 0
    ? `<line x1="${(spIdx * barW).toFixed(1)}" y1="0" x2="${(spIdx * barW).toFixed(1)}" y2="${H}" stroke="rgba(203,213,225,.55)" stroke-width="1.5" stroke-dasharray="4,2"/>`
    : '';
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:80px;display:block" preserveAspectRatio="none">${bars}${minLineEl}${spLineEl}</svg>`;
}

function renderPotAreaChart(allYears, retireAge) {
  if (!allYears || allYears.length === 0) return '<div class="small muted">No data available.</div>';
  const W = 400, H = 80;
  const pots = allYears.map((y) => Math.max(0, Number(y.potEnd || 0)));
  const maxPot = Math.max(...pots, 1);
  const n = allYears.length;
  const points = allYears.map((y, i) => {
    const x = ((i / Math.max(n - 1, 1)) * W).toFixed(1);
    const yPos = (H - (pots[i] / maxPot) * H).toFixed(1);
    return `${x},${yPos}`;
  }).join(' ');
  const retIdx = allYears.findIndex((y) => Number(y.age) >= Number(retireAge));
  const retLineEl = retIdx > 0
    ? `<line x1="${((retIdx / Math.max(n - 1, 1)) * W).toFixed(1)}" y1="0" x2="${((retIdx / Math.max(n - 1, 1)) * W).toFixed(1)}" y2="${H}" stroke="rgba(203,213,225,.55)" stroke-width="1.5" stroke-dasharray="4,2"/>`
    : '';
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:80px;display:block" preserveAspectRatio="none">
    <polygon points="0,${H} ${points} ${W},${H}" fill="rgba(37,99,235,.10)"/>
    <polyline points="${points}" fill="none" stroke="#2563eb" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${retLineEl}
  </svg>`;
}

function dcOrderReason(dcOrderRule) {
  if (dcOrderRule === 'highest-fee-first') return 'Uses higher-fee pots earlier to reduce long-term fee drag.';
  if (dcOrderRule === 'smallest-pot-first') return 'Uses smaller pots first to simplify later drawdown across fewer pots.';
  return 'Uses default priority order from your configured pensions.';
}

const esc = (s) => String(s ?? '').replace(/</g, '&lt;');

export function renderStrategyTab(deps, strategyBundle) {
  const { getEl, fmtGBP, badge } = deps;
  const {
    ranked = [],
    bestTax,
    bestSustainable,
    bestBalanced,
    selectedTimeline = [],
    selectedStrategyId,
    selectedResult = null,
    priorityMode = 'balanced',
    targets = {},
    stateMeta = {},
  } = strategyBundle || {};

  const labListEl = getEl('strategyLabList');
  const detailWrap = getEl('strategyDetailWrap');
  const selectEl = getEl('strategySelect');

  const effectiveSelectedId = selectedStrategyId
    || bestBalanced?.strategy?.id
    || ranked[0]?.strategy?.id
    || '';

  if (selectEl) {
    if (ranked.length === 0) {
      selectEl.innerHTML = '<option value="">No strategies available</option>';
      selectEl.disabled = true;
    } else {
      const placeholder = effectiveSelectedId
        ? '<option value="" disabled hidden>Select a strategy…</option>'
        : '<option value="" disabled selected>Select a strategy…</option>';
      const options = ranked
        .map(
          (r) =>
            `<option value="${r.strategy.id}" ${
              r.strategy.id === effectiveSelectedId ? 'selected' : ''
            }>${esc(r.strategy.name)}</option>`
        )
        .join('');
      selectEl.innerHTML = `${placeholder}${options}`;
      selectEl.disabled = false;
    }
  }

  const priorityModeLabel = {
    balanced: 'Balanced',
    'minimise-tax': 'Minimise tax',
    'maximise-stable-income': 'Maximise stable income',
    'preserve-flexibility': 'Preserve flexibility',
    'prioritise-guaranteed-income': 'Prioritise guaranteed income',
  }[String(priorityMode || 'balanced')] || 'Balanced';

  const stateAge = Number(stateMeta?.stateAge || 67);
  const retireAge = Number(stateMeta?.retireAge || stateAge);
  const hasEarlyAge = stateMeta?.earlyAge !== '' && stateMeta?.earlyAge !== null && stateMeta?.earlyAge !== undefined;
  const earlyAge = hasEarlyAge ? Number(stateMeta?.earlyAge) : null;
  const hasEarlyGap = Number.isFinite(earlyAge) && earlyAge < stateAge;

  const selected = selectedResult
    || (effectiveSelectedId ? ranked.find((r) => r.strategy.id === effectiveSelectedId) : null)
    || null;
  const selectedWatchouts = Array.isArray(selected?.watchouts) ? selected.watchouts : [];
  const explanation = selected?.rankingExplanation || null;

  const awardMap = new Map();
  const addAward = (result, label) => {
    if (!result?.strategy?.id || awardMap.has(result.strategy.id)) return;
    awardMap.set(result.strategy.id, label);
  };
  addAward(bestBalanced, `Top pick (${priorityModeLabel})`);
  addAward(bestTax, 'Tax focus');
  addAward(bestSustainable, 'Steadiest income');

  const handleStrategySelect = (id) => {
    if (!id) return;
    if (selectEl) {
      selectEl.value = id;
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (window?.__RP_APP) {
      window.__RP_APP.strategySelectedId = id;
    }
  };

  /* ── Mini gauge helper ── */
  const miniGauge = (score) => {
    const r = 18; const circ = 2 * Math.PI * r; const off = circ * (1 - score / 100);
    const tone = score >= 70 ? 'good' : score >= 45 ? 'mid' : 'low';
    return `<div class="strategy-lab-gauge">
      <svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="${r}" class="strategy-lab-gauge-track"/><circle cx="22" cy="22" r="${r}" class="strategy-lab-gauge-fill strategy-lab-gauge-fill--${tone}" stroke-dasharray="${circ}" stroke-dashoffset="${off}"/></svg>
      <div class="strategy-lab-gauge-score">${score}</div>
    </div>`;
  };

  /* ── Render lab card ── */
  const renderLabCard = (result, groupLabel) => {
    const strat = result.strategy || {};
    if (!strat.id) return '';
    const metrics = result.metrics || {};
    const award = awardMap.get(strat.id);
    const isSelected = strat.id === effectiveSelectedId;
    const score = result.scores?.balanced ?? 0;
    const metricCells = [
      { label: `${priorityModeLabel} score`, value: `${score}/100` },
      { label: 'Net @ retirement', value: fmtGBP(metrics.netAtRet) },
      { label: 'Pot @ 75', value: fmtGBP(metrics.potAt75) },
      { label: 'Total tax', value: fmtGBP(metrics.totalTax) },
    ];
    const labBadges = (strat.labBadges || []).map((text) => `<span class="pill">${esc(text)}</span>`).join('');
    const gapBadge = hasEarlyGap
      ? `<span class="pill ${strat.labSupportsEarlyGap ? 'pill-good' : 'pill-warn'}">${strat.labSupportsEarlyGap ? `Covers age ${earlyAge}–${stateAge}` : 'Needs other income before SP'}</span>`
      : '';
    return `<article class="strategy-lab-card${isSelected ? ' active' : ''}" data-strategy-id="${strat.id}" tabindex="0">
      <div class="strategy-lab-card-head">
        <div>
          <p class="strategy-lab-card-eyebrow">${esc(groupLabel)}</p>
          <h4>${esc(strat.name)}</h4>
        </div>
        ${miniGauge(score)}
      </div>
      ${award ? `<div class="strategy-lab-ribbon">★ ${esc(award)}</div>` : ''}
      <p class="strategy-lab-tagline">${esc(strat.labTagline || strat.summary || '')}</p>
      <div class="strategy-lab-metrics">
        ${metricCells.map((m) => `<div><span class="label">${esc(m.label)}</span><span class="value">${m.value}</span></div>`).join('')}
      </div>
      <div class="strategy-lab-tags">${gapBadge}${labBadges}</div>
    </article>`;
  };

  /* ── Build lab groups ── */
  const groupMap = new Map();
  ranked.forEach((result) => {
    const strat = result.strategy || {};
    const key = strat.labCategory || 'other';
    if (!groupMap.has(key)) {
      groupMap.set(key, { key, label: strat.labCategoryLabel || 'Other ideas', order: Number(strat.labOrder || 0), items: [] });
    }
    groupMap.get(key).items.push(result);
  });
  const labGroups = [...groupMap.values()]
    .sort((a, b) => (a.order === b.order ? a.label.localeCompare(b.label) : a.order - b.order));

  if (labListEl) {
    if (ranked.length === 0) {
      labListEl.innerHTML = '<div class="muted small">Recalculate to populate the Strategy Lab.</div>';
    } else if (labGroups.length === 0) {
      labListEl.innerHTML = '<div class="muted small">No strategy candidates matched the current inputs.</div>';
    } else {
      labListEl.innerHTML = labGroups
        .map((group) => `
          <div class="strategy-lab-group">
            <div class="strategy-lab-group-head">
              <p class="strategy-lab-group-label">${esc(group.label)}</p>
              <span class="strategy-lab-group-count">${group.items.length}</span>
            </div>
            ${group.items.map((result) => renderLabCard(result, group.label)).join('')}
          </div>`)
        .join('');
      labListEl.querySelectorAll('.strategy-lab-card').forEach((card) => {
        const id = card.dataset.strategyId;
        const invoke = () => handleStrategySelect(id);
        card.addEventListener('click', invoke);
        card.addEventListener('keydown', (evt) => {
          if (evt.key === 'Enter' || evt.key === ' ') { evt.preventDefault(); invoke(); }
        });
      });
    }
  }

  /* ── Dimension labels ── */
  const dimensionLabels = {
    taxEfficiency: 'Tax efficiency',
    incomeSustainability: 'Sustainability',
    incomeSmoothness: 'Income smoothness',
    flexibility: 'Flexibility',
    guaranteedIncomeStrength: 'Guaranteed income',
    potEfficiency: 'Pot efficiency',
  };

  /* ── Hero card ── */
  const buildHeroMarkup = () => {
    if (ranked.length === 0) return '';
    if (!selected) {
      return `<article class="strategy-hero-card">
        <div class="strategy-hero-top" style="justify-content:center;text-align:center">
          <div>
            <p class="strategy-hero-eyebrow">Selected plan</p>
            <h3>Choose a strategy</h3>
            <p class="strategy-hero-tagline">Pick an option in the lab sidebar to load diagnostics here.</p>
          </div>
        </div>
      </article>`;
    }
    const metrics = selected.metrics || {};
    const years = Array.isArray(selected.years) ? selected.years : [];
    const selectedRetireAge = Number(selected.state?.retireAge || retireAge);
    const retirementYears = years.filter((row) => Number(row.age) >= selectedRetireAge);
    const meetsMinYears = retirementYears.filter((row) => Number(row.recurringNetIncome || 0) >= Number(targets.minimumDesiredNetIncome || 0)).length;
    const totalRetYears = retirementYears.length;
    const score = selected.scores?.balanced ?? 0;
    const tone = score >= 70 ? 'good' : score >= 45 ? 'mid' : 'low';
    const r = 44; const circ = 2 * Math.PI * r; const dashOff = circ * (1 - score / 100);

    const heroKpis = [
      { label: 'Net at retirement', value: fmtGBP(metrics.netAtRet) },
      { label: 'Pot at 75', value: fmtGBP(metrics.potAt75) },
      { label: 'Total tax', value: fmtGBP(metrics.totalTax) },
      { label: 'Years meeting floor', value: totalRetYears ? `${meetsMinYears}/${totalRetYears}` : '—' },
    ];
    const watchoutHtml = selectedWatchouts.length
      ? selectedWatchouts.slice(0, 3).map((w) => `<div class="strategy-hero-watchout strategy-hero-watchout--${w.severity}"><strong>${esc(w.title)}</strong><p>${esc(w.detail)}</p></div>`).join('')
      : '<p class="small muted">No major watchouts flagged.</p>';
    const driverHtml = explanation?.topDrivers?.length
      ? `<ul class="strategy-driver-list">${explanation.topDrivers.slice(0, 3).map((d) => `<li class="strategy-driver-item"><span>${dimensionLabels[d.dimension] || d.dimension}</span><strong>${Math.round(Number(d.points || 0))} pts</strong></li>`).join('')}</ul>`
      : '';
    const altCandidates = [];
    if (bestTax && bestTax.strategy.id !== selected.strategy.id) altCandidates.push({ id: bestTax.strategy.id, title: bestTax.strategy.name, caption: 'Tax focus' });
    if (bestSustainable && bestSustainable.strategy.id !== selected.strategy.id) altCandidates.push({ id: bestSustainable.strategy.id, title: bestSustainable.strategy.name, caption: 'Steadiest income' });
    const usedAlt = new Set();
    const altList = altCandidates.filter((item) => { if (usedAlt.has(item.id)) return false; usedAlt.add(item.id); return true; }).slice(0, 2);
    const altHtml = altList.length
      ? `<div class="strategy-hero-alts"><p class="strategy-hero-alts-label">Other standout picks</p>${altList.map((alt) => `<button type="button" class="strategy-alt-btn" data-strategy-link="${alt.id}">${esc(alt.title)}<span>${esc(alt.caption)}</span></button>`).join('')}</div>`
      : '';

    return `<article class="strategy-hero-card">
      <div class="strategy-hero-top">
        <div class="strategy-hero-gauge">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="${r}" class="strategy-hero-gauge-track"/>
            <circle cx="50" cy="50" r="${r}" class="strategy-hero-gauge-fill strategy-hero-gauge-fill--${tone}" stroke-dasharray="${circ}" stroke-dashoffset="${dashOff}"/>
          </svg>
          <div class="strategy-hero-gauge-label"><span>${score}</span><span>${priorityModeLabel}</span></div>
        </div>
        <div class="strategy-hero-info">
          <p class="strategy-hero-eyebrow">Selected plan</p>
          <h3>${esc(selected.strategy.name)}</h3>
          <p class="strategy-hero-tagline">${esc(selected.strategy.summary)}</p>
        </div>
      </div>
      <div class="strategy-hero-body">
        <div class="strategy-hero-kpis">
          ${heroKpis.map((kpi) => `<div class="strategy-hero-kpi"><span class="label">${esc(kpi.label)}</span><span class="value">${kpi.value}</span></div>`).join('')}
        </div>
        <div class="strategy-hero-sections">
          <div>
            <p class="strategy-hero-section-title">Watchouts</p>
            ${watchoutHtml}
          </div>
          ${driverHtml ? `<div><p class="strategy-hero-section-title">Why this ranks well</p>${driverHtml}</div>` : ''}
        </div>
      </div>
      ${altHtml}
    </article>`;
  };

  const modeWeights = ranked[0]?.rankingExplanation?.weights || {};
  const topWeightsStr = Object.entries(modeWeights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([dim, pct]) => `${dimensionLabels[dim] || dim} <strong>${pct}%</strong>`)
    .join(' › ');

  if (detailWrap) {
    if (ranked.length === 0) {
      detailWrap.innerHTML = '<div class="card strategy-detail-placeholder"><p class="muted">Recalculate to see withdrawal diagnostics.</p></div>';
    } else {
      const heroSection = buildHeroMarkup();

      const detailSections = (() => {
        if (!selected) {
          return '<div class="card strategy-detail-placeholder"><p class="muted">Pick a strategy on the left to view charts, watchouts, and milestone guidance.</p></div>';
        }

        const dims = selected?.dimensionScores || null;
        const detailYears = Array.isArray(selected?.years) ? selected.years : [];
        const selectedState = selected?.state || {};
        const stateAge = Number(selectedState.stateAge || 67);
        const retireAge = Number(selectedState.retireAge || 67);
        const currentAge = Number(selectedState.currentAge || 42);
        const endAge = Number(selectedState.endAge || 95);
        const minIncome = Number(targets.minimumDesiredNetIncome || 0);
        const targetIncome = Number(targets.targetRetirementNetIncome || 0);
        const retYears = detailYears.filter((y) => y.phase === 'retired');
        const totalRetirementIncome = retYears.reduce((sum, row) => sum + Number(row.recurringNetIncome || 0), 0);
        const avgAnnualIncome = retYears.length ? totalRetirementIncome / retYears.length : 0;
        const yearsOnMinimum = retYears.filter((row) => Number(row.recurringNetIncome || 0) >= minIncome).length;
        const yearsOnTarget = retYears.filter((row) => Number(row.recurringNetIncome || 0) >= targetIncome).length;

        const dcOrderRule = String(selectedState.dcOrderRule || selected?.strategy?.dcOrder || 'default');
        const withdrawalByPotTotals = selected?.metrics?.withdrawalByPotTotals || {};
        const lumpSumByPotTotals = selected?.metrics?.lumpSumByPotTotals || {};
        const dbPensionsInState = selectedState.dbPensions || [];
        const dbTimingNotes = dbPensionsInState
          .map((dbPen) => {
            const takeAge = Number(dbPen.dbTakingAge || dbPen.startAge || 67);
            const npa = Number(dbPen.dbNpa || dbPen.npaAge || dbPen.startAge || 67);
            const name = String(dbPen.name || 'DB Pension');
            const adjustedIncome = Number(dbPen.annualIncome || 0);
            if (takeAge < npa) return `${name}: take at age ${takeAge} (${npa - takeAge}y early, ~${adjustedIncome.toFixed(0)}/yr)`;
            if (takeAge > npa) return `${name}: defer to age ${takeAge} (${takeAge - npa}y late, ~${adjustedIncome.toFixed(0)}/yr)`;
            return `${name}: take at age ${takeAge} (NPA)`;
          })
          .join(' · ');

        const currentWorkplaceId = 'current-workplace';
        const dcPotMeta = [
          { id: currentWorkplaceId, name: 'Current workplace pension', feePct: Number(selectedState.feePct || 0), startValue: Number(selectedState.pot || 0) },
          ...((selectedState.dcPensions || []).map((pot) => ({ id: String(pot.id || ''), name: String(pot.name || 'DC pension'), feePct: Number(pot.feePct || 0), startValue: Number(pot.currentValue || 0) }))),
        ].filter((pot) => pot.id);

        const potRows = dcPotMeta.map((pot) => {
          const drawdownUsed = Number(withdrawalByPotTotals[pot.id] || 0);
          const lumpUsed = Number(lumpSumByPotTotals[pot.id] || 0);
          return { ...pot, drawdownUsed, lumpUsed, totalUsed: drawdownUsed + lumpUsed };
        });

        const orderedPots = [...potRows].sort((a, b) => {
          if (dcOrderRule === 'highest-fee-first') { if (b.feePct !== a.feePct) return b.feePct - a.feePct; return b.startValue - a.startValue; }
          if (dcOrderRule === 'smallest-pot-first') { if (a.startValue !== b.startValue) return a.startValue - b.startValue; return b.feePct - a.feePct; }
          if (b.totalUsed !== a.totalUsed) return b.totalUsed - a.totalUsed;
          return b.startValue - a.startValue;
        });

        const potVisualRows = orderedPots
          .filter((pot) => pot.startValue > 0 || pot.totalUsed > 0)
          .map((pot, idx) => {
            const feeTag = pot.feePct > 0 ? ` · fee ${pot.feePct.toFixed(2)}%` : '';
            return `<div class="strategy-pot-row">
              <div class="strategy-pot-idx">${idx + 1}</div>
              <div>
                <div class="strategy-pot-name">${esc(pot.name)}</div>
                <div class="strategy-pot-sub">Value today: ${fmtGBP(pot.startValue)}${feeTag}</div>
              </div>
              <div class="strategy-pot-amounts">
                ${pot.lumpUsed > 0 ? `<div class="strategy-pot-amt"><span class="label">Lump sum</span><span class="value">${fmtGBP(pot.lumpUsed)}</span></div>` : ''}
                ${pot.drawdownUsed > 0 ? `<div class="strategy-pot-amt"><span class="label">Drawdown</span><span class="value">${fmtGBP(pot.drawdownUsed)}</span></div>` : ''}
              </div>
            </div>`;
          })
          .join('');

        const lumpSourceRows = orderedPots
          .filter((pot) => Number(pot.lumpUsed || 0) > 0)
          .map((pot) => `<div class="small muted">${esc(pot.name)}: ${fmtGBP(pot.lumpUsed)}</div>`)
          .join('');

        const incomeChart = renderIncomeBarChart(retYears, minIncome, stateAge);
        const potChart = renderPotAreaChart(detailYears, retireAge);

        const dbStartAges = [];
        detailYears.forEach((row, idx, arr) => {
          if (Number(row.dbIncome || 0) > 0 && (idx === 0 || Number(arr[idx - 1].dbIncome || 0) === 0)) {
            dbStartAges.push(Number(row.age));
          }
        });
        const keyAgeSet = [...new Set([retireAge, stateAge, ...dbStartAges, 75, endAge]
          .filter((age) => age >= retireAge && age <= endAge))].sort((a, b) => a - b);

        const milestoneCards = keyAgeSet.map((age) => {
          const row = detailYears.find((y) => Number(y.age) === age);
          if (!row) return '';
          const entry = selectedTimeline.find((e) => Number(e.age) === age);
          const milestoneItems = (entry?.items || []).filter((i) => ['milestone', 'pcls', 'ufpls'].includes(i.category));
          const isRetire = age === retireAge;
          const isSp = age === stateAge && age !== retireAge;
          const isDb = dbStartAges.includes(age) && !isRetire && !isSp;
          const defaultLabel = isRetire ? 'Retirement' : isSp ? 'State Pension starts' : isDb ? 'DB income starts' : age === 75 ? 'Age 75 snapshot' : `Age ${age}`;
          const eventLabel = milestoneItems.length ? milestoneItems.map((mi) => mi.action).join('; ') : defaultLabel;
          const potLow = Number(row.potEnd || 0) < 50000;
          return `<div class="strategy-milestone-card">
            <div class="strategy-milestone-age">${age}</div>
            <div>
              <p class="strategy-milestone-event">${esc(eventLabel)}</p>
              <div class="strategy-milestone-stats">
                <span class="strategy-milestone-stat">Net <strong>${fmtGBP(Number(row.recurringNetIncome || 0))}</strong></span>
                <span class="strategy-milestone-stat">Guaranteed <strong>${fmtGBP(Number(row.guaranteedIncome || 0))}</strong></span>
                <span class="strategy-milestone-stat${potLow ? ' strategy-milestone-stat--warn' : ''}">Pot <strong>${fmtGBP(Number(row.potEnd || 0))}</strong></span>
              </div>
            </div>
          </div>`;
        }).join('');

        const condensedTimeline = selectedTimeline
          .map((entry) => ({ ...entry, items: entry.items.filter((i) => i.category !== 'drawdown') }))
          .filter((entry) => entry.items.length > 0);

        const limitedHint = ranked.length <= 2
          ? '<div class="strategy-detail-callout"><strong>Tip:</strong> enter your current DC pot balances to unlock more strategy variations.</div>'
          : '';

        /* Dimension bars */
        const dimEntries = dims ? [
          { key: 'taxEfficiency', label: 'Tax efficiency' },
          { key: 'incomeSustainability', label: 'Sustainability' },
          { key: 'incomeSmoothness', label: 'Smoothness' },
          { key: 'flexibility', label: 'Flexibility' },
          { key: 'guaranteedIncomeStrength', label: 'Guaranteed' },
          { key: 'potEfficiency', label: 'Pot efficiency' },
        ] : [];
        const dimBarsHtml = dimEntries.length ? `<div class="strategy-dim-bars">${dimEntries.map((d) => {
          const v = Number(dims[d.key] || 0);
          const tone = v >= 70 ? 'good' : v >= 45 ? 'mid' : 'low';
          return `<div class="strategy-dim-bar-row">
            <span class="strategy-dim-bar-label">${d.label}</span>
            <div class="strategy-dim-bar-track"><div class="strategy-dim-bar-fill strategy-dim-bar-fill--${tone}" style="width:${v}%"></div></div>
            <span class="strategy-dim-bar-value">${v}</span>
          </div>`;
        }).join('')}</div>` : '';

        /* Drivers panel */
        const driversHtml = explanation
          ? `<div class="strategy-drivers-panel">
              <p class="strategy-drivers-panel-title">Top drivers</p>
              <div class="strategy-driver-grid">
                ${(explanation.topDrivers || []).slice(0, 3).map((d) => `<div class="strategy-driver-cell"><span class="label">${dimensionLabels[d.dimension] || d.dimension}</span><span class="value">${Math.round(d.points)} pts</span><span class="sub">${d.weightPct}% weight</span></div>`).join('')}
              </div>
              ${Array.isArray(explanation.penaltyBreakdown) && explanation.penaltyBreakdown.length > 0
                ? `<div class="strategy-deductions">Deductions: ${explanation.penaltyBreakdown.slice(0, 3).map((p) => `${esc(p.title)} (−${Math.round(p.penalty)} pts)`).join(', ')}${explanation.penaltyBreakdown.length > 3 ? '…' : ''}</div>`
                : ''}
            </div>`
          : '';

        const weightsCallout = topWeightsStr ? `<div class="small muted" style="margin-top:8px">Mode weighting: ${topWeightsStr}</div>` : '';
        const watchoutListHtml = selectedWatchouts.length === 0
          ? '<div class="small muted">No major watchouts triggered.</div>'
          : `<div class="strategy-watchout-list">${selectedWatchouts.map((w) => `<div class="strategy-watchout-item strategy-watchout-${w.severity}"><strong>${esc(w.title)}</strong><div class="small muted">${esc(w.detail)}</div></div>`).join('')}</div>`;

        const diagSection = `
          <section class="card strategy-detail-card">
            <div class="strategy-detail-card-head">
              <div>
                <p class="strategy-detail-eyebrow">Plan diagnostics</p>
                <h4>Score breakdown</h4>
              </div>
              <span class="strategy-detail-score">${selected?.scores?.balanced ?? 0}</span>
            </div>
            ${limitedHint}
            ${dimBarsHtml}
            ${driversHtml}
            ${weightsCallout}
            <div class="strategy-watchout-panel">
              <p class="strategy-hero-section-title">Watchouts</p>
              ${watchoutListHtml}
            </div>
          </section>`;

        const dcSection = `
          <section class="card strategy-detail-card">
            <div class="strategy-detail-card-head">
              <div>
                <p class="strategy-detail-eyebrow">Withdrawal plumbing</p>
                <h4>DC + DB plan</h4>
              </div>
            </div>
            <div style="margin-top:12px">
              <span class="strategy-dc-rule-badge">DC order: ${esc(dcOrderRule)}</span>
              <p class="small muted" style="margin-top:6px">${dcOrderReason(dcOrderRule)}</p>
            </div>
            ${dbTimingNotes ? `<div class="strategy-db-note">DB timing: ${dbTimingNotes}</div>` : ''}
            ${lumpSourceRows ? `<div style="margin-top:10px"><p class="strategy-hero-section-title">Lump sum sources</p>${lumpSourceRows}</div>` : ''}
            <div class="strategy-pot-visual">${potVisualRows || '<div class="small muted">No DC pot usage data available.</div>'}</div>
          </section>`;

        const incomeSection = `
          <section class="card strategy-detail-card">
            <div class="strategy-detail-card-head">
              <div>
                <p class="strategy-detail-eyebrow">Retirement income</p>
                <h4>Trajectory</h4>
              </div>
            </div>
            <div class="strategy-income-kpis">
              <div class="strategy-income-kpi"><span class="label">Total retirement income</span><span class="value">${fmtGBP(totalRetirementIncome)}</span></div>
              <div class="strategy-income-kpi"><span class="label">Average per year</span><span class="value">${fmtGBP(avgAnnualIncome)}</span></div>
              <div class="strategy-income-kpi"><span class="label">Years above minimum</span><span class="value">${yearsOnMinimum} / ${retYears.length}</span></div>
              ${targetIncome > 0 ? `<div class="strategy-income-kpi"><span class="label">Years above target</span><span class="value">${yearsOnTarget} / ${retYears.length}</span></div>` : ''}
            </div>
            <div class="strategy-mini-charts">
              <div class="strategy-chart-box">
                <p class="strategy-chart-title">Income (today's £)</p>
                <p class="strategy-chart-subtitle">Blue = pre-SP · Green = post-SP · Red = below minimum</p>
                ${incomeChart}
                <div class="strategy-axis-row"><span>Age ${retireAge}</span><span>Age ${endAge}</span></div>
              </div>
              <div class="strategy-chart-box">
                <p class="strategy-chart-title">Pot balance</p>
                <p class="strategy-chart-subtitle">Shaded = pot value · dashed = retirement age</p>
                ${potChart}
                <div class="strategy-axis-row"><span>Age ${currentAge}</span><span>Age ${endAge}</span></div>
              </div>
            </div>
          </section>`;

        const snapshotSection = `
          <section class="card strategy-detail-card">
            <div class="strategy-detail-card-head">
              <div>
                <p class="strategy-detail-eyebrow">Milestones</p>
                <h4>Snapshot at key ages</h4>
              </div>
            </div>
            <div class="strategy-milestone-grid">${milestoneCards || '<div class="small muted">No milestone data available.</div>'}</div>
          </section>`;

        const eventsSection = `
          <section class="card strategy-detail-card">
            <div class="strategy-detail-card-head">
              <div>
                <p class="strategy-detail-eyebrow">Key actions</p>
                <h4>One-off moves</h4>
              </div>
            </div>
            ${condensedTimeline.length === 0
              ? '<div class="small muted" style="margin-top:12px">No one-off milestones — this strategy relies on recurring drawdown only.</div>'
              : `<div class="strategy-timeline-list">${condensedTimeline.map((entry) => `<div class="strategy-timeline-card"><div class="strategy-timeline-dot"></div><div class="strategy-timeline-age">Age ${entry.age}</div>${entry.items.map((item) => `<div class="strategy-timeline-block"><strong>${esc(item.action)}</strong><div class="small muted" style="margin-top:3px">${esc(item.reason)}</div></div>`).join('')}</div>`).join('')}</div>`}
          </section>`;

        return `${diagSection}${dcSection}${incomeSection}${snapshotSection}${eventsSection}`;
      })();

      detailWrap.innerHTML = `${heroSection}${detailSections}`;
      detailWrap.querySelectorAll('[data-strategy-link]').forEach((btn) => {
        btn.addEventListener('click', () => handleStrategySelect(btn.dataset.strategyLink));
      });
    }
  }
}