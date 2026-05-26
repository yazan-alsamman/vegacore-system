export const SYSTEM_CURRENCY = 'USD' as const;

export function formatMoney(value: number | unknown, maximumFractionDigits = 0): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: SYSTEM_CURRENCY,
    maximumFractionDigits,
  }).format(n);
}
