

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
    return `<rect x="${x}" y="${yPos}" width="${bw}" height="${barH}" fill="${fill}"/>`;
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

function formatDbTimingCell(dbPensions) {
  const list = Array.isArray(dbPensions) ? dbPensions : [];
  if (list.length === 0) return '<span class="muted">—</span>';
  return list.map((dbPen) => {
    const takeAge = Number(dbPen.dbTakingAge || dbPen.startAge || 67);
    const npa = Number(dbPen.dbNpa || dbPen.npaAge || dbPen.startAge || 67);
    const shortName = String(dbPen.name || 'DB').trim();
    if (takeAge < npa) return `${shortName}: ${takeAge} <span class="small muted">(${npa - takeAge}y early)</span>`;
    if (takeAge > npa) return `${shortName}: ${takeAge} <span class="small muted">(${takeAge - npa}y deferred)</span>`;
    return `${shortName}: ${takeAge} <span class="small muted">(NPA)</span>`;
  }).join('<br/>');
}

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
            }>${r.strategy.name}</option>`
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

  const renderLabCard = (result, groupLabel) => {
    const strat = result.strategy || {};
    if (!strat.id) return '';
    const metrics = result.metrics || {};
    const award = awardMap.get(strat.id);
    const isSelected = strat.id === effectiveSelectedId;
    const metricCells = [
      { label: `${priorityModeLabel} score`, value: `${result.scores?.balanced ?? 0}/100` },
      { label: 'Net @ retirement', value: fmtGBP(metrics.netAtRet) },
      { label: 'Pot @ 75', value: fmtGBP(metrics.potAt75) },
      { label: 'Total tax (full plan)', value: fmtGBP(metrics.totalTax) },
    ];
    const labBadges = (strat.labBadges || []).map((text) => `<span class="pill">${text}</span>`).join('');
    const gapBadge = hasEarlyGap
      ? `<span class="pill ${strat.labSupportsEarlyGap ? 'pill-good' : 'pill-warn'}">${strat.labSupportsEarlyGap ? `Covers age ${earlyAge}–${stateAge}` : 'Needs other income before SP'}</span>`
      : '';
    return `<article class="strategy-lab-card${isSelected ? ' active' : ''}" data-strategy-id="${strat.id}" tabindex="0">
      <div class="strategy-lab-card-head">
        <div>
          <p class="strategy-lab-card-eyebrow">${groupLabel}</p>
          <h4>${strat.name}</h4>
        </div>
        <div class="strategy-lab-score">
          <span>${result.scores?.balanced ?? 0}</span>
          <small>${priorityModeLabel}</small>
        </div>
      </div>
      ${award ? `<div class="strategy-lab-ribbon">${award}</div>` : ''}
      <p class="strategy-lab-tagline">${strat.labTagline || strat.summary || ''}</p>
      <div class="strategy-lab-metrics">
        ${metricCells.map((metric) => `<div><span class="label">${metric.label}</span><span class="value">${metric.value}</span></div>`).join('')}
      </div>
      <div class="strategy-lab-tags">${gapBadge}${labBadges}</div>
    </article>`;
  };

  const rankIndex = new Map();
  ranked.forEach((item, idx) => {
    if (item?.strategy?.id) rankIndex.set(item.strategy.id, idx);
  });

  const groupMap = new Map();
  ranked.forEach((result, idx) => {
    const strat = result.strategy || {};
    const key = strat.labCategory || 'other';
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        key,
        label: strat.labCategoryLabel || 'Other ideas',
        order: Number(strat.labOrder || 0),
        items: [],
      });
    }
    groupMap.get(key).items.push({ result, rank: idx });
  });

  const labGroups = [...groupMap.values()]
    .sort((a, b) => (a.order === b.order ? a.label.localeCompare(b.label) : a.order - b.order))
    .map((group) => ({
      ...group,
      items: group.items.sort((a, b) => a.rank - b.rank),
    }));

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
              <div>
                <p class="strategy-lab-group-label">${group.label}</p>
                <p class="small muted">${group.items.length} option${group.items.length === 1 ? '' : 's'}</p>
              </div>
            </div>
            ${group.items.map(({ result }) => renderLabCard(result, group.label)).join('')}
          </div>`)
        .join('');
      labListEl.querySelectorAll('.strategy-lab-card').forEach((card) => {
        const id = card.dataset.strategyId;
        const invoke = () => handleStrategySelect(id);
        card.addEventListener('click', invoke);
        card.addEventListener('keydown', (evt) => {
          if (evt.key === 'Enter' || evt.key === ' ') {
            evt.preventDefault();
            invoke();
          }
        });
      });
    }
  }

  const dimensionLabels = {
    taxEfficiency: 'Tax efficiency',
    incomeSustainability: 'Income sustainability',
    incomeSmoothness: 'Income smoothness',
    flexibility: 'Flexibility',
    guaranteedIncomeStrength: 'Guaranteed income',
    potEfficiency: 'Pot efficiency',
  };
  const buildHeroMarkup = () => {
    if (ranked.length === 0) return '';
    if (!selected) {
      return `<article class="strategy-hero-card strategy-hero-card--empty">
        <div class="strategy-hero-head">
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
    const heroKpis = [
      { label: 'Net at retirement', value: fmtGBP(metrics.netAtRet) },
      { label: 'Pot at 75', value: fmtGBP(metrics.potAt75) },
      { label: 'Total tax (full plan)', value: fmtGBP(metrics.totalTax) },
      { label: 'Years meeting income floor', value: totalRetYears ? `${meetsMinYears}/${totalRetYears}` : '—' },
    ];
    const watchoutHtml = selectedWatchouts.length
      ? selectedWatchouts.slice(0, 2).map((w) => `<div class="strategy-watchout strategy-watchout-${w.severity}"><strong>${w.title}</strong><p class="small muted">${w.detail}</p></div>`).join('')
      : '<p class="small muted">No major watchouts flagged.</p>';
    const driverHtml = explanation?.topDrivers?.length
      ? `<ul class="strategy-driver-list">${explanation.topDrivers.slice(0, 3).map((driver) => `<li><span>${dimensionLabels[driver.dimension] || driver.dimension}</span><strong>${Math.round(Number(driver.points || 0))} pts</strong></li>`).join('')}</ul>`
      : '';
    const altCandidates = [];
    if (bestTax && bestTax.strategy.id !== selected.strategy.id) altCandidates.push({ id: bestTax.strategy.id, title: bestTax.strategy.name, caption: 'Tax focus' });
    if (bestSustainable && bestSustainable.strategy.id !== selected.strategy.id) altCandidates.push({ id: bestSustainable.strategy.id, title: bestSustainable.strategy.name, caption: 'Steadiest income' });
    const usedAlt = new Set();
    const altList = altCandidates.filter((item) => {
      if (usedAlt.has(item.id)) return false;
      usedAlt.add(item.id);
      return true;
    }).slice(0, 2);
    const altHtml = altList.length
      ? `<div class="strategy-selected-alt"><p class="small muted">Other standout picks</p><div class="strategy-alt-links">${altList.map((alt) => `<button type="button" class="strategy-alt-btn" data-strategy-link="${alt.id}">${alt.title}<span>${alt.caption}</span></button>`).join('')}</div></div>`
      : '';
    return `<article class="strategy-hero-card">
      <div class="strategy-hero-head">
        <div>
          <p class="strategy-hero-eyebrow">Selected plan</p>
          <h3>${selected.strategy.name}</h3>
          <p class="strategy-hero-tagline">${selected.strategy.summary}</p>
        </div>
        <div class="strategy-hero-score">
          <span>${selected.scores?.balanced ?? 0}</span>
          <small>${priorityModeLabel} score</small>
        </div>
      </div>
      <div class="strategy-hero-kpis">
        ${heroKpis.map((kpi) => `<div><span class="label">${kpi.label}</span><span class="value">${kpi.value}</span></div>`).join('')}
      </div>
      <div class="strategy-hero-section">
        <div>
          <p class="small muted">Watchouts</p>
          ${watchoutHtml}
        </div>
        ${driverHtml ? `<div><p class="small muted">Why this ranks well</p>${driverHtml}</div>` : ''}
      </div>
      ${altHtml}
    </article>`;
  };

  const dimensionShortLabel = {
    taxEfficiency: 'Tax efficiency',
    incomeSustainability: 'Sustainability',
    incomeSmoothness: 'Income smoothness',
    flexibility: 'Flexibility',
    guaranteedIncomeStrength: 'Guaranteed income',
    potEfficiency: 'Pot efficiency',
  };
  const modeWeights = ranked[0]?.rankingExplanation?.weights || {};
  const topWeightsStr = Object.entries(modeWeights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([dim, pct]) => `${dimensionShortLabel[dim] || dim} <strong>${pct}%</strong>`)
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
          if (takeAge < npa) {
            const yrsEarly = npa - takeAge;
            return `${name}: take at age ${takeAge} (${yrsEarly}y early, ~${adjustedIncome.toFixed(0)}/yr)`;
          }
          if (takeAge > npa) {
            const yrsDeferred = takeAge - npa;
            return `${name}: defer to age ${takeAge} (${yrsDeferred}y late, ~${adjustedIncome.toFixed(0)}/yr)`;
          }
          return `${name}: take at age ${takeAge} (NPA)`;
        })
        .join(' · ');

      const currentWorkplaceId = 'current-workplace';
      const dcPotMeta = [
        {
          id: currentWorkplaceId,
          name: 'Current workplace pension',
          feePct: Number(selectedState.feePct || 0),
          startValue: Number(selectedState.pot || 0),
        },
        ...((selectedState.dcPensions || []).map((pot) => ({
          id: String(pot.id || ''),
          name: String(pot.name || 'DC pension'),
          feePct: Number(pot.feePct || 0),
          startValue: Number(pot.currentValue || 0),
        }))),
      ].filter((pot) => pot.id);

      const potRows = dcPotMeta.map((pot) => {
        const drawdownUsed = Number(withdrawalByPotTotals[pot.id] || 0);
        const lumpUsed = Number(lumpSumByPotTotals[pot.id] || 0);
        return {
          ...pot,
          drawdownUsed,
          lumpUsed,
          totalUsed: drawdownUsed + lumpUsed,
        };
      });

      const orderedPots = [...potRows].sort((a, b) => {
        if (dcOrderRule === 'highest-fee-first') {
          if (b.feePct !== a.feePct) return b.feePct - a.feePct;
          return b.startValue - a.startValue;
        }
        if (dcOrderRule === 'smallest-pot-first') {
          if (a.startValue !== b.startValue) return a.startValue - b.startValue;
          return b.feePct - a.feePct;
        }
        if (b.totalUsed !== a.totalUsed) return b.totalUsed - a.totalUsed;
        return b.startValue - a.startValue;
      });

      const potUsageRows = orderedPots
        .filter((pot) => pot.startValue > 0 || pot.totalUsed > 0)
        .map((pot, idx) => {
          const feeTag = pot.feePct > 0 ? ` · fee ${pot.feePct.toFixed(2)}%` : '';
          const reasonTag = dcOrderRule === 'highest-fee-first'
            ? `Higher fee priority (${pot.feePct.toFixed(2)}% fee)`
            : dcOrderRule === 'smallest-pot-first'
              ? `Smaller pot priority (${fmtGBP(pot.startValue)} today)`
              : 'Default pension priority';
          return `<tr>
            <td><strong>${idx + 1}</strong></td>
            <td><strong>${pot.name}</strong><div class="small muted">Value today: ${fmtGBP(pot.startValue)}${feeTag}</div></td>
            <td class="small">${reasonTag}</td>
            <td>${pot.lumpUsed > 0 ? fmtGBP(pot.lumpUsed) : '<span class="muted">—</span>'}</td>
            <td>${pot.drawdownUsed > 0 ? fmtGBP(pot.drawdownUsed) : '<span class="muted">—</span>'}</td>
          </tr>`;
        })
        .join('');

      const lumpSourceRows = orderedPots
        .filter((pot) => Number(pot.lumpUsed || 0) > 0)
        .map((pot) => `<div class="small muted">${pot.name}: ${fmtGBP(pot.lumpUsed)} (taken at retirement age ${retireAge})</div>`)
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

      const keyAgeRows = keyAgeSet.map((age) => {
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
        const potStyle = potLow ? ' style="color:rgba(248,113,113,.9)"' : '';
        return `<tr>
          <td><strong>${age}</strong></td>
          <td class="small">${eventLabel}</td>
          <td>${fmtGBP(Number(row.recurringNetIncome || 0))}</td>
          <td>${fmtGBP(Number(row.guaranteedIncome || 0))}</td>
          <td><span${potStyle}>${fmtGBP(Number(row.potEnd || 0))}</span></td>
        </tr>`;
      }).join('');

      const condensedTimeline = selectedTimeline
        .map((entry) => ({ ...entry, items: entry.items.filter((i) => i.category !== 'drawdown') }))
        .filter((entry) => entry.items.length > 0);

      const limitedHint = ranked.length <= 2
        ? '<div class="strategy-detail-callout strategy-gap-sm"><strong>Tip:</strong> enter your current DC pot balances to unlock more strategy variations.</div>'
        : '';

      const driversHtml = explanation
        ? `<div class="strategy-explainer-shell">
            <div class="small strategy-strong-lite">Top drivers</div>
            <div class="strategy-explainer-grid strategy-top-gap-sm">
              ${(explanation.topDrivers || []).slice(0, 3).map((driver) => `<div class="strategy-explainer-item"><span class="small muted">${dimensionLabels[driver.dimension] || driver.dimension}</span><strong>${Math.round(driver.points)} pts</strong><span class="small muted">${driver.weightPct}% weight</span></div>`).join('')}
            </div>
            ${Array.isArray(explanation.penaltyBreakdown) && explanation.penaltyBreakdown.length > 0
              ? `<div class="small muted strategy-top-gap-sm">Deductions: ${explanation.penaltyBreakdown.slice(0, 3).map((p) => `${p.title} (−${Math.round(p.penalty)} pts)`).join(', ')}${explanation.penaltyBreakdown.length > 3 ? '…' : ''}.</div>`
              : '<div class="small muted strategy-top-gap-sm">No penalty deductions applied.</div>'}
          </div>`
        : '<p class="small muted">No ranking explanation available.</p>';

      const weightsCallout = topWeightsStr ? `<div class="small muted strategy-top-gap-xs">Mode weighting focus: ${topWeightsStr}</div>` : '';
      const watchoutListHtml = selectedWatchouts.length === 0
        ? '<div class="small muted">No major watchouts triggered.</div>'
        : `<div class="strategy-watchout-list">${selectedWatchouts.map((w) => `<div class="strategy-watchout-item strategy-watchout-${w.severity}"><strong>${w.title}</strong><div class="small muted">${w.detail}</div></div>`).join('')}</div>`;

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
          ${driversHtml}
          ${weightsCallout}
          ${dims
            ? `<div class="row strategy-chip-row strategy-top-gap-sm">
                ${badge('good', `Tax ${dims.taxEfficiency}`, 'Tax efficiency')}
                ${badge('good', `Sustainability ${dims.incomeSustainability}`, 'Income sustainability')}
                ${badge('good', `Smoothness ${dims.incomeSmoothness}`, 'Income smoothness')}
                ${badge('good', `Flexibility ${dims.flexibility}`, 'Flexibility')}
                ${badge('good', `Guaranteed ${dims.guaranteedIncomeStrength}`, 'Guaranteed income strength')}
                ${badge('good', `Pot eff. ${dims.potEfficiency}`, 'Pot efficiency')}
              </div>`
            : ''}
          <div class="strategy-watchout-panel strategy-top-gap-sm">
            <p class="small muted">Watchouts</p>
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
          <p class="small muted">DC order rule: <strong>${dcOrderRule}</strong>. ${dcOrderReason(dcOrderRule)}</p>
          ${dbTimingNotes ? `<p class="small muted strategy-top-gap-xxs">DB timing: ${dbTimingNotes}</p>` : ''}
          ${lumpSourceRows ? `<div class="strategy-top-gap-sm"><div class="small strategy-strong-lite">Lump sum sources</div>${lumpSourceRows}</div>` : ''}
          <div class="strategy-overflow strategy-top-gap-sm"><table>
            <thead><tr><th>Order</th><th>DC pot</th><th>Why this order</th><th>One-off lump sum</th><th>Total drawdown</th></tr></thead>
            <tbody>${potUsageRows || '<tr><td colspan="5" class="small muted">No DC pot usage data available.</td></tr>'}</tbody>
          </table></div>
        </section>`;

      const incomeSection = `
        <section class="card strategy-detail-card">
          <div class="strategy-detail-card-head">
            <div>
              <p class="strategy-detail-eyebrow">Retirement income</p>
              <h4>Trajectory</h4>
            </div>
          </div>
          <div class="kpi strategy-top-gap-sm">
            <div class="item"><div class="label">Total retirement income</div><div class="value">${fmtGBP(totalRetirementIncome)}</div></div>
            <div class="item"><div class="label">Average per year</div><div class="value">${fmtGBP(avgAnnualIncome)}</div></div>
            <div class="item"><div class="label">Years above min income</div><div class="value">${yearsOnMinimum} / ${retYears.length}</div></div>
            ${targetIncome > 0 ? `<div class="item"><div class="label">Years above target</div><div class="value">${yearsOnTarget} / ${retYears.length}</div></div>` : ''}
          </div>
          <div class="strategy-mini-charts strategy-top-gap-sm">
            <div>
              <div class="small strategy-strong-lite strategy-bottom-gap-xs">Income (today's £)</div>
              <div class="small muted strategy-bottom-gap-sm">Blue = before State Pension · Green = after State Pension · Red = below minimum</div>
              ${incomeChart}
              <div class="small muted strategy-axis-row"><span>Age ${retireAge}</span><span>Age ${endAge}</span></div>
            </div>
            <div>
              <div class="small strategy-strong-lite strategy-bottom-gap-xs">Pot balance</div>
              <div class="small muted strategy-bottom-gap-sm">Shaded area = pot · dashed line = retirement age</div>
              ${potChart}
              <div class="small muted strategy-axis-row"><span>Age ${currentAge}</span><span>Age ${endAge}</span></div>
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
          <div class="strategy-overflow strategy-top-gap-sm"><table>
            <thead><tr><th>Age</th><th>Event</th><th>Net income</th><th>Guaranteed income</th><th>Pot remaining</th></tr></thead>
            <tbody>${keyAgeRows || '<tr><td colspan="5" class="small muted">No rows available.</td></tr>'}</tbody>
          </table></div>
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
            ? '<div class="small muted">No one-off milestones — this strategy relies on recurring drawdown only.</div>'
            : `<div class="strategy-timeline-list strategy-top-gap-sm">${condensedTimeline.map((entry) => `<div class="callout strategy-timeline-card"><div class="dot strategy-timeline-dot"></div><div class="strategy-timeline-content"><div class="strategy-timeline-age strategy-strong">Age ${entry.age}</div>${entry.items.map((item) => `<div class="strategy-timeline-block strategy-top-gap-xs"><div><strong>${item.action}</strong></div><div class="small muted strategy-top-gap-xxs">${item.reason}</div></div>`).join('')}</div></div>`).join('')}</div>`}
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