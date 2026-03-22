

export function renderStrategyTab(deps, strategyBundle) {
  const { getEl, fmtGBP, badge } = deps;
  const {
    ranked = [],
    bestTax,
    bestSustainable,
    bestBalanced,
    selectedTimeline = [],
    selectedStrategyId,
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

  const topCards = [
    { label: 'Best for lowest tax', result: bestTax, scoreKey: 'tax' },
    { label: 'Best for stable income', result: bestSustainable, scoreKey: 'sustainable' },
    { label: 'Best all-round plan', result: bestBalanced, scoreKey: 'balanced' },
  ];

  cardsWrap.innerHTML =
    ranked.length === 0
      ? '<div class="muted">No strategies were generated for the current inputs.</div>'
      : topCards
          .map(({ label, result, scoreKey }) => {
            if (!result) return '';
            return `<div class="card" style="grid-column: span 4; background:rgba(255,255,255,.04)">
              <div class="muted small">${label}</div>
              <h3 style="margin-top:6px">${result.strategy.name}</h3>
              <div class="row" style="margin-top:8px; gap:8px; flex-wrap:wrap">
                ${badge('good', `${result.scores[scoreKey]}/100`, `${label} score`)}
                ${badge('warn', `Tax ${fmtGBP(result.metrics.totalTax)}`, 'Estimated tax across projection horizon')}
              </div>
              <div class="small muted" style="margin-top:10px">${result.strategy.summary}</div>
              <div class="kpi" style="margin-top:12px">
                <div class="item"><div class="label">Net at retirement</div><div class="value">${fmtGBP(result.summary.netAtRet)}</div></div>
                <div class="item"><div class="label">Pot at 75</div><div class="value">${fmtGBP(result.metrics.potAt75)}</div></div>
                <div class="item"><div class="label">LSA left at retirement</div><div class="value">${fmtGBP(result.metrics.remainingLsaAtRet)}</div></div>
              </div>
            </div>`;
          })
          .join('');

  compareWrap.innerHTML =
    ranked.length === 0
      ? '<div class="muted">No strategy comparison available yet.</div>'
      : `<div style="overflow:auto"><table><thead><tr>
          <th>Strategy</th><th>Tax score</th><th>Sustainable score</th><th>Balanced score</th><th>Tax to end age</th><th>Net at retirement</th><th>Lowest later income</th><th>Pot at 75</th><th>One-off lump sums</th></tr></thead><tbody>
          ${ranked
            .map(
              (r) => `<tr>
                <td><strong>${r.strategy.name}</strong><div class="small muted">${r.strategy.summary}</div></td>
                <td>${r.scores.tax}</td>
                <td>${r.scores.sustainable}</td>
                <td>${r.scores.balanced}</td>
                <td>${fmtGBP(r.metrics.totalTax)}</td>
                <td>${fmtGBP(r.metrics.netAtRet)}</td>
                <td>${fmtGBP(r.metrics.lowestIncomeAfterRet)}</td>
                <td>${fmtGBP(r.metrics.potAt75)}</td>
                <td>${fmtGBP(r.metrics.totalLumpSums)}</td>
              </tr>`
            )
            .join('')}
        </tbody></table></div>`;

  timelineWrap.innerHTML =
    selectedTimeline.length === 0
      ? '<div class="muted">No strategy timeline available yet.</div>'
      : selectedTimeline
          .map(
            (entry) =>
              `<div class="callout" style="margin-top:10px"><div class="dot" style="background:rgba(110,231,255,.9)"></div><div style="flex:1"><div style="font-weight:700">Age ${entry.age}</div>${entry.items
                .map(
                  (item) =>
                    `<div style="margin-top:8px"><div><strong>${item.action}</strong></div><div class="small muted" style="margin-top:4px">${item.reason}</div></div>`
                )
                .join('')}</div></div>`
          )
          .join('');
}