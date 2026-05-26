'use client';

import { useTranslations } from 'next-intl';
import { Clock, Film, Hash, Lightbulb, Mic, Target, Wrench } from 'lucide-react';

function labelKey(key: string): string {
  const map: Record<string, string> = {
    hook: 'hook',
    script: 'script',
    cta: 'cta',
    scenes: 'scenes',
    hashtags: 'hashtags',
    duration: 'duration',
    summary: 'summary',
    weeks: 'weeks',
    assignments: 'assignments',
    healthScore: 'healthScore',
    insights: 'insights',
    strengths: 'strengths',
    risks: 'risks',
    recommendations: 'recommendations',
    recommendedServices: 'recommendedServices',
    nextActions: 'nextActions',
    severity: 'severity',
    rootCause: 'rootCause',
    fixSteps: 'fixSteps',
    affectedAreas: 'affectedAreas',
    prevention: 'prevention',
    codeSnippet: 'codeSnippet',
    kpis: 'kpis',
  };
  return map[key] || key;
}

function isScene(item: unknown): item is { time?: string; visual?: string; text?: string } {
  return typeof item === 'object' && item !== null && ('visual' in item || 'text' in item || 'time' in item);
}

function StringList({ items, icon: Icon }: { items: string[]; icon?: typeof Hash }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <li
          key={i}
          className="inline-flex items-center gap-1 rounded-full bg-vega-cyan/10 px-3 py-1 text-xs font-medium text-vega-cyan"
        >
          {Icon && <Icon className="h-3 w-3 shrink-0" />}
          {item}
        </li>
      ))}
    </ul>
  );
}

function ScenesList({ scenes }: { scenes: { time?: string; visual?: string; text?: string }[] }) {
  const t = useTranslations('ai');
  return (
    <div className="space-y-3">
      {scenes.map((scene, i) => (
        <div
          key={i}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] overflow-hidden"
        >
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-vega-navy/5 dark:bg-vega-navy/20 px-4 py-2">
            <Film className="h-4 w-4 text-vega-cyan shrink-0" />
            <span className="text-xs font-bold text-vega-cyan">
              {t('scene')} {i + 1}
            </span>
            {scene.time && (
              <span className="ms-auto inline-flex items-center gap-1 rounded-full bg-vega-cyan/15 px-2 py-0.5 text-[10px] font-semibold text-vega-cyan">
                <Clock className="h-3 w-3" />
                {scene.time}
              </span>
            )}
          </div>
          <div className="space-y-3 p-4 text-sm">
            {scene.visual && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                  {t('visual')}
                </p>
                <p className="text-[var(--color-text-primary)] leading-relaxed">{scene.visual}</p>
              </div>
            )}
            {scene.text && (
              <div className="rounded-lg border border-vega-cyan/20 bg-vega-cyan/5 px-3 py-2">
                <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-vega-cyan">
                  <Mic className="h-3 w-3" />
                  {t('voiceover')}
                </p>
                <p className="font-medium leading-relaxed">{scene.text}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function AssignmentsList({
  items,
}: {
  items: { taskTitle?: string; assigneeName?: string; reason?: string; priority?: string; estimatedHours?: number }[];
}) {
  const t = useTranslations('ai');
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
      <table className="w-full text-sm">
        <thead className="bg-vega-navy/5 dark:bg-vega-navy/20">
          <tr>
            <th className="px-3 py-2 text-start font-semibold">{t('task')}</th>
            <th className="px-3 py-2 text-start font-semibold">{t('assignee')}</th>
            <th className="px-3 py-2 text-start font-semibold">{t('priority')}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row, i) => (
            <tr key={i} className="border-t border-[var(--color-border)]">
              <td className="px-3 py-2 font-medium">{row.taskTitle || '—'}</td>
              <td className="px-3 py-2">{row.assigneeName || '—'}</td>
              <td className="px-3 py-2">
                <span className="rounded bg-vega-cyan/10 px-2 py-0.5 text-xs font-semibold text-vega-cyan">
                  {row.priority || '—'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.some((r) => r.reason) && (
        <ul className="border-t border-[var(--color-border)] p-3 space-y-1 text-xs text-[var(--color-text-secondary)]">
          {items.filter((r) => r.reason).map((r, i) => (
            <li key={i}>
              <span className="font-medium text-[var(--color-text-primary)]">{r.taskTitle}:</span> {r.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WeeksPlan({ weeks }: { weeks: { week?: number; items?: { day?: string; type?: string; title?: string; idea?: string; platform?: string }[] }[] }) {
  const t = useTranslations('ai');
  return (
    <div className="space-y-4">
      {weeks.map((w, wi) => (
        <div key={wi} className="rounded-xl border border-[var(--color-border)] p-4">
          <p className="mb-3 font-semibold text-vega-cyan">
            {t('week')} {w.week ?? wi + 1}
          </p>
          <ul className="space-y-2">
            {(w.items || []).map((item, ii) => (
              <li key={ii} className="flex flex-wrap gap-2 rounded-lg bg-[var(--color-surface-secondary)] px-3 py-2 text-sm">
                <span className="font-medium">{item.day}</span>
                {item.type && (
                  <span className="rounded bg-vega-cyan/10 px-2 py-0.5 text-[10px] font-bold uppercase text-vega-cyan">
                    {item.type}
                  </span>
                )}
                <span className="w-full font-medium">{item.title}</span>
                {item.idea && <span className="w-full text-[var(--color-text-secondary)]">{item.idea}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ServicesList({ items }: { items: { service?: string; reason?: string; priority?: string }[] }) {
  return (
    <ul className="space-y-2">
      {items.map((s, i) => (
        <li key={i} className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm">
          <p className="font-semibold">{s.service}</p>
          {s.reason && <p className="text-[var(--color-text-secondary)]">{s.reason}</p>}
          {s.priority && (
            <span className="mt-1 inline-block rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-600">
              {s.priority}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function renderValue(key: string, value: unknown, t: ReturnType<typeof useTranslations<'ai'>>): React.ReactNode {
  if (value === null || value === undefined) return null;

  if (key === 'scenes' && Array.isArray(value) && value.every(isScene)) {
    return <ScenesList scenes={value} />;
  }

  if (key === 'hashtags' && Array.isArray(value) && value.every((x) => typeof x === 'string')) {
    return <StringList items={value as string[]} icon={Hash} />;
  }

  if (
    (key === 'insights' || key === 'strengths' || key === 'risks' || key === 'recommendations' || key === 'nextActions' || key === 'fixSteps' || key === 'affectedAreas' || key === 'prevention' || key === 'kpis') &&
    Array.isArray(value) &&
    value.every((x) => typeof x === 'string')
  ) {
    return <StringList items={value as string[]} icon={Lightbulb} />;
  }

  if (key === 'assignments' && Array.isArray(value)) {
    return <AssignmentsList items={value as Parameters<typeof AssignmentsList>[0]['items']} />;
  }

  if (key === 'weeks' && Array.isArray(value)) {
    return <WeeksPlan weeks={value as Parameters<typeof WeeksPlan>[0]['weeks']} />;
  }

  if (key === 'recommendedServices' && Array.isArray(value)) {
    return <ServicesList items={value as Parameters<typeof ServicesList>[0]['items']} />;
  }

  if (key === 'healthScore' && typeof value === 'number') {
    return (
      <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-2">
        <Target className="h-5 w-5 text-emerald-500" />
        <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{value}%</span>
      </div>
    );
  }

  if (key === 'severity' && typeof value === 'string') {
    const colors: Record<string, string> = {
      LOW: 'bg-slate-500/15 text-slate-600',
      MEDIUM: 'bg-amber-500/15 text-amber-600',
      HIGH: 'bg-orange-500/15 text-orange-600',
      CRITICAL: 'bg-vega-red/15 text-vega-red',
    };
    return (
      <span className={`inline-block rounded-lg px-3 py-1 text-sm font-bold ${colors[value] || colors.MEDIUM}`}>
        {value}
      </span>
    );
  }

  if (typeof value === 'string') {
    const isLong = value.length > 120 || value.includes('\n');
    if (key === 'script' || key === 'hook' || key === 'codeSnippet') {
      return (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-4">
          <p className="whitespace-pre-wrap leading-relaxed">{value}</p>
        </div>
      );
    }
    return (
      <p className={`text-[var(--color-text-secondary)] ${isLong ? 'whitespace-pre-wrap leading-relaxed' : ''}`}>
        {value}
      </p>
    );
  }

  if (Array.isArray(value) && value.every(isScene)) {
    return <ScenesList scenes={value} />;
  }

  if (Array.isArray(value) && value.every((x) => typeof x === 'string')) {
    return <StringList items={value as string[]} />;
  }

  return (
    <pre className="overflow-auto rounded-lg bg-[var(--color-surface-secondary)] p-3 text-xs">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

const LABEL_KEYS = [
  'hook', 'script', 'cta', 'scenes', 'hashtags', 'duration', 'summary', 'weeks', 'week',
  'assignments', 'task', 'assignee', 'priority', 'healthScore', 'insights', 'strengths',
  'risks', 'recommendations', 'recommendedServices', 'nextActions', 'severity', 'rootCause',
  'fixSteps', 'affectedAreas', 'prevention', 'codeSnippet', 'kpis', 'scene', 'visual', 'voiceover',
] as const;

const ORDER = [
  'hook',
  'script',
  'scenes',
  'cta',
  'hashtags',
  'duration',
  'summary',
  'healthScore',
  'weeks',
  'assignments',
  'recommendedServices',
  'severity',
  'rootCause',
  'fixSteps',
  'codeSnippet',
];

export function AiResultView({ data }: { data: Record<string, unknown> }) {
  const t = useTranslations('ai');

  if (data.error) {
    return <p className="text-sm text-vega-red">{String(data.error)}</p>;
  }

  const entries = Object.entries(data)
    .filter(([k]) => !k.startsWith('_'))
    .sort(([a], [b]) => {
      const ia = ORDER.indexOf(a);
      const ib = ORDER.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

  const iconFor = (key: string) => {
    if (key === 'scenes') return Film;
    if (key === 'fixSteps' || key === 'codeSnippet') return Wrench;
    if (key === 'hook' || key === 'script') return Mic;
    return Lightbulb;
  };

  return (
    <div className="space-y-5 text-sm">
      {entries.map(([key, value]) => {
        const Icon = iconFor(key);
        const lk = labelKey(key);
        const title = (LABEL_KEYS as readonly string[]).includes(lk)
          ? t(lk as (typeof LABEL_KEYS)[number])
          : key.replace(/([A-Z])/g, ' $1');
        return (
          <section key={key}>
            <h4 className="mb-2 flex items-center gap-2 font-semibold text-vega-cyan">
              <Icon className="h-4 w-4 shrink-0" />
              {title}
            </h4>
            {renderValue(key, value, t)}
          </section>
        );
      })}
    </div>
  );
}
