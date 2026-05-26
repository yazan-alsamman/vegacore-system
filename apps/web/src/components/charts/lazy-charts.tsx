'use client';

import dynamic from 'next/dynamic';

const chartLoading = (
  <div className="flex h-44 items-center justify-center">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
  </div>
);

export const DashboardExecutiveCharts = dynamic(
  () => import('./dashboard-executive-charts').then((m) => m.DashboardExecutiveCharts),
  { ssr: false, loading: () => chartLoading },
);

export const FinanceRevenueChart = dynamic(
  () => import('./finance-revenue-chart').then((m) => m.FinanceRevenueChart),
  { ssr: false, loading: () => chartLoading },
);
