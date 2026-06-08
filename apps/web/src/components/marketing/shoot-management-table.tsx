'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Trash2 } from 'lucide-react';
import { api } from '@/lib/api';

export interface ShootItem {
  id: string;
  title: string;
  scheduledAt?: string | null;
  equipment?: Record<string, unknown> | null;
  createdAt?: string;
}

export interface ModelOption {
  id: string;
  name: string;
}

export interface PhotographerOption {
  id: string;
  name: string;
}

export interface PendingContentOption {
  id: string;
  label: string;
}

interface ShootRowState {
  id: string;
  scheduledAt: string;
  modelId: string;
  photographerUserId: string;
  tools: string;
  reelsCount: string;
  contentCalendarIds: string[];
}

interface ShootManagementTableProps {
  clientId: string;
  items: ShootItem[];
  models: ModelOption[];
  photographers: PhotographerOption[];
  pendingContent: PendingContentOption[];
  token: string | null;
  canEdit: boolean;
  canDelete: boolean;
  onChanged: () => Promise<void>;
}

function toDatetimeLocal(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseEquipment(eq?: Record<string, unknown> | null) {
  const ids = eq?.contentCalendarIds;
  return {
    modelId: String(eq?.modelId || ''),
    photographerUserId: String(eq?.photographerUserId || ''),
    tools: String(eq?.tools || ''),
    reelsCount: eq?.reelsCount != null ? String(eq.reelsCount) : '',
    contentCalendarIds: Array.isArray(ids) ? (ids as string[]) : [],
  };
}

function buildTitle(ids: string[], options: PendingContentOption[]) {
  const labels = ids
    .map((id) => options.find((o) => o.id === id)?.label)
    .filter(Boolean);
  return labels.length ? labels.join(' • ') : 'تصوير';
}

function itemToRow(item: ShootItem): ShootRowState {
  const eq = parseEquipment(item.equipment);
  return {
    id: item.id,
    scheduledAt: toDatetimeLocal(item.scheduledAt),
    modelId: eq.modelId,
    photographerUserId: eq.photographerUserId,
    tools: eq.tools,
    reelsCount: eq.reelsCount,
    contentCalendarIds: eq.contentCalendarIds,
  };
}

function rowPayload(row: ShootRowState, clientId: string, pendingContent: PendingContentOption[]) {
  const reelsCount = row.reelsCount.trim() ? Number(row.reelsCount) : undefined;
  return {
    title: buildTitle(row.contentCalendarIds, pendingContent),
    scheduledAt: row.scheduledAt ? new Date(row.scheduledAt).toISOString() : undefined,
    equipment: {
      clientId,
      modelId: row.modelId || undefined,
      photographerUserId: row.photographerUserId || undefined,
      tools: row.tools || undefined,
      reelsCount: reelsCount != null && !Number.isNaN(reelsCount) ? reelsCount : undefined,
      contentCalendarIds: row.contentCalendarIds,
    },
  };
}

const cellInput =
  'w-full min-w-[100px] rounded border border-transparent bg-transparent px-2 py-1.5 text-sm outline-none focus:border-vega-cyan/50 focus:bg-[var(--color-surface-secondary)]';

const cellText = 'px-2 py-1.5 text-sm text-[var(--color-text)]';

function formatDateTime(value: string) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

function labelForId(id: string, options: { id: string; name: string }[]) {
  return options.find((o) => o.id === id)?.name || '—';
}

function contentLabels(ids: string[], options: PendingContentOption[]) {
  if (!ids.length) return '—';
  return ids.map((id) => options.find((o) => o.id === id)?.label || id).join('، ');
}

export function ShootManagementTable({
  clientId,
  items,
  models,
  photographers,
  pendingContent,
  token,
  canEdit,
  canDelete,
  onChanged,
}: ShootManagementTableProps) {
  const t = useTranslations('marketing');
  const tc = useTranslations('common');

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()),
    [items],
  );

  const [rows, setRows] = useState<ShootRowState[]>([]);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    setRows(sortedItems.map(itemToRow));
  }, [sortedItems]);

  const persistRow = useCallback(
    async (row: ShootRowState) => {
      if (!token || !canEdit) return;
      setSaving((s) => ({ ...s, [row.id]: true }));
      try {
        await api(`/media/shoots/${row.id}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify(rowPayload(row, clientId, pendingContent)),
        });
      } finally {
        setSaving((s) => ({ ...s, [row.id]: false }));
      }
    },
    [token, canEdit, clientId, pendingContent],
  );

  const scheduleSave = useCallback(
    (row: ShootRowState) => {
      if (!canEdit) return;
      const key = row.id;
      if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
      saveTimers.current[key] = setTimeout(() => {
        void persistRow(row);
      }, 600);
    },
    [canEdit, persistRow],
  );

  const updateRow = (id: string, patch: Partial<ShootRowState>) => {
    setRows((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, ...patch } : r));
      const updated = next.find((r) => r.id === id);
      if (updated) scheduleSave(updated);
      return next;
    });
  };

  const toggleContent = (rowId: string, contentId: string) => {
    setRows((prev) => {
      const next = prev.map((r) => {
        if (r.id !== rowId) return r;
        const has = r.contentCalendarIds.includes(contentId);
        const contentCalendarIds = has
          ? r.contentCalendarIds.filter((c) => c !== contentId)
          : [...r.contentCalendarIds, contentId];
        return { ...r, contentCalendarIds };
      });
      const updated = next.find((r) => r.id === rowId);
      if (updated) scheduleSave(updated);
      return next;
    });
  };

  const addRow = async () => {
    if (!token || !canEdit) return;
    const created = await api<{ id: string }>('/media/shoots', {
      method: 'POST',
      token,
      body: JSON.stringify({
        title: 'تصوير',
        equipment: { clientId, contentCalendarIds: [] },
      }),
    });
    await onChanged();
    setRows((prev) => [
      ...prev,
      {
        id: created.id,
        scheduledAt: '',
        modelId: '',
        photographerUserId: '',
        tools: '',
        reelsCount: '',
        contentCalendarIds: [],
      },
    ]);
  };

  const deleteRow = async (id: string) => {
    if (!token || !canDelete) return;
    if (saveTimers.current[id]) clearTimeout(saveTimers.current[id]);
    await api(`/media/shoots/${id}`, { method: 'DELETE', token });
    setRows((prev) => prev.filter((r) => r.id !== id));
    await onChanged();
  };

  if (rows.length === 0 && !canEdit) {
    return <p className="text-sm text-[var(--color-text-secondary)]">{tc('noData')}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <table className="w-full min-w-[1000px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
              <th className="w-12 px-2 py-3 text-center">{t('colNumber')}</th>
              <th className="min-w-[160px] px-2 py-3 text-start">{t('shootDate')}</th>
              <th className="min-w-[140px] px-2 py-3 text-start">{t('modelRequired')}</th>
              <th className="min-w-[140px] px-2 py-3 text-start">{t('photographer')}</th>
              <th className="min-w-[140px] px-2 py-3 text-start">{t('toolsRequired')}</th>
              <th className="w-28 px-2 py-3 text-start">{t('reelsToShoot')}</th>
              <th className="min-w-[200px] px-2 py-3 text-start">{t('requiredShooting')}</th>
              {canDelete && <th className="w-10 px-2 py-3" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-vega-navy/[0.02]">
                <td className="px-2 py-2 text-center font-medium text-[var(--color-text-secondary)]">
                  {index + 1}
                  {canEdit && saving[row.id] && <span className="block text-[10px] text-vega-cyan">…</span>}
                </td>
                <td className="px-1 py-1">
                  {canEdit ? (
                    <input
                      type="datetime-local"
                      className={cellInput}
                      value={row.scheduledAt}
                      onChange={(e) => updateRow(row.id, { scheduledAt: e.target.value })}
                    />
                  ) : (
                    <span className={cellText}>{formatDateTime(row.scheduledAt)}</span>
                  )}
                </td>
                <td className="px-1 py-1">
                  {canEdit ? (
                    <select
                      className={cellInput}
                      value={row.modelId}
                      onChange={(e) => updateRow(row.id, { modelId: e.target.value })}
                    >
                      <option value="">—</option>
                      {models.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={cellText}>{labelForId(row.modelId, models)}</span>
                  )}
                </td>
                <td className="px-1 py-1">
                  {canEdit ? (
                    <select
                      className={cellInput}
                      value={row.photographerUserId}
                      onChange={(e) => updateRow(row.id, { photographerUserId: e.target.value })}
                    >
                      <option value="">—</option>
                      {photographers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={cellText}>{labelForId(row.photographerUserId, photographers)}</span>
                  )}
                </td>
                <td className="px-1 py-1">
                  {canEdit ? (
                    <input
                      className={cellInput}
                      value={row.tools}
                      placeholder="—"
                      onChange={(e) => updateRow(row.id, { tools: e.target.value })}
                    />
                  ) : (
                    <span className={cellText}>{row.tools || '—'}</span>
                  )}
                </td>
                <td className="px-1 py-1">
                  {canEdit ? (
                    <input
                      type="number"
                      min={0}
                      className={`${cellInput} w-20`}
                      value={row.reelsCount}
                      placeholder="0"
                      onChange={(e) => updateRow(row.id, { reelsCount: e.target.value })}
                    />
                  ) : (
                    <span className={cellText}>{row.reelsCount || '—'}</span>
                  )}
                </td>
                <td className="px-1 py-1 align-top">
                  {canEdit ? (
                    <div className="max-h-32 overflow-y-auto rounded border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-1.5">
                      {pendingContent.length === 0 ? (
                        <p className="px-1 py-1 text-xs text-[var(--color-text-secondary)]">{t('noPendingContent')}</p>
                      ) : (
                        pendingContent.map((item) => (
                          <label key={item.id} className="flex cursor-pointer items-start gap-2 rounded px-1 py-0.5 hover:bg-vega-cyan/5">
                            <input
                              type="checkbox"
                              className="mt-1 shrink-0"
                              checked={row.contentCalendarIds.includes(item.id)}
                              onChange={() => toggleContent(row.id, item.id)}
                            />
                            <span className="text-xs leading-snug">{item.label}</span>
                          </label>
                        ))
                      )}
                    </div>
                  ) : (
                    <span className={`${cellText} block whitespace-pre-wrap`}>
                      {contentLabels(row.contentCalendarIds, pendingContent)}
                    </span>
                  )}
                </td>
                {canDelete && (
                  <td className="px-1 py-1 text-center">
                    <button
                      type="button"
                      onClick={() => void deleteRow(row.id)}
                      className="rounded p-1.5 text-vega-red hover:bg-vega-red/10"
                      title={tc('delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <button
          type="button"
          onClick={() => void addRow()}
          className="rounded-lg border border-dashed border-vega-cyan/40 px-4 py-2 text-sm font-medium text-vega-cyan hover:bg-vega-cyan/10"
        >
          + {t('addShootRow')}
        </button>
      )}
    </div>
  );
}
