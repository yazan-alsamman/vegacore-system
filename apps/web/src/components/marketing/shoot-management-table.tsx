'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Clapperboard, Trash2 } from 'lucide-react';
import { MonthNav } from '@/components/marketing/month-nav';
import { Modal } from '@/components/ui/modal';
import { currentMonthKey, defaultDatetimeInMonth, itemInMonth } from '@/components/marketing/month-utils';
import { api } from '@/lib/api';

const PENDING_STATUS = 'SCHEDULED';

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

export interface CalendarReelItem {
  id: string;
  title: string;
  script?: string | null;
  platform?: string | null;
  status: string;
  publishDate?: string | null;
  createdAt?: string;
  metadata?: { idea?: string; clientId?: string } | null;
}

interface ShootRowState {
  id: string;
  title: string;
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
  calendarItems: CalendarReelItem[];
  models: ModelOption[];
  photographers: PhotographerOption[];
  token: string | null;
  canEdit: boolean;
  canDelete: boolean;
  onChanged: () => Promise<void>;
}

/** عنوان تقويم المحتوى (العنوان ثم الفكرة عند غياب العنوان). */
function formatReelLabel(item: CalendarReelItem): string {
  const title = item.title?.trim();
  if (title) return title;
  const idea = item.metadata?.idea?.trim();
  if (idea) return idea;
  const script = item.script?.trim();
  if (script) return script.length > 60 ? `${script.slice(0, 60)}…` : script;
  return '—';
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

function buildTitle(ids: string[], calendar: CalendarReelItem[]) {
  const labels = ids
    .map((id) => {
      const item = calendar.find((c) => c.id === id);
      return item ? formatReelLabel(item) : null;
    })
    .filter(Boolean);
  return labels.length ? labels.join(' • ') : 'تصوير';
}

function itemToRow(item: ShootItem): ShootRowState {
  const eq = parseEquipment(item.equipment);
  return {
    id: item.id,
    title: item.title || '',
    scheduledAt: toDatetimeLocal(item.scheduledAt),
    modelId: eq.modelId,
    photographerUserId: eq.photographerUserId,
    tools: eq.tools,
    reelsCount: eq.reelsCount,
    contentCalendarIds: eq.contentCalendarIds,
  };
}

function resolveReelLabels(
  ids: string[],
  calendar: CalendarReelItem[],
  shootTitle: string,
  unknownLabel: string,
): string[] {
  if (!ids.length) return [];

  const labels = ids.map((id) => {
    const item = calendar.find((c) => c.id === id);
    return item ? formatReelLabel(item) : null;
  });

  const missing = labels.filter((l) => !l).length;
  if (missing === 0) return labels as string[];

  const titleParts =
    shootTitle && shootTitle.trim() && shootTitle !== 'تصوير'
      ? shootTitle.split('•').map((s) => s.trim()).filter(Boolean)
      : [];

  return ids.map((id, index) => {
    const fromCalendar = calendar.find((c) => c.id === id);
    if (fromCalendar) return formatReelLabel(fromCalendar);
    if (titleParts[index]) return titleParts[index];
    return unknownLabel;
  });
}

function reelsForSelection(
  calendar: CalendarReelItem[],
  month: string,
  selectedIds: string[],
) {
  const inMonth = calendar.filter((c) => itemInMonth(c.publishDate, c.createdAt, month));
  const selectedOutside = selectedIds
    .filter((id) => !inMonth.some((c) => c.id === id))
    .map((id) => calendar.find((c) => c.id === id))
    .filter((c): c is CalendarReelItem => Boolean(c));

  const merged = new Map<string, CalendarReelItem>();
  for (const item of [...inMonth, ...selectedOutside]) {
    if (item.status === PENDING_STATUS || selectedIds.includes(item.id)) {
      merged.set(item.id, item);
    }
  }
  return [...merged.values()];
}

function RequiredShootingCell({
  row,
  calendarItems,
  month,
  canEdit,
  unknownLabel,
  selectLabel,
  emptyLabel,
  noPendingLabel,
  onToggle,
}: {
  row: ShootRowState;
  calendarItems: CalendarReelItem[];
  month: string;
  canEdit: boolean;
  unknownLabel: string;
  selectLabel: string;
  emptyLabel: string;
  noPendingLabel: string;
  onToggle: (contentId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const labels = resolveReelLabels(row.contentCalendarIds, calendarItems, row.title, unknownLabel);
  const options = reelsForSelection(calendarItems, month, row.contentCalendarIds);

  return (
    <>
      <div className="space-y-2">
        {labels.length ? (
          <ul className="space-y-1.5">
            {labels.map((label, i) => (
              <li
                key={`${row.id}-${i}`}
                className="flex items-start gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 px-2.5 py-2"
              >
                <Clapperboard className="mt-0.5 h-3.5 w-3.5 shrink-0 text-vega-cyan" />
                <span className="text-sm leading-relaxed text-[var(--color-text)] break-words">{label}</span>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-sm text-[var(--color-text-secondary)]">{emptyLabel}</span>
        )}
        {canEdit && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-vega-cyan/35 px-2.5 py-1.5 text-xs font-semibold text-vega-cyan hover:bg-vega-cyan/10"
          >
            {selectLabel}
          </button>
        )}
      </div>

      {canEdit && (
        <Modal open={open} onClose={() => setOpen(false)} title={selectLabel} size="lg">
          {options.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">{noPendingLabel}</p>
          ) : (
            <ul className="max-h-[min(60vh,400px)] space-y-2 overflow-y-auto">
              {options.map((item) => (
                <li key={item.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-border)] px-3 py-3 hover:border-vega-cyan/40 hover:bg-vega-cyan/5">
                    <input
                      type="checkbox"
                      className="mt-1 shrink-0"
                      checked={row.contentCalendarIds.includes(item.id)}
                      onChange={() => onToggle(item.id)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-[var(--color-text)]">
                        {formatReelLabel(item)}
                      </span>
                      {item.platform && (
                        <span className="mt-0.5 block text-xs text-[var(--color-text-secondary)]">
                          {item.platform}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </>
  );
}

function rowPayload(row: ShootRowState, clientId: string, calendar: CalendarReelItem[]) {
  const reelsCount = row.reelsCount.trim() ? Number(row.reelsCount) : undefined;
  return {
    title: buildTitle(row.contentCalendarIds, calendar),
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

function formatPublishDateTime(value: string) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

function labelForId(id: string, options: { id: string; name: string }[]) {
  return options.find((o) => o.id === id)?.name || '—';
}

export function ShootManagementTable({
  clientId,
  items,
  calendarItems,
  models,
  photographers,
  token,
  canEdit,
  canDelete,
  onChanged,
}: ShootManagementTableProps) {
  const t = useTranslations('marketing');
  const tc = useTranslations('common');
  const [month, setMonth] = useState(currentMonthKey);

  const monthItems = useMemo(
    () => items.filter((item) => itemInMonth(item.scheduledAt, item.createdAt, month)),
    [items, month],
  );

  const sortedItems = useMemo(
    () => [...monthItems].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()),
    [monthItems],
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
          body: JSON.stringify(rowPayload(row, clientId, calendarItems)),
        });
      } finally {
        setSaving((s) => ({ ...s, [row.id]: false }));
      }
    },
    [token, canEdit, clientId, calendarItems],
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
    const defaultScheduled = defaultDatetimeInMonth(month);
    const created = await api<{ id: string }>('/media/shoots', {
      method: 'POST',
      token,
      body: JSON.stringify({
        title: 'تصوير',
        scheduledAt: new Date(defaultScheduled).toISOString(),
        equipment: { clientId, contentCalendarIds: [] },
      }),
    });
    await onChanged();
    setRows((prev) => [
      ...prev,
      {
        id: created.id,
        title: 'تصوير',
        scheduledAt: defaultScheduled,
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

  return (
    <div className="space-y-3">
      <MonthNav month={month} onChange={setMonth} />
      {rows.length === 0 && !canEdit ? (
        <p className="text-sm text-[var(--color-text-secondary)]">{tc('noData')}</p>
      ) : (
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
              <th className="min-w-[220px] px-2 py-3 text-start">{t('requiredShooting')}</th>
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
                      <span className={cellText}>{formatPublishDateTime(row.scheduledAt)}</span>
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
                    <RequiredShootingCell
                      row={row}
                      calendarItems={calendarItems}
                      month={month}
                      canEdit={canEdit}
                      unknownLabel={t('unknownReel')}
                      selectLabel={t('selectReels')}
                      emptyLabel={tc('noData')}
                      noPendingLabel={t('noPendingContent')}
                      onToggle={(contentId) => toggleContent(row.id, contentId)}
                    />
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
      )}

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
