export function createEditorHelpers(deps){
  const { getEl, readState, numVal, escapeHtml, escapeHtmlAttr, newId } = deps;
  const fmtGBP = (n)=> new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);
  const fmtPct = (n)=> `${(Number.isFinite(Number(n)) ? Number(n) : 0).toFixed(1)}%`;

  const store = {
    primary: { dcPensions: [], dbPensions: [], contribEvents: [], lumpSumEvents: [] },
    partner: { dcPensions: [], dbPensions: [], contribEvents: [], lumpSumEvents: [] },
  };

  const cloneList = (arr)=> (arr || []).map((x)=>({ ...x }));
  const safeP = (person)=> person === 'partner' ? 'partner' : 'primary';
  const personWrap = {
    primary: { dc: 'dcPensionsWrap', db: 'dbPensionsWrap', contrib: 'contribEventsWrap', lump: 'lumpSumEventsWrap' },
    partner: { dc: 'partnerDcPensionsWrap', db: 'partnerDbPensionsWrap', contrib: 'partnerContribEventsWrap', lump: 'partnerLumpSumEventsWrap' },
  };
  const personSummary = {
    primary: { dc: 'dcPensionsSummary', db: 'dbPensionsSummary', contrib: 'contribEventsSummary', lump: 'lumpSumEventsSummary' },
    partner: { dc: 'partnerDcPensionsSummary', db: 'partnerDbPensionsSummary', contrib: 'partnerContribEventsSummary', lump: 'partnerLumpSumEventsSummary' },
  };

  function setStoreFromState(s){
    store.primary.dcPensions = cloneList(s?.dcPensions || []);
    store.primary.dbPensions = cloneList(s?.dbPensions || []);
    store.primary.contribEvents = cloneList(s?.contribEvents || []);
    store.primary.lumpSumEvents = cloneList(s?.lumpSumEvents || []);
    store.partner.dcPensions = cloneList(s?.partnerDcPensions || []);
    store.partner.dbPensions = cloneList(s?.partnerDbPensions || []);
    store.partner.contribEvents = cloneList(s?.partnerContribEvents || []);
    store.partner.lumpSumEvents = cloneList(s?.partnerLumpSumEvents || []);
  }


  function getAllDCPensionsForEditor(s, person = 'primary'){
    const isPartner = person === 'partner';
    const base = [{
      id:'current-workplace',
      name:'Current workplace pension',
      provider:'Current scheme',
      currentValue:Number(isPartner ? (s?.partnerPot || 0) : (s?.pot || 0)),
      feePct:Number(s?.feePct||0),
      priority:100
    }];
    const dcList = isPartner ? (s?.partnerDcPensions || []) : (s?.dcPensions || []);
    return base.concat(dcList.map((p,i)=>({id:p.id||('dc_'+i), name:p.name||('DC pension '+(i+1)), provider:p.provider||'', currentValue:Number(p.currentValue||0), feePct:Number(p.feePct||0), priority:Number(p.priority||50)})));
  }

  function renderRepeaters(s){
    setStoreFromState(s || {});
    renderDcPensionsEditor(cloneList(store.primary.dcPensions), s, 'primary');
    renderDbPensionsEditor(cloneList(store.primary.dbPensions), s, 'primary');
    renderContribEventsEditor(cloneList(store.primary.contribEvents), s, 'primary');
    renderLumpSumEventsEditor(cloneList(store.primary.lumpSumEvents), s, 'primary');
    renderDcPensionsEditor(cloneList(store.partner.dcPensions), s, 'partner');
    renderDbPensionsEditor(cloneList(store.partner.dbPensions), s, 'partner');
    renderContribEventsEditor(cloneList(store.partner.contribEvents), s, 'partner');
    renderLumpSumEventsEditor(cloneList(store.partner.lumpSumEvents), s, 'partner');
  }

  function syncCurrentDomToStore(){
    store.primary.dcPensions = readDcPensionsEditor('primary');
    store.primary.dbPensions = readDbPensionsEditor('primary');
    store.primary.contribEvents = readContribEventsEditor('primary');
    store.primary.lumpSumEvents = readLumpSumEventsEditor('primary');
    store.partner.dcPensions = readDcPensionsEditor('partner');
    store.partner.dbPensions = readDbPensionsEditor('partner');
    store.partner.contribEvents = readContribEventsEditor('partner');
    store.partner.lumpSumEvents = readLumpSumEventsEditor('partner');
  }

  function getEditorCollections(){
    syncCurrentDomToStore();
    return {
      primary: {
        dcPensions: cloneList(store.primary.dcPensions),
        dbPensions: cloneList(store.primary.dbPensions),
        contribEvents: cloneList(store.primary.contribEvents),
        lumpSumEvents: cloneList(store.primary.lumpSumEvents),
      },
      partner: {
        dcPensions: cloneList(store.partner.dcPensions),
        dbPensions: cloneList(store.partner.dbPensions),
        contribEvents: cloneList(store.partner.contribEvents),
        lumpSumEvents: cloneList(store.partner.lumpSumEvents),
      },
    };
  }

  function renderDcPensionsEditor(list, stateOverride, person = 'primary'){
    const p = safeP(person);
    const wrap=getEl(personWrap[p].dc); if(!wrap) return;
    const s = stateOverride || readState();
    const items=(list||[]);
    store[p].dcPensions = cloneList(items);
    const summaryEl = getEl(personSummary[p].dc);
    if(summaryEl){
      const total = items.reduce((sum, x)=>sum + Number(x?.currentValue||0), 0);
      summaryEl.innerHTML = items.length ? `<span class="badge">${items.length} pension${items.length===1?'':'s'}</span> <span class="badge">Total starting value ${fmtGBP(total)}</span>` : '';
    }
    wrap.className='repeatWrap';
    if(!items.length){ wrap.innerHTML = `<div class="repeatEmpty"><div class="repeatEmptyTitle">No extra DC pensions yet</div><div class="muted small">Add legacy or old workplace DC pots so strategy can target them with priorities.</div></div>`; return; }
    wrap.innerHTML = items.map((p,idx)=>`
      <div class="repeatCard" data-dc-idx="${idx}" data-id="${escapeHtmlAttr(p.id||newId('dc'))}">
        <div class="repeatHead"><div class="repeatTitle">${escapeHtml(p.name||('DC pension '+(idx+1)))}</div><div class="repeatActions"><button class="miniBtn clone" type="button" data-clone-dc="${idx}">Duplicate</button><button class="miniBtn" type="button" data-del-dc="${idx}">Remove</button></div></div>
        <div class="repeatMeta"><span class="badge">${fmtGBP(Number(p.currentValue||0))}</span><span class="badge">Fee ${fmtPct(p.feePct||0)}</span><span class="badge">Priority ${Number(p.priority||50)}</span></div>
        <div class="form">
          <div class="field"><label>Name</label><input type="text" data-dc="name" value="${escapeHtmlAttr(p.name||'')}" /></div>
          <div class="field"><label>Provider</label><input type="text" data-dc="provider" value="${escapeHtmlAttr(p.provider||'')}" /></div>
          <div class="field"><label>Current value (£)</label><input type="number" step="100" min="0" data-dc="currentValue" value="${numVal(p.currentValue)}" /></div>
          <div class="field"><label>Fee % / yr</label><input type="number" step="0.01" min="0" data-dc="feePct" value="${numVal(p.feePct)}" /></div>
          <div class="field"><label>Return override % / yr</label><input type="number" step="0.1" data-dc="returnOverride" value="${p.returnOverride==null?'':numVal(p.returnOverride)}" placeholder="Optional" /></div>
          <div class="field"><label>Withdrawal priority</label><input type="number" step="1" min="1" data-dc="priority" value="${numVal(p.priority||50)}" /></div>
        </div>
      </div>`).join('');
    wrap.querySelectorAll('[data-clone-dc]').forEach(btn=>btn.onclick=()=>{
      const arr=readDcPensionsEditor(p);
      const base = arr[Number(btn.dataset.cloneDc)];
      arr.splice(Number(btn.dataset.cloneDc)+1,0,{...base,id:newId('dc'),name:(base.name||'DC pension')+' copy'});
      renderDcPensionsEditor(arr, s, p);
      const st=readState();
      renderContribEventsEditor(readContribEventsEditor(p), st, p);
      renderLumpSumEventsEditor(readLumpSumEventsEditor(p), st, p);
    });
    wrap.querySelectorAll('[data-del-dc]').forEach(btn=>btn.onclick=()=>{
      const arr=readDcPensionsEditor(p); arr.splice(Number(btn.dataset.delDc),1); renderDcPensionsEditor(arr, s, p); const st=readState(); renderContribEventsEditor(readContribEventsEditor(p), st, p); renderLumpSumEventsEditor(readLumpSumEventsEditor(p), st, p);
    });
  }

  function renderDbPensionsEditor(list, _stateOverride, person = 'primary'){
    const p = safeP(person);
    const wrap=getEl(personWrap[p].db); if(!wrap) return;
    const items=(list||[]);
    store[p].dbPensions = cloneList(items);
    const summaryEl = getEl(personSummary[p].db);
    if(summaryEl){
      const total = items.reduce((sum, x)=>sum + Number(x?.annualIncome||0), 0);
      summaryEl.innerHTML = items.length ? `<span class="badge">${items.length} pension${items.length===1?'':'s'}</span> <span class="badge">Combined annual income ${fmtGBP(total)}</span>` : '';
    }
    wrap.className='repeatWrap';
    if(!items.length){ wrap.innerHTML = `<div class="repeatEmpty"><div class="repeatEmptyTitle">No defined benefit pensions yet</div><div class="muted small">Add final salary or career average incomes and start ages.</div></div>`; return; }
    wrap.innerHTML = items.map((p,idx)=>`
      <div class="repeatCard" data-db-idx="${idx}" data-id="${escapeHtmlAttr(p.id||newId('db'))}">
        <div class="repeatHead"><div class="repeatTitle">${escapeHtml(p.name||('DB pension '+(idx+1)))}</div><div class="repeatActions"><button class="miniBtn clone" type="button" data-clone-db="${idx}">Duplicate</button><button class="miniBtn" type="button" data-del-db="${idx}">Remove</button></div></div>
        <div class="repeatMeta"><span class="badge">${fmtGBP(Number(p.annualIncome||0))}/yr</span><span class="badge">Starts age ${Number(p.startAge||67)}</span><span class="badge">NPA ${Number(p.npaAge==null ? p.startAge : p.npaAge)||67}</span></div>
        <div class="form">
          <div class="field"><label>Name</label><input type="text" data-db="name" value="${escapeHtmlAttr(p.name||'')}" /></div>
          <div class="field"><label>Provider</label><input type="text" data-db="provider" value="${escapeHtmlAttr(p.provider||'')}" /></div>
          <div class="field"><label>Annual income (£/yr, today’s money)</label><input type="number" step="100" min="0" data-db="annualIncome" value="${numVal(p.annualIncome)}" /></div>
          <div class="field"><label>Start age</label><input type="number" step="1" min="40" max="100" data-db="startAge" value="${numVal(p.startAge)}" /></div>
          <div class="field"><label>Normal Pension Age (NPA)</label><input type="number" step="1" min="40" max="100" data-db="npaAge" value="${numVal(p.npaAge == null ? p.startAge : p.npaAge)}" /></div>
          <div class="field"><label>Increase type</label>
            <select data-db="increaseType">
              <option value="fixed" ${(p.increaseType||'fixed')==='fixed'?'selected':''}>Fixed annual increase %</option>
              <option value="cpi" ${(p.increaseType||'fixed')==='cpi'?'selected':''}>CPI-linked</option>
              <option value="cpiCap" ${(p.increaseType||'fixed')==='cpiCap'?'selected':''}>CPI-linked with cap</option>
              <option value="none" ${(p.increaseType||'fixed')==='none'?'selected':''}>No increase</option>
            </select>
          </div>
          <div class="field"><label>Fixed annual increase %</label><input type="number" step="0.1" min="0" data-db="escalationPct" value="${numVal(p.escalationPct||0)}" /></div>
          <div class="field"><label>CPI cap % (optional)</label><input type="number" step="0.1" min="0" data-db="cpiCapPct" value="${p.cpiCapPct==null?'':numVal(p.cpiCapPct)}" placeholder="Optional" /></div>
        </div>
      </div>`).join('');
    wrap.querySelectorAll('[data-clone-db]').forEach(btn=>btn.onclick=()=>{
      const arr=readDbPensionsEditor(p);
      const base = arr[Number(btn.dataset.cloneDb)];
      arr.splice(Number(btn.dataset.cloneDb)+1,0,{...base,id:newId('db'),name:(base.name||'DB pension')+' copy'});
      renderDbPensionsEditor(arr, null, p);
    });
    wrap.querySelectorAll('[data-del-db]').forEach(btn=>btn.onclick=()=>{
      const arr=readDbPensionsEditor(p); arr.splice(Number(btn.dataset.delDb),1); renderDbPensionsEditor(arr, null, p);
    });
  }

  function renderContribEventsEditor(list, stateOverride, person = 'primary'){
    const p = safeP(person);
    const wrap=getEl(personWrap[p].contrib); if(!wrap) return;
    const s = stateOverride || readState();
    const items=(list||[]);
    store[p].contribEvents = cloneList(items);
    const summaryEl = getEl(personSummary[p].contrib);
    if(summaryEl){
      const total = items.reduce((sum, x)=>sum + Number(x?.amount||0), 0);
      summaryEl.innerHTML = items.length ? `<span class="badge">${items.length} event${items.length===1?'':'s'}</span> <span class="badge">Configured amount total ${fmtGBP(total)}</span>` : '';
    }
    const targetOpts=getAllDCPensionsForEditor(s, p).map(pt=>`<option value="${escapeHtmlAttr(pt.id)}">${escapeHtml(pt.name)}</option>`).join('');
    wrap.className='repeatWrap';
    if(!items.length){ wrap.innerHTML = `<div class="repeatEmpty"><div class="repeatEmptyTitle">No extra contribution events yet</div><div class="muted small">Use events for one-off top-ups, monthly boosts, or annual bonus-funded payments.</div></div>`; return; }
    wrap.innerHTML = items.map((c,idx)=>`
      <div class="repeatCard" data-contrib-idx="${idx}" data-id="${escapeHtmlAttr(c.id||newId('ce'))}">
        <div class="repeatHead"><div class="repeatTitle">${escapeHtml(c.name||('Contribution '+(idx+1)))}</div><div class="repeatActions"><button class="miniBtn clone" type="button" data-clone-contrib="${idx}">Duplicate</button><button class="miniBtn" type="button" data-del-contrib="${idx}">Remove</button></div></div>
        <div class="repeatMeta"><span class="badge">${String(c.type||'oneOff')}</span><span class="badge">${fmtGBP(Number(c.amount||0))}</span><span class="badge">Start age ${Number(c.startAge||0)}</span></div>
        <div class="form">
          <div class="field"><label>Name</label><input type="text" data-contrib="name" value="${escapeHtmlAttr(c.name||'')}" /></div>
          <div class="field"><label>Type</label>
            <select data-contrib="type">
              ${['oneOff','annual','monthly','bonusFixed'].map(t=>`<option value="${t}" ${c.type===t?'selected':''}>${t==='oneOff'?'One-off':t==='annual'?'Annual extra':t==='monthly'?'Monthly extra':'Bonus-funded annual'}</option>`).join('')}
            </select>
          </div>
          <div class="field"><label>Amount (£)</label><input type="number" step="100" min="0" data-contrib="amount" value="${numVal(c.amount)}" /></div>
          <div class="field"><label>Target DC pension</label><select data-contrib="targetId">${targetOpts}</select></div>
          <div class="field"><label>Start age</label><input type="number" step="1" min="18" max="100" data-contrib="startAge" value="${numVal(c.startAge)}" /></div>
          <div class="field"><label>End age</label><input type="number" step="1" min="18" max="100" data-contrib="endAge" value="${c.endAge==null?'':numVal(c.endAge)}" placeholder="Optional" /></div>
        </div>
        <div class="hint">Use annual / monthly for recurring top-ups. Bonus-funded annual means a fixed annual bonus contribution.</div>
      </div>`).join('');
    wrap.querySelectorAll('[data-contrib="targetId"]').forEach((sel,idx)=>{ sel.value = items[idx].targetId || 'current-workplace'; });
    wrap.querySelectorAll('[data-clone-contrib]').forEach(btn=>btn.onclick=()=>{
      const arr=readContribEventsEditor(p);
      const base = arr[Number(btn.dataset.cloneContrib)];
      arr.splice(Number(btn.dataset.cloneContrib)+1,0,{...base,id:newId('ce'),name:(base.name||'Contribution')+' copy'});
      const st=readState();
      renderContribEventsEditor(arr, st, p);
      renderLumpSumEventsEditor(readLumpSumEventsEditor(p), st, p);
    });
    wrap.querySelectorAll('[data-del-contrib]').forEach(btn=>btn.onclick=()=>{
      const arr=readContribEventsEditor(p); arr.splice(Number(btn.dataset.delContrib),1); const st=readState(); renderContribEventsEditor(arr, st, p); renderLumpSumEventsEditor(readLumpSumEventsEditor(p), st, p);
    });
  }

  function readDcPensionsEditor(person = 'primary'){
    const p = safeP(person);
    const wrap=getEl(personWrap[p].dc); if(!wrap) return [];
    return [...wrap.querySelectorAll('[data-dc-idx]')].map(card=>({
      id: card.dataset.id || newId('dc'),
      name: card.querySelector('[data-dc="name"]').value.trim(),
      provider: card.querySelector('[data-dc="provider"]').value.trim(),
      currentValue: Number(card.querySelector('[data-dc="currentValue"]').value||0),
      feePct: Number(card.querySelector('[data-dc="feePct"]').value||0),
      returnOverride: card.querySelector('[data-dc="returnOverride"]').value===''? null : Number(card.querySelector('[data-dc="returnOverride"]').value),
      priority: Number(card.querySelector('[data-dc="priority"]').value||50)
    })).filter(x=>x.name || x.currentValue || x.feePct || x.returnOverride!=null);
  }

  function readDbPensionsEditor(person = 'primary'){
    const p = safeP(person);
    const wrap=getEl(personWrap[p].db); if(!wrap) return [];
    return [...wrap.querySelectorAll('[data-db-idx]')].map(card=>({
      id: card.dataset.id || newId('db'),
      name: card.querySelector('[data-db="name"]').value.trim(),
      provider: card.querySelector('[data-db="provider"]').value.trim(),
      annualIncome: Number(card.querySelector('[data-db="annualIncome"]').value||0),
      startAge: Number(card.querySelector('[data-db="startAge"]').value||67),
      npaAge: Number(card.querySelector('[data-db="npaAge"]')?.value || card.querySelector('[data-db="startAge"]').value || 67),
      increaseType: String(card.querySelector('[data-db="increaseType"]').value||'fixed'),
      escalationPct: Number(card.querySelector('[data-db="escalationPct"]').value||0),
      cpiCapPct: card.querySelector('[data-db="cpiCapPct"]').value===''? null : Number(card.querySelector('[data-db="cpiCapPct"]').value)
    })).filter(x=>x.name || x.annualIncome);
  }

  function readContribEventsEditor(person = 'primary'){
    const p = safeP(person);
    const wrap=getEl(personWrap[p].contrib); if(!wrap) return [];
    return [...wrap.querySelectorAll('[data-contrib-idx]')].map(card=>({
      id: card.dataset.id || newId('ce'),
      name: card.querySelector('[data-contrib="name"]').value.trim(),
      type: String(card.querySelector('[data-contrib="type"]').value||'oneOff'),
      amount: Number(card.querySelector('[data-contrib="amount"]').value||0),
      targetId: String(card.querySelector('[data-contrib="targetId"]').value||'current-workplace'),
      startAge: Number(card.querySelector('[data-contrib="startAge"]').value||0),
      endAge: card.querySelector('[data-contrib="endAge"]').value===''? null : Number(card.querySelector('[data-contrib="endAge"]').value)
    })).filter(x=>x.amount>0 || x.name);
  }

  function renderLumpSumEventsEditor(list, stateOverride, person = 'primary'){
    const p = safeP(person);
    const wrap=getEl(personWrap[p].lump); if(!wrap) return;
    const s = stateOverride || readState();
    const items=(list||[]);
    store[p].lumpSumEvents = cloneList(items);
    const summaryEl = getEl(personSummary[p].lump);
    if(summaryEl){
      const total = items.reduce((sum, x)=>sum + Number(x?.amount||0), 0);
      summaryEl.innerHTML = items.length ? `<span class="badge">${items.length} lump sum${items.length===1?'':'s'}</span> <span class="badge">Configured amount total ${fmtGBP(total)}</span>` : '';
    }
    const targetOpts = [`<option value="any-dc">Any DC pension (by withdrawal priority)</option>`].concat(getAllDCPensionsForEditor(s, p).map(pt=>`<option value="${escapeHtmlAttr(pt.id)}">${escapeHtml(pt.name)}</option>`)).join('');
    wrap.className='repeatWrap';
    if(!items.length){ wrap.innerHTML = `<div class="repeatEmpty"><div class="repeatEmptyTitle">No DC lump sums yet</div><div class="muted small">Add one-off withdrawals for PCLS, UFPLS or taxable events at specific ages.</div></div>`; return; }
    wrap.innerHTML = items.map((e,idx)=>`
      <div class="repeatCard" data-lump-idx="${idx}" data-id="${escapeHtmlAttr(e.id||newId('ls'))}">
        <div class="repeatHead"><div class="repeatTitle">${escapeHtml(e.name||('Lump sum '+(idx+1)))}</div><div class="repeatActions"><button class="miniBtn clone" type="button" data-clone-lump="${idx}">Duplicate</button><button class="miniBtn" type="button" data-del-lump="${idx}">Remove</button></div></div>
        <div class="repeatMeta"><span class="badge">${String(e.type||'pcls').toUpperCase()}</span><span class="badge">${fmtGBP(Number(e.amount||0))}</span><span class="badge">Age ${Number(e.age||0)}</span></div>
        <div class="form">
          <div class="field"><label>Name</label><input type="text" data-lump="name" value="${escapeHtmlAttr(e.name||'')}" /></div>
          <div class="field"><label>Type</label>
            <select data-lump="type">
              <option value="pcls" ${(e.type||'pcls')==='pcls'?'selected':''}>Tax-free lump sum / PCLS</option>
              <option value="ufpls" ${(e.type||'pcls')==='ufpls'?'selected':''}>UFPLS (25% tax-free, 75% taxable)</option>
              <option value="taxable" ${(e.type||'pcls')==='taxable'?'selected':''}>Fully taxable lump sum</option>
            </select>
          </div>
          <div class="field"><label>Amount type</label>
            <select data-lump="amountType">
              <option value="fixed" ${(e.amountType||'fixed')==='fixed'?'selected':''}>Fixed £ amount</option>
              <option value="pctPot" ${(e.amountType||'fixed')==='pctPot'?'selected':''}>% of selected DC pot</option>
              <option value="pctRemainingLsa" ${(e.amountType||'fixed')==='pctRemainingLsa'?'selected':''}>% of remaining TFLS / LSA</option>
            </select>
          </div>
          <div class="field"><label>Amount (£ or %)</label><input type="number" step="0.1" min="0" data-lump="amount" value="${numVal(e.amount)}" /></div>
          <div class="field"><label>Target DC pension</label><select data-lump="targetId">${targetOpts}</select></div>
          <div class="field"><label>Age</label><input type="number" step="1" min="18" max="100" data-lump="age" value="${numVal(e.age)}" /></div>
        </div>
        <div class="hint">Lump sums are applied at the start of the chosen age year, before that year’s regular drawdown and growth.</div>
      </div>`).join('');
    wrap.querySelectorAll('[data-lump="targetId"]').forEach((sel,idx)=>{ sel.value = items[idx].targetId || 'any-dc'; });
    wrap.querySelectorAll('[data-clone-lump]').forEach(btn=>btn.onclick=()=>{
      const arr=readLumpSumEventsEditor(p);
      const base = arr[Number(btn.dataset.cloneLump)];
      arr.splice(Number(btn.dataset.cloneLump)+1,0,{...base,id:newId('ls'),name:(base.name||'Lump sum')+' copy'});
      renderLumpSumEventsEditor(arr, readState(), p);
    });
    wrap.querySelectorAll('[data-del-lump]').forEach(btn=>btn.onclick=()=>{
      const arr=readLumpSumEventsEditor(p); arr.splice(Number(btn.dataset.delLump),1); renderLumpSumEventsEditor(arr, readState(), p);
    });
  }

  function readLumpSumEventsEditor(person = 'primary'){
    const p = safeP(person);
    const wrap=getEl(personWrap[p].lump); if(!wrap) return [];
    return [...wrap.querySelectorAll('[data-lump-idx]')].map(card=>({
      id: card.dataset.id || newId('ls'),
      name: card.querySelector('[data-lump="name"]').value.trim(),
      type: String(card.querySelector('[data-lump="type"]').value||'pcls'),
      amountType: String(card.querySelector('[data-lump="amountType"]').value||'fixed'),
      amount: Number(card.querySelector('[data-lump="amount"]').value||0),
      targetId: String(card.querySelector('[data-lump="targetId"]').value||'any-dc'),
      age: Number(card.querySelector('[data-lump="age"]').value||0)
    })).filter(x=>x.amount>0 || x.name);
  }

  return {
    renderRepeaters,
    renderDcPensionsEditor,
    renderDbPensionsEditor,
    renderContribEventsEditor,
    renderLumpSumEventsEditor,
    readDcPensionsEditor,
    readDbPensionsEditor,
    readContribEventsEditor,
    readLumpSumEventsEditor,
    getAllDCPensionsForEditor,
    getEditorCollections,
  };
}
