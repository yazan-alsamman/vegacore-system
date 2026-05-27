import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  variant?: 'default' | 'warning' | 'success' | 'danger' | 'cyan' | 'navy';
}

export function StatCard({ title, value, icon: Icon, trend, variant = 'default' }: StatCardProps) {
  const variants = {
    default: { bg: 'bg-vega-navy/10', text: 'text-vega-navy dark:text-vega-cyan', border: 'border-vega-navy/20' },
    navy: { bg: 'bg-vega-navy/10', text: 'text-vega-navy dark:text-vega-cyan', border: 'border-vega-navy/20' },
    cyan: { bg: 'bg-vega-cyan/10', text: 'text-vega-cyan', border: 'border-vega-cyan/20' },
    warning: { bg: 'bg-vega-gold/10', text: 'text-[#c8870a]', border: 'border-vega-gold/30' },
    success: { bg: 'bg-vega-green/10', text: 'text-vega-green', border: 'border-vega-green/20' },
    danger: { bg: 'bg-vega-red/10', text: 'text-vega-red', border: 'border-vega-red/20' },
  };

  const v = variants[variant];

  return (
    <div className="group relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-vega-gradient opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">{title}</p>
          <p className="mt-1 sm:mt-2 text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight break-words">{value}</p>
          {trend && <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{trend}</p>}
        </div>
        <div className={clsx('rounded-xl border p-3', v.bg, v.text, v.border)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
