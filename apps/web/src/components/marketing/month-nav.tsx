'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale } from 'next-intl';
import { formatMonthLabel, shiftMonth } from '@/components/marketing/month-utils';

interface MonthNavProps {
  month: string;
  onChange: (month: string) => void;
}

export function MonthNav({ month, onChange }: MonthNavProps) {
  const locale = useLocale();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-3 shadow-sm">
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, -1))}
        className="rounded-lg p-2 text-[var(--color-text-secondary)] hover:bg-vega-cyan/10 hover:text-vega-cyan"
        aria-label="Previous month"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
      <div className="flex flex-col items-center gap-1">
        <span className="text-base font-bold text-vega-navy dark:text-vega-cyan">
          {formatMonthLabel(month, locale)}
        </span>
        <input
          type="month"
          dir="ltr"
          value={month}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs [direction:ltr]"
        />
      </div>
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, 1))}
        className="rounded-lg p-2 text-[var(--color-text-secondary)] hover:bg-vega-cyan/10 hover:text-vega-cyan"
        aria-label="Next month"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
    </div>
  );
}
