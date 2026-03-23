function formatDelta(value, fmtGBP) {
  const amount = Number(value || 0);
  if (!amount) return 'No change';
  const sign = amount > 0 ? '+' : '-';
  return `${sign}${fmtGBP(Math.abs(amount))}`;
}

function sparklinePath(values, width = 130, height = 34) {
  const series = Array.isArray(values) && values.length ? values.map((value) => Number(value || 0)) : [0, 0, 0];
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  return series
    .map((value, index) => {
      const x = (index / Math.max(1, series.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

export function renderOverviewDashboard({ getEl, fmtGBP }, model) {
  try {
    const headline = getEl('overviewHeadlineCards');
    const income = getEl('overviewIncomeBreakdown');
    const watchouts = getEl('overviewWatchouts');
    const earlyBridge = getEl('overviewBridgeFeasibility');
    const changes = getEl('overviewChanges');
    const nextSteps = getEl('overviewNextSteps');
    const horizon = getEl('horizonLbl');
    const compareSource = getEl('overviewCompareSource');
    const compareScenario = getEl('overviewCompareScenario');

    if (horizon) horizon.textContent = model.horizonText;

    if (compareSource) compareSource.value = model.compareSource || 'previous';
    if (compareScenario) {
      compareScenario.innerHTML = `<option value="">Select saved scenario...</option>${(model.compareScenarioOptions || []).map((option) => `<option value="${option.id}">${option.name}</option>`).join('')}`;
      compareScenario.value = model.compareScenarioId || '';
      compareScenario.disabled = (model.compareSource || 'previous') !== 'scenario';
    }

    if (headline) {
      headline.innerHTML = model.headlineCards.map((card) => `
        <article class="overview-summary-card overview-summary-card--${card.tone}">
          <div class="overview-summary-label">${card.title}</div>
          <div class="overview-summary-value">${fmtGBP(card.value)}</div>
          <svg class="overview-sparkline" viewBox="0 0 130 34" preserveAspectRatio="none" aria-hidden="true">
            <path d="${sparklinePath(card.sparkline)}" />
          </svg>
          <div class="overview-summary-detail muted">${card.detail}</div>
        </article>
      `).join('');
    }

    if (income) {
      income.innerHTML = model.incomeComposition.items.map((item) => `
        <div class="overview-breakdown-item ${item.emphasis ? 'is-emphasis' : ''}">
          <span class="overview-breakdown-label">${item.label}</span>
          <strong>${fmtGBP(item.value)}</strong>
        </div>
      `).join('');
    }

    if (watchouts) {
      if (!model.watchouts.length) {
        watchouts.innerHTML = '<div class="muted">No major watchouts detected from current assumptions.</div>';
      } else {
        watchouts.innerHTML = model.watchouts.map((item) => `
          <div class="overview-watchout overview-watchout--${item.tone}">
            <div class="overview-watchout-title">${item.title}</div>
            <div class="overview-watchout-text muted">${item.text}</div>
            <button class="btn" type="button" data-overview-nav="${item.view}">Open ${item.view}</button>
          </div>
        `).join('');
      }
    }

    if (earlyBridge) {
      const panel = model.earlyBridge;
      if (!panel) {
        earlyBridge.innerHTML = '<div class="muted">Set an early retirement age in Inputs to assess bridge feasibility to State Pension age.</div>';
      } else if (!panel.available) {
        earlyBridge.innerHTML = `<div class="overview-bridge-summary overview-bridge-summary--warn"><strong>Bridge unavailable</strong><div class="muted">${panel.error}</div></div>`;
      } else {
        const bridgeAmountLabel = panel.bridgeMode === 'gross' ? 'Gross withdrawal target' : 'Net spend target';
        const baseText = panel.baseHolds ? `Holds to age ${model.horizonText.split(' -> ')[1]}` : `Runs out at age ${panel.baseRunOutAge}`;
        const lifeText = panel.lifeEnabled
          ? (panel.lifeHolds ? `Holds to age ${model.horizonText.split(' -> ')[1]}` : `Runs out at age ${panel.lifeRunOutAge}`)
          : 'Not enabled';
        earlyBridge.innerHTML = `
          <div class="overview-bridge-summary overview-bridge-summary--${panel.baseStatus}">
            <div class="overview-bridge-row"><span>Bridge window</span><strong>Age ${panel.startAge} -> ${panel.endAge} (${panel.years} years)</strong></div>
            <div class="overview-bridge-row"><span>${bridgeAmountLabel}</span><strong>${fmtGBP(panel.bridgeAmount)}</strong></div>
            <div class="overview-bridge-row"><span>Pot at early retirement</span><strong>${fmtGBP(panel.potAtEarly)}</strong></div>
            <div class="overview-bridge-row"><span>Pot at State Pension age</span><strong>${fmtGBP(panel.potAtStateAge)}</strong></div>
            <div class="overview-bridge-row"><span>Net at State Pension age</span><strong>${fmtGBP(panel.netAtStateAge)}</strong></div>
            <div class="overview-bridge-row"><span>Guaranteed income at State Pension age</span><strong>${fmtGBP(panel.guaranteedAtStateAge)}</strong></div>
            <div class="overview-bridge-row"><span>Baseline bridge result</span><strong>${baseText}</strong></div>
            <div class="overview-bridge-row"><span>Lifestyle bridge result</span><strong>${lifeText}</strong></div>
          </div>
        `;
      }
    }

    if (changes) {
      if (!model.changes.available) {
        changes.innerHTML = `<div class="muted">${model.changes.summary}</div>`;
      } else {
        changes.innerHTML = `
          <div class="overview-changes-summary muted">${model.changes.summary}</div>
          <div class="overview-changes-grid">
            ${model.changes.items.map((item) => `
              <div class="overview-change-item">
                <span>${item.label}</span>
                <strong>${item.text || formatDelta(item.delta, fmtGBP)}</strong>
              </div>
            `).join('')}
          </div>
        `;
      }
    }

    if (nextSteps) {
      nextSteps.innerHTML = model.nextSteps.map((step) => `
        <button class="overview-next-step" type="button" data-overview-nav="${step.view}">
          <span class="overview-next-step-title">${step.title}</span>
          <span class="overview-next-step-text">${step.detail}</span>
        </button>
      `).join('');
    }
  } catch (error) {
    console.error('Overview dashboard render failed', error);
  }
}

export function renderRetirementLumpSumCard({ getEl, fmtGBP }, base) {
  const card = getEl('retirementLumpSumCard');
  const wrap = getEl('retirementLumpSumSummary');
  if (!card || !wrap) return;
  const total = Number(base.retirementLumpSumAtRet || 0);
  if (total <= 0) {
    card.style.display = 'none';
    wrap.innerHTML = '';
    return;
  }
  card.style.display = '';
  const items = [
    { label: 'PCLS at retirement', value: Number(base.pclsAtRet || 0) },
    { label: 'UFPLS at retirement', value: Number(base.ufplsAtRet || 0) },
    { label: 'Taxable lump sum at retirement', value: Number(base.taxableLumpAtRet || 0) },
    { label: 'Total one-off DC lump sums', value: total },
    { label: 'Remaining TFLS / LSA after retirement year', value: Number(base.remainingLsaAtRet || 0) },
  ].filter((item) => item.value > 0 || item.label.includes('Remaining TFLS'));
  wrap.innerHTML = items.map((item) => `<div class="k"><div class="label">${item.label}</div><div class="value">${fmtGBP(item.value)}</div></div>`).join('');
}
