export function badge(state, text, reason = '') {
  const cls = state === 'good' ? 'good' : state === 'bad' ? 'bad' : 'warn';
  const title = reason ? ` title="${String(reason).replace(/"/g, '&quot;')}"` : '';
  return `<span class="badge ${cls}"${title}>${text}</span>`;
}

export function createToast({ getEl, window }) {
  return function toast(state, title, detail = '') {
    const wrap = getEl('toastWrap');
    if (!wrap) return;
    const el = window.document.createElement('div');
    el.className = `toast ${state || 'good'}`;
    el.innerHTML = `<div style="font-weight:700">${title}</div>${detail ? `<div class="muted small">${detail}</div>` : ''}`;
    wrap.appendChild(el);
    window.setTimeout(() => el.classList.add('show'), 10);
    window.setTimeout(() => {
      el.classList.remove('show');
      window.setTimeout(() => el.remove(), 250);
    }, 2800);
  };
}
