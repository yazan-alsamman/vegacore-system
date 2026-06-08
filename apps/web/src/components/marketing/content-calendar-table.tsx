'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Trash2 } from 'lucide-react';
import { MonthNav } from '@/components/marketing/month-nav';
import { currentMonthKey, defaultDatetimeInMonth, itemInMonth } from '@/components/marketing/month-utils';
import { api } from '@/lib/api';

const PLATFORMS = ['instagram', 'facebook', 'linkedin'] as const;
const STATUSES = ['PUBLISHED', 'SCHEDULED', 'REJECTED'] as const;

type CalendarStatus = (typeof STATUSES)[number];
type Platform = (typeof PLATFORMS)[number];

export interface ContentCalendarItem {
  id: string;
  title: string;
  script?: string | null;
  platform?: string | null;
  status: string;
  publishDate?: string | null;
  metadata?: {
    idea?: string;
    clientId?: string;
    publishVideoUrl?: string;
    sourceUrl?: string;
  } | null;
  createdAt?: string;
}

interface CalendarRowState {
  id: string;
  title: string;
  idea: string;
  script: string;
  platform: Platform;
  publishDate: string;
  publishVideoUrl: string;
  sourceUrl: string;
  status: CalendarStatus;
}

interface ContentCalendarTableProps {
  clientId: string;
  items: ContentCalendarItem[];
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

function normalizePlatform(value?: string | null): Platform {
  const v = (value || 'instagram').toLowerCase();
  return PLATFORMS.includes(v as Platform) ? (v as Platform) : 'instagram';
}

function normalizeStatus(value?: string | null): CalendarStatus {
  if (value === 'PUBLISHED') return 'PUBLISHED';
  if (value === 'REJECTED') return 'REJECTED';
  return 'SCHEDULED';
}

function itemToRow(item: ContentCalendarItem): CalendarRowState {
  const meta = item.metadata || {};
  return {
    id: item.id,
    title: item.title || '',
    idea: meta.idea || '',
    script: item.script || '',
    platform: normalizePlatform(item.platform),
    publishDate: toDatetimeLocal(item.publishDate),
    publishVideoUrl: meta.publishVideoUrl || '',
    sourceUrl: meta.sourceUrl || '',
    status: normalizeStatus(item.status),
  };
}

function rowPayload(row: CalendarRowState, clientId: string) {
  return {
    title: row.title,
    script: row.script || undefined,
    platform: row.platform,
    status: row.status,
    publishDate: row.publishDate ? new Date(row.publishDate).toISOString() : undefined,
    metadata: {
      clientId,
      idea: row.idea,
      publishVideoUrl: row.publishVideoUrl || undefined,
      sourceUrl: row.sourceUrl || undefined,
    },
  };
}

const cellInput =
  'w-full min-w-[120px] rounded border border-transparent bg-transparent px-2 py-1.5 text-sm outline-none focus:border-vega-cyan/50 focus:bg-[var(--color-surface-secondary)]';

const cellText = 'px-2 py-1.5 text-sm text-[var(--color-text)]';

function hrefForUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function formatPublishDate(value: string) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

function LinkCell({ url, label }: { url: string; label?: string }) {
  const href = hrefForUrl(url);
  if (!href) return <span className={`${cellText} text-[var(--color-text-secondary)]`}>—</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${cellText} inline-block max-w-[220px] truncate text-vega-cyan underline-offset-2 hover:underline`}
      title={url}
    >
      {label || url}
    </a>
  );
}

function TextCell({ value, multiline }: { value: string; multiline?: boolean }) {
  return (
    <span className={`${cellText} block ${multiline ? 'whitespace-pre-wrap' : 'truncate max-w-[200px]'}`}>
      {value || '—'}
    </span>
  );
}

export function ContentCalendarTable({
  clientId,
  items,
  token,
  canEdit,
  canDelete,
  onChanged,
}: ContentCalendarTableProps) {
  const t = useTranslations('marketing');
  const tc = useTranslations('common');
  const [month, setMonth] = useState(currentMonthKey);

  const monthItems = useMemo(
    () => items.filter((item) => itemInMonth(item.publishDate, item.createdAt, month)),
    [items, month],
  );

  const sortedItems = useMemo(
    () => [...monthItems].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()),
    [monthItems],
  );

  const [rows, setRows] = useState<CalendarRowState[]>([]);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    setRows(sortedItems.map(itemToRow));
  }, [sortedItems]);

  const persistRow = useCallback(
    async (row: CalendarRowState) => {
      if (!token || !canEdit) return;
      setSaving((s) => ({ ...s, [row.id]: true }));
      try {
        await api(`/marketing/calendar/${row.id}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify(rowPayload(row, clientId)),
        });
      } finally {
        setSaving((s) => ({ ...s, [row.id]: false }));
      }
    },
    [token, canEdit, clientId],
  );

  const scheduleSave = useCallback(
    (row: CalendarRowState) => {
      if (!canEdit) return;
      const key = row.id;
      if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
      saveTimers.current[key] = setTimeout(() => {
        void persistRow(row);
      }, 600);
    },
    [canEdit, persistRow],
  );

  const updateRow = (id: string, patch: Partial<CalendarRowState>) => {
    setRows((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, ...patch } : r));
      const updated = next.find((r) => r.id === id);
      if (updated) scheduleSave(updated);
      return next;
    });
  };

  const addRow = async () => {
    if (!token || !canEdit) return;
    const defaultPublish = defaultDatetimeInMonth(month);
    const created = await api<{ id: string }>('/marketing/calendar', {
      method: 'POST',
      token,
      body: JSON.stringify({
        title: '',
        platform: 'instagram',
        status: 'SCHEDULED',
        publishDate: new Date(defaultPublish).toISOString(),
        metadata: { clientId, idea: '' },
      }),
    });
    await onChanged();
    setRows((prev) => [
      ...prev,
      {
        id: created.id,
        title: '',
        idea: '',
        script: '',
        platform: 'instagram',
        publishDate: defaultPublish,
        publishVideoUrl: '',
        sourceUrl: '',
        status: 'SCHEDULED',
      },
    ]);
  };

  const deleteRow = async (id: string) => {
    if (!token || !canDelete) return;
    if (saveTimers.current[id]) clearTimeout(saveTimers.current[id]);
    await api(`/marketing/calendar/${id}`, { method: 'DELETE', token });
    setRows((prev) => prev.filter((r) => r.id !== id));
    await onChanged();
  };

  const statusLabel = (status: CalendarStatus) => {
    if (status === 'PUBLISHED') return t('statusPublished');
    if (status === 'REJECTED') return t('statusCancelled');
    return t('statusPending');
  };

  return (
    <div className="space-y-3">
      <MonthNav month={month} onChange={setMonth} />
      {rows.length === 0 && !canEdit ? (
        <p className="text-sm text-[var(--color-text-secondary)]">{tc('noData')}</p>
      ) : (
      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
              <th className="px-2 py-3 text-center w-12">{t('colNumber')}</th>
              <th className="px-2 py-3 text-start min-w-[140px]">{t('colIdea')}</th>
              <th className="px-2 py-3 text-start min-w-[140px]">{t('colTitle')}</th>
              <th className="px-2 py-3 text-start min-w-[160px]">{t('script')}</th>
              <th className="px-2 py-3 text-start w-32">{tc('platform')}</th>
              <th className="px-2 py-3 text-start w-44">{t('publishDate')}</th>
              <th className="px-2 py-3 text-start min-w-[160px]">{t('publishVideoLink')}</th>
              <th className="px-2 py-3 text-start w-36">{t('contentStatus')}</th>
              <th className="px-2 py-3 text-start min-w-[160px]">{t('sourceLink')}</th>
              {canDelete && <th className="px-2 py-3 w-10" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-vega-navy/[0.02]">
                <td className="px-2 py-2 text-center text-[var(--color-text-secondary)] font-medium">
                  {index + 1}
                  {canEdit && saving[row.id] && <span className="block text-[10px] text-vega-cyan">…</span>}
                </td>
                <td className="px-1 py-1">
                  {canEdit ? (
                    <input
                      className={cellInput}
                      value={row.idea}
                      placeholder="—"
                      onChange={(e) => updateRow(row.id, { idea: e.target.value })}
                    />
                  ) : (
                    <TextCell value={row.idea} />
                  )}
                </td>
                <td className="px-1 py-1">
                  {canEdit ? (
                    <input
                      className={cellInput}
                      value={row.title}
                      placeholder="—"
                      onChange={(e) => updateRow(row.id, { title: e.target.value })}
                    />
                  ) : (
                    <TextCell value={row.title} />
                  )}
                </td>
                <td className="px-1 py-1">
                  {canEdit ? (
                    <textarea
                      className={`${cellInput} min-h-[36px] resize-y`}
                      value={row.script}
                      placeholder="—"
                      rows={1}
                      onChange={(e) => updateRow(row.id, { script: e.target.value })}
                    />
                  ) : (
                    <TextCell value={row.script} multiline />
                  )}
                </td>
                <td className="px-1 py-1">
                  {canEdit ? (
                    <select
                      className={cellInput}
                      value={row.platform}
                      onChange={(e) => updateRow(row.id, { platform: e.target.value as Platform })}
                    >
                      {PLATFORMS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <TextCell value={row.platform} />
                  )}
                </td>
                <td className="px-1 py-1">
                  {canEdit ? (
                    <input
                      type="datetime-local"
                      className={cellInput}
                      value={row.publishDate}
                      onChange={(e) => updateRow(row.id, { publishDate: e.target.value })}
                    />
                  ) : (
                    <TextCell value={formatPublishDate(row.publishDate)} />
                  )}
                </td>
                <td className="px-1 py-1">
                  {canEdit ? (
                    <input
                      type="url"
                      className={cellInput}
                      value={row.publishVideoUrl}
                      placeholder="https://"
                      onChange={(e) => updateRow(row.id, { publishVideoUrl: e.target.value })}
                    />
                  ) : (
                    <LinkCell url={row.publishVideoUrl} />
                  )}
                </td>
                <td className="px-1 py-1">
                  {canEdit ? (
                    <select
                      className={cellInput}
                      value={row.status}
                      onChange={(e) => updateRow(row.id, { status: e.target.value as CalendarStatus })}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {statusLabel(s)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <TextCell value={statusLabel(row.status)} />
                  )}
                </td>
                <td className="px-1 py-1">
                  {canEdit ? (
                    <input
                      type="url"
                      className={cellInput}
                      value={row.sourceUrl}
                      placeholder="https://"
                      onChange={(e) => updateRow(row.id, { sourceUrl: e.target.value })}
                    />
                  ) : (
                    <LinkCell url={row.sourceUrl} />
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
      )}

      {canEdit && (
        <button
          type="button"
          onClick={() => void addRow()}
          className="rounded-lg border border-dashed border-vega-cyan/40 px-4 py-2 text-sm font-medium text-vega-cyan hover:bg-vega-cyan/10"
        >
          + {t('addRow')}
        </button>
      )}
    </div>
  );
}
