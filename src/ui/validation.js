export function renderValidationSummary(getEl, v){
  const wrap = getEl('validationSummary');
  const over = getEl('overviewWarnings');
  if(!wrap || !over) return;
  const total = v.errors.length + v.warnings.length;
  if(total===0){ wrap.style.display='none'; over.style.display='none'; wrap.innerHTML=''; over.innerHTML=''; return; }
  const items = [...v.errors.map(x=>({type:'Error',...x})), ...v.warnings.map(x=>({type:'Warning',...x}))].slice(0,6);
  const html = `<div>${v.errors.length? '⛔':'⚠️'}</div><div><div style="font-weight:700">Input checks</div><div class="muted small" style="margin-top:4px">${v.errors.length} error(s) • ${v.warnings.length} warning(s)</div><ul style="margin:8px 0 0 18px">${items.map(it=>`<li><strong>${it.type}:</strong> ${it.msg}</li>`).join('')}</ul></div>`;
  wrap.style.display='flex'; wrap.innerHTML=html;
  over.style.display='flex'; over.innerHTML=html;
}
