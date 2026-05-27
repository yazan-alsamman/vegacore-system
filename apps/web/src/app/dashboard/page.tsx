'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertTriangle,
  Briefcase,
  Clock,
  DollarSign,
  FolderKanban,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { DashboardExecutiveCharts } from '@/components/charts/lazy-charts';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { StatCard } from '@/components/ui/stat-card';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/money';

// re-export alias for chart props
const money = formatMoney;

interface ExecutiveData {
  overview: {
    totalProjects: number;
    activeProjects: number;
    delayedProjects: number;
    delayedTasks: number;
    activeClients: number;
    monthlyRevenue: number;
    monthlyExpenses: number;
    monthlyProfit: number;
    collectionRate: number;
    overdueInvoicesCount: number;
    overdueAmount: number;
    pendingApprovals: number;
    avgPerformanceScore: number | null;
    busyEmployeesCount: number;
  };
  projects: {
    id: string;
    name: string;
    status: string;
    progress: number;
    endDate?: string;
    isDelayed: boolean;
    client?: { companyName: string };
    delayedTasks: number;
  }[];
  delayedTasks: {
    id: string;
    title: string;
    priority: string;
    daysOverdue: number;
    project?: { name: string };
    assignee?: string | null;
  }[];
  busyEmployees: {
    id: string;
    name: string;
    department?: string;
    workload: number;
    activeTasks: number;
    busy: boolean;
  }[];
  overdueClients: {
    clientId: string;
    companyName: string;
    totalDue: number;
    invoiceCount: number;
  }[];
  performance: {
    avgScore: number | null;
    recentReports: { employee: string; score: number; period: string; department?: string }[];
    projectHealth: { id: string; name: string; progress: number; onTrack: boolean; isDelayed: boolean }[];
  };
  revenueByMonth: { month: string; revenue: number; expenses: number; profit: number }[];
  charts: {
    tasksByStatus?: { status: string; _count: number }[];
    clientsByStatus?: { status: string; _count: number }[];
    projectsByStatus?: { status: string; _count: number }[];
  };
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const { token } = useAuth();
  const { canRead } = usePermissions();
  const showFinance = canRead('finance');
  const [data, setData] = useState<ExecutiveData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api<ExecutiveData>('/dashboard/executive', { token })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const overview = data?.overview;
  const profitChart = showFinance
    ? (data?.revenueByMonth || []).map((m) => ({
        name: m.month.slice(5),
        revenue: m.revenue,
        profit: m.profit,
      }))
    : [];
  const taskChartData = data?.charts?.tasksByStatus?.map((x) => ({ name: x.status, value: x._count })) || [];
  const projectChartData = data?.charts?.projectsByStatus?.map((x) => ({ name: x.status, value: x._count })) || [];

  if (loading && !data) {
    return (
      <DashboardLayout title={t('title')} module="dashboard">
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('title')} module="dashboard">
      <p className="mb-6 text-[var(--color-text-secondary)]">{t('description')}</p>

      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6 mb-6">
        <StatCard title={t('totalProjects')} value={overview?.totalProjects ?? 0} icon={FolderKanban} variant="navy" />
        <StatCard title={t('delayedTasks')} value={overview?.delayedTasks ?? 0} icon={AlertTriangle} variant="warning" />
        <StatCard title={t('delayedProjects')} value={overview?.delayedProjects ?? 0} icon={Clock} variant="danger" />
        {showFinance && (
          <>
            <StatCard
              title={t('monthlyProfit')}
              value={money(overview?.monthlyProfit ?? 0)}
              icon={(overview?.monthlyProfit ?? 0) >= 0 ? TrendingUp : TrendingDown}
              variant={(overview?.monthlyProfit ?? 0) >= 0 ? 'success' : 'warning'}
            />
            <StatCard title={t('collectionRate')} value={`${overview?.collectionRate ?? 0}%`} icon={Wallet} />
          </>
        )}
        <StatCard title={t('busyEmployees')} value={overview?.busyEmployeesCount ?? 0} icon={Users} variant="cyan" />
      </div>

      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {showFinance && (
          <>
            <StatCard title={t('monthlyRevenue')} value={money(overview?.monthlyRevenue ?? 0)} icon={DollarSign} variant="success" />
            <StatCard title={t('overduePayments')} value={money(overview?.overdueAmount ?? 0)} icon={AlertTriangle} variant="danger" />
          </>
        )}
        <StatCard title={t('activeClients')} value={overview?.activeClients ?? 0} icon={Briefcase} />
        <StatCard
          title={t('performanceScore')}
          value={overview?.avgPerformanceScore != null ? `${overview.avgPerformanceScore}%` : tc('dash')}
          icon={TrendingUp}
        />
      </div>

      <DashboardExecutiveCharts
        profitChart={profitChart}
        taskChartData={taskChartData}
        projectChartData={projectChartData}
        revenueProfitTitle={showFinance ? t('revenueProfitChart') : undefined}
        tasksByStatusTitle={t('tasksByStatus')}
        projectsByStatusTitle={t('projectsByStatus')}
        revenueLabel={t('revenue')}
        profitLabel={t('profit')}
        formatMoney={formatMoney}
      />

      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">{t('allProjects')}</h3>
            <Link href="/projects" className="text-xs font-semibold text-vega-cyan hover:underline">{t('viewAll')}</Link>
          </div>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {(data?.projects || []).slice(0, 12).map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors hover:border-vega-cyan/50 ${
                  p.isDelayed ? 'border-amber-500/30 bg-amber-500/5' : 'border-[var(--color-border)]'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{p.name}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {p.client?.companyName || '—'} · {p.status}
                    {p.isDelayed && <span className="ms-1 text-amber-600"> · {t('delayed')}</span>}
                  </p>
                </div>
                <div className="text-end shrink-0">
                  <p className="text-xs font-bold text-vega-cyan">{p.progress}%</p>
                  {p.delayedTasks > 0 && (
                    <p className="text-[10px] text-amber-600">{p.delayedTasks} {t('lateTasks')}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h3 className="mb-4 font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            {t('delays')}
          </h3>
          {(data?.delayedTasks?.length ?? 0) === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">{t('noDelays')}</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto space-y-2">
              {data!.delayedTasks.map((task) => (
                <li key={task.id} className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm">
                  <p className="font-medium">{task.title}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {task.project?.name || '—'} · {task.assignee || t('unassigned')}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-amber-600">
                    {task.daysOverdue} {t('daysOverdue')} · {task.priority}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h3 className="mb-4 font-semibold">{t('busyEmployees')}</h3>
          <div className="space-y-3">
            {(data?.busyEmployees || []).slice(0, 10).map((emp) => (
              <div key={emp.id} className="flex items-center gap-3">
                <span className={`h-2 w-2 rounded-full shrink-0 ${emp.busy ? 'bg-vega-red' : 'bg-emerald-500'}`} />
                <span className="w-28 truncate text-sm font-medium">{emp.name}</span>
                <div className="flex-1 h-2 rounded-full bg-[var(--color-surface-secondary)]">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(emp.activeTasks * 15 + emp.workload * 10, 100)}%`,
                      background: emp.busy ? '#ED1C24' : 'var(--vega-gradient)',
                    }}
                  />
                </div>
                <span className="text-xs text-[var(--color-text-secondary)] w-16 text-end">
                  {emp.activeTasks} {t('tasks')}
                </span>
              </div>
            ))}
          </div>
        </section>

        {showFinance && (
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-vega-red" />
                {t('latePayingClients')}
              </h3>
              <Link href="/finance" className="text-xs font-semibold text-vega-cyan hover:underline">{t('finance')}</Link>
            </div>
            {(data?.overdueClients?.length ?? 0) === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)]">{t('noOverdue')}</p>
            ) : (
              <ul className="space-y-2">
                {data!.overdueClients.map((c) => (
                  <li key={c.clientId}>
                    <Link
                      href={`/clients/${c.clientId}`}
                      className="flex justify-between rounded-lg border border-vega-red/20 bg-vega-red/5 px-3 py-2 text-sm hover:border-vega-red/40"
                    >
                      <span className="font-medium">{c.companyName}</span>
                      <span className="font-semibold text-vega-red">{money(c.totalDue)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h3 className="mb-4 font-semibold">{t('performanceQuality')}</h3>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-2">{t('teamScores')}</p>
            {(data?.performance?.recentReports?.length ?? 0) === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)]">{tc('noData')}</p>
            ) : (
              <ul className="space-y-2">
                {data!.performance.recentReports.map((r, i) => (
                  <li key={i} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm">
                    <span>{r.employee}</span>
                    <span className={`font-bold ${r.score >= 80 ? 'text-emerald-500' : r.score >= 60 ? 'text-amber-500' : 'text-vega-red'}`}>
                      {r.score}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-secondary)] mb-2">{t('projectHealth')}</p>
            <ul className="space-y-2">
              {(data?.performance?.projectHealth || []).map((p) => (
                <li key={p.id} className="flex items-center gap-3 text-sm">
                  <span className={`h-2 w-2 rounded-full ${p.onTrack ? 'bg-emerald-500' : p.isDelayed ? 'bg-vega-red' : 'bg-amber-500'}`} />
                  <span className="flex-1 truncate font-medium">{p.name}</span>
                  <span className="text-vega-cyan font-semibold">{p.progress}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}
