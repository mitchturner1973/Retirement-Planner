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

function sparklinePath(values, width = 130, height = 38) {
  const series = Array.isArray(values) && values.length ? values.map((value) => Number(value || 0)) : [0, 0, 0];
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const pad = 2;
  const pts = series.map((value, index) => {
    const x = (index / Math.max(1, series.length - 1)) * width;
    const y = pad + (height - pad * 2) * (1 - (value - min) / range);
    return [x, y];
  });
  /* Monotone cubic Hermite (Fritsch-Carlson) for smooth curve */
  const n = pts.length;
  if (n < 2) return { line: `M0,${height / 2}`, area: `M0,${height} L0,${height / 2} L0,${height}` };
  const dx = [], slope = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0];
    slope[i] = dx[i] ? (pts[i + 1][1] - pts[i][1]) / dx[i] : 0;
  }
  const tan = new Array(n);
  tan[0] = slope[0];
  for (let i = 1; i < n - 1; i++) tan[i] = (slope[i - 1] * slope[i] <= 0) ? 0 : (slope[i - 1] + slope[i]) / 2;
  tan[n - 1] = slope[n - 2];
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(slope[i]) < 1e-10) { tan[i] = 0; tan[i + 1] = 0; continue; }
    const a = tan[i] / slope[i], b = tan[i + 1] / slope[i];
    if (a < 0) tan[i] = 0; if (b < 0) tan[i + 1] = 0;
    const mag = a * a + b * b;
    if (mag > 9) { const s = 3 / Math.sqrt(mag); tan[i] = s * a * slope[i]; tan[i + 1] = s * b * slope[i]; }
  }
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const seg = dx[i] / 3;
    d += ` C${(pts[i][0] + seg).toFixed(1)},${(pts[i][1] + tan[i] * seg).toFixed(1)} ` +
      `${(pts[i + 1][0] - seg).toFixed(1)},${(pts[i + 1][1] - tan[i + 1] * seg).toFixed(1)} ` +
      `${pts[i + 1][0].toFixed(1)},${pts[i + 1][1].toFixed(1)}`;
  }
  const area = `${d} L${pts[n - 1][0].toFixed(1)},${height} L${pts[0][0].toFixed(1)},${height} Z`;
  return { line: d, area };
}

export function renderOverviewDashboard({ getEl, fmtGBP }, model) {
  try {
    const headline = getEl('overviewHeadlineCards');
    const income = getEl('overviewIncomeBreakdown');
    const risksSection = getEl('overviewWatchouts');
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
      headline.innerHTML = model.headlineCards.map((card) => {
        const spark = sparklinePath(card.sparkline);
        return `
        <article class="overview-summary-card overview-summary-card--${card.tone}">
          <div class="overview-summary-label">${card.title}</div>
          <div class="overview-summary-value">${fmtGBP(card.value)}</div>
          <svg class="overview-sparkline" viewBox="0 0 130 38" preserveAspectRatio="none" aria-hidden="true">
            <path class="spark-area" d="${spark.area}" />
            <path class="spark-line" d="${spark.line}" />
          </svg>
          <div class="overview-summary-detail muted">${card.detail}</div>
        </article>
      `;
      }).join('');
    }

    if (income) {
      const comp = model.incomeComposition;
      const sources = comp.items.filter(i => !['tax', 'net', 'lump'].includes(i.key) && i.value > 0);
      const grossTotal = sources.reduce((sum, i) => sum + i.value, 0);
      const colors = { dc: '#f59e0b', state: '#22c55e', db: '#6366f1', other: '#60a5fa' };
      const guaranteedGross = sources
        .filter((item) => item.key === 'state' || item.key === 'db')
        .reduce((sum, item) => sum + item.value, 0);
      const guaranteedPct = grossTotal > 0 ? Math.round((guaranteedGross / grossTotal) * 100) : 0;
      const flexibleGross = Math.max(0, grossTotal - guaranteedGross);
      const flexiblePct = Math.max(0, 100 - guaranteedPct);

      const legend = sources.map(item => {
        const pct = grossTotal > 0 ? Math.round((item.value / grossTotal) * 100) : 0;
        const shortLabel = item.label.replace(/ \(gross\)/, '');
        return `<li class="income-legend-row">
          <span class="income-legend-dot" style="background:${colors[item.key] || '#94a3b8'}"></span>
          <div class="income-legend-text">
            <span class="income-legend-label">${shortLabel}</span>
            <span class="income-legend-value">${fmtGBP(item.value)} · ${pct}%</span>
          </div>
        </li>`;
      }).join('');

      const lumpNote = comp.oneOff > 0
        ? `<p class="income-hero-note">Includes ${fmtGBP(comp.oneOff)} in one-off lump sums.</p>`
        : '';

      income.innerHTML = `
        <article class="income-hero-card">
          <div class="income-hero-text">
            <p class="income-hero-eyebrow">RETIREMENT INCOME MIX</p>
            <h3>Where your income comes from</h3>
            <p class="muted">Mix of recurring income in today's money once you reach retirement.</p>
            <div class="income-hero-total">
              <span>Recurring net income</span>
              <strong>${fmtGBP(comp.recurringNet)}</strong>
            </div>
            <div class="income-pill-grid">
              <div class="income-pill">
                <span>Guaranteed sources</span>
                <strong>${fmtGBP(guaranteedGross)} · ${guaranteedPct}%</strong>
              </div>
              <div class="income-pill">
                <span>Flexible / DC drawdown</span>
                <strong>${fmtGBP(flexibleGross)} · ${flexiblePct}%</strong>
              </div>
            </div>
            ${lumpNote}
          </div>
          <div class="income-hero-visual">
            <div class="income-donut-chart">
              <svg viewBox="0 0 180 180" class="income-donut-svg">${donutSegments(sources, grossTotal)}</svg>
              <div class="income-donut-center">
                <div class="income-donut-total">${fmtCompact(grossTotal)}</div>
                <div class="income-donut-sub">Gross mix</div>
              </div>
            </div>
            <ul class="income-legend">${legend}</ul>
            <div class="income-donut-footer muted">Breakdown of recurring income sources at retirement.</div>
          </div>
        </article>`;
    }

    if (risksSection) {
      // Merge watchouts and topRiskDrivers, dedupe by key
      const risks = [...(model.watchouts || []), ...(model.topRiskDrivers || [])];
      const seen = new Set();
      const merged = risks.filter(r => {
        if (!r.key || seen.has(r.key)) return false;
        seen.add(r.key); return true;
      });
      const riskCards = merged.length === 0
        ? '<div class="muted">No major risks or watchouts detected from current assumptions.</div>'
        : merged.map(item => {
          const tone = item.tone || 'warn';
          const toneLabel = tone === 'bad' ? 'Critical' : tone === 'warn' ? 'Warning' : 'Info';
          const actionCopy = item.action || 'See recommended actions above or review this area in detail.';
          const riskCopy = item.risk || 'If ignored, this risk could impact your plan resilience.';
          const trigger = item.trigger ? `<div class="risk-watchout-trigger">${item.trigger}</div>` : '';
          const navButton = item.view
            ? `<button class="risk-open-link" type="button" data-overview-nav="${item.view}">Open ${item.view}</button>`
            : '';
          return `
            <article class="risk-watchout risk-watchout-${tone}">
              <div class="risk-watchout-top">
                <div class="risk-watchout-chips">
                  <span class="risk-badge risk-badge--${tone}">${toneLabel}</span>
                  ${item.category ? `<span class="risk-category">${item.category}</span>` : ''}
                </div>
                ${navButton}
              </div>
              <div class="risk-watchout-title">${item.title}</div>
              <div class="risk-watchout-detail">${item.text}</div>
              ${trigger}
              <ul class="risk-mini-grid">
                <li class="risk-mini-card">
                  <span class="risk-mini-label">Action</span>
                  <span class="risk-mini-text">${actionCopy}</span>
                </li>
                <li class="risk-mini-card">
                  <span class="risk-mini-label">If ignored</span>
                  <span class="risk-mini-text">${riskCopy}</span>
                </li>
              </ul>
            </article>
          `;
        }).join('');
      risksSection.innerHTML = `
        <div class="watchout-header">
          <div class="watchout-eyebrow">PLAN RISKS</div>
          <h4>Risks & Watchouts</h4>
          <p class="watchout-subtitle">Review these critical risks and watchouts. Addressing them can improve your plan’s resilience.</p>
        </div>
        ${riskCards}
      `;
    }

    if (planSummary) {
      const ps = model.planSummary;
      if (!ps || !ps.available) {
        planSummary.innerHTML = '<div class="muted">Run a projection to see the plan summary.</div>';
      } else {
        const sparkW = 280, sparkH = 50;
        const psSparkD = sparklinePath(ps.sparkline, sparkW, sparkH).line;
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
        const sparkD = sparklinePath(panel.sparkline, sparkW, sparkH).line;

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
