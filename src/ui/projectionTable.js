const drilldownHostId = 'projectionDrilldownHost';
let drilldownHost;

function renderAmount(fmtGBP, value, shouldShow = true) {
  return shouldShow ? fmtGBP(Number(value || 0)) : '—';
}

function milestoneIcon(row) {
  if (row.flags.hasMajorIncomeDrop) return { icon: '!', tone: 'bad', label: 'Income drop' };
  if (row.flags.isRetirementStart) return { icon: '↗', tone: 'milestone', label: 'Retirement starts' };
  if (row.flags.isStatePensionStart) return { icon: '◎', tone: 'income', label: 'State Pension starts' };
  if (row.flags.isDbStart) return { icon: '◉', tone: 'income', label: 'DB starts' };
  if (row.flags.hasLumpSum) return { icon: '◍', tone: 'cash', label: 'One-off cash' };
  return null;
}

function computeRowMetrics(row) {
  const toNumber = (value) => Number(value || 0);
  const start = toNumber(row.potStart);
  const end = toNumber(row.potEnd);
  const contrib = toNumber(row.contrib);
  const grossWithdrawal = toNumber(row.grossWithdrawal);
  const lumpSumGross = toNumber(row.lumpSumGross);
  const guaranteedIncome = toNumber(row.statePension) + toNumber(row.dbIncome) + toNumber(row.otherIncome);
  const recurringNet = Number(row.recurringNetIncome ?? row.totalCashReceived ?? 0);
  const drawdownNeed = Math.max(0, recurringNet - guaranteedIncome);
  const isRetirementPhase = row.phase === 'retired' || row.phase === 'bridge';
  const workingContrib = isRetirementPhase ? 0 : contrib;
  const growthAmount = end - start - workingContrib + grossWithdrawal + lumpSumGross;
  const growthBase = Math.max(1, start + workingContrib);
  const growthPct = growthBase ? growthAmount / growthBase : 0;

  return {
    start,
    end,
    incomeFlow: recurringNet,
    drawdownNeed,
    workingContrib,
    grossWithdrawal,
    lumpSumGross,
    growthAmount,
    growthPct,
  };
}

function buildColumns() {
  const INCOME_TIP = 'Recurring total net income: regular annual net income after tax, including drawdown and guaranteed sources.';
  const DRAWDOWN_TIP = 'Drawdown need: the part of recurring income that must come from the DC pot after deducting guaranteed income.';

  return [
    { key: 'milestone', label: 'Milestone', className: 'projection-col-milestones' },
    { key: 'phaseLabel', label: 'Phase', className: 'projection-col-phase' },
    { key: 'age', label: 'Age', className: 'projection-col-age' },
    { key: 'contrib', label: 'Work contrib', numeric: true },
    { key: 'potStart', label: 'Start balance', numeric: true },
    { key: 'incomeFlow', label: 'Income flow', numeric: true, tooltip: INCOME_TIP },
    { key: 'drawdownNeed', label: 'Drawdown need', numeric: true, tooltip: DRAWDOWN_TIP },
    { key: 'growth', label: 'Growth', numeric: true },
    { key: 'potEnd', label: 'End balance', numeric: true },
    { key: 'events', label: 'Events & notes', className: 'projection-col-events' },
  ];
}

function renderEventsCell(row) {
  const badges = row.eventBadges.map((badge) => `<span class="projection-event-chip projection-event-chip--${badge.tone}">${badge.label}</span>`).join('');
  const notes = row.noteParts.map((part) => `<div class="projection-note-line">${part}</div>`).join('');
  const notesHtml = notes || '<div class="projection-note-line muted">No major events</div>';
  return `<div class="projection-events-cell">${badges ? `<div class="projection-event-chip-row">${badges}</div>` : ''}<div class="projection-note-list">${notesHtml}</div></div>`;
}

function ensureProjectionDrilldownHost() {
  if (drilldownHost) {
    return drilldownHost;
  }

  let host = document.getElementById(drilldownHostId);
  if (!host) {
    host = document.createElement('div');
    host.id = drilldownHostId;
    host.className = 'projection-drilldown';
    host.innerHTML = `
      <div class="projection-drilldown-backdrop" data-drill-close></div>
      <div class="projection-drilldown-card">
        <button class="projection-drilldown-close" data-drill-close aria-label="Close">×</button>
        <div class="projection-drilldown-body"></div>
      </div>
    `;
    document.body.appendChild(host);
  }

  host.querySelectorAll('[data-drill-close]').forEach((el) => {
    el.addEventListener('click', () => {
      host.classList.remove('is-visible');
    });
  });

  drilldownHost = host;
  return host;
}

function renderIncomeDrilldown(row, metrics, fmtGBP) {
  const guaranteedSources = [
    { label: 'State Pension', value: Number(row.statePension || 0) },
    { label: 'DB pensions', value: Number(row.dbIncome || 0) },
    { label: 'Other income', value: Number(row.otherIncome || 0) },
  ].filter((source) => source.value > 0);
  const guaranteedTotal = guaranteedSources.reduce((sum, item) => sum + item.value, 0);
  const drawdownGap = Math.max(0, metrics.drawdownNeed);

  return `
    <header class="projection-drilldown-header">
      <p class="projection-drilldown-eyebrow">Recurring income</p>
      <h2>Age ${row.age}</h2>
      <div class="projection-drilldown-figure">${fmtGBP(metrics.incomeFlow)}</div>
    </header>
    <table class="projection-drilldown-table">
      <tbody>
        <tr>
          <td>Total recurring income</td>
          <td>${fmtGBP(metrics.incomeFlow)}</td>
        </tr>
        ${guaranteedSources.length ? guaranteedSources.map((source) => `
          <tr>
            <td>${source.label}</td>
            <td>${fmtGBP(source.value)}</td>
          </tr>
        `).join('') : '<tr><td>Guaranteed income</td><td>None</td></tr>'}
        <tr>
          <td>Needed from drawdown</td>
          <td>${fmtGBP(drawdownGap)}</td>
        </tr>
      </tbody>
    </table>
  `;
}

function renderDrawdownDrilldown(row, metrics, fmtGBP) {
  const rows = [
    { label: 'Net drawdown needed', value: metrics.drawdownNeed },
    { label: 'Gross DC withdrawal', value: metrics.grossWithdrawal },
    ...(metrics.lumpSumGross ? [{ label: 'One-off lump sums', value: metrics.lumpSumGross }] : []),
    { label: 'End balance after withdrawals', value: metrics.end },
  ];

  return `
    <header class="projection-drilldown-header">
      <p class="projection-drilldown-eyebrow">Drawdown flow</p>
      <h2>Age ${row.age}</h2>
      <div class="projection-drilldown-figure">${fmtGBP(metrics.drawdownNeed)}</div>
    </header>
    <table class="projection-drilldown-table">
      <tbody>
        ${rows.map((line) => `
          <tr>
            <td>${line.label}</td>
            <td>${fmtGBP(line.value || 0)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderGrowthDrilldown(row, metrics, fmtGBP) {
  const steps = [
    { label: 'Start of year balance', value: metrics.start },
    { label: '+ Contributions', value: metrics.workingContrib },
    { label: '− Withdrawals', value: metrics.grossWithdrawal },
    { label: '− Lump sums', value: metrics.lumpSumGross },
    { label: 'Investment growth', value: metrics.growthAmount },
  ];

  return `
    <header class="projection-drilldown-header">
      <p class="projection-drilldown-eyebrow">Growth contribution</p>
      <h2>Age ${row.age}</h2>
      <div class="projection-drilldown-figure">${fmtGBP(metrics.growthAmount)}</div>
    </header>
    <ul class="projection-drilldown-steps">
      ${steps.map((step) => `
        <li>
          <span>${step.label}</span>
          <strong>${fmtGBP(step.value || 0)}</strong>
        </li>
      `).join('')}
    </ul>
  `;
}

function renderEndingBalanceDrilldown(row, metrics, fmtGBP) {
  const lines = [
    { label: 'Start', value: metrics.start, sign: '' },
    { label: 'Contributions', value: metrics.workingContrib, sign: '+' },
    { label: 'Growth', value: metrics.growthAmount, sign: '+' },
    { label: 'Withdrawals', value: metrics.grossWithdrawal, sign: '−' },
    { label: 'Lump sums', value: metrics.lumpSumGross, sign: '−' },
  ];

  return `
    <header class="projection-drilldown-header">
      <p class="projection-drilldown-eyebrow">Ending balance</p>
      <h2>Age ${row.age}</h2>
      <div class="projection-drilldown-figure">${fmtGBP(metrics.end)}</div>
    </header>
    <table class="projection-drilldown-table">
      <tbody>
        ${lines.map((line) => `
          <tr>
            <td>${line.sign ? `${line.sign} ` : ''}${line.label}</td>
            <td>${fmtGBP(line.value || 0)}</td>
          </tr>
        `).join('')}
        <tr>
          <td>= End of year</td>
          <td>${fmtGBP(metrics.end)}</td>
        </tr>
      </tbody>
    </table>
  `;
}

function openProjectionDrilldown(type, row, metrics, fmtGBP) {
  const host = ensureProjectionDrilldownHost();
  if (!host) {
    return;
  }

  const body = host.querySelector('.projection-drilldown-body');
  if (type === 'drawdown') {
    body.innerHTML = renderDrawdownDrilldown(row, metrics, fmtGBP);
  } else if (type === 'growth') {
    body.innerHTML = renderGrowthDrilldown(row, metrics, fmtGBP);
  } else if (type === 'ending') {
    body.innerHTML = renderEndingBalanceDrilldown(row, metrics, fmtGBP);
  } else {
    body.innerHTML = renderIncomeDrilldown(row, metrics, fmtGBP);
  }

  host.classList.add('is-visible');
}

function renderDetailValue(fmtGBP, item) {
  if (typeof item.value === 'number') return fmtGBP(item.value);
  return item.text || '—';
}

function renderDetailRow(fmtGBP, row, colSpan, isExpanded) {
  if (!isExpanded) return '';
  return `
    <tr class="projection-row-detail-shell">
      <td colspan="${colSpan}">
        <div class="projection-row-detail-card">
          <div class="projection-row-detail-grid">
            ${row.detailItems.map((item) => `<div class="projection-row-detail-item"><span class="projection-row-detail-label">${item.label}</span><strong>${renderDetailValue(fmtGBP, item)}</strong></div>`).join('')}
          </div>
        </div>
      </td>
    </tr>
  `;
}

export function renderProjectionTable({ getEl, fmtGBP, app, rerender }, model) {
  const table = getEl('tblProjection');
  const summary = getEl('projectionSummaryCards');
  const legend = getEl('projectionLegend');
  const help = getEl('projectionHelpText');
  const count = getEl('projectionRowCount');
  if (!table) return;

  model.rangeOptions.forEach((option) => getEl(`btnProjectionRange_${option.key}`)?.classList.toggle('active', model.range === option.key));

  const personGroup = getEl('projectionPersonToggle');
  if (personGroup) {
    personGroup.hidden = model.householdMode !== 'joint';
    getEl('btnProjectionPerson_primary')?.classList.toggle('active', model.personView !== 'partner');
    const partnerBtn = getEl('btnProjectionPerson_partner');
    if (partnerBtn) {
      partnerBtn.classList.toggle('active', model.personView === 'partner');
      partnerBtn.textContent = model.partnerLabel;
    }
  }

  if (summary) {
    summary.innerHTML = model.summaryCards.map((card) => `
      <article class="projection-summary-card">
        <div class="projection-summary-label">${card.title}</div>
        <div class="projection-summary-age">Age ${card.age}</div>
        <div class="projection-summary-kpis">
          <div><span class="projection-summary-kpi-label">Recurring net</span><strong>${fmtGBP(card.recurringNetIncome)}</strong></div>
          <div><span class="projection-summary-kpi-label">Total cash</span><strong>${fmtGBP(card.totalCashReceived)}</strong></div>
          <div><span class="projection-summary-kpi-label">Pot end-year</span><strong>${fmtGBP(card.potEnd)}</strong></div>
        </div>
        <div class="projection-summary-highlight muted">${card.highlight || ''}</div>
      </article>
    `).join('');
  }

  if (legend) legend.innerHTML = '';
  if (help) help.textContent = '';
  if (count) {
    const personSuffix = model.householdMode === 'joint' ? ` • Showing: ${model.personLabel}` : '';
    count.textContent = `${model.rowCountText}${personSuffix}`;
  }

  const columns = buildColumns();
  const metricsByAge = new Map();
  const rowLookup = new Map();
  model.visibleRows.forEach((row) => {
    const key = String(row.age);
    metricsByAge.set(key, computeRowMetrics(row));
    rowLookup.set(key, row);
  });

  table.innerHTML = `
    <thead>
      <tr>
        ${columns.map((column) => `<th class="${column.numeric ? 'right' : ''} ${column.className || ''}">${column.label}${column.tooltip ? `<button class="projection-col-tip" type="button" tabindex="-1" aria-label="${column.tooltip}" title="${column.tooltip}">ℹ</button>` : ''}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${model.visibleRows.map((row) => {
        const metrics = metricsByAge.get(String(row.age));
        const rowClasses = [
          'projection-row',
          `projection-row--${row.rowTone}`,
          row.flags.isRetirementStart ? 'is-retirement-start' : '',
          row.flags.isStatePensionStart ? 'is-state-pension-start' : '',
          row.flags.isDbStart ? 'is-db-start' : '',
          row.flags.hasLumpSum ? 'has-lump-sum' : '',
          row.flags.hasMajorIncomeDrop ? 'has-income-drop' : '',
        ].filter(Boolean).join(' ');
        const isExpanded = app?.projectionExpandedAge === row.age;
        const isRetirementPhase = row.phase === 'retired' || row.phase === 'bridge';

        return `<tr class="${rowClasses}">
          ${columns.map((column) => {
            if (column.key === 'milestone') {
              const marker = milestoneIcon(row);
              if (!marker) return '<td class="projection-milestone-cell"><span class="projection-milestone-empty">—</span></td>';
              return `<td class="projection-milestone-cell"><span class="projection-milestone-dot projection-milestone-dot--${marker.tone}" title="${marker.label}" aria-label="${marker.label}">${marker.icon}</span></td>`;
            }
            if (column.key === 'phaseLabel') {
              return `<td class="projection-phase-cell"><span class="projection-phase-pill projection-phase-pill--${isRetirementPhase ? 'retired' : 'working'}">${row.phaseLabel}</span></td>`;
            }
            if (column.key === 'age') {
              const phaseText = isRetirementPhase ? 'in retirement' : 'working year';
              return `<td class="projection-age-cell"><div class="projection-age-value">${row.age}</div><div class="projection-age-sub">${phaseText}</div></td>`;
            }
            if (column.key === 'events') {
              return `<td class="projection-events-column">${renderEventsCell(row)}</td>`;
            }
            if (column.key === 'incomeFlow') {
              const value = metrics?.incomeFlow || 0;
              if (!value) {
                return '<td class="projection-drill-cell right">—</td>';
              }
              return `<td class="projection-drill-cell right"><button class="projection-drill-button" data-projection-drill data-drill-type="income" data-drill-age="${row.age}">${fmtGBP(value)}</button></td>`;
            }
            if (column.key === 'drawdownNeed') {
              const value = metrics?.drawdownNeed || 0;
              if (!value) {
                return '<td class="projection-drill-cell right">—</td>';
              }
              return `<td class="projection-drill-cell right"><button class="projection-drill-button" data-projection-drill data-drill-type="drawdown" data-drill-age="${row.age}">${fmtGBP(value)}</button></td>`;
            }
            if (column.key === 'contrib') {
              const value = metrics?.workingContrib || 0;
              return `<td class="right">${value ? fmtGBP(value) : '—'}</td>`;
            }
            if (column.key === 'growth') {
              const growthValue = metrics?.growthAmount || 0;
              const pctValue = metrics?.growthPct || 0;
              const pct = Number.isFinite(pctValue) ? `${(pctValue * 100).toFixed(1)}%` : '—';
              const tone = growthValue >= 0 ? 'positive' : 'negative';
              return `<td class="projection-growth-cell right">
                <button class="projection-drill-button projection-growth-button" data-projection-drill data-drill-type="growth" data-drill-age="${row.age}">
                  <span>${fmtGBP(growthValue)}</span>
                  <span class="projection-growth-pct projection-growth-pct--${tone}">${pct}</span>
                </button>
              </td>`;
            }
            if (column.key === 'potStart') {
              return `<td class="right">${fmtGBP(metrics?.start ?? row.potStart)}</td>`;
            }
            if (column.key === 'potEnd') {
              return `<td class="projection-end-cell right"><button class="projection-drill-button" data-projection-drill data-drill-type="ending" data-drill-age="${row.age}">${fmtGBP(metrics?.end ?? row.potEnd)}</button></td>`;
            }
            return `<td class="right">${renderAmount(fmtGBP, row[column.key])}</td>`;
          }).join('')}
        </tr>${renderDetailRow(fmtGBP, row, columns.length, isExpanded)}`;
      }).join('')}
    </tbody>
  `;

  table.querySelectorAll('[data-projection-toggle-age]').forEach((button) => {
    const age = Number(button.getAttribute('data-projection-toggle-age'));
    const isExpanded = app?.projectionExpandedAge === age;
    button.textContent = isExpanded ? 'Hide detail' : 'More detail';
    button.addEventListener('click', () => {
      if (!app) return;
      app.projectionExpandedAge = isExpanded ? null : age;
      rerender?.();
    });
  });

  table.querySelectorAll('[data-projection-drill]').forEach((button) => {
    button.addEventListener('click', (event) => {
      const target = event.currentTarget;
      const age = target.getAttribute('data-drill-age');
      const type = target.getAttribute('data-drill-type');
      const row = rowLookup.get(age);
      const metrics = metricsByAge.get(age);
      if (row && metrics) {
        openProjectionDrilldown(type, row, metrics, fmtGBP);
      }
    });
  });
}
