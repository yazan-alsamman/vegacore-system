'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
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

const fieldBase =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm leading-relaxed text-[var(--color-text)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--color-text-secondary)]/50 focus:border-vega-cyan/50 focus:ring-2 focus:ring-vega-cyan/15';

const ltrField = `${fieldBase} text-start [direction:ltr] [unicode-bidi:plaintext]`;

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

function StatusBadge({ label, status }: { label: string; status: CalendarStatus }) {
  const tone =
    status === 'PUBLISHED'
      ? 'bg-vega-green/12 text-vega-green border-vega-green/25'
      : status === 'REJECTED'
        ? 'bg-vega-red/10 text-vega-red border-vega-red/25'
        : 'bg-amber-500/12 text-amber-700 dark:text-amber-400 border-amber-500/25';

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {label}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span className="inline-flex rounded-md bg-vega-navy/8 px-2 py-1 text-xs font-medium capitalize text-vega-navy dark:bg-vega-cyan/10 dark:text-vega-cyan">
      {platform}
    </span>
  );
}

function ReadText({ value, multiline }: { value: string; multiline?: boolean }) {
  if (!value.trim()) {
    return <span className="text-sm text-[var(--color-text-secondary)]">—</span>;
  }
  return (
    <p
      className={`text-sm leading-relaxed text-[var(--color-text)] break-words ${
        multiline ? 'whitespace-pre-wrap max-h-32 overflow-y-auto' : 'line-clamp-2'
      }`}
      title={value}
    >
      {value}
    </p>
  );
}

function LinkDisplay({ url }: { url: string }) {
  const href = hrefForUrl(url);
  if (!href) return <span className="text-sm text-[var(--color-text-secondary)]">—</span>;
  const display = url.trim();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      dir="ltr"
      className="block max-w-full truncate text-sm font-medium text-vega-cyan underline-offset-2 hover:underline [direction:ltr] [unicode-bidi:plaintext]"
      title={display}
    >
      {display}
    </a>
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

  const thClass =
    'sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-3.5 text-start text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]';
  const tdClass = 'align-top border-b border-[var(--color-border)] px-3 py-3 last:border-b-0';

  return (
    <div className="space-y-4">
      <MonthNav month={month} onChange={setMonth} />

      {rows.length === 0 && !canEdit ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40 px-6 py-12 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">{tc('noData')}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] border-collapse text-sm">
              <colgroup>
                <col className="w-12" />
                <col className="w-[130px]" />
                <col className="w-[150px]" />
                <col className="w-[220px]" />
                <col className="w-[120px]" />
                <col className="w-[170px]" />
                <col className="w-[180px]" />
                <col className="w-[130px]" />
                <col className="w-[180px]" />
                {canDelete && <col className="w-12" />}
              </colgroup>
              <thead>
                <tr>
                  <th className={`${thClass} text-center`}>{t('colNumber')}</th>
                  <th className={thClass}>{t('colIdea')}</th>
                  <th className={thClass}>{t('colTitle')}</th>
                  <th className={thClass}>{t('script')}</th>
                  <th className={thClass}>{tc('platform')}</th>
                  <th className={thClass}>{t('publishDate')}</th>
                  <th className={thClass}>{t('publishVideoLink')}</th>
                  <th className={thClass}>{t('contentStatus')}</th>
                  <th className={thClass}>{t('sourceLink')}</th>
                  {canDelete && <th className={thClass} />}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-vega-cyan/[0.03] even:bg-[var(--color-surface-secondary)]/25"
                  >
                    <td className={`${tdClass} text-center`}>
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-vega-navy/8 text-xs font-bold text-vega-navy dark:bg-vega-cyan/15 dark:text-vega-cyan">
                        {index + 1}
                      </span>
                      {canEdit && saving[row.id] && (
                        <span className="mt-1 block text-[10px] font-medium text-vega-cyan">{t('saving')}</span>
                      )}
                    </td>
                    <td className={tdClass}>
                      {canEdit ? (
                        <input
                          className={fieldBase}
                          value={row.idea}
                          placeholder={t('colIdea')}
                          onChange={(e) => updateRow(row.id, { idea: e.target.value })}
                        />
                      ) : (
                        <ReadText value={row.idea} />
                      )}
                    </td>
                    <td className={tdClass}>
                      {canEdit ? (
                        <input
                          className={fieldBase}
                          value={row.title}
                          placeholder={t('colTitle')}
                          onChange={(e) => updateRow(row.id, { title: e.target.value })}
                        />
                      ) : (
                        <ReadText value={row.title} />
                      )}
                    </td>
                    <td className={tdClass}>
                      {canEdit ? (
                        <textarea
                          className={`${fieldBase} min-h-[88px] resize-y leading-relaxed`}
                          value={row.script}
                          placeholder={t('script')}
                          rows={3}
                          onChange={(e) => updateRow(row.id, { script: e.target.value })}
                        />
                      ) : (
                        <ReadText value={row.script} multiline />
                      )}
                    </td>
                    <td className={tdClass}>
                      {canEdit ? (
                        <select
                          className={fieldBase}
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
                        <PlatformBadge platform={row.platform} />
                      )}
                    </td>
                    <td className={tdClass}>
                      {canEdit ? (
                        <input
                          type="datetime-local"
                          dir="ltr"
                          className={ltrField}
                          value={row.publishDate}
                          onChange={(e) => updateRow(row.id, { publishDate: e.target.value })}
                        />
                      ) : (
                        <span dir="ltr" className="block text-sm text-[var(--color-text)] [direction:ltr] [unicode-bidi:plaintext]">
                          {formatPublishDate(row.publishDate)}
                        </span>
                      )}
                    </td>
                    <td className={tdClass}>
                      {canEdit ? (
                        <input
                          type="url"
                          dir="ltr"
                          className={ltrField}
                          value={row.publishVideoUrl}
                          placeholder="https://"
                          onChange={(e) => updateRow(row.id, { publishVideoUrl: e.target.value })}
                        />
                      ) : (
                        <LinkDisplay url={row.publishVideoUrl} />
                      )}
                    </td>
                    <td className={tdClass}>
                      {canEdit ? (
                        <select
                          className={fieldBase}
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
                        <StatusBadge label={statusLabel(row.status)} status={row.status} />
                      )}
                    </td>
                    <td className={tdClass}>
                      {canEdit ? (
                        <input
                          type="url"
                          dir="ltr"
                          className={ltrField}
                          value={row.sourceUrl}
                          placeholder="https://"
                          onChange={(e) => updateRow(row.id, { sourceUrl: e.target.value })}
                        />
                      ) : (
                        <LinkDisplay url={row.sourceUrl} />
                      )}
                    </td>
                    {canDelete && (
                      <td className={`${tdClass} text-center`}>
                        <button
                          type="button"
                          onClick={() => void deleteRow(row.id)}
                          className="rounded-lg p-2 text-vega-red transition-colors hover:bg-vega-red/10"
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
        </div>
      )}

      {canEdit && (
        <button
          type="button"
          onClick={() => void addRow()}
          className="inline-flex items-center gap-2 rounded-lg bg-vega-cyan px-4 py-2.5 text-sm font-semibold text-vega-navy shadow-sm transition-colors hover:bg-vega-cyan/90"
        >
          <Plus className="h-4 w-4" />
          {t('addRow')}
        </button>
      )}
    </div>
  );
}
