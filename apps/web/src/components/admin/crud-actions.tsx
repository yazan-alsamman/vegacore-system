'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePermissions } from '@/hooks/use-permissions';

interface CrudActionsProps {
  module: string;
  onEdit?: () => void;
  onDelete?: () => void;
  deleteConfirm?: string;
}

export function CrudActions({ module, onEdit, onDelete, deleteConfirm }: CrudActionsProps) {
  const t = useTranslations('common');
  const { canUpdate, canDelete } = usePermissions();

  const showEdit = canUpdate(module) && onEdit;
  const showDelete = canDelete(module) && onDelete;

  if (!showEdit && !showDelete) return null;

  const handleDelete = () => {
    const msg = deleteConfirm || t('deleteConfirm');
    if (window.confirm(msg)) onDelete?.();
  };

  return (
    <div className="flex items-center justify-end gap-1">
      {showEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg p-2 text-vega-navy hover:bg-vega-cyan/10 dark:text-vega-cyan"
          title={t('edit')}
          aria-label={t('edit')}
        >
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {showDelete && (
        <button
          type="button"
          onClick={handleDelete}
          className="rounded-lg p-2 text-vega-red hover:bg-vega-red/10"
          title={t('delete')}
          aria-label={t('delete')}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
