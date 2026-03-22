export function createNavigationController({ getEl, document, window, onOpenMonte }){
  const menuBtn = getEl('btnMenu');
  const overlay = document.getElementById('sideOverlay');
  const bottomNav = document.getElementById('bottomNav');
  const sheet = document.getElementById('actionSheet');
  const btnActions = document.getElementById('btnActions');
  const btnSheetClose = document.getElementById('btnSheetClose');

  function setView(name){
    document.querySelectorAll('.view').forEach(v=>v.style.display='none');
    document.querySelectorAll('.nav button').forEach(b=>b.classList.remove('active'));
    getEl('view-'+name).style.display='block';
    document.querySelector(`.nav button[data-view="${name}"]`)?.classList.add('active');
    const titles={overview:'Overview', inputs:'Inputs', projection:'Projection', strategy:'Strategy', bridge:'Early Retirement Bridge', household:'Household', stress:'Stress tests', monte:'Monte Carlo', scenarios:'Scenarios', help:'Help'};
    getEl('viewTitle').textContent = titles[name] || 'Overview';
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
    if(menuBtn) menuBtn.addEventListener('click', ()=>setNavOpen(!document.body.classList.contains('navOpen')));
    if(overlay) overlay.addEventListener('click', ()=>setNavOpen(false));
    if(btnActions) btnActions.addEventListener('click', ()=>setSheet(true));
    if(btnSheetClose) btnSheetClose.addEventListener('click', ()=>setSheet(false));
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
  }

  return { setView, setNavOpen, syncBottomNav, setSheet, bindNavigation };
}
