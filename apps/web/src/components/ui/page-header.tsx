import { Plus } from 'lucide-react';

export function PageHeader({
  description,
  actionLabel,
  onAction,
  showAction = true,
}: {
  description?: string;
  actionLabel: string;
  onAction: () => void;
  showAction?: boolean;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      {description && (
        <p className="text-[var(--color-text-secondary)]">{description}</p>
      )}
      {showAction && (
        <button
          type="button"
          onClick={onAction}
          className="ms-auto inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
          style={{ background: 'var(--vega-gradient)' }}
        >
          <Plus className="h-4 w-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
