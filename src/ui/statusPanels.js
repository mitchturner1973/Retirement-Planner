export function createStatusPanelRenderer(deps){
  const {app, getEl, nowTime, computeOverall, badge, suggestLevers, getRiskSummary, document, toast} = deps;

  function updateFreshness(msg){
    app.lastUpdatedAt = new Date();
    getEl('freshnessText').textContent = `Updated ${nowTime()}`;
    if(msg) getEl('freshnessText').textContent += ` • ${msg}`;
  }

  function renderOverallAndActions(s, stressStatus, bridgeStatus, mcStatus){
    const overall = computeOverall(stressStatus, bridgeStatus.base, bridgeStatus.life, mcStatus);
    getEl('overallBadge').innerHTML = badge(overall.s, overall.text, overall.reason);
    getEl('robustBadge').innerHTML = badge(stressStatus.s, 'Gatekeeper', stressStatus.reason);
    if(getEl('bridgeOverallBadge')){
      const b = bridgeStatus.base;
      getEl('bridgeOverallBadge').innerHTML = badge(b.s, b.text, b.reason);
    }
    const recs = suggestLevers(
      s,
      {overall, stress: stressStatus, bridgeBase: bridgeStatus.base, bridgeLife: bridgeStatus.life},
      typeof getRiskSummary === 'function' ? getRiskSummary() : null,
    );
    if(recs.length===0){
      getEl('actionPanel').innerHTML = `<div class="muted">No obvious improvements found within conservative bounds. Try adjusting multiple levers (spend + retirement age + contributions).</div>`;
      return;
    }
    getEl('actionPanel').innerHTML = recs.map((r,idx)=>`<div class="callout" style="margin-top:${idx?10:0}px"><div class="dot"></div><div style="flex:1">
      <div><strong>${r.title}</strong></div>
      <div class="muted small" style="margin-top:4px">${r.detail}</div>
      <div class="row" style="margin-top:8px"><button class="btn" data-act="${idx}">Apply</button></div>
    </div></div>`).join('');
    Array.from(document.querySelectorAll('#actionPanel button[data-act]')).forEach(btn=>{
      const idx=Number(btn.getAttribute('data-act'));
      btn.onclick=()=>{recs[idx].apply(); toast('good','Applied change','Recalculated');};
    });
  }
  return { updateFreshness, renderOverallAndActions };
}
