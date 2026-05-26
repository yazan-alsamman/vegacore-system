'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const COLORS = ['#2E3192', '#00AEEF', '#00A651', '#ED1C24', '#EC008C', '#F7B040'];

export interface ChartPoint {
  name: string;
  value: number;
}

export interface ProfitPoint {
  name: string;
  revenue: number;
  profit: number;
}

interface DashboardExecutiveChartsProps {
  profitChart: ProfitPoint[];
  taskChartData: ChartPoint[];
  projectChartData: ChartPoint[];
  revenueProfitTitle: string;
  tasksByStatusTitle: string;
  projectsByStatusTitle: string;
  revenueLabel: string;
  profitLabel: string;
  formatMoney: (n: number) => string;
}

export function DashboardExecutiveCharts({
  profitChart,
  taskChartData,
  projectChartData,
  revenueProfitTitle,
  tasksByStatusTitle,
  projectsByStatusTitle,
  revenueLabel,
  profitLabel,
  formatMoney,
}: DashboardExecutiveChartsProps) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h3 className="mb-4 font-semibold">{revenueProfitTitle}</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={profitChart}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatMoney(v)} />
              <Legend />
              <Line type="monotone" dataKey="revenue" name={revenueLabel} stroke="#00AEEF" strokeWidth={2} />
              <Line type="monotone" dataKey="profit" name={profitLabel} stroke="#00A651" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h3 className="mb-3 font-semibold text-sm">{tasksByStatusTitle}</h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskChartData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#2E3192" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h3 className="mb-3 font-semibold text-sm">{projectsByStatusTitle}</h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={projectChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  label={({ name }) => name}
                >
                  {projectChartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
