export function createNavigationController({ getEl, document, window, onOpenMonte }){
  const menuBtn = getEl('btnMenu');
  const overlay = document.getElementById('sideOverlay');
  const bottomNav = document.getElementById('bottomNav');
  const sheet = document.getElementById('actionSheet');
  const btnActions = document.getElementById('btnActions');
  const btnSheetClose = document.getElementById('btnSheetClose');
  const btnQuickRecalc = document.getElementById('navQuickRecalc');
  const btnQuickScenario = document.getElementById('navQuickScenario');
  const btnQuickCompare = document.getElementById('navQuickCompare');
  const cmdPalette = document.getElementById('cmdPalette');
  const cmdInput = document.getElementById('cmdInput');
  const cmdList = document.getElementById('cmdList');
  const btnCmdClose = document.getElementById('btnCmdClose');
  let cmdItems = [];
  let cmdCommands = [];

  const VIEW_TITLES = {
    overview: 'Overview',
    inputs: 'Inputs',
    projection: 'Projection',
    strategy: 'Strategy',
    bridge: 'Early Retirement Bridge',
    household: 'Household',
    stress: 'Stress tests',
    monte: 'Monte Carlo',
    scenarios: 'Scenarios',
    help: 'Help',
  };

  function setNavState(view, state = 'na', hint = null){
    const btn = document.querySelector(`.nav button[data-view="${view}"]`);
    if (!btn) return;
    if (state) btn.setAttribute('data-state', state);
    const pill = btn.querySelector('[data-pill]');
    if (pill) {
      const fallback = btn.getAttribute('data-default-hint') || '';
      pill.textContent = hint || fallback;
    }
  }

  function readBadgeState(elId){
    const host = getEl(elId);
    if (!host) return { state: 'na', text: null };
    const b = host.querySelector('.badge');
    if (!b) return { state: 'na', text: null };
    if (b.classList.contains('good')) return { state: 'good', text: b.textContent || null };
    if (b.classList.contains('warn')) return { state: 'warn', text: b.textContent || null };
    if (b.classList.contains('bad')) return { state: 'bad', text: b.textContent || null };
    return { state: 'na', text: b.textContent || null };
  }

  function updateNavHints(){
    const overall = readBadgeState('overallBadge');
    setNavState('overview', overall.state, overall.state === 'good' ? 'On track' : overall.state === 'warn' ? 'Review' : overall.state === 'bad' ? 'Action' : 'Summary');

    const validation = getEl('validationSummary');
    const hasValidation = validation && validation.style.display !== 'none' && (validation.textContent || '').trim().length > 0;
    setNavState('inputs', hasValidation ? 'bad' : 'good', hasValidation ? 'Fix fields' : 'Ready');

    const bridge = readBadgeState('bridgeOverallBadge');
    setNavState('bridge', bridge.state, bridge.state === 'good' ? 'Strong' : bridge.state === 'warn' ? 'Watch' : bridge.state === 'bad' ? 'Risk' : 'Early retire');

    const stress = readBadgeState('stressCombinedBadge');
    setNavState('stress', stress.state, stress.state === 'good' ? 'Pass' : stress.state === 'warn' ? 'Watch' : stress.state === 'bad' ? 'Risk' : 'Downside checks');

    const monte = readBadgeState('monteBadge');
    const hasMonte = Boolean(window.__RP_APP?.mc?.result);
    setNavState('monte', hasMonte ? monte.state : 'warn', hasMonte ? (monte.state === 'good' ? 'Strong' : monte.state === 'warn' ? 'Moderate' : 'Weak') : 'Not run');

    setNavState('projection', 'good', 'Timeline');
    setNavState('strategy', 'good', 'Levers');
    setNavState('household', 'na', 'Joint');
    setNavState('scenarios', 'na', 'Compare');
    setNavState('help', 'na', 'Guide');
  }

  function setCmdOpen(open){
    if (!cmdPalette) return;
    cmdPalette.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) {
      cmdInput?.focus();
      cmdInput?.select();
    }
  }

  function renderCmdList(filter = ''){
    if (!cmdList) return;
    const q = (filter || '').trim().toLowerCase();
    cmdItems = cmdCommands.filter((x) => !q || x.label.toLowerCase().includes(q) || (x.hint || '').toLowerCase().includes(q));
    cmdList.innerHTML = cmdItems.map((item, idx) => `
      <button class="cmdItem${idx===0 ? ' active' : ''}" data-cmd-id="${item.id}">
        <span><span class="cmdItemLabel">${item.label}</span> <span class="cmdItemHint">${item.hint || ''}</span></span>
        <span class="cmdItemKbd">Enter</span>
      </button>`).join('');
    cmdList.querySelectorAll('.cmdItem').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-cmd-id');
        const hit = cmdItems.find((c) => c.id === id);
        if (!hit) return;
        hit.run();
        setCmdOpen(false);
      });
    });
  }

  function setView(name){
    document.querySelectorAll('.view').forEach(v=>v.style.display='none');
    document.querySelectorAll('.nav button').forEach(b=>b.classList.remove('active'));
    getEl('view-'+name).style.display='block';
    document.querySelector(`.nav button[data-view="${name}"]`)?.classList.add('active');
    getEl('viewTitle').textContent = VIEW_TITLES[name] || 'Overview';
    updateNavHints();
  }

  function setNavOpen(open){
    document.body.classList.toggle('navOpen', open);
    if(menuBtn) menuBtn.setAttribute('aria-expanded', open?'true':'false');
  }

  function syncBottomNav(view){
    if(!bottomNav) return;
    bottomNav.querySelectorAll('button').forEach(x=>x.classList.remove('active'));
    const hit = bottomNav.querySelector(`button[data-view="${view}"]`);
    if(hit) hit.classList.add('active');
  }

  function setSheet(open){
    if(!sheet) return;
    sheet.setAttribute('aria-hidden', open?'false':'true');
  }

  function bindNavigation(actionHandlers = {}){
    cmdCommands = [
      { id:'go-overview', label:'Go to Dashboard', hint:'Overview', run:()=>setView('overview') },
      { id:'go-inputs', label:'Go to Inputs', hint:'Setup assumptions', run:()=>setView('inputs') },
      { id:'go-proj', label:'Go to Projection', hint:'Timeline path', run:()=>setView('projection') },
      { id:'go-strategy', label:'Go to Strategy', hint:'Improve outcomes', run:()=>setView('strategy') },
      { id:'go-bridge', label:'Go to Bridge', hint:'Early retirement gap', run:()=>setView('bridge') },
      { id:'go-stress', label:'Go to Downside checks', hint:'Stress tests', run:()=>setView('stress') },
      { id:'go-monte', label:'Go to Probability check', hint:'Monte Carlo', run:()=>{ setView('monte'); onOpenMonte?.(); } },
      { id:'go-scenarios', label:'Go to Scenarios', hint:'Compare plans', run:()=>setView('scenarios') },
      { id:'act-recalc', label:'Run Recalculate', hint:'Refresh all views', run:()=>actionHandlers.recalc?.() },
      { id:'act-save-scenario', label:'Save scenario', hint:'Snapshot current inputs', run:()=>actionHandlers.saveScenario?.() },
      { id:'act-export', label:'Export inputs', hint:'.json', run:()=>actionHandlers.save?.() },
    ];
    renderCmdList('');

    if(menuBtn) menuBtn.addEventListener('click', ()=>setNavOpen(!document.body.classList.contains('navOpen')));
    if(overlay) overlay.addEventListener('click', ()=>setNavOpen(false));
    if(btnActions) btnActions.addEventListener('click', ()=>setSheet(true));
    if(btnSheetClose) btnSheetClose.addEventListener('click', ()=>setSheet(false));
    if(btnQuickRecalc) btnQuickRecalc.addEventListener('click', ()=>actionHandlers.recalc?.());
    if(btnQuickScenario) btnQuickScenario.addEventListener('click', ()=>actionHandlers.saveScenario?.());
    if(btnQuickCompare) btnQuickCompare.addEventListener('click', ()=>setView('scenarios'));
    if(btnCmdClose) btnCmdClose.addEventListener('click', ()=>setCmdOpen(false));
    if(cmdPalette) cmdPalette.addEventListener('click', (e)=>{ if(e.target===cmdPalette) setCmdOpen(false); });
    if(cmdInput){
      cmdInput.addEventListener('input', ()=>renderCmdList(cmdInput.value));
      cmdInput.addEventListener('keydown', (e)=>{
        if(e.key==='Escape'){ e.preventDefault(); setCmdOpen(false); return; }
        if(e.key==='Enter'){
          e.preventDefault();
          const hit = cmdItems[0];
          if(hit){ hit.run(); setCmdOpen(false); }
        }
      });
    }
    document.addEventListener('keydown', (e)=>{
      const k = (e.key || '').toLowerCase();
      if((e.metaKey || e.ctrlKey) && k==='k'){
        e.preventDefault();
        setCmdOpen(true);
      }
      if(k==='escape') setCmdOpen(false);
    });

    if(sheet){
      sheet.addEventListener('click', (e)=>{ if(e.target===sheet) setSheet(false); });
      sheet.querySelectorAll('button[data-act]').forEach(b=>b.addEventListener('click', ()=>{
        const act=b.getAttribute('data-act');
        actionHandlers[act]?.();
        setSheet(false);
      }));
    }
    if(bottomNav){
      bottomNav.querySelectorAll('button[data-view]').forEach(b=>b.addEventListener('click', ()=>{
        const v=b.dataset.view;
        setView(v);
        setNavOpen(false);
        syncBottomNav(v);
        if(v==='monte') onOpenMonte?.();
        window.scrollTo({top:0, behavior:'smooth'});
      }));
    }

    document.querySelectorAll('.nav button').forEach(btn=>btn.addEventListener('click', ()=>{
      setView(btn.dataset.view);
      setNavOpen(false);
      syncBottomNav(btn.dataset.view);
      if(btn.dataset.view==='monte') onOpenMonte?.();
    }));

    document.querySelectorAll('.tabs button').forEach(btn=>btn.addEventListener('click', ()=>{
      document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab').forEach(t=>t.style.display='none');
      getEl('tab-'+btn.dataset.tab).style.display='block';
    }));

    ['overallBadge','bridgeOverallBadge','stressBadge','stressCombinedBadge','monteBadge','validationSummary']
      .map((id)=>getEl(id))
      .filter(Boolean)
      .forEach((node)=>{
        const observer = new MutationObserver(()=>updateNavHints());
        observer.observe(node, { childList:true, subtree:true, attributes:true, characterData:true });
      });
    updateNavHints();
  }

  return { setView, setNavOpen, syncBottomNav, setSheet, bindNavigation, updateNavHints };
}
