/* ──────────────────────────────────────────────
   strategyTaxOptimisation.js — Premium 2026 renderer
   ────────────────────────────────────────────── */
const esc = (s) => String(s ?? '').replace(/</g, '&lt;');

/* ── 1. Hero gauge ── */
function renderSummary(getEl, fmtGBP, cards) {
  const el = getEl('strategyTaxSummary');
  if (!el) return;
  if (!cards || cards.length === 0) {
    el.innerHTML = '<div class="card strategy-detail-placeholder">Recalculate to populate tax optimisation insights.</div>';
    return;
  }
  const strategy = cards.find((c) => c.title.includes('strategy'));
  const score    = cards.find((c) => c.title.includes('efficiency'));
  const rest     = cards.filter((c) => c !== strategy && c !== score);

  const scoreNum = parseInt(score?.value, 10) || 0;
  const tone = scoreNum >= 80 ? 'good' : scoreNum >= 60 ? 'warn' : 'bad';
  const r = 56; // radius
  const circ = 2 * Math.PI * r;
  const dashOff = circ * (1 - scoreNum / 100);

  el.innerHTML = `
    <div class="tax-hero">
      <div class="tax-hero-gauge">
        <svg viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="${r}" class="tax-hero-gauge-track" />
          <circle cx="70" cy="70" r="${r}" class="tax-hero-gauge-fill tax-hero-gauge-fill--${tone}"
            stroke-dasharray="${circ}" stroke-dashoffset="${dashOff}" />
        </svg>
        <div class="tax-hero-score">
          <span class="tax-hero-score-value">${scoreNum}</span>
          <span class="tax-hero-score-label">of 100</span>
        </div>
      </div>
      <div class="tax-hero-metrics">
        <div>
          <p class="tax-hero-strategy">${esc(strategy?.value || 'No strategy selected')}</p>
          <p class="tax-hero-strategy-sub">${esc(strategy?.detail || '')}</p>
        </div>
        <div class="tax-hero-pills">
          ${rest.map((c) => `
            <span class="tax-hero-pill tax-hero-pill--${c.tone || 'info'}">
              <span class="tax-hero-pill-dot"></span>
              ${esc(c.value)}
            </span>
          `).join('')}
        </div>
      </div>
    </div>`;
}

/* ── 2. Waterfall (withdrawal order) ── */
function renderOrder(getEl, fmtGBP, order) {
  const el = getEl('strategyTaxOrder');
  if (!el) return;
  if (!order || order.length === 0) {
    el.innerHTML = '<div class="strategy-detail-placeholder">No withdrawal order available yet.</div>';
    return;
  }
  el.innerHTML = `
    <div class="strategy-detail-card-head">
      <div>
        <p class="strategy-detail-eyebrow">Withdrawal waterfall</p>
        <h4>Recommended stacking sequence</h4>
      </div>
    </div>
    <ol class="tax-waterfall">
      ${order.map((item, idx) => `
        <li class="tax-waterfall-row tax-waterfall-row--${item.tone || 'info'}">
          <div class="tax-waterfall-idx">${idx + 1}</div>
          <div class="tax-waterfall-body">
            <h5>${esc(item.label)}</h5>
            <p class="tax-waterfall-source">${esc(item.source)}</p>
            <p class="tax-waterfall-reason">${esc(item.reason)}</p>
          </div>
          <div class="tax-waterfall-tags">
            <span class="tax-waterfall-tag">${esc(item.taxTreatment).slice(0, 50)}${item.taxTreatment.length > 50 ? '…' : ''}</span>
            <span class="tax-waterfall-tag">${esc(item.flexibility)}</span>
          </div>
        </li>
      `).join('')}
    </ol>`;
}

/* ── 3. Alert-style findings ── */
function renderFindings(getEl, findings) {
  const el = getEl('strategyTaxFindings');
  if (!el) return;
  if (!findings || findings.length === 0) {
    el.innerHTML = '<div class="strategy-detail-placeholder">No plan-specific findings yet.</div>';
    return;
  }
  const icons = { info: 'ℹ️', warn: '⚠️', good: '✅' };
  el.innerHTML = `
    <div class="strategy-detail-card-head">
      <div>
        <p class="strategy-detail-eyebrow">Plan-specific findings</p>
        <h4>What stands out</h4>
      </div>
    </div>
    <ul class="tax-findings">
      ${findings.map((f) => {
        const tone = typeof f === 'object' ? (f.tone || 'info') : 'info';
        const text = typeof f === 'object' ? f.text : f;
        const icon = icons[tone] || icons.info;
        return `
          <li class="tax-finding tax-finding--${tone}">
            <div class="tax-finding-icon">${icon}</div>
            <p>${esc(text)}</p>
          </li>`;
      }).join('')}
    </ul>`;
}

/* ── 4. Spotlight comparisons ── */
let _spotlightCards = [];
let _spotlightDeps = null;

function renderSpotlightHero(el, card) {
  if (!el || !card) return;
  const heroEl = el.querySelector('.tax-spotlight-hero') || el;
  const target = el.querySelector('.tax-spotlight-hero') ? heroEl : el;

  const heroHTML = `
    <div class="tax-spotlight-hero tax-spotlight-hero--${card.tone}">
      <div class="tax-spotlight-head">
        <span class="tax-spotlight-badge tax-spotlight-badge--${card.tone}">${esc(card.status?.replace(/-/g, ' ') || card.tone)}</span>
        <h5>${esc(card.title)}</h5>
      </div>
      <p class="tax-spotlight-desc">${esc(card.description)}</p>
      <div class="tax-spotlight-cols">
        <div class="tax-spotlight-col">
          <p class="tax-spotlight-col-title">Advantages</p>
          <ul>${(card.pros || []).map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
        </div>
        <div class="tax-spotlight-col">
          <p class="tax-spotlight-col-title">Risks</p>
          <ul>${(card.risks || []).map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
        </div>
      </div>
      <div class="tax-spotlight-meta">
        <span><strong>Tax impact:</strong> ${esc(card.taxImpact)}</span>
        <span><strong>Flexibility:</strong> ${esc(card.flexibility)}</span>
        <span><strong>MPAA:</strong> ${esc(card.mpaa)}</span>
      </div>
    </div>`;

  if (el.querySelector('.tax-spotlight-hero')) {
    el.querySelector('.tax-spotlight-hero').outerHTML = heroHTML;
  } else {
    // first render — insert before chips
    const chipsEl = el.querySelector('.tax-spotlight-chips');
    if (chipsEl) chipsEl.insertAdjacentHTML('beforebegin', heroHTML);
  }
}

function renderComparisonCards(getEl, fmtGBP, cards) {
  const el = getEl('strategyTaxComparisons');
  if (!el) return;
  if (!cards || cards.length === 0) {
    el.innerHTML = '<div class="strategy-detail-placeholder">No comparison cards to show yet.</div>';
    return;
  }

  _spotlightCards = cards;
  _spotlightDeps = { getEl };

  // Sort: best-fit first
  const sorted = [...cards].sort((a, b) => {
    const rank = { good: 0, info: 1, warn: 2, bad: 3 };
    return (rank[a.tone] ?? 1) - (rank[b.tone] ?? 1);
  });
  const active = sorted[0];

  el.innerHTML = `
    <div class="strategy-detail-card-head">
      <div>
        <p class="strategy-detail-eyebrow">Strategy comparison</p>
        <h4>Tax-focused approaches</h4>
      </div>
    </div>
    <div class="tax-spotlight">
      <div class="tax-spotlight-hero tax-spotlight-hero--${active.tone}">
        <div class="tax-spotlight-head">
          <span class="tax-spotlight-badge tax-spotlight-badge--${active.tone}">${esc(active.status?.replace(/-/g, ' ') || active.tone)}</span>
          <h5>${esc(active.title)}</h5>
        </div>
        <p class="tax-spotlight-desc">${esc(active.description)}</p>
        <div class="tax-spotlight-cols">
          <div class="tax-spotlight-col">
            <p class="tax-spotlight-col-title">Advantages</p>
            <ul>${active.pros.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
          </div>
          <div class="tax-spotlight-col">
            <p class="tax-spotlight-col-title">Risks</p>
            <ul>${active.risks.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
          </div>
        </div>
        <div class="tax-spotlight-meta">
          <span><strong>Tax impact:</strong> ${esc(active.taxImpact)}</span>
          <span><strong>Flexibility:</strong> ${esc(active.flexibility)}</span>
          <span><strong>MPAA:</strong> ${esc(active.mpaa)}</span>
        </div>
      </div>
      <div class="tax-spotlight-chips" role="tablist">
        ${sorted.map((c, i) => `
          <button type="button" class="tax-spotlight-chip${i === 0 ? ' active' : ''}" data-spotlight-idx="${i}">${esc(c.title)}</button>
        `).join('')}
      </div>
    </div>`;

  // Wire chip clicks
  el.querySelectorAll('.tax-spotlight-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.spotlightIdx);
      const card = sorted[idx];
      if (!card) return;
      el.querySelectorAll('.tax-spotlight-chip').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderSpotlightHero(el.querySelector('.tax-spotlight'), card);
    });
  });
}

/* ── 5. PCLS vs UFPLS explainer ── */
function renderExplainer(getEl, explainer) {
  const el = getEl('strategyTaxExplainer');
  if (!el) return;
  if (!explainer) {
    el.innerHTML = '<div class="strategy-detail-placeholder">Select a strategy to compare PCLS and UFPLS.</div>';
    return;
  }
  el.innerHTML = `
    <div class="strategy-detail-card-head">
      <div>
        <p class="strategy-detail-eyebrow">PCLS vs UFPLS</p>
        <h4>Understand the difference</h4>
      </div>
    </div>
    <div class="tax-explainer-cols">
      <div class="tax-explainer-col">
        <span class="tax-explainer-col-badge">${esc(explainer.pcls.title)}</span>
        <ul>${explainer.pcls.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
      </div>
      <div class="tax-explainer-col">
        <span class="tax-explainer-col-badge">${esc(explainer.ufpls.title)}</span>
        <ul>${explainer.ufpls.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
      </div>
    </div>
    <div class="tax-explainer-callout">
      <strong>${esc(explainer.highlight)}</strong>
      <p>${esc(explainer.mpaaNote)}</p>
    </div>`;
}

/* ── 6. Premium tax band bar ── */
function renderTaxBands(getEl, fmtGBP, usage) {
  const el = getEl('strategyTaxBands');
  if (!el) return;
  if (!usage) {
    el.innerHTML = '<div class="strategy-detail-placeholder">No tax band data yet.</div>';
    return;
  }

  const segments = [
    { label: 'Personal allowance', value: usage.allowanceFill, cls: 'allowance' },
    { label: 'Basic-rate band', value: usage.basicFill, cls: 'basic' },
    { label: 'Higher-rate', value: usage.higherFill, cls: 'higher' },
  ];
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;

  const annotation = usage.higherFill > 0
    ? `<strong>Higher-rate exposure detected.</strong> Guaranteed income fills the allowance; DC drawdown pushes ${fmtGBP(Math.round(usage.higherFill))} into the higher-rate band.`
    : `<strong>All within basic-rate.</strong> Guaranteed income of ${fmtGBP(Math.round(usage.guaranteedIncome || 0))} plus DC drawdown stays below the higher-rate threshold.`;

  el.innerHTML = `
    <div class="strategy-detail-card-head">
      <div>
        <p class="strategy-detail-eyebrow">Tax band usage</p>
        <h4>Retirement income layering</h4>
      </div>
    </div>
    <div class="tax-band-viz">
      <div class="tax-band-bar">
        ${segments.map((seg) => {
          const pct = Math.max(5, Math.round((seg.value / total) * 100));
          return `<div class="tax-band-seg tax-band-seg--${seg.cls}" style="flex:${pct}">
            <span class="tax-band-seg-label">${seg.label}</span>
            <span class="tax-band-seg-value">${fmtGBP(Math.round(seg.value))}</span>
          </div>`;
        }).join('')}
      </div>
      <div class="tax-band-markers">
        <div class="tax-band-marker"><div class="tax-band-marker-line"></div>£0</div>
        <div class="tax-band-marker"><div class="tax-band-marker-line"></div>PA: ${fmtGBP(usage.personalAllowance || 0)}</div>
        <div class="tax-band-marker"><div class="tax-band-marker-line"></div>HR: ${fmtGBP(usage.personalAllowance + usage.basicBandLimit || 0)}</div>
      </div>
      <div class="tax-band-breakdown">
        <div class="tax-band-stat">
          <p class="tax-band-stat-label">Guaranteed income</p>
          <div class="tax-band-stat-value">${fmtGBP(Math.round(usage.guaranteedIncome || 0))}</div>
        </div>
        <div class="tax-band-stat">
          <p class="tax-band-stat-label">Taxable DC drawdown</p>
          <div class="tax-band-stat-value">${fmtGBP(Math.round(usage.dcTaxable || 0))}</div>
        </div>
        <div class="tax-band-stat">
          <p class="tax-band-stat-label">Tax-free cash year 1</p>
          <div class="tax-band-stat-value">${fmtGBP(Math.round(usage.taxFreeCashAtRet || 0))}</div>
        </div>
      </div>
      <div class="tax-band-annotation">${annotation}</div>
    </div>`;
}

/* ── 7. Action checklist ── */
function renderActions(getEl, actions) {
  const el = getEl('strategyTaxActions');
  if (!el) return;
  if (!actions || actions.length === 0) {
    el.innerHTML = '<div class="strategy-detail-placeholder">No recommended actions yet.</div>';
    return;
  }
  const priorityLabel = { bad: 'Urgent', warn: 'Important', good: 'Positive', info: 'Review' };
  el.innerHTML = `
    <div class="strategy-detail-card-head">
      <div>
        <p class="strategy-detail-eyebrow">Recommended actions</p>
        <h4>Your tax-efficiency checklist</h4>
      </div>
    </div>
    <ul class="tax-actions">
      ${actions.map((a) => {
        const tone = a.tone || 'info';
        return `
          <li class="tax-action">
            <div class="tax-action-accent tax-action-accent--${tone}"></div>
            <span class="tax-action-priority tax-action-priority--${tone}">${priorityLabel[tone] || 'Review'}</span>
            <div class="tax-action-body">
              <h5>${esc(a.title)}</h5>
              <p>${esc(a.detail)}</p>
            </div>
          </li>`;
      }).join('')}
    </ul>`;
}

/* ── Export ── */
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
