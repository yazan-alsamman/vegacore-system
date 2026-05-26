'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCheck,
  Clock,
  DollarSign,
  FolderKanban,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

type NotificationCategory = 'SHOOT_APPOINTMENT' | 'TASK_DELAY' | 'PAYMENT_DUE' | 'PROJECT_DELAY';

interface NotificationItem {
  id: string;
  category: NotificationCategory | null;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
}

interface CenterResponse {
  items: NotificationItem[];
  unreadCount: number;
  byCategory: Record<NotificationCategory, number>;
}

const CATEGORY_ICONS: Record<NotificationCategory, typeof Bell> = {
  SHOOT_APPOINTMENT: Calendar,
  TASK_DELAY: Clock,
  PAYMENT_DUE: DollarSign,
  PROJECT_DELAY: FolderKanban,
};

const CATEGORY_COLORS: Record<NotificationCategory, string> = {
  SHOOT_APPOINTMENT: 'text-vega-cyan bg-vega-cyan/10',
  TASK_DELAY: 'text-amber-600 bg-amber-500/10',
  PAYMENT_DUE: 'text-vega-red bg-vega-red/10',
  PROJECT_DELAY: 'text-orange-600 bg-orange-500/10',
};

export function NotificationCenter() {
  const t = useTranslations('notifications');
  const { token } = useAuth();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<CenterResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<NotificationCategory | 'ALL'>('ALL');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api<CenterResponse>('/notifications/center', { token });
      setData(res);
    } catch {
      setData({ items: [], unreadCount: 0, byCategory: { SHOOT_APPOINTMENT: 0, TASK_DELAY: 0, PAYMENT_DUE: 0, PROJECT_DELAY: 0 } });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) load();
  }, [token, load]);

  useEffect(() => {
    if (!open) return;
    load();
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, load]);

  const markRead = async (id: string) => {
    if (!token) return;
    await api(`/notifications/${id}/read`, { method: 'PATCH', token });
    setData((prev) =>
      prev
        ? {
            ...prev,
            unreadCount: Math.max(0, prev.unreadCount - 1),
            items: prev.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
          }
        : prev,
    );
  };

  const markAllRead = async () => {
    if (!token) return;
    await api('/notifications/read-all', { method: 'PATCH', token });
    setData((prev) =>
      prev ? { ...prev, unreadCount: 0, items: prev.items.map((n) => ({ ...n, read: true })) } : prev,
    );
  };

  const onItemClick = async (item: NotificationItem) => {
    if (!item.read) await markRead(item.id);
    setOpen(false);
    if (item.link) router.push(item.link);
  };

  const items = (data?.items || []).filter((n) => filter === 'ALL' || n.category === filter);
  const unread = data?.unreadCount ?? 0;

  const filters: { key: NotificationCategory | 'ALL'; label: string }[] = [
    { key: 'ALL', label: t('all') },
    { key: 'SHOOT_APPOINTMENT', label: t('shoot') },
    { key: 'TASK_DELAY', label: t('task') },
    { key: 'PAYMENT_DUE', label: t('payment') },
    { key: 'PROJECT_DELAY', label: t('project') },
  ];

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-vega-navy transition-colors"
        title={t('title')}
        aria-label={t('title')}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute end-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-vega-red px-1 text-[10px] font-bold text-white ring-2 ring-[var(--color-surface)]">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-full z-50 mt-2 w-[min(100vw-2rem,24rem)] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <div>
              <h2 className="font-bold text-sm">{t('title')}</h2>
              <p className="text-[11px] text-[var(--color-text-secondary)]">{t('subtitle')}</p>
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="rounded-lg p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
                  title={t('markAllRead')}
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto border-b border-[var(--color-border)] px-2 py-2">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  filter === f.key
                    ? 'bg-vega-navy text-white dark:bg-vega-cyan dark:text-vega-navy'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="max-h-[min(60vh,22rem)] overflow-y-auto">
            {loading && !data ? (
              <div className="flex justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-vega-cyan border-t-transparent" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 px-4 text-center">
                <Bell className="h-8 w-8 text-[var(--color-text-secondary)] opacity-40" />
                <p className="text-sm text-[var(--color-text-secondary)]">{t('empty')}</p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {items.map((item) => {
                  const cat = item.category as NotificationCategory | null;
                  const Icon = cat ? CATEGORY_ICONS[cat] : AlertTriangle;
                  const color = cat ? CATEGORY_COLORS[cat] : 'text-[var(--color-text-secondary)] bg-[var(--color-surface-secondary)]';
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onItemClick(item)}
                        className={`flex w-full gap-3 px-4 py-3 text-start transition-colors hover:bg-[var(--color-surface-secondary)] ${
                          !item.read ? 'bg-vega-cyan/5' : ''
                        }`}
                      >
                        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="font-semibold text-sm truncate">{item.title}</span>
                            {!item.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-vega-cyan" />}
                          </span>
                          <span className="mt-0.5 block text-xs text-[var(--color-text-secondary)] line-clamp-2">
                            {item.message}
                          </span>
                          {cat && (
                            <span className="mt-1 inline-block text-[10px] font-medium text-vega-navy dark:text-vega-cyan">
                              {t(`category.${cat}`)}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-[var(--color-border)] px-4 py-2.5">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-semibold text-vega-cyan hover:underline"
            >
              {t('viewAll')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
