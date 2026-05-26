'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  BarChart3,
  Download,
  FileText,
  FolderKanban,
  Loader2,
  Users,
  Wallet,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuth } from '@/lib/auth-context';
import { api, getStoredToken } from '@/lib/api';
import { usePermissions } from '@/hooks/use-permissions';

type ReportType = 'EXECUTIVE' | 'FINANCE' | 'PROJECTS' | 'HR';

interface ReportTypeInfo {
  type: ReportType;
  title: string;
  description: string;
}

interface ReportHistory {
  id: string;
  type: ReportType;
  title: string;
  fileName: string;
  fileSize?: number | null;
  createdAt: string;
  generatedBy: { firstName: string; lastName: string };
}

const TYPE_ICONS: Record<ReportType, typeof FileText> = {
  EXECUTIVE: BarChart3,
  FINANCE: Wallet,
  PROJECTS: FolderKanban,
  HR: Users,
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function ReportsPage() {
  const t = useTranslations('reports');
  const { token } = useAuth();
  const { has } = usePermissions();
  const [types, setTypes] = useState<ReportTypeInfo[]>([]);
  const [history, setHistory] = useState<ReportHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<ReportType | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const data = await api<{ types: ReportTypeInfo[]; history: ReportHistory[] }>('/reports', { token });
    setTypes(data.types);
    setHistory(data.history);
  }, [token]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const generate = async (type: ReportType) => {
    if (!token || !has('reports.generate')) return;
    setGenerating(type);
    try {
      await api('/reports/generate', {
        method: 'POST',
        token,
        body: JSON.stringify({ type }),
      });
      await load();
    } catch (e) {
      console.error(e);
      alert(t('generateError'));
    } finally {
      setGenerating(null);
    }
  };

  const download = async (id: string, fileName: string) => {
    const tkn = getStoredToken();
    if (!tkn) return;
    const res = await fetch(`${API_URL}/reports/${id}/download`, {
      headers: { Authorization: `Bearer ${tkn}` },
    });
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatSize = (bytes?: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <DashboardLayout title={t('title')} module="reports">
      <p className="mb-6 text-sm text-[var(--color-text-secondary)]">{t('description')}</p>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-vega-cyan" />
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {types.map((rt) => {
              const Icon = TYPE_ICONS[rt.type];
              const busy = generating === rt.type;
              return (
                <div
                  key={rt.type}
                  className="flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
                >
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-vega-navy/10 text-vega-navy dark:bg-vega-cyan/15 dark:text-vega-cyan">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-sm">{t(`types.${rt.type}.title`)}</h3>
                  <p className="mt-1 flex-1 text-xs text-[var(--color-text-secondary)]">
                    {t(`types.${rt.type}.description`)}
                  </p>
                  {has('reports.generate') && (
                    <button
                      type="button"
                      disabled={!!generating}
                      onClick={() => generate(rt.type)}
                      className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      style={{ background: 'var(--vega-gradient)' }}
                    >
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                      {busy ? t('generating') : t('generatePdf')}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="border-b border-[var(--color-border)] px-5 py-4">
              <h2 className="font-semibold">{t('history')}</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">{t('historyHint')}</p>
            </div>
            {history.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-[var(--color-text-secondary)]">{t('noHistory')}</p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {history.map((item) => {
                  const Icon = TYPE_ICONS[item.type];
                  return (
                    <li key={item.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-secondary)] text-vega-navy dark:text-vega-cyan">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{item.title}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {item.generatedBy.firstName} {item.generatedBy.lastName} ·{' '}
                          {new Date(item.createdAt).toLocaleString()} · {formatSize(item.fileSize)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => download(item.id, item.fileName)}
                        className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-semibold hover:border-vega-cyan hover:text-vega-cyan"
                      >
                        <Download className="h-4 w-4" />
                        {t('download')}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </DashboardLayout>
  );
}
