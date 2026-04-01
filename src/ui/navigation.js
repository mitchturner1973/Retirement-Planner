export function createNavigationController({ getEl, document, window, onOpenMonte }){
  const menuBtn = getEl('btnMenu');
  const railToggle = getEl('btnRailToggle');
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
  const inputsAssistShell = document.getElementById('navInputsDetails');
  const inputsProgressText = document.getElementById('inputsNavProgressText');
  const inputsProgressBar = document.getElementById('inputsNavProgressBar');
  const inputsProgressFill = document.getElementById('inputsNavProgressFill');
  const inputsStatusPill = document.getElementById('inputsNavStatusPill');
  const inputsResumeBtn = document.getElementById('inputsNavResumeBtn');
  const inputsAddSalaryBtn = document.getElementById('inputsNavAddSalaryBtn');
  const inputSectionSummaries = {
    personal: document.getElementById('inputsNavSummaryPersonal'),
    income: document.getElementById('inputsNavSummaryIncome'),
    pensions: document.getElementById('inputsNavSummaryPensions'),
    household: document.getElementById('inputsNavSummaryHousehold'),
  };
  const repeaterIds = [
    'dcPensionsWrap',
    'dbPensionsWrap',
    'contribEventsWrap',
    'lumpSumEventsWrap',
    'partnerDcPensionsWrap',
    'partnerDbPensionsWrap',
    'partnerContribEventsWrap',
    'partnerLumpSumEventsWrap',
  ];
  const currencyFormatter = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
  let cmdItems = [];
  let cmdCommands = [];

  const VIEW_TITLES = {
    overview: 'Overview',
    wealth: 'Current Wealth',
    inputs: 'Income',
    expenses: 'Expenses',
    assumptions: 'Assumptions',
    projection: 'Projection',
    strategy: 'Strategy',
    bridge: 'Early Retirement Bridge',
    household: 'Household',
    stress: 'Stress tests',
    monte: 'Monte Carlo',
    scenarios: 'Scenarios',
    help: 'Help',
  };

  const viewButtons = () => document.querySelectorAll('[data-view-nav]');
  const inputSectionButtons = () => document.querySelectorAll('[data-input-nav]');

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

  function formatGBPShort(value) {
    if (!Number.isFinite(value) || value <= 0) return null;
    if (value >= 1_000_000) return `£${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}m`;
    if (value >= 1_000) return `£${Math.round(value / 1_000)}k`;
    return currencyFormatter.format(value);
  }

  function setChipState(section, state) {
    const chip = document.querySelector(`[data-section-status="${section}"]`);
    if (!chip) return;
    chip.dataset.state = state;
    const labels = { ready: 'Ready', attention: 'Review', review: 'Review', todo: 'To do', fix: 'Fix now' };
    chip.textContent = labels[state] || chip.textContent;
  }

  function readNumber(id) {
    const el = getEl(id);
    if (!el) return null;
    const value = Number(el.value);
    return Number.isFinite(value) ? value : null;
  }

  function hasValue(id, { allowZero = false } = {}) {
    const el = getEl(id);
    if (!el) return false;
    const raw = el.value;
    if (raw === '' || raw == null) return false;
    if (el.type === 'number' || el.type === 'range') {
      const num = Number(raw);
      if (!Number.isFinite(num)) return false;
      return allowZero ? true : num > 0;
    }
    return raw.toString().trim().length > 0;
  }

  function countRepeaterCards(id) {
    const wrap = getEl(id);
    if (!wrap) return 0;
    return wrap.querySelectorAll('.repeatCard').length;
  }

  function updateInputsAssist() {
    if (!inputsAssistShell) return;
    const validation = getEl('validationSummary');
    const errorCount = Number(validation?.dataset?.errorCount || 0);
    const warningCount = Number(validation?.dataset?.warningCount || 0);
    const essentialsComplete = [
      hasValue('in_dob'),
      hasValue('in_retireAge', { allowZero: true }),
      hasValue('in_stateAge', { allowZero: true }),
      readNumber('in_salary') > 0,
    ].filter(Boolean).length;
    const essentialsTotal = 4;
    let progress = Math.round((essentialsComplete / essentialsTotal) * 100);
    let pillState = 'ready';
    let pillText = 'Ready to run';
    let progressCopy = 'All key fields complete';

    if (errorCount > 0) {
      pillState = 'fix';
      pillText = 'Fix inputs';
      progressCopy = 'Resolve outstanding errors';
      progress = Math.max(20, 70 - errorCount * 6);
    } else if (warningCount > 0) {
      pillState = 'review';
      pillText = 'Review inputs';
      progressCopy = 'Warnings spotted — review before running';
      progress = Math.min(90, 80 - warningCount * 3);
    } else if (essentialsComplete < essentialsTotal) {
      pillState = progress >= 60 ? 'review' : 'fix';
      pillText = progress >= 60 ? 'Keep filling' : 'Start here';
      progressCopy = progress >= 60 ? 'Add the remaining basics' : 'Capture your essentials';
    }

    if (inputsProgressBar) inputsProgressBar.setAttribute('aria-valuenow', String(progress));
    if (inputsProgressFill) inputsProgressFill.style.width = `${progress}%`;
    if (inputsStatusPill) {
      inputsStatusPill.dataset.state = pillState;
      inputsStatusPill.textContent = pillText;
    }
    if (inputsProgressText) inputsProgressText.textContent = progressCopy;

    const currentAge = readNumber('in_currentAge');
    const retireAge = readNumber('in_retireAge');
    const stateAge = readNumber('in_stateAge');
    if (inputSectionSummaries.personal) {
      inputSectionSummaries.personal.textContent = currentAge
        ? `Age ${currentAge} • retire ${retireAge || '—'}`
        : 'Add DOB & valuation date';
      const personalState = currentAge && retireAge && stateAge ? 'ready' : (currentAge || retireAge ? 'attention' : 'todo');
      setChipState('personal', personalState);
    }

    const salary = readNumber('in_salary') || 0;
    const otherIncome = readNumber('in_otherIncome') || 0;
    const empPct = readNumber('in_empPct') || 0;
    const erPct = readNumber('in_erPct') || 0;
    if (inputSectionSummaries.income) {
      const parts = [];
      parts.push(salary > 0 ? `${formatGBPShort(salary)}/yr salary` : 'No salary yet');
      if (otherIncome > 0) parts.push(`+ ${formatGBPShort(otherIncome)} other`);
      if (empPct + erPct > 0) parts.push(`${(empPct + erPct).toFixed(1).replace(/\.0$/, '')}% saved`);
      inputSectionSummaries.income.textContent = parts.join(' • ');
      const incomeState = salary > 0 ? ((empPct + erPct) > 0 ? 'ready' : 'attention') : 'todo';
      setChipState('income', incomeState);
    }

    const dcCount = countRepeaterCards('dcPensionsWrap');
    const dbCount = countRepeaterCards('dbPensionsWrap');
    const contribCount = countRepeaterCards('contribEventsWrap');
    const lumpCount = countRepeaterCards('lumpSumEventsWrap');
    if (inputSectionSummaries.pensions) {
      const parts = [`${dcCount} DC`, `${dbCount} DB`];
      if (contribCount) parts.push(`${contribCount} contrib`);
      if (lumpCount) parts.push(`${lumpCount} lump`);
      inputSectionSummaries.pensions.textContent = parts.join(' • ') || 'No DC or DB pensions yet';
      const pensionState = (dcCount + dbCount) > 0 ? 'ready' : (contribCount + lumpCount) > 0 ? 'attention' : 'todo';
      setChipState('pensions', pensionState);
    }

    const householdMode = getEl('in_householdMode')?.value || 'single';
    const spouseAge = readNumber('in_spouseCurrentAge');
    const spouseRetire = readNumber('in_spouseRetireAge');
    if (inputSectionSummaries.household) {
      if (householdMode === 'single') {
        inputSectionSummaries.household.textContent = 'Single plan • add partner if needed';
        setChipState('household', 'todo');
      } else {
        inputSectionSummaries.household.textContent = spouseAge
          ? `Partner age ${spouseAge} • retire ${spouseRetire || '—'}`
          : 'Add partner basics';
        const householdState = spouseAge && spouseRetire ? 'ready' : 'attention';
        setChipState('household', householdState);
      }
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
    setNavState('assumptions', 'na', 'Global');
    updateInputsAssist();
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
    viewButtons().forEach(b=>b.classList.toggle('active', b.dataset.view === name));
    const viewHost = getEl('view-'+name);
    if (viewHost) viewHost.style.display='block';
    syncBottomNav(name);
    getEl('viewTitle').textContent = VIEW_TITLES[name] || 'Overview';
    updateNavHints();
  }

  function goToInputsSection(tab, subtab, focusFieldId){
    setView('inputs');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(()=>{
      // Open drawer if subtab is a drawer id
      if (subtab && subtab.startsWith('drawer-')) {
        const drawer = document.getElementById(subtab);
        const overlay = document.getElementById('inpOverlay');
        if (drawer) {
          document.querySelectorAll('.inp-drawer.open').forEach(d => d.classList.remove('open'));
          drawer.classList.add('open');
          overlay?.classList.add('open');
          document.body.style.overflow = 'hidden';
        }
      } else {
        // Legacy tab / subtab support
        if (tab) {
          document.querySelector(`#view-inputs .tabs button[data-tab="${tab}"]`)?.click();
        }
        if (subtab) {
          const owner = subtab.startsWith('partner-') ? 'partner' : 'you';
          document.querySelector(`#subtabs-${owner} button[data-subtab="${subtab}"]`)?.click();
        }
      }
      if (focusFieldId) {
        const focusTarget = getEl(focusFieldId);
        if (focusTarget && typeof focusTarget.focus === 'function') {
          focusTarget.focus({ preventScroll: true });
          focusTarget.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }
    }, 60);
  }

  function setNavOpen(open){
    document.body.classList.toggle('navOpen', open);
    if(menuBtn) menuBtn.setAttribute('aria-expanded', open?'true':'false');
  }

  function setRailCollapsed(collapsed){
    document.body.classList.toggle('railCollapsed', collapsed);
    if(railToggle){
      railToggle.setAttribute('aria-pressed', collapsed ? 'true' : 'false');
      railToggle.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
      railToggle.setAttribute('title', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
      railToggle.textContent = collapsed ? '⇥' : '⇤';
    }
    try {
      window.localStorage?.setItem('rp:railCollapsed', collapsed ? '1' : '0');
    } catch {}
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
      { id:'go-wealth', label:'Go to Current Wealth', hint:'Financial snapshot', run:()=>setView('wealth') },
      { id:'go-inputs', label:'Go to Income', hint:'Setup earnings & pensions', run:()=>setView('inputs') },
      { id:'go-expenses', label:'Go to Expenses', hint:'Spending tracker', run:()=>setView('expenses') },
      { id:'go-assumptions', label:'Go to Assumptions', hint:'Global settings', run:()=>setView('assumptions') },
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

    try {
      setRailCollapsed(window.localStorage?.getItem('rp:railCollapsed') === '1');
    } catch {
      setRailCollapsed(false);
    }

    if(menuBtn) menuBtn.addEventListener('click', ()=>setNavOpen(!document.body.classList.contains('navOpen')));
    if(railToggle) railToggle.addEventListener('click', ()=>setRailCollapsed(!document.body.classList.contains('railCollapsed')));
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

    viewButtons().forEach(btn=>btn.addEventListener('click', ()=>{
      setView(btn.dataset.view);
      setNavOpen(false);
      if(btn.dataset.view==='monte') onOpenMonte?.();
    }));

    inputSectionButtons().forEach(btn=>btn.addEventListener('click', ()=>{
      const tab = btn.getAttribute('data-tab') || 'you';
      const subtab = btn.getAttribute('data-subtab') || '';
      const focusField = btn.getAttribute('data-input-focus') || '';
      goToInputsSection(tab, subtab, focusField);
      setNavOpen(false);
    }));

    inputsResumeBtn?.addEventListener('click', ()=>{
      const firstIssue = document.querySelector('.validation-focus-btn');
      if(firstIssue){
        firstIssue.click();
      } else {
        goToInputsSection('you','drawer-personal','in_dob');
      }
      setNavOpen(false);
    });

    inputsAddSalaryBtn?.addEventListener('click', ()=>{
      goToInputsSection('you','drawer-employment','in_salary');
      setNavOpen(false);
    });

    document.querySelectorAll('.tabs button').forEach(btn=>btn.addEventListener('click', ()=>{
      document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab').forEach(t=>t.style.display='none');
      getEl('tab-'+btn.dataset.tab).style.display='block';
    }));

    const subnavContainers = document.querySelectorAll('.view-subnav[data-subnav]');
    if(subnavContainers.length){
      subnavContainers.forEach(container=>{
        const group = container.dataset.subnav;
        const buttons = container.querySelectorAll('[data-subnav-target]');
        const panels = document.querySelectorAll(`.view-subpanel[data-subnav="${group}"]`);
        if(!buttons.length || !panels.length) return;
        const show = (target)=>{
          buttons.forEach(btn=>btn.classList.toggle('active', btn.dataset.subnavTarget === target));
          panels.forEach(panel=>panel.toggleAttribute('hidden', panel.dataset.subnavPanel !== target));
        };
        buttons.forEach(btn=>btn.addEventListener('click', ()=>show(btn.dataset.subnavTarget)));
        const initial = container.querySelector('.active')?.dataset.subnavTarget || buttons[0].dataset.subnavTarget;
        show(initial);
      });
    }

    ['overallBadge','bridgeOverallBadge','stressBadge','stressCombinedBadge','monteBadge','validationSummary']
      .map((id)=>getEl(id))
      .filter(Boolean)
      .forEach((node)=>{
        const observer = new MutationObserver(()=>updateNavHints());
        observer.observe(node, { childList:true, subtree:true, attributes:true, characterData:true });
      });

    const handleInputsChange = (event)=>{
      if (!inputsAssistShell) return;
      const target = event?.target;
      if (!target) return;
      if (target.closest('#view-inputs')) updateInputsAssist();
    };
    document.addEventListener('input', handleInputsChange);
    document.addEventListener('change', handleInputsChange);

    observeInputCollections();
    updateNavHints();
  }

  function observeInputCollections(){
    if (typeof MutationObserver === 'undefined') return;
    repeaterIds.forEach((id)=>{
      const host = getEl(id);
      if (!host) return;
      const observer = new MutationObserver(()=>updateInputsAssist());
      observer.observe(host, { childList:true, subtree:true });
    });
  }

  return { setView, setNavOpen, setRailCollapsed, syncBottomNav, setSheet, bindNavigation, updateNavHints, goToInputsSection };
}
