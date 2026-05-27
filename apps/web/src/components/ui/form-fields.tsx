import clsx from 'clsx';

const inputClass =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-2.5 text-sm transition-colors focus:outline-none focus:border-vega-cyan focus:ring-2 focus:ring-vega-cyan/20';

export function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold">
        {label}
        {required && <span className="text-vega-red ms-1">*</span>}
      </label>
      {children}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputClass} {...props} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(inputClass, 'min-h-[88px] resize-y')} {...props} />;
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={inputClass} {...props} />;
}

/** Two-column form row — stacks on mobile */
export function FormGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx('grid grid-cols-1 gap-3 sm:grid-cols-2', className)}>{children}</div>;
}

export function FormActions({
  onCancel,
  submitLabel,
  cancelLabel = 'Cancel',
  loading,
}: {
  onCancel: () => void;
  submitLabel: string;
  cancelLabel?: string;
  loading?: boolean;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:gap-3">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium hover:bg-[var(--color-surface-secondary)]"
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        disabled={loading}
        className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        style={{ background: 'var(--vega-gradient)' }}
      >
        {loading ? '...' : submitLabel}
      </button>
    </div>
  );
}
