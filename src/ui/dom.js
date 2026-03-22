export const $ = (id) => document.getElementById(id);

export const fmtGBP = (x) => {
  if (!isFinite(x)) return '—';
  return x.toLocaleString(undefined,{style:'currency',currency:'GBP',maximumFractionDigits:0});
};

export const fmtNum = (x) => {
  if (!isFinite(x)) return '—';
  return x.toLocaleString(undefined,{maximumFractionDigits:0});
};

export const fmtPct = (x) => {
  if (!isFinite(x)) return '—';
  return (x*100).toFixed(1)+'%';
};

export function clone(x){ return JSON.parse(JSON.stringify(x)); }
export function numVal(v){ return (v==null || Number.isNaN(Number(v))) ? '' : String(v); }
export function escapeHtml(str){ return String(str||'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
export function escapeHtmlAttr(str){ return escapeHtml(str).replace(/'/g,'&#39;'); }
export function newId(prefix){ return prefix+'_'+Math.random().toString(36).slice(2,9); }
export const nowTime = () => new Date().toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'});
