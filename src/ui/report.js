export function createReportRenderer(deps){
  const {getEl, fmtGBP, badge, app} = deps;
  return function renderReport(s, computed){
    getEl('reportMeta').textContent = `Generated ${new Date().toLocaleString()} • Updated ${getEl('freshnessText').textContent}`;
    const base = computed.base;
    getEl('reportSummary').innerHTML = `<ul>
      <li>Retirement age: <strong>${s.retireAge}</strong></li>
      <li>Pot at start of retirement (today’s £): <strong>${fmtGBP(base.potAtRet)}</strong></li>
      <li>First-year net income at retirement (after tax, incl. SP + DB): <strong>${fmtGBP(base.netAtRet)}</strong></li>
    </ul>`;
    getEl('reportStatus').innerHTML = `${badge(computed.overall.s, computed.overall.text, computed.overall.reason)}
      <div style="margin-top:6px">${badge(computed.stress.s, computed.stress.text, computed.stress.reason)}</div>
      <div style="margin-top:6px">${badge(computed.bridge.base.s, computed.bridge.base.text, computed.bridge.base.reason)}</div>
      <div style="margin-top:6px">${computed.bridge.life?badge(computed.bridge.life.s, computed.bridge.life.text, computed.bridge.life.reason):''}</div>
      <div style="margin-top:6px">${computed.monte?badge(computed.monte.s, `Monte Carlo: ${computed.monte.label}`, computed.monte.reason):''}</div>`;
    getEl('reportStress').innerHTML = `<div>${badge(computed.stress.s, computed.stress.text, computed.stress.reason)}</div>`;
    getEl('reportStressChart').innerHTML = getEl('chartStress').outerHTML;
    getEl('reportBridge').innerHTML = `<div>${badge(computed.bridge.base.s, computed.bridge.base.text, computed.bridge.base.reason)}</div>`;
    getEl('reportBridgeChart').innerHTML = getEl('chartBridge').outerHTML;
    const mcRes = app.mc.result;
    const mcHtml = mcRes ? `<ul>
      <li>Success probability: <strong>${(mcRes.successProb*100).toFixed(1)}%</strong></li>
      <li>Worst-case depletion age: <strong>${mcRes.worstDepletionAge===null?`Never (to ${s.endAge})`:`Age ${mcRes.worstDepletionAge}`}</strong></li>
      <li>P10 terminal pot: <strong>${fmtGBP(mcRes.p10Terminal)}</strong></li>
    </ul>` : `<div class="muted">Monte Carlo not run yet. Open Monte Carlo tab and run it.</div>`;
    getEl('reportMonte').innerHTML = mcHtml;
    getEl('reportMonteChart').innerHTML = getEl('chartMC').outerHTML;
    getEl('reportAssumptions').innerHTML = `<ul>
      <li>All values shown in today’s money (real terms), using inflation input.</li>
      <li>Tax is simplified: allowance + basic + higher threshold; TFLS simplified.</li>
      <li>DC pensions can now be modelled separately by provider and fee. DB pensions are treated as future income streams from their chosen start age. One-off DC lump sums can also be modelled by age and source pot.</li>
      <li>Monte Carlo uses mean return + volatility; real markets may differ.</li>
      <li>This is not financial advice.</li>
    </ul>`;
  };
}
