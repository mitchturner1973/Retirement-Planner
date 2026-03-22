export function fmtGBP(value) {
  if (!isFinite(value)) return '—';
  return Number(value).toLocaleString(undefined, {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  });
}
