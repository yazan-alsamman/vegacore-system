/** YYYY-MM */
export function currentMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthKeyFromDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return currentMonthKey(d);
}

export function itemInMonth(
  primaryDate?: string | null,
  fallbackDate?: string | null,
  month?: string,
): boolean {
  if (!month) return true;
  const key = monthKeyFromDate(primaryDate) || monthKeyFromDate(fallbackDate);
  return key === month;
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return currentMonthKey(d);
}

export function formatMonthLabel(month: string, locale?: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString(locale || undefined, { month: 'long', year: 'numeric' });
}

export function defaultDatetimeInMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const now = new Date();
  if (now.getFullYear() === y && now.getMonth() + 1 === m) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${y}-${pad(m)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }
  return `${month}-01T10:00`;
}
