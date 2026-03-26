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

function buildColumns(mode) {
  const RECURRING_TIP = 'Recurring total net income: your regular annual income (DC drawdown net of tax, State Pension, DB pensions, other income). Does not include one-off lump sums.';
  const TOTAL_CASH_TIP = 'Total cash received: recurring net income plus any one-off lump sums taken that year (PCLS, UFPLS, or ad-hoc withdrawals).';

  if (mode === 'compact') {
    return {
      groups: [
        { label: 'Milestones', span: 1 },
        { label: 'Year', span: 2 },
        { label: 'Cashflow', span: 5 },
        { label: 'Totals', span: 3 },
        { label: 'Events', span: 1 },
      ],
      columns: [
        { key: 'milestone', label: 'Milestones', className: 'projection-col-milestones' },
        { key: 'age', label: 'Age', className: 'projection-col-age' },
        { key: 'phaseLabel', label: 'Phase', className: 'projection-col-phase' },
        { key: 'grossWithdrawal', label: 'Gross DC withdrawal', numeric: true, emptyWhenNoCash: true },
        { key: 'dcNetIncome', label: 'Recurring DC net income', numeric: true, emptyWhenNoCash: true },
        { key: 'statePension', label: 'State Pension', numeric: true, emptyWhenNoCash: true },
        { key: 'dbIncome', label: 'DB income', numeric: true, emptyWhenNoCash: true },
        { key: 'lumpSumGross', label: 'One-off lump sums', numeric: true, emptyWhenNoCash: true },
        { key: 'recurringNetIncome', label: 'Recurring total net income', numeric: true, emptyWhenNoCash: true, emphasis: true, tooltip: RECURRING_TIP },
        { key: 'totalCashReceived', label: 'Total cash received', numeric: true, emptyWhenNoCash: true, emphasis: true, tooltip: TOTAL_CASH_TIP },
        { key: 'potEnd', label: 'Pot end-year', numeric: true },
        { key: 'events', label: 'Events & notes', className: 'projection-col-events' },
      ],
    };
  }

  return {
    groups: [
      { label: 'Milestones', span: 1 },
      { label: 'Year', span: 2 },
      { label: 'Working years', span: 2 },
      { label: 'Pot path', span: 3 },
      { label: 'Retirement cashflow', span: 5 },
      { label: 'Totals', span: 2 },
      { label: 'Events', span: 1 },
    ],
    columns: [
      { key: 'milestone', label: 'Milestones', className: 'projection-col-milestones' },
      { key: 'age', label: 'Age', className: 'projection-col-age' },
      { key: 'phaseLabel', label: 'Phase', className: 'projection-col-phase' },
      { key: 'salary', label: 'Salary', numeric: true, hideWhenRetired: true },
      { key: 'contrib', label: 'Contrib', numeric: true, hideWhenRetired: true },
      { key: 'potStart', label: 'Pot start-year', numeric: true },
      { key: 'potEnd', label: 'Pot end-year', numeric: true },
      { key: 'remainingLsa', label: 'Remaining TFLS / LSA', numeric: true, emptyWhenNoCash: true },
      { key: 'grossWithdrawal', label: 'Gross DC withdrawal', numeric: true, emptyWhenNoCash: true },
      { key: 'tax', label: 'Tax', numeric: true, emptyWhenNoCash: true },
      { key: 'dcNetIncome', label: 'Recurring DC net income', numeric: true, emptyWhenNoCash: true },
      { key: 'statePension', label: 'State Pension', numeric: true, emptyWhenNoCash: true },
      { key: 'dbIncome', label: 'DB income', numeric: true, emptyWhenNoCash: true },
      { key: 'recurringNetIncome', label: 'Recurring total net income', numeric: true, emptyWhenNoCash: true, emphasis: true, tooltip: RECURRING_TIP },
      { key: 'totalCashReceived', label: 'Total cash received', numeric: true, emptyWhenNoCash: true, emphasis: true, tooltip: TOTAL_CASH_TIP },
      { key: 'events', label: 'Events & notes', className: 'projection-col-events' },
    ],
  };
}

function renderEventsCell(row) {
  const badges = row.eventBadges.map((badge) => `<span class="projection-event-chip projection-event-chip--${badge.tone}">${badge.label}</span>`).join('');
  const notes = row.noteParts.map((part) => `<div class="projection-note-line">${part}</div>`).join('');
  const notesHtml = notes || '<div class="projection-note-line muted">No major events</div>';
  return `<div class="projection-events-cell">${badges ? `<div class="projection-event-chip-row">${badges}</div>` : ''}<div class="projection-note-list">${notesHtml}</div></div>`;
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

  getEl('btnProjectionCompact')?.classList.toggle('active', model.mode === 'compact');
  getEl('btnProjectionDetailed')?.classList.toggle('active', model.mode !== 'compact');
  model.rangeOptions.forEach((option) => getEl(`btnProjectionRange_${option.key}`)?.classList.toggle('active', model.range === option.key));

  // Person toggle — only visible in joint household mode
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

  if (legend) {
    legend.innerHTML = model.legendItems.map((item) => `<span class="projection-legend-chip projection-legend-chip--${item.tone}">${item.label}</span>`).join('');
  }

  if (help) help.textContent = model.helpText;
  if (count) {
    const personSuffix = model.householdMode === 'joint' ? ` • Showing: ${model.personLabel}` : '';
    count.textContent = `${model.rowCountText}${personSuffix}`;
  }

  const layout = buildColumns(model.mode);
  table.classList.toggle('projection-table--compact', model.mode === 'compact');
  table.innerHTML = `
    <thead>
      <tr class="projection-group-head">
        ${layout.groups.map((group) => `<th colspan="${group.span}">${group.label}</th>`).join('')}
      </tr>
      <tr>
        ${layout.columns.map((column) => `<th class="${column.numeric ? 'right' : ''} ${column.className || ''}">${column.label}${column.tooltip ? `<button class="projection-col-tip" type="button" tabindex="-1" aria-label="${column.tooltip}" title="${column.tooltip}">ℹ</button>` : ''}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${model.visibleRows.map((row) => {
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

        return `<tr class="${rowClasses}">
          ${layout.columns.map((column) => {
            if (column.key === 'milestone') {
              const marker = milestoneIcon(row);
              if (!marker) return '<td class="projection-milestone-cell"><span class="projection-milestone-empty">—</span></td>';
              return `<td class="projection-milestone-cell"><span class="projection-milestone-dot projection-milestone-dot--${marker.tone}" title="${marker.label}" aria-label="${marker.label}">${marker.icon}</span></td>`;
            }
            if (column.key === 'age') {
              return `<td class="projection-age-cell"><div class="projection-age-value">${row.age}</div><div class="projection-age-phase">${row.phaseLabel}</div></td>`;
            }
            if (column.key === 'phaseLabel') {
              return `<td class="projection-phase-cell"><span class="projection-phase-pill projection-phase-pill--${row.phase === 'retired' ? 'retired' : 'working'}">${row.phaseLabel}</span></td>`;
            }
            if (column.key === 'events') {
              return `<td class="projection-events-column">${renderEventsCell(row)}</td>`;
            }
            const shouldShow = column.hideWhenRetired ? row.phase !== 'retired' : !(column.emptyWhenNoCash && !row.hasCash);
            const cellClasses = [column.numeric ? 'right' : '', column.emphasis ? 'projection-emphasis-cell' : ''].filter(Boolean).join(' ');
            return `<td class="${cellClasses}">${renderAmount(fmtGBP, row[column.key], shouldShow)}</td>`;
          }).join('')}
        </tr>${renderDetailRow(fmtGBP, row, layout.columns.length, isExpanded)}`;
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
}
