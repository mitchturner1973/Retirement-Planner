export function createEditorHelpers(deps){
  const { getEl, readState, numVal, escapeHtml, escapeHtmlAttr, newId } = deps;

  function getAllDCPensionsForEditor(s){
    const base = [{
      id:'current-workplace',
      name:'Current workplace pension',
      provider:'Current scheme',
      currentValue:Number(s?.pot||0),
      feePct:Number(s?.feePct||0),
      priority:100
    }];
    return base.concat((s?.dcPensions||[]).map((p,i)=>({id:p.id||('dc_'+i), name:p.name||('DC pension '+(i+1)), provider:p.provider||'', currentValue:Number(p.currentValue||0), feePct:Number(p.feePct||0), priority:Number(p.priority||50)})));
  }

  function renderRepeaters(s){
    renderDcPensionsEditor(s.dcPensions||[]);
    renderDbPensionsEditor(s.dbPensions||[]);
    renderContribEventsEditor(s.contribEvents||[], s);
    renderLumpSumEventsEditor(s.lumpSumEvents||[], s);
  }

  function renderDcPensionsEditor(list){
    const wrap=getEl('dcPensionsWrap'); if(!wrap) return;
    const items=(list||[]);
    wrap.className='repeatWrap';
    if(!items.length){ wrap.innerHTML = `<div class="muted small">No extra DC pensions added yet.</div>`; return; }
    wrap.innerHTML = items.map((p,idx)=>`
      <div class="repeatCard" data-dc-idx="${idx}" data-id="${escapeHtmlAttr(p.id||newId('dc'))}">
        <div class="repeatHead"><div class="repeatTitle">${escapeHtml(p.name||('DC pension '+(idx+1)))}</div><button class="miniBtn" type="button" data-del-dc="${idx}">Remove</button></div>
        <div class="form">
          <div class="field"><label>Name</label><input type="text" data-dc="name" value="${escapeHtmlAttr(p.name||'')}" /></div>
          <div class="field"><label>Provider</label><input type="text" data-dc="provider" value="${escapeHtmlAttr(p.provider||'')}" /></div>
          <div class="field"><label>Current value (£)</label><input type="number" step="100" min="0" data-dc="currentValue" value="${numVal(p.currentValue)}" /></div>
          <div class="field"><label>Fee % / yr</label><input type="number" step="0.01" min="0" data-dc="feePct" value="${numVal(p.feePct)}" /></div>
          <div class="field"><label>Return override % / yr</label><input type="number" step="0.1" data-dc="returnOverride" value="${p.returnOverride==null?'':numVal(p.returnOverride)}" placeholder="Optional" /></div>
          <div class="field"><label>Withdrawal priority</label><input type="number" step="1" min="1" data-dc="priority" value="${numVal(p.priority||50)}" /></div>
        </div>
      </div>`).join('');
    wrap.querySelectorAll('[data-del-dc]').forEach(btn=>btn.onclick=()=>{
      const arr=readDcPensionsEditor(); arr.splice(Number(btn.dataset.delDc),1); renderDcPensionsEditor(arr); const st=readState(); renderContribEventsEditor(readContribEventsEditor(), st); renderLumpSumEventsEditor(readLumpSumEventsEditor(), st);
    });
  }

  function renderDbPensionsEditor(list){
    const wrap=getEl('dbPensionsWrap'); if(!wrap) return;
    const items=(list||[]);
    wrap.className='repeatWrap';
    if(!items.length){ wrap.innerHTML = `<div class="muted small">No defined benefit pensions added yet.</div>`; return; }
    wrap.innerHTML = items.map((p,idx)=>`
      <div class="repeatCard" data-db-idx="${idx}" data-id="${escapeHtmlAttr(p.id||newId('db'))}">
        <div class="repeatHead"><div class="repeatTitle">${escapeHtml(p.name||('DB pension '+(idx+1)))}</div><button class="miniBtn" type="button" data-del-db="${idx}">Remove</button></div>
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
    wrap.querySelectorAll('[data-del-db]').forEach(btn=>btn.onclick=()=>{
      const arr=readDbPensionsEditor(); arr.splice(Number(btn.dataset.delDb),1); renderDbPensionsEditor(arr);
    });
  }

  function renderContribEventsEditor(list, s){
    const wrap=getEl('contribEventsWrap'); if(!wrap) return;
    const items=(list||[]);
    const targetOpts=getAllDCPensionsForEditor(s).map(p=>`<option value="${escapeHtmlAttr(p.id)}">${escapeHtml(p.name)}</option>`).join('');
    wrap.className='repeatWrap';
    if(!items.length){ wrap.innerHTML = `<div class="muted small">No extra contributions added yet.</div>`; return; }
    wrap.innerHTML = items.map((c,idx)=>`
      <div class="repeatCard" data-contrib-idx="${idx}" data-id="${escapeHtmlAttr(c.id||newId('ce'))}">
        <div class="repeatHead"><div class="repeatTitle">${escapeHtml(c.name||('Contribution '+(idx+1)))}</div><button class="miniBtn" type="button" data-del-contrib="${idx}">Remove</button></div>
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
    wrap.querySelectorAll('[data-del-contrib]').forEach(btn=>btn.onclick=()=>{
      const arr=readContribEventsEditor(); arr.splice(Number(btn.dataset.delContrib),1); const st=readState(); renderContribEventsEditor(arr, st); renderLumpSumEventsEditor(readLumpSumEventsEditor(), st);
    });
  }

  function readDcPensionsEditor(){
    const wrap=getEl('dcPensionsWrap'); if(!wrap) return [];
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

  function readDbPensionsEditor(){
    const wrap=getEl('dbPensionsWrap'); if(!wrap) return [];
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

  function readContribEventsEditor(){
    const wrap=getEl('contribEventsWrap'); if(!wrap) return [];
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

  function renderLumpSumEventsEditor(list, s){
    const wrap=getEl('lumpSumEventsWrap'); if(!wrap) return;
    const items=(list||[]);
    const targetOpts = [`<option value="any-dc">Any DC pension (by withdrawal priority)</option>`].concat(getAllDCPensionsForEditor(s).map(p=>`<option value="${escapeHtmlAttr(p.id)}">${escapeHtml(p.name)}</option>`)).join('');
    wrap.className='repeatWrap';
    if(!items.length){ wrap.innerHTML = `<div class="muted small">No DC lump sums added yet.</div>`; return; }
    wrap.innerHTML = items.map((e,idx)=>`
      <div class="repeatCard" data-lump-idx="${idx}" data-id="${escapeHtmlAttr(e.id||newId('ls'))}">
        <div class="repeatHead"><div class="repeatTitle">${escapeHtml(e.name||('Lump sum '+(idx+1)))}</div><button class="miniBtn" type="button" data-del-lump="${idx}">Remove</button></div>
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
    wrap.querySelectorAll('[data-del-lump]').forEach(btn=>btn.onclick=()=>{
      const arr=readLumpSumEventsEditor(); arr.splice(Number(btn.dataset.delLump),1); renderLumpSumEventsEditor(arr, readState());
    });
  }

  function readLumpSumEventsEditor(){
    const wrap=getEl('lumpSumEventsWrap'); if(!wrap) return [];
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
  };
}
