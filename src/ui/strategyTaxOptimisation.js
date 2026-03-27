const formatMoney = (fmtGBP, value) => fmtGBP(Math.round(Number(value || 0)));

function renderSummary(getEl, fmtGBP, cards) {
  const summaryEl = getEl('strategyTaxSummary');
  if (!summaryEl) return;
  if (!cards || cards.length === 0) {
    summaryEl.innerHTML = '<div class="card strategy-detail-placeholder">Recalculate to populate tax optimisation insights.</div>';
    return;
  }
  summaryEl.innerHTML = `
    <div class="strategy-tax-summary-grid">
      ${cards.map((card) => `
        <article class="strategy-tax-summary-card strategy-tax-summary-card--${card.tone || 'info'}">
          <p class="strategy-tax-summary-label">${card.title}</p>
          <div class="strategy-tax-summary-value">${card.value}</div>
          <p class="small muted">${card.detail}</p>
        </article>
      `).join('')}
    </div>`;
}

function renderOrder(getEl, fmtGBP, order) {
  const orderEl = getEl('strategyTaxOrder');
  if (!orderEl) return;
  if (!order || order.length === 0) {
    orderEl.innerHTML = '<div class="strategy-detail-placeholder">No withdrawal order available yet.</div>';
    return;
  }
  orderEl.innerHTML = `
    <div class="strategy-detail-card-head">
      <div>
        <p class="strategy-detail-eyebrow">Withdrawal order analysis</p>
        <h4>Likely stacking sequence</h4>
      </div>
    </div>
    <ol class="strategy-tax-order">
      ${order.map((item, idx) => `
        <li class="strategy-tax-order-row strategy-tax-order-row--${item.tone || 'info'}">
          <div class="strategy-tax-order-index">${idx + 1}</div>
          <div>
            <strong>${item.label}</strong>
            <div class="small muted">${item.source}</div>
            <p>${item.reason}</p>
            <div class="strategy-tax-order-meta">
              <span><strong>Tax:</strong> ${item.taxTreatment}</span>
              <span><strong>Flexibility:</strong> ${item.flexibility}</span>
              <span><strong>Trade-off:</strong> ${item.tradeOff}</span>
            </div>
          </div>
        </li>
      `).join('')}
    </ol>`;
}

function renderComparisonCards(getEl, fmtGBP, cards) {
  const compEl = getEl('strategyTaxComparisons');
  if (!compEl) return;
  if (!cards || cards.length === 0) {
    compEl.innerHTML = '<div class="strategy-detail-placeholder">No comparison cards to show yet.</div>';
    return;
  }
  compEl.innerHTML = `
    <div class="strategy-detail-card-head">
      <div>
        <p class="strategy-detail-eyebrow">Strategy comparison</p>
        <h4>Tax-focused approaches</h4>
      </div>
    </div>
    <div class="strategy-tax-comparison-grid">
      ${cards.map((card) => `
        <article class="strategy-tax-comparison-card strategy-tax-comparison-card--${card.tone}">
          <div class="strategy-tax-comparison-head">
            <div>
              <p class="strategy-tax-chip">${card.status.replace(/-/g, ' ')}</p>
              <h5>${card.title}</h5>
            </div>
          </div>
          <p class="strategy-tax-comparison-desc">${card.description}</p>
          <div class="strategy-tax-comparison-cols">
            <div>
              <p class="strategy-tax-chip strategy-tax-chip--light">Pros</p>
              <ul>${card.pros.map((pro) => `<li>${pro}</li>`).join('')}</ul>
            </div>
            <div>
              <p class="strategy-tax-chip strategy-tax-chip--light">Risks</p>
              <ul>${card.risks.map((risk) => `<li>${risk}</li>`).join('')}</ul>
            </div>
          </div>
          <div class="strategy-tax-comparison-meta">
            <span><strong>Tax impact:</strong> ${card.taxImpact}</span>
            <span><strong>Flexibility:</strong> ${card.flexibility}</span>
            <span><strong>MPAA:</strong> ${card.mpaa}</span>
          </div>
        </article>
      `).join('')}
    </div>`;
}

function renderFindings(getEl, findings) {
  const findingsEl = getEl('strategyTaxFindings');
  if (!findingsEl) return;
  if (!findings || findings.length === 0) {
    findingsEl.innerHTML = '<div class="strategy-detail-placeholder">No plan-specific findings yet.</div>';
    return;
  }
  findingsEl.innerHTML = `
    <div class="strategy-detail-card-head">
      <div>
        <p class="strategy-detail-eyebrow">Plan-specific findings</p>
        <h4>What stands out</h4>
      </div>
    </div>
    <ul class="strategy-tax-finding-list">
      ${findings.map((finding) => `<li>${finding}</li>`).join('')}
    </ul>`;
}

function renderExplainer(getEl, explainer) {
  const explainerEl = getEl('strategyTaxExplainer');
  if (!explainerEl) return;
  if (!explainer) {
    explainerEl.innerHTML = '<div class="strategy-detail-placeholder">Select a strategy to compare PCLS and UFPLS.</div>';
    return;
  }
  explainerEl.innerHTML = `
    <div class="strategy-detail-card-head">
      <div>
        <p class="strategy-detail-eyebrow">PCLS vs UFPLS</p>
        <h4>Understand the difference</h4>
      </div>
    </div>
    <div class="strategy-tax-explainer">
      <div>
        <p class="strategy-tax-chip">${explainer.pcls.title}</p>
        <ul>${explainer.pcls.bullets.map((item) => `<li>${item}</li>`).join('')}</ul>
      </div>
      <div>
        <p class="strategy-tax-chip">${explainer.ufpls.title}</p>
        <ul>${explainer.ufpls.bullets.map((item) => `<li>${item}</li>`).join('')}</ul>
      </div>
    </div>
    <div class="strategy-tax-callout">
      <strong>${explainer.highlight}</strong>
      <p class="small muted">${explainer.mpaaNote}</p>
    </div>`;
}

function renderTaxBands(getEl, fmtGBP, usage) {
  const bandsEl = getEl('strategyTaxBands');
  if (!bandsEl) return;
  if (!usage) {
    bandsEl.innerHTML = '<div class="strategy-detail-placeholder">No tax band data yet.</div>';
    return;
  }
  const segments = [
    { label: 'Personal allowance used', value: usage.allowanceFill, tone: 'good' },
    { label: 'Basic-rate band used', value: usage.basicFill, tone: 'info' },
    { label: 'Higher-rate exposure', value: usage.higherFill, tone: usage.higherFill > 0 ? 'warn' : 'info' },
  ];
  const total = segments.reduce((sum, seg) => sum + seg.value, 0) || 1;
  bandsEl.innerHTML = `
    <div class="strategy-detail-card-head">
      <div>
        <p class="strategy-detail-eyebrow">Tax band usage</p>
        <h4>Retirement income layering</h4>
      </div>
    </div>
    <div class="strategy-tax-band-bar">
      ${segments.map((seg) => {
        const pct = Math.max(2, Math.round((seg.value / total) * 100));
        return `<span class="strategy-tax-band-segment strategy-tax-band-segment--${seg.tone}" style="width:${pct}%">
          <small>${seg.label}</small>
          <strong>${fmtGBP(Math.round(seg.value))}</strong>
        </span>`;
      }).join('')}
    </div>
    <div class="strategy-tax-band-breakdown">
      <div>
        <p class="small muted">Guaranteed income</p>
        <strong>${fmtGBP(Math.round(usage.guaranteedIncome || 0))}</strong>
      </div>
      <div>
        <p class="small muted">Taxable DC drawdown</p>
        <strong>${fmtGBP(Math.round(usage.dcTaxable || 0))}</strong>
      </div>
      <div>
        <p class="small muted">Tax-free cash in year one</p>
        <strong>${fmtGBP(Math.round(usage.taxFreeCashAtRet || 0))}</strong>
      </div>
    </div>`;
}

function renderActions(getEl, actions) {
  const actionsEl = getEl('strategyTaxActions');
  if (!actionsEl) return;
  if (!actions || actions.length === 0) {
    actionsEl.innerHTML = '<div class="strategy-detail-placeholder">No recommended actions yet.</div>';
    return;
  }
  actionsEl.innerHTML = `
    <div class="strategy-detail-card-head">
      <div>
        <p class="strategy-detail-eyebrow">Recommended actions</p>
        <h4>Plain-English next steps</h4>
      </div>
    </div>
    <ul class="strategy-tax-actions">
      ${actions.map((action) => `
        <li class="strategy-tax-action strategy-tax-action--${action.tone || 'info'}">
          <strong>${action.title}</strong>
          <p>${action.detail}</p>
        </li>
      `).join('')}
    </ul>`;
}

export function renderStrategyTaxOptimisation(deps, analysis) {
  const { getEl, fmtGBP } = deps;
  renderSummary(getEl, fmtGBP, analysis?.summaryCards);
  renderOrder(getEl, fmtGBP, analysis?.withdrawalOrder);
  renderComparisonCards(getEl, fmtGBP, analysis?.comparisonCards);
  renderFindings(getEl, analysis?.findings);
  renderExplainer(getEl, analysis?.pclsVsUfpls);
  renderTaxBands(getEl, fmtGBP, analysis?.taxBandUsage);
  renderActions(getEl, analysis?.recommendedActions);
}
