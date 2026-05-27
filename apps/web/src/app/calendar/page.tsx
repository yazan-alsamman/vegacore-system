'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { CalendarDays, ChevronLeft, ChevronRight, Camera, Clapperboard, Package, Users } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

type EventType = 'SHOOT' | 'REEL_PUBLISH' | 'DELIVERY' | 'MEETING';

interface CalendarEvent {
  id: string;
  type: EventType;
  title: string;
  description?: string;
  start: string;
  end?: string;
  allDay: boolean;
  link?: string;
  status?: string;
}

const TYPE_STYLE: Record<EventType, { bg: string; text: string; icon: typeof Camera }> = {
  SHOOT: { bg: 'bg-vega-cyan/15', text: 'text-vega-cyan', icon: Camera },
  REEL_PUBLISH: { bg: 'bg-pink-500/15', text: 'text-pink-600 dark:text-pink-400', icon: Clapperboard },
  DELIVERY: { bg: 'bg-amber-500/15', text: 'text-amber-700 dark:text-amber-400', icon: Package },
  MEETING: { bg: 'bg-vega-navy/10', text: 'text-vega-navy dark:text-vega-cyan', icon: Users },
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function eventDayKey(iso: string) {
  const d = new Date(iso);
  return dayKey(d);
}

export default function CalendarPage() {
  const t = useTranslations('calendar');
  const locale = useLocale();
  const { token, user } = useAuth();
  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const from = dayKey(new Date(year, month, 1));
      const to = dayKey(new Date(year, month + 1, 0));
      const data = await api<CalendarEvent[]>(`/calendar/events?from=${from}&to=${to}`, { token });
      setEvents(data);
    } finally {
      setLoading(false);
    }
  }, [token, year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of events) {
      const key = eventDayKey(e.start);
      (map[key] ||= []).push(e);
    }
    return map;
  }, [events]);

  const gridDays = useMemo(() => {
    const firstDow = monthStart.getDay();
    const daysInMonth = monthEnd.getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor, monthStart, monthEnd]);

  const monthLabel = monthStart.toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

  const today = new Date();
  const selectedEvents = selectedDay ? eventsByDay[selectedDay] || [] : [];

  const formatTime = (iso: string, allDay: boolean) => {
    if (allDay) return t('allDay');
    return new Date(iso).toLocaleTimeString(locale === 'ar' ? 'ar-AE' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <DashboardLayout title={t('title')} module="calendar">
      <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
        {t('personalHint', { name: user?.firstName || '' })}
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {(Object.keys(TYPE_STYLE) as EventType[]).map((type) => {
          const s = TYPE_STYLE[type];
          const Icon = s.icon;
          return (
            <span key={type} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${s.bg} ${s.text}`}>
              <Icon className="h-3.5 w-3.5" />
              {t(`types.${type}`)}
            </span>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <button
              type="button"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              className="rounded-lg p-2 hover:bg-[var(--color-surface-secondary)]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="flex items-center gap-2 font-bold">
              <CalendarDays className="h-5 w-5 text-vega-cyan" />
              {monthLabel}
            </h2>
            <button
              type="button"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              className="rounded-lg p-2 hover:bg-[var(--color-surface-secondary)]"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-center text-[9px] sm:text-[11px] font-semibold text-[var(--color-text-secondary)]">
            {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((d) => (
              <div key={d} className="py-2">{t(`weekdays.${d}`)}</div>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-vega-cyan border-t-transparent" />
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {gridDays.map((day, i) => {
                if (!day) {
                  return <div key={`empty-${i}`} className="min-h-[56px] sm:min-h-[72px] lg:min-h-[88px] border-b border-e border-[var(--color-border)] bg-[var(--color-surface-secondary)]/40" />;
                }
                const key = dayKey(day);
                const dayEvents = eventsByDay[key] || [];
                const isToday = sameDay(day, today);
                const isSelected = selectedDay === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDay(key)}
                    className={`min-h-[56px] sm:min-h-[72px] lg:min-h-[88px] border-b border-e border-[var(--color-border)] p-1.5 text-start transition-colors hover:bg-[var(--color-surface-secondary)] ${
                      isSelected ? 'bg-vega-cyan/10 ring-1 ring-inset ring-vega-cyan/40' : ''
                    }`}
                  >
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        isToday ? 'bg-vega-navy text-white dark:bg-vega-cyan dark:text-vega-navy' : ''
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 3).map((ev) => {
                        const st = TYPE_STYLE[ev.type];
                        return (
                          <span
                            key={ev.id}
                            className={`block truncate rounded px-1 py-0.5 text-[9px] font-semibold ${st.bg} ${st.text}`}
                          >
                            {ev.title}
                          </span>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <span className="text-[9px] text-[var(--color-text-secondary)]">+{dayEvents.length - 3}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <aside className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h3 className="mb-1 font-semibold">
            {selectedDay
              ? new Date(selectedDay + 'T12:00:00').toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-US', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })
              : t('selectDay')}
          </h3>
          <p className="mb-4 text-xs text-[var(--color-text-secondary)]">
            {selectedDay ? t('eventsCount', { count: selectedEvents.length }) : t('selectDayHint')}
          </p>

          {!selectedDay ? (
            <p className="text-sm text-[var(--color-text-secondary)]">{t('selectDayHint')}</p>
          ) : selectedEvents.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">{t('noEvents')}</p>
          ) : (
            <ul className="space-y-3">
              {selectedEvents.map((ev) => {
                const st = TYPE_STYLE[ev.type];
                const Icon = st.icon;
                const inner = (
                  <>
                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${st.bg} ${st.text}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-vega-navy dark:text-vega-cyan">{t(`types.${ev.type}`)}</span>
                      <span className="block font-semibold text-sm">{ev.title}</span>
                      {ev.description && (
                        <span className="mt-0.5 block text-xs text-[var(--color-text-secondary)]">{ev.description}</span>
                      )}
                      <span className="mt-1 block text-[11px] text-[var(--color-text-secondary)]">
                        {formatTime(ev.start, ev.allDay)}
                        {ev.end && !ev.allDay && ` – ${formatTime(ev.end, false)}`}
                      </span>
                    </span>
                  </>
                );

                return (
                  <li key={ev.id}>
                    {ev.link ? (
                      <Link href={ev.link} className="flex gap-3 rounded-lg border border-[var(--color-border)] p-3 hover:border-vega-cyan/50">
                        {inner}
                      </Link>
                    ) : (
                      <div className="flex gap-3 rounded-lg border border-[var(--color-border)] p-3">{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </DashboardLayout>
  );
}
