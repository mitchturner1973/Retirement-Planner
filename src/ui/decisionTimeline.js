

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
  } = strategyBundle || {};

  const cardsWrap = getEl('strategyTopCards');
  const compareWrap = getEl('strategyCompareWrap');
  const timelineWrap = getEl('strategyTimelineWrap');
  const selectEl = getEl('strategySelect');

 

  const effectiveSelectedId = selectedStrategyId || ranked[0]?.strategy?.id || '';

  if (selectEl) {
    if (ranked.length === 0) {
      selectEl.innerHTML = '<option value="">No strategies available</option>';
      selectEl.disabled = true;
    } else {
      selectEl.innerHTML = ranked
        .map(
          (r) =>
            `<option value="${r.strategy.id}" ${
              r.strategy.id === effectiveSelectedId ? 'selected' : ''
            }>${r.strategy.name}</option>`
        )
        .join('');
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

  const topCards = [
    { label: `Top pick: ${priorityModeLabel}`, result: ranked[0] || null, scoreKey: 'balanced' },
    { label: 'Most tax-efficient', result: bestTax, scoreKey: 'tax' },
    { label: 'Most stable income', result: bestSustainable, scoreKey: 'sustainable' },
  ];
  const topWinnerIds = topCards.map((card) => card.result?.strategy?.id).filter(Boolean);
  const uniqueTopWinnerCount = new Set(topWinnerIds).size;

  const baseline = ranked.find((r) => String(r.strategy.id || '').startsWith('straight-drawdown')) || null;
  const formatDelta = (value) => {
    if (!Number.isFinite(value)) return '—';
    return `${value >= 0 ? '+' : '-'}${fmtGBP(Math.abs(value))}`;
  };

  const pot75LabelFor = (result) => {
    const endAge = Number(result?.state?.endAge || 0);
    return endAge > 0 && endAge < 75 ? `Pot at end age (${endAge})` : 'Pot at 75';
  };

  const selected = selectedResult || ranked.find((r) => r.strategy.id === effectiveSelectedId) || null;
  const selectedWatchouts = Array.isArray(selected?.watchouts) ? selected.watchouts : [];
  const dims = selected?.dimensionScores || null;
  const explanation = selected?.rankingExplanation || null;

  const dimensionLabel = {
    taxEfficiency: 'Tax efficiency',
    incomeSustainability: 'Income sustainability',
    incomeSmoothness: 'Income smoothness',
    flexibility: 'Flexibility',
    guaranteedIncomeStrength: 'Guaranteed income',
    potEfficiency: 'Pot efficiency',
  };

  cardsWrap.innerHTML =
    ranked.length === 0
      ? '<div class="muted">No strategies were generated for the current inputs.</div>'
      : `<div class="grid strategy-card-grid">
          ${uniqueTopWinnerCount === 1
            ? `<div class="strategy-context-callout strategy-full-span strategy-tight-bottom"><strong>One strategy leads in all categories</strong> under <em>${priorityModeLabel}</em> mode. Try a different priority mode above to compare alternative focus areas.</div>`
            : ''}
          ${topCards.map(({ label, result, scoreKey }) => {
            if (!result) return '';
            return `<div class="card strategy-top-card strategy-col-4">
              <div class="muted small strategy-top-card-label">${label}</div>
              <h3 class="strategy-top-card-title strategy-tight-top">${result.strategy.name}</h3>
              <div class="row strategy-top-card-badges strategy-chip-row">
                ${badge('good', `${result.scores[scoreKey]}/100`, `${label} score`)}
                ${badge('warn', `Tax to end age ${fmtGBP(result.metrics.totalTax)}`, 'Estimated total tax across the full projection horizon')}
              </div>
              ${result.dimensionScores
                ? `<div class="row strategy-top-card-badges strategy-chip-row">
                  ${badge('good', `Tax eff. ${result.dimensionScores.taxEfficiency}`, 'Tax efficiency score')}
                  ${badge('good', `Sustainability ${result.dimensionScores.incomeSustainability}`, 'Income sustainability score')}
                  ${badge('good', `Smoothness ${result.dimensionScores.incomeSmoothness}`, 'Income smoothness score')}
                </div>`
                : ''}
              <div class="small muted strategy-top-card-summary strategy-top-gap">${result.strategy.summary}</div>
              ${baseline && baseline.strategy.id !== result.strategy.id
                ? `<div class="small muted strategy-top-card-note strategy-top-gap-sm">Compared with baseline straight drawdown, this plan changes withdrawal timing and can materially change pot values by age.</div>`
                : ''}
              <div class="kpi strategy-top-card-kpis strategy-top-gap-md">
                <div class="item strategy-kpi-item"><div class="label">Net at retirement</div><div class="value">${fmtGBP(result.summary.netAtRet)}</div></div>
                <div class="item strategy-kpi-item"><div class="label">Pot at retirement</div><div class="value">${fmtGBP(result.summary.potAtRet)}</div></div>
                <div class="item strategy-kpi-item"><div class="label">${pot75LabelFor(result)}</div><div class="value">${fmtGBP(result.metrics.potAt75)}</div></div>
                <div class="item strategy-kpi-item"><div class="label">LSA left at retirement</div><div class="value">${fmtGBP(result.metrics.remainingLsaAtRet)}</div></div>
              </div>
            </div>`;
          }).join('')}
        </div>`;

  const noPotHint = ranked.length <= 2
    ? '<div class="strategy-context-callout strategy-tight-bottom"><strong>Limited strategies available.</strong> Enter your current DC pension pot value on the main form to unlock tax-free lump sum strategies and see a broader comparison.</div>'
    : '';

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

  compareWrap.innerHTML =
    ranked.length === 0
      ? '<div class="muted">No strategy comparison available yet.</div>'
        : `${noPotHint}<div class="strategy-context-callout strategy-tight-bottom">
            <div><strong>Mode: ${priorityModeLabel}</strong> — Priority score column is sorted by this mode’s weights.</div>
            ${topWeightsStr ? `<div class="small muted strategy-gap-xs">Top weighted dimensions: ${topWeightsStr}</div>` : ''}
            <div class="small muted strategy-gap-xs">Targets: min net ${fmtGBP(Number(targets.minimumDesiredNetIncome || 0))} / retirement target ${fmtGBP(Number(targets.targetRetirementNetIncome || 0))} / buffer at 75 ${fmtGBP(Number(targets.minimumFlexibilityBufferAt75 || 0))}.</div>
          </div>
          <div class="strategy-table-shell strategy-overflow"><table><thead><tr>
          <th>Strategy</th><th>DB timing</th><th>Priority score</th><th>Tax score</th><th>Stable income score</th><th>Tax to end age</th><th>Net at retirement</th><th>Δ vs baseline net (ret)</th><th>Pot at retirement</th><th>Δ vs baseline pot (ret)</th><th>Lowest later income</th><th>Pot at 75 (or end age)</th><th>One-off lump sums</th></tr></thead><tbody>
          ${ranked
            .map(
              (r, idx) => {
                const netDelta = baseline ? Number(r.metrics.netAtRet || 0) - Number(baseline.metrics.netAtRet || 0) : Number.NaN;
                const potDelta = baseline ? Number(r.summary.potAtRet || 0) - Number(baseline.summary.potAtRet || 0) : Number.NaN;
                const isTop = idx === 0;
                return `<tr${isTop ? ' class="strategy-row-top"' : ''}>
                <td class="strategy-cell-main"><strong>${r.strategy.name}</strong>${isTop ? ' <span class="small strategy-top-pick">★ top pick</span>' : ''}<div class="small muted strategy-table-summary">${r.strategy.summary}</div></td>
                <td class="strategy-cell-db">${formatDbTimingCell(r.state?.dbPensions || [])}</td>
                <td><strong>${r.scores.balanced}</strong></td>
                <td>${r.scores.tax}</td>
                <td>${r.scores.sustainable}</td>
                <td>${fmtGBP(r.metrics.totalTax)}</td>
                <td>${fmtGBP(r.metrics.netAtRet)}</td>
                <td>${formatDelta(netDelta)}</td>
                <td>${fmtGBP(r.summary.potAtRet)}</td>
                <td>${formatDelta(potDelta)}</td>
                <td>${fmtGBP(r.metrics.lowestIncomeAfterRet)}</td>
                <td>${fmtGBP(r.metrics.potAt75)}</td>
                <td>${fmtGBP(r.metrics.totalLumpSums)}</td>
              </tr>`;
              }
            )
            .join('')}
        </tbody></table></div>`;

  timelineWrap.innerHTML =
    selectedTimeline.length === 0
      ? '<div class="muted">No strategy timeline available yet.</div>'
      : (() => {
          const allYears = selectedResult?.years || [];
          const retYears = allYears.filter((y) => y.phase === 'retired');
          const stateAge = Number(selected?.state?.stateAge || 67);
          const retireAge = Number(selected?.state?.retireAge || 67);
          const currentAge = Number(selected?.state?.currentAge || 42);
          const endAge = Number(selected?.state?.endAge || 95);
          const minIncome = Number(targets.minimumDesiredNetIncome || 0);
          const targetIncome = Number(targets.targetRetirementNetIncome || 0);

          const totalRetirementIncome = retYears.reduce((s, y) => s + Number(y.recurringNetIncome || 0), 0);
          const avgAnnualIncome = retYears.length > 0 ? totalRetirementIncome / retYears.length : 0;
          const yearsOnMinimum = retYears.filter((y) => Number(y.recurringNetIncome || 0) >= minIncome).length;
          const yearsOnTarget = retYears.filter((y) => Number(y.recurringNetIncome || 0) >= targetIncome).length;

          const dcOrderRule = String(selected?.state?.dcOrderRule || selected?.strategy?.dcOrder || 'default');
          const withdrawalByPotTotals = selected?.metrics?.withdrawalByPotTotals || {};
          const lumpSumByPotTotals = selected?.metrics?.lumpSumByPotTotals || {};

          // DB timing info
          const dbPensionsInState = selected?.state?.dbPensions || [];
          const dbTimingNotes = dbPensionsInState
            .map((dbPen) => {
              const takeAge = Number(dbPen.dbTakingAge || dbPen.startAge || 67);
              const npa = Number(dbPen.dbNpa || dbPen.npaAge || dbPen.startAge || 67);
              const name = String(dbPen.name || 'DB Pension');
              const adjustedIncome = Number(dbPen.annualIncome || 0);
              if (takeAge < npa) {
                const yrsEarly = npa - takeAge;
                return `${name}: take at age ${takeAge} (${yrsEarly} years early, reduced to ~${adjustedIncome.toFixed(0)} per year)`;
              } else if (takeAge > npa) {
                const yrsDeferred = takeAge - npa;
                return `${name}: defer to age ${takeAge} (${yrsDeferred} years late, increased to ~${adjustedIncome.toFixed(0)} per year)`;
              }
              return `${name}: take at age ${takeAge} (Normal Pension Age)`;
            })
            .join(' \u00b7 ');

          const currentWorkplaceId = 'current-workplace';
          const dcPotMeta = [
            {
              id: currentWorkplaceId,
              name: 'Current workplace pension',
              feePct: Number(selected?.state?.feePct || 0),
              startValue: Number(selected?.state?.pot || 0),
            },
            ...((selected?.state?.dcPensions || []).map((pot) => ({
              id: String(pot.id || ''),
              name: String(pot.name || 'DC pension'),
              feePct: Number(pot.feePct || 0),
              startValue: Number(pot.currentValue || 0),
            }))),
          ].filter((pot) => pot.id);

          // Find per-pot values at retirement age from the actual simulation rows
          const retirementRow = allYears.find((y) => Number(y.age) === retireAge) || null;
          const retDrawdownByPot = retirementRow?.drawdownByPot || {};
          const retLumpByPot = retirementRow?.lumpSumByPot || {};

          const potRows = dcPotMeta.map((pot) => {
            const drawdownUsed = Number(withdrawalByPotTotals[pot.id] || 0);
            const lumpUsed = Number(lumpSumByPotTotals[pot.id] || 0);
            const totalUsed = drawdownUsed + lumpUsed;
            return {
              ...pot,
              drawdownUsed,
              lumpUsed,
              totalUsed,
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
              const feeTag = pot.feePct > 0 ? ` · annual fee ${pot.feePct.toFixed(2)}%` : ' · no explicit fee';
              const reasonTag = dcOrderRule === 'highest-fee-first'
                ? `Higher fee priority (${pot.feePct.toFixed(2)}% fee)`
                : dcOrderRule === 'smallest-pot-first'
                  ? `Smaller pot priority (${fmtGBP(pot.startValue)} today)`
                  : 'Default pension priority';
              const lumpNote = pot.lumpUsed > 0
                ? `<div class="small muted">Taken as one-off at retirement (age ${retireAge}), from the projected pot value including growth to that age</div>`
                : '';
              const drawNote = pot.drawdownUsed > 0
                ? `<div class="small muted">Cumulative amount drawn across all retirement years (age ${retireAge}–${endAge})</div>`
                : '';
              return `<tr>
                <td><strong>${idx + 1}</strong></td>
                <td><strong>${pot.name}</strong><div class="small muted">Value today: ${fmtGBP(pot.startValue)}${feeTag}</div></td>
                <td class="small">${reasonTag}</td>
                <td>${pot.lumpUsed > 0 ? fmtGBP(pot.lumpUsed) : '<span class="muted">—</span>'}${lumpNote}</td>
                <td>${pot.drawdownUsed > 0 ? fmtGBP(pot.drawdownUsed) : '<span class="muted">—</span>'}${drawNote}</td>
              </tr>`;
            })
            .join('');

          const lumpSourceRows = orderedPots
            .filter((pot) => Number(pot.lumpUsed || 0) > 0)
            .map((pot) => `<div class="small muted">${pot.name}: ${fmtGBP(pot.lumpUsed)} (taken at age ${retireAge} — this is the predicted amount based on projected pot growth to retirement)</div>`)
            .join('');

          const incomeChart = renderIncomeBarChart(retYears, minIncome, stateAge);
          const potChart = renderPotAreaChart(allYears, retireAge);

          // Key snapshot ages
          const dbStartAges = [];
          allYears.forEach((row, idx, arr) => {
            if (Number(row.dbIncome || 0) > 0 && (idx === 0 || Number(arr[idx - 1].dbIncome || 0) === 0)) {
              dbStartAges.push(Number(row.age));
            }
          });
          const keyAgeSet = [...new Set([retireAge, stateAge, ...dbStartAges, 75, endAge]
            .filter((a) => a >= retireAge && a <= endAge))].sort((a, b) => a - b);

          const keyAgeRows = keyAgeSet.map((age) => {
            const row = allYears.find((y) => Number(y.age) === age);
            if (!row) return '';
            const entry = selectedTimeline.find((e) => Number(e.age) === age);
            const milestoneItems = (entry?.items || []).filter((i) => ['milestone', 'pcls', 'ufpls'].includes(i.category));
            const isRetire = age === retireAge;
            const isSp = age === stateAge && age !== retireAge;
            const isDb = dbStartAges.includes(age) && !isRetire && !isSp;
            const defaultLabel = isRetire ? 'Retirement' : isSp ? 'State Pension starts' : isDb ? 'DB income starts' : age === 75 ? 'Age 75 snapshot' : `End age (${age})`;
            const eventLabel = milestoneItems.length ? milestoneItems.map((mi) => mi.action).join('; ') : defaultLabel;
            const potLow = Number(row.potEnd || 0) < 50000;
            const potStyle = potLow ? ' style="color:rgba(248,113,113,.9)"' : '';
            return `<tr>
              <td style="white-space:nowrap"><strong>${age}</strong></td>
              <td class="small">${eventLabel}</td>
              <td>${fmtGBP(Number(row.recurringNetIncome || 0))}</td>
              <td>${fmtGBP(Number(row.guaranteedIncome || 0))}</td>
              <td><span${potStyle}>${fmtGBP(Number(row.potEnd || 0))}</span></td>
            </tr>`;
          }).join('');

          // Condensed timeline — milestone and one-off events only, no routine drawdown
          const condensedTimeline = selectedTimeline
            .map((entry) => ({ ...entry, items: entry.items.filter((i) => i.category !== 'drawdown') }))
            .filter((entry) => entry.items.length > 0);

          return `
          <div class="strategy-watchouts-shell strategy-block-gap">
            <div class="small strategy-strong">Selected: <span class="strategy-selected-name">${selected?.strategy?.name || '—'}</span></div>
            ${explanation
              ? `<div class="strategy-explainer-shell strategy-top-gap-sm">
                  <div class="small strategy-strong-lite">Why this ranked ${selected?.scores?.balanced ?? '—'}/100 in ${priorityModeLabel.toLowerCase()} mode</div>
                  <div class="strategy-explainer-grid strategy-top-gap-sm">
                    ${(explanation.topDrivers || []).slice(0, 3).map((driver) => `<div class="strategy-explainer-item"><span class="small muted">${dimensionLabel[driver.dimension] || driver.dimension}</span><strong>${Math.round(driver.points)} pts</strong><span class="small muted">(${driver.weightPct}% weight)</span></div>`).join('')}
                  </div>
                  ${Array.isArray(explanation.penaltyBreakdown) && explanation.penaltyBreakdown.length > 0
                    ? `<div class="small muted strategy-top-gap-sm">Deductions: ${explanation.penaltyBreakdown.slice(0, 3).map((p) => `${p.title} (−${Math.round(p.penalty)} pts)`).join(', ')}${explanation.penaltyBreakdown.length > 3 ? '…' : ''}.</div>`
                    : '<div class="small muted strategy-top-gap-sm">No penalty deductions applied.</div>'}
                </div>`
              : ''}
            ${dims
              ? `<div class="row strategy-top-card-badges strategy-chip-row">
                  ${badge('good', `Tax ${dims.taxEfficiency}`, 'Tax efficiency')}
                  ${badge('good', `Sustainability ${dims.incomeSustainability}`, 'Income sustainability')}
                  ${badge('good', `Smoothness ${dims.incomeSmoothness}`, 'Income smoothness')}
                  ${badge('good', `Flexibility ${dims.flexibility}`, 'Flexibility')}
                  ${badge('good', `Guaranteed ${dims.guaranteedIncomeStrength}`, 'Guaranteed income strength')}
                  ${badge('good', `Pot eff. ${dims.potEfficiency}`, 'Pot efficiency')}
                </div>`
              : ''}
            ${selectedWatchouts.length === 0
              ? '<div class="small muted strategy-top-gap-sm">No major watchouts triggered.</div>'
              : `<div class="strategy-watchout-list strategy-top-gap-sm">${selectedWatchouts.map((w) => `<div class="strategy-watchout-item strategy-watchout-${w.severity}"><strong>${w.title}</strong><div class="small muted">${w.detail}</div></div>`).join('')}</div>`}
          </div>

          <div class="strategy-watchouts-shell strategy-block-gap">
            <div class="small strategy-strong strategy-bottom-gap-sm">DC + DB pension plan</div>
            <div class="small muted strategy-bottom-gap-xs">
              DC order rule: <strong>${dcOrderRule}</strong>. ${dcOrderReason(dcOrderRule)}
            </div>
            ${dbTimingNotes ? `<div class="small muted strategy-bottom-gap-sm">DB timing: ${dbTimingNotes}</div>` : ''}
            ${lumpSourceRows
              ? `<div class="strategy-bottom-gap-sm"><div class="small strategy-strong-lite">Retirement lump sum source</div>${lumpSourceRows}</div>`
              : '<div class="small muted strategy-bottom-gap-sm">No one-off lump sum taken under this strategy.</div>'}
            <div class="strategy-overflow"><table>
              <thead><tr><th>Order</th><th>DC pot</th><th>Why this order</th><th>One-off lump sum</th><th>Total drawdown taken</th></tr></thead>
              <tbody>${potUsageRows || '<tr><td colspan="5" class="small muted">No DC pot usage data available.</td></tr>'}</tbody>
            </table></div>
          </div>

          <div class="kpi strategy-block-gap">
            <div class="item"><div class="label">Total retirement income</div><div class="value">${fmtGBP(totalRetirementIncome)}</div></div>
            <div class="item"><div class="label">Average per year</div><div class="value">${fmtGBP(avgAnnualIncome)}</div></div>
            <div class="item"><div class="label">Years above min income</div><div class="value">${yearsOnMinimum} / ${retYears.length}</div></div>
            ${targetIncome > 0 ? `<div class="item"><div class="label">Years above retirement target</div><div class="value">${yearsOnTarget} / ${retYears.length}</div></div>` : ''}
          </div>

          <div class="strategy-mini-charts strategy-block-gap">
            <div>
              <div class="small strategy-strong-lite strategy-bottom-gap-xs">Net income in retirement (per year)</div>
              <div class="small muted strategy-bottom-gap-sm">Blue = pre-State Pension &nbsp;·&nbsp; Green = post-State Pension &nbsp;·&nbsp; Red = below minimum &nbsp;·&nbsp; — = min target</div>
              ${incomeChart}
              <div class="small muted strategy-axis-row"><span>Age ${retireAge}</span><span>Age ${endAge}</span></div>
            </div>
            <div>
              <div class="small strategy-strong-lite strategy-bottom-gap-xs">Pension pot over time</div>
              <div class="small muted strategy-bottom-gap-sm">Purple = DC pot balance each year &nbsp;·&nbsp; Dashed = retirement age</div>
              ${potChart}
              <div class="small muted strategy-axis-row"><span>Age ${currentAge}</span><span>Age ${endAge}</span></div>
            </div>
          </div>

          <div class="strategy-block-gap">
            <div class="small strategy-strong strategy-bottom-gap-sm">Snapshot at key ages</div>
            <div class="strategy-overflow"><table>
              <thead><tr><th>Age</th><th>Event</th><th>Net income</th><th>Guaranteed income</th><th>Pot remaining</th></tr></thead>
              <tbody>${keyAgeRows}</tbody>
            </table></div>
          </div>

          <div>
            <div class="small strategy-strong strategy-bottom-gap-sm">Key events</div>
            ${condensedTimeline.length === 0
              ? '<div class="small muted">No notable one-off events — this strategy uses only recurring drawdown.</div>'
              : `<div class="strategy-timeline-list">${condensedTimeline.map((entry) => `<div class="callout strategy-timeline-card strategy-top-gap-sm"><div class="dot strategy-timeline-dot"></div><div class="strategy-timeline-content"><div class="strategy-timeline-age strategy-strong">Age ${entry.age}</div>${entry.items.map((item) => `<div class="strategy-timeline-block strategy-top-gap-xs"><div><strong>${item.action}</strong></div><div class="small muted strategy-top-gap-xxs">${item.reason}</div></div>`).join('')}</div></div>`).join('')}</div>`}
          </div>`;
        })();
}