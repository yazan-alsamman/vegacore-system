'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface RevenueChartPoint {
  name: string;
  revenue: number;
  expenses: number;
}

interface FinanceRevenueChartProps {
  data: RevenueChartPoint[];
  revenueLabel: string;
  expensesLabel: string;
  formatMoney: (n: number) => string;
}

export function FinanceRevenueChart({ data, revenueLabel, expensesLabel, formatMoney }: FinanceRevenueChartProps) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => formatMoney(v)} />
          <Legend />
          <Bar dataKey="revenue" name={revenueLabel} fill="#00AEEF" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expenses" name={expensesLabel} fill="#ED1C24" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
