export function renderProjectionTable({ getEl, fmtGBP }, res) {
  const tbody = getEl('tblProjection')?.querySelector('tbody');
  if (!tbody) return;
  tbody.innerHTML = res.years.map((year) => {
    const hasCash = (year.phase === 'retired') || (Number(year.lumpSumGross || 0) > 0) || (Number(year.statePension || 0) > 0) || (Number(year.dbIncome || 0) > 0);
    return `<tr>
      <td>${year.age}</td>
      <td class="right">${year.phase === 'retired' ? '—' : fmtGBP(year.salary)}</td>
      <td class="right">${year.phase === 'retired' ? '—' : fmtGBP(year.contrib)}</td>
      <td class="right">${fmtGBP(year.potStart)}</td>
      <td class="right">${fmtGBP(year.potEnd)}</td>
      <td class="right">${hasCash ? fmtGBP(year.grossWithdrawal || 0) : '—'}</td>
      <td class="right">${hasCash ? fmtGBP(year.dcNetIncome || 0) : '—'}</td>
      <td class="right">${hasCash ? fmtGBP(year.statePension || 0) : '—'}</td>
      <td class="right">${hasCash ? fmtGBP(year.dbIncome || 0) : '—'}</td>
      <td class="right">${hasCash ? fmtGBP(year.lumpSumGross || 0) : '—'}</td>
      <td class="right">${hasCash ? fmtGBP(year.remainingLsa || 0) : '—'}</td>
      <td class="right">${hasCash ? fmtGBP((year.recurringNetIncome ?? year.totalNetIncome) || 0) : '—'}</td>
      <td class="right">${hasCash ? fmtGBP((year.totalCashReceived ?? year.netIncome) || 0) : '—'}</td>
      <td class="muted">${year.note || ''}</td>
    </tr>`;
  }).join('');
}
