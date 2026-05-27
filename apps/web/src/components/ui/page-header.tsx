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
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
      {description && (
        <p className="text-sm sm:text-base text-[var(--color-text-secondary)]">{description}</p>
      )}
      {showAction && (
        <button
          type="button"
          onClick={onAction}
          className="w-full sm:w-auto sm:ms-auto inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
          style={{ background: 'var(--vega-gradient)' }}
        >
          <Plus className="h-4 w-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
