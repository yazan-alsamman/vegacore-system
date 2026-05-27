'use client';

import { useTranslations } from 'next-intl';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: string;
}

export function DataTable<T extends object>({
  columns,
  data,
  keyField = 'id',
}: DataTableProps<T>) {
  const t = useTranslations('common');

  if (!data.length) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 sm:p-12 text-center text-[var(--color-text-secondary)]">
        {t('noData')}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
      <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-vega-navy/5 dark:bg-vega-navy/20">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="whitespace-nowrap px-3 py-3 text-start text-xs font-semibold uppercase tracking-wider text-vega-navy dark:text-vega-cyan sm:px-4 sm:py-3.5"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, rowIdx) => (
              <tr
                key={String((item as Record<string, unknown>)[keyField])}
                className={`border-b border-[var(--color-border)] last:border-0 transition-colors hover:bg-vega-cyan/5 ${
                  rowIdx % 2 === 1 ? 'bg-[var(--color-surface-secondary)]/40' : ''
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-3 text-[var(--color-text)] sm:px-4 sm:py-3.5">
                    {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
