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
    const panel = getEl('actionPanel');
    if(recs.length===0){
      panel.innerHTML = `<div class="muted">No obvious improvements found within conservative bounds. Try adjusting multiple levers (spend + retirement age + contributions).</div>`;
      return;
    }
    panel.innerHTML = recs.map((r,idx)=>{
      const confLabel = r.confidence || 'medium';
      const effLabel = r.effort || 'medium';
      return `<div class="mentor-card">
        <div class="mentor-card-head">
          <div class="mentor-card-meta">
            <span class="mentor-badge">PREVIEW</span>
            <span class="mentor-ordinal">#${idx + 1}</span>
          </div>
          <button class="mentor-apply-btn" data-act="${idx}">Apply Suggestion</button>
        </div>
        <div class="mentor-card-title">${r.title}</div>
        <div class="mentor-card-detail">${r.detail}</div>
        ${r.reason ? `<blockquote class="mentor-card-reason">${r.reason}</blockquote>` : ''}
        <div class="mentor-card-pills">
          <span class="mentor-pill">Confidence: ${confLabel}</span>
          <span class="mentor-pill">Effort: ${effLabel}</span>
        </div>
        <div class="mentor-card-columns">
          <div class="mentor-col mentor-col--help">
            <div class="mentor-col-title">WHY THIS HELPS</div>
            <div class="mentor-col-text">${r.whyHelps || r.detail}</div>
          </div>
          <div class="mentor-col mentor-col--risk">
            <div class="mentor-col-title">WHAT COULD GO WRONG</div>
            <div class="mentor-col-text">${r.risk || 'Consider side effects before applying.'}</div>
          </div>
        </div>
      </div>`;
    }).join('');
    Array.from(document.querySelectorAll('#actionPanel button[data-act]')).forEach(btn=>{
      const idx=Number(btn.getAttribute('data-act'));
      btn.onclick=()=>{recs[idx].apply(); toast('good','Applied change','Recalculated');};
    });
  }
  return { updateFreshness, renderOverallAndActions };
}
