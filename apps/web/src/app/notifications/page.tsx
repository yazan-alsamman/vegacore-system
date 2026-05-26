'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  AlertTriangle,
  Calendar,
  CheckCheck,
  Clock,
  DollarSign,
  FolderKanban,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

type NotificationCategory = 'SHOOT_APPOINTMENT' | 'TASK_DELAY' | 'PAYMENT_DUE' | 'PROJECT_DELAY';

interface NotificationItem {
  id: string;
  category: NotificationCategory | null;
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

const CATEGORY_ICONS = {
  SHOOT_APPOINTMENT: Calendar,
  TASK_DELAY: Clock,
  PAYMENT_DUE: DollarSign,
  PROJECT_DELAY: FolderKanban,
} as const;

export default function NotificationsPage() {
  const t = useTranslations('notifications');
  const { token } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<CenterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NotificationCategory | 'ALL'>('ALL');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setData(await api<CenterResponse>('/notifications/center', { token }));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const markAllRead = async () => {
    if (!token) return;
    await api('/notifications/read-all', { method: 'PATCH', token });
    await load();
  };

  const onItemClick = async (item: NotificationItem) => {
    if (!token) return;
    if (!item.read) await api(`/notifications/${item.id}/read`, { method: 'PATCH', token });
    if (item.link) router.push(item.link);
    else await load();
  };

  const items = (data?.items || []).filter((n) => filter === 'ALL' || n.category === filter);

  const filters: { key: NotificationCategory | 'ALL'; label: string; count?: number }[] = [
    { key: 'ALL', label: t('all'), count: data?.items.length },
    { key: 'SHOOT_APPOINTMENT', label: t('shoot'), count: data?.byCategory.SHOOT_APPOINTMENT },
    { key: 'TASK_DELAY', label: t('task'), count: data?.byCategory.TASK_DELAY },
    { key: 'PAYMENT_DUE', label: t('payment'), count: data?.byCategory.PAYMENT_DUE },
    { key: 'PROJECT_DELAY', label: t('project'), count: data?.byCategory.PROJECT_DELAY },
  ];

  return (
    <DashboardLayout title={t('title')}>
      <p className="mb-6 text-[var(--color-text-secondary)]">{t('pageDescription')}</p>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                filter === f.key
                  ? 'bg-vega-navy text-white dark:bg-vega-cyan dark:text-vega-navy'
                  : 'border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]'
              }`}
            >
              {f.label}
              {f.count != null && f.count > 0 && (
                <span className="ms-1.5 rounded-full bg-white/20 px-1.5 text-[10px]">{f.count}</span>
              )}
            </button>
          ))}
        </div>
        {(data?.unreadCount ?? 0) > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm font-semibold hover:bg-[var(--color-surface-secondary)]"
          >
            <CheckCheck className="h-4 w-4" />
            {t('markAllRead')}
          </button>
        )}
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-vega-cyan border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--color-text-secondary)]">{t('empty')}</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {items.map((item) => {
              const cat = item.category as NotificationCategory | null;
              const Icon = cat ? CATEGORY_ICONS[cat] : AlertTriangle;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onItemClick(item)}
                    className={`flex w-full gap-4 px-5 py-4 text-start hover:bg-[var(--color-surface-secondary)] ${
                      !item.read ? 'bg-vega-cyan/5' : ''
                    }`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-secondary)] text-vega-navy dark:text-vega-cyan">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-semibold">{item.title}</span>
                        {!item.read && (
                          <span className="rounded-full bg-vega-cyan/20 px-2 py-0.5 text-[10px] font-bold text-vega-cyan">
                            {t('new')}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-sm text-[var(--color-text-secondary)]">{item.message}</span>
                      <span className="mt-2 flex flex-wrap gap-2 text-[11px] text-[var(--color-text-secondary)]">
                        {cat && <span>{t(`category.${cat}`)}</span>}
                        <span>·</span>
                        <span>{new Date(item.createdAt).toLocaleString()}</span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
}
