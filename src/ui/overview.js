function formatDelta(value, fmtGBP) {
  const amount = Number(value || 0);
  if (!amount) return 'No change';
  const sign = amount > 0 ? '+' : '-';
  return `${sign}${fmtGBP(Math.abs(amount))}`;
}

function fmtCompact(v) {
  const abs = Math.abs(v);
  if (abs >= 1e6) return `£${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `£${Math.round(v / 1e3)}K`;
  return `£${Math.round(v)}`;
}

function donutSegments(sources, total) {
  const cx = 90, cy = 90, r = 65, sw = 24;
  const C = 2 * Math.PI * r;
  if (!sources.length || total <= 0) {
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="${sw}" />`;
  }
  const colors = { dc: '#f59e0b', state: '#22c55e', db: '#6366f1', other: '#60a5fa' };
  let offset = 0;
  return sources.map(item => {
    const pct = item.value / total;
    const dash = pct * C;
    const gap = sources.length > 1 ? 3 : 0;
    const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
      stroke="${colors[item.key] || '#94a3b8'}" stroke-width="${sw}"
      stroke-dasharray="${Math.max(0, dash - gap)} ${C - Math.max(0, dash - gap)}"
      stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" />`;
    offset += dash;
    return seg;
  }).join('');
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
    const riskDrivers = getEl('overviewRiskDrivers');
    const planSummary = getEl('overviewPlanSummary');
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
      const comp = model.incomeComposition;
      const sources = comp.items.filter(i => !['tax', 'net', 'lump'].includes(i.key) && i.value > 0);
      const grossTotal = sources.reduce((sum, i) => sum + i.value, 0);
      const colors = { dc: '#f59e0b', state: '#22c55e', db: '#6366f1', other: '#60a5fa' };

      const legend = sources.map(item => {
        const pct = grossTotal > 0 ? Math.round((item.value / grossTotal) * 100) : 0;
        const shortLabel = item.label.replace(/ \(gross\)/, '');
        return `<span class="income-donut-legend-item">
          <span class="income-donut-dot" style="background:${colors[item.key] || '#94a3b8'}"></span>
          ${shortLabel}&ensp;${pct}%
        </span>`;
      }).join('');

      const lumpNote = comp.oneOff > 0
        ? `<div class="income-donut-extra">Plus ${fmtGBP(comp.oneOff)} in one-off lump sums</div>`
        : '';

      income.innerHTML = `
        <div class="income-donut-wrap">
          <div class="income-donut-chart">
            <svg viewBox="0 0 180 180" class="income-donut-svg">${donutSegments(sources, grossTotal)}</svg>
            <div class="income-donut-center">
              <div class="income-donut-total">${fmtCompact(comp.recurringNet)}</div>
              <div class="income-donut-sub">Net of tax</div>
            </div>
          </div>
          <div class="income-donut-legend">${legend}</div>
          <div class="income-donut-footer muted">Recurring annual income at retirement.</div>
          ${lumpNote}
        </div>`;
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

    if (riskDrivers) {
      if (!model.topRiskDrivers || model.topRiskDrivers.length === 0) {
        riskDrivers.innerHTML = '<div class="muted">No major risk drivers identified yet. Run Stress and Monte to populate this panel.</div>';
      } else {
        riskDrivers.innerHTML = model.topRiskDrivers.map((item) => `
          <div class="overview-watchout overview-watchout--${item.tone}">
            <div class="overview-watchout-title">${item.title}</div>
            <div class="overview-watchout-text muted">${item.text}</div>
            <button class="btn" type="button" data-overview-nav="${item.view}">Open ${item.view}</button>
          </div>
        `).join('');
      }
    }

    if (planSummary) {
      const ps = model.planSummary;
      if (!ps || !ps.available) {
        planSummary.innerHTML = '<div class="muted">Run a projection to see the plan summary.</div>';
      } else {
        const sparkW = 280, sparkH = 50;
        const psSparkD = sparklinePath(ps.sparkline, sparkW, sparkH);
        planSummary.innerHTML = `
          <div class="proof-card proof-card--${ps.overallStatus}">
            <div class="proof-header">
              <span class="proof-title">Retirement Plan</span>
              <span class="proof-badge proof-badge--${ps.overallStatus}">${ps.badgeLabel}</span>
            </div>
            <p class="proof-narrative">${ps.narrative}</p>

            <div class="proof-kpis">
              <div class="proof-kpi">
                <div class="proof-kpi-label">POT AT RETIREMENT (AGE ${ps.retireAge})</div>
                <div class="proof-kpi-value">${fmtGBP(ps.potAtRet)}</div>
              </div>
              <div class="proof-kpi">
                <div class="proof-kpi-label">NET INCOME</div>
                <div class="proof-kpi-value">${fmtGBP(ps.netAtRet)}</div>
              </div>
              <div class="proof-kpi">
                <div class="proof-kpi-label">PLAN STATUS</div>
                <div class="proof-kpi-value">${ps.statusLabel}</div>
              </div>
              <div class="proof-kpi">
                <div class="proof-kpi-label">POT RUN-OUT</div>
                <div class="proof-kpi-value">${ps.depletionLabel}</div>
              </div>
            </div>

            <div class="proof-spark-wrap">
              <svg class="proof-spark" viewBox="0 0 ${sparkW} ${sparkH}" preserveAspectRatio="none" aria-hidden="true">
                <path d="${psSparkD}" />
              </svg>
            </div>

            <div class="proof-guidance">
              <strong>How to read this:</strong> This card shows the overall health of your retirement plan from age ${ps.currentAge} to ${ps.endAge}. Guaranteed income (State Pension + DB) covers ${ps.guaranteedPct}% of retirement income — higher is more resilient.
            </div>

            <p class="proof-detail muted">The sparkline shows your total pot trajectory. A line that rises during working years and falls gently in retirement is typical. A steep late decline or early run-out warrants attention.</p>

            <div class="proof-timeline">
              <div class="proof-timeline-header">
                <span class="proof-timeline-title">TIMELINE MARKERS</span>
                <span class="proof-timeline-range">AGE ${ps.currentAge} TO ${ps.endAge}</span>
              </div>
              <div class="proof-timeline-pills">
                ${ps.markers.map(m => `<span class="proof-pill proof-pill--${m.label === 'TODAY' ? 'now' : 'milestone'}"><strong>${m.label}</strong> · Age ${m.age}  ${m.pct}% through plan</span>`).join('')}
              </div>
            </div>
          </div>
        `;
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
        const sparkW = 280, sparkH = 50;
        const sparkD = sparklinePath(panel.sparkline, sparkW, sparkH);

        earlyBridge.innerHTML = `
          <div class="proof-card proof-card--${panel.baseStatus}">
            <div class="proof-header">
              <span class="proof-title">Bridge Feasibility</span>
              <span class="proof-badge proof-badge--${panel.baseStatus}">${panel.badgeLabel}</span>
            </div>
            <p class="proof-narrative">${panel.narrative}</p>

            <div class="proof-kpis">
              <div class="proof-kpi">
                <div class="proof-kpi-label">POT AT EARLY RETIREMENT</div>
                <div class="proof-kpi-value">${fmtGBP(panel.potAtEarly)}</div>
              </div>
              <div class="proof-kpi">
                <div class="proof-kpi-label">POT AT STATE PENSION</div>
                <div class="proof-kpi-value">${fmtGBP(panel.potAtStateAge)}</div>
              </div>
              <div class="proof-kpi">
                <div class="proof-kpi-label">BRIDGE STATUS</div>
                <div class="proof-kpi-value">${panel.statusLabel}</div>
              </div>
              <div class="proof-kpi">
                <div class="proof-kpi-label">DEPLETION AGE</div>
                <div class="proof-kpi-value">${panel.depletionLabel}</div>
              </div>
            </div>

            <div class="proof-spark-wrap">
              <svg class="proof-spark" viewBox="0 0 ${sparkW} ${sparkH}" preserveAspectRatio="none" aria-hidden="true">
                <path d="${sparkD}" />
              </svg>
            </div>

            <div class="proof-guidance">
              <strong>How to read this:</strong> This shows whether your pension pot can sustain withdrawals from early retirement (age ${panel.startAge}) until State Pension begins (age ${panel.endAge}). A falling line that stays above zero means the bridge holds.
            </div>

            <p class="proof-detail muted">The sparkline tracks your pot value during the bridge window. A gentle decline is normal — you are drawing down without State Pension support. A steep drop or line hitting zero means the pot may not last.</p>

            <div class="proof-timeline">
              <div class="proof-timeline-header">
                <span class="proof-timeline-title">TIMELINE MARKERS</span>
                <span class="proof-timeline-range">AGE ${panel.currentAge} TO ${panel.planEndAge}</span>
              </div>
              <div class="proof-timeline-pills">
                ${panel.markers.map(m => `<span class="proof-pill proof-pill--${m.label === 'TODAY' ? 'now' : 'milestone'}"><strong>${m.label}</strong> · Age ${m.age}  ${m.pct}% through plan</span>`).join('')}
              </div>
            </div>
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
