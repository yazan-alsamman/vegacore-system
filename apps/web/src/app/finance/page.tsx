'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { FinanceRevenueChart } from '@/components/charts/lazy-charts';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Modal } from '@/components/ui/modal';
import { FormActions, FormField, SelectInput, TextArea, TextInput } from '@/components/ui/form-fields';
import { CrudActions } from '@/components/admin/crud-actions';
import { useApiData } from '@/hooks/use-api-data';
import { usePermissions } from '@/hooks/use-permissions';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/money';

const SERVICE_TYPES = ['Web Development', 'Media Production', 'Marketing', 'Retainer', 'Consulting', 'Other'];
const INVOICE_STATUSES = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'] as const;

type Tab = 'dashboard' | 'invoices' | 'expenses' | 'salaries' | 'subscriptions' | 'revenue';

interface Workspace {
  dashboard: {
    monthlyRevenue: number;
    monthlyExpenses: number;
    monthlyPayroll: number;
    monthlyProfit: number;
    collectionRate: number;
    totalInvoiced: number;
    totalCollected: number;
    topClient: { clientId: string; companyName: string; revenue: number } | null;
    topService: { serviceType: string; revenue: number } | null;
    topClients: { clientId: string; companyName: string; revenue: number }[];
    topServices: { serviceType: string; revenue: number }[];
    revenueByMonth: { month: string; revenue: number; expenses: number }[];
    unpaidInvoices: { id: string; number: string; total: number; status: string; dueDate?: string; client: { companyName: string } }[];
    recentPayments: { id: string; amount: number; method?: string; paidAt?: string; invoice?: { number: string; client?: { companyName: string } } }[];
    activeSubscriptions: { id: string; name: string; amount: number; interval: string; nextDue?: string; client: { companyName: string } }[];
    recurringExpenses: { id: string; title: string; amount: number; category?: string }[];
    recurringMonthly: number;
    subscriptionCount: number;
  };
  invoices: InvoiceRow[];
  expenses: ExpenseRow[];
  subscriptions: SubscriptionRow[];
  payroll: PayrollRow[];
  payments: PaymentRow[];
  clients: { id: string; companyName: string }[];
  employees: { id: string; name: string; department?: string }[];
}

interface InvoiceRow {
  id: string;
  number: string;
  total: number;
  amount: number;
  tax: number;
  status: string;
  serviceType?: string;
  dueDate?: string;
  clientId: string;
  client: { id: string; companyName: string };
  payments?: { amount: number }[];
}

interface ExpenseRow {
  id: string;
  title: string;
  amount: number;
  category?: string;
  description?: string;
  isRecurring: boolean;
  date: string;
}

interface SubscriptionRow {
  id: string;
  name: string;
  amount: number;
  interval: string;
  nextDue?: string;
  isActive: boolean;
  clientId: string;
  client: { companyName: string };
}

interface PayrollRow {
  id: string;
  amount: number;
  period: string;
  paidAt?: string;
  notes?: string;
  employeeId: string;
  employee: { user: { firstName: string; lastName: string } };
}

interface PaymentRow {
  id: string;
  amount: number;
  method?: string;
  paidAt?: string;
  invoice?: { number: string; client?: { companyName: string } };
}

const money = formatMoney;

export default function FinancePage() {
  const t = useTranslations('finance');
  const tc = useTranslations('common');
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const { data, loading, refetch, token } = useApiData<Workspace>('/finance/workspace');
  const [tab, setTab] = useState<Tab>('dashboard');

  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRow | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentInvoiceId, setPaymentInvoiceId] = useState('');
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRow | null>(null);
  const [subOpen, setSubOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<SubscriptionRow | null>(null);
  const [payrollOpen, setPayrollOpen] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<PayrollRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [invoiceForm, setInvoiceForm] = useState({
    clientId: '',
    amount: '',
    tax: '0',
    serviceType: 'Web Development',
    status: 'SENT',
    dueDate: '',
    notes: '',
  });
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'bank_transfer', reason: '', reference: '' });
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    category: '',
    description: '',
    isRecurring: false,
    date: new Date().toISOString().slice(0, 10),
  });
  const [subForm, setSubForm] = useState({
    clientId: '',
    name: '',
    amount: '',
    interval: 'monthly',
    nextDue: '',
    isActive: true,
  });
  const [payrollForm, setPayrollForm] = useState({
    employeeId: '',
    amount: '',
    period: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    paidAt: '',
    notes: '',
  });

  const dash = data?.dashboard;
  const chartData = useMemo(
    () =>
      (dash?.revenueByMonth || []).map((m) => ({
        name: m.month.slice(5),
        revenue: m.revenue,
        expenses: m.expenses,
        profit: m.revenue - m.expenses,
      })),
    [dash?.revenueByMonth],
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: 'dashboard', label: t('tabDashboard') },
    { id: 'invoices', label: t('tabInvoices') },
    { id: 'expenses', label: t('tabExpenses') },
    { id: 'salaries', label: t('tabSalaries') },
    { id: 'subscriptions', label: t('tabSubscriptions') },
    { id: 'revenue', label: t('tabRevenue') },
  ];

  const resetInvoiceForm = () => {
    setInvoiceForm({
      clientId: data?.clients[0]?.id || '',
      amount: '',
      tax: '0',
      serviceType: 'Web Development',
      status: 'SENT',
      dueDate: '',
      notes: '',
    });
    setEditingInvoice(null);
  };

  const openCreateInvoice = () => {
    resetInvoiceForm();
    setInvoiceOpen(true);
  };

  const openEditInvoice = (inv: InvoiceRow) => {
    setEditingInvoice(inv);
    setInvoiceForm({
      clientId: inv.clientId,
      amount: String(inv.amount),
      tax: String(inv.tax),
      serviceType: inv.serviceType || 'Other',
      status: inv.status,
      dueDate: inv.dueDate ? inv.dueDate.slice(0, 10) : '',
      notes: '',
    });
    setInvoiceOpen(true);
  };

  const saveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const body = {
        clientId: invoiceForm.clientId,
        amount: Number(invoiceForm.amount),
        tax: Number(invoiceForm.tax),
        serviceType: invoiceForm.serviceType,
        status: invoiceForm.status,
        dueDate: invoiceForm.dueDate || undefined,
        notes: invoiceForm.notes || undefined,
      };
      if (editingInvoice) {
        await api(`/finance/invoices/${editingInvoice.id}`, { method: 'PATCH', token, body: JSON.stringify(body) });
      } else {
        await api('/finance/invoices', { method: 'POST', token, body: JSON.stringify(body) });
      }
      setInvoiceOpen(false);
      resetInvoiceForm();
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'));
    } finally {
      setSaving(false);
    }
  };

  const savePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !paymentInvoiceId) return;
    setSaving(true);
    try {
      await api('/finance/payments', {
        method: 'POST',
        token,
        body: JSON.stringify({
          invoiceId: paymentInvoiceId,
          amount: Number(paymentForm.amount),
          method: paymentForm.method,
          reason: paymentForm.reason.trim() || undefined,
          reference: paymentForm.reference || undefined,
        }),
      });
      setPaymentOpen(false);
      setPaymentForm({ amount: '', method: 'bank_transfer', reason: '', reference: '' });
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'));
    } finally {
      setSaving(false);
    }
  };

  const saveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const body = {
        ...expenseForm,
        amount: Number(expenseForm.amount),
      };
      if (editingExpense) {
        await api(`/finance/expenses/${editingExpense.id}`, { method: 'PATCH', token, body: JSON.stringify(body) });
      } else {
        await api('/finance/expenses', { method: 'POST', token, body: JSON.stringify(body) });
      }
      setExpenseOpen(false);
      setEditingExpense(null);
      setExpenseForm({ title: '', amount: '', category: '', description: '', isRecurring: false, date: new Date().toISOString().slice(0, 10) });
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'));
    } finally {
      setSaving(false);
    }
  };

  const saveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const body = {
        ...subForm,
        amount: Number(subForm.amount),
        nextDue: subForm.nextDue || undefined,
      };
      if (editingSub) {
        await api(`/finance/subscriptions/${editingSub.id}`, { method: 'PATCH', token, body: JSON.stringify(body) });
      } else {
        await api('/finance/subscriptions', { method: 'POST', token, body: JSON.stringify(body) });
      }
      setSubOpen(false);
      setEditingSub(null);
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'));
    } finally {
      setSaving(false);
    }
  };

  const savePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const body = {
        ...payrollForm,
        amount: Number(payrollForm.amount),
        paidAt: payrollForm.paidAt || undefined,
      };
      if (editingPayroll) {
        await api(`/finance/payroll/${editingPayroll.id}`, { method: 'PATCH', token, body: JSON.stringify(body) });
      } else {
        await api('/finance/payroll', { method: 'POST', token, body: JSON.stringify(body) });
      }
      setPayrollOpen(false);
      setEditingPayroll(null);
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'));
    } finally {
      setSaving(false);
    }
  };

  const deleteInvoice = async (id: string) => {
    if (!token) return;
    await api(`/finance/invoices/${id}`, { method: 'DELETE', token });
    await refetch();
  };

  const deleteExpense = async (id: string) => {
    if (!token) return;
    await api(`/finance/expenses/${id}`, { method: 'DELETE', token });
    await refetch();
  };

  const deleteSub = async (id: string) => {
    if (!token) return;
    await api(`/finance/subscriptions/${id}`, { method: 'DELETE', token });
    await refetch();
  };

  const deletePayroll = async (id: string) => {
    if (!token) return;
    await api(`/finance/payroll/${id}`, { method: 'DELETE', token });
    await refetch();
  };

  if (loading && !data) {
    return (
      <DashboardLayout title={t('title')} module="finance">
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('title')} module="finance">
      <PageHeader description={t('description')} actionLabel="" onAction={() => {}} showAction={false} />

      <div className="mb-6 flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === item.id
                ? 'bg-vega-cyan/15 text-vega-cyan'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && dash && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title={t('monthlyRevenue')} value={money(dash.monthlyRevenue)} icon={DollarSign} variant="success" />
            <StatCard title={t('monthlyExpenses')} value={money(dash.monthlyExpenses + dash.monthlyPayroll)} icon={TrendingUp} />
            <StatCard
              title={t('monthlyProfit')}
              value={money(dash.monthlyProfit)}
              icon={dash.monthlyProfit >= 0 ? ArrowUpRight : ArrowDownRight}
              variant={dash.monthlyProfit >= 0 ? 'success' : 'warning'}
            />
            <StatCard title={t('collectionRate')} value={`${dash.collectionRate}%`} icon={Wallet} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 lg:col-span-2">
              <h3 className="mb-4 font-semibold">{t('revenueChart')}</h3>
              <FinanceRevenueChart
                data={chartData}
                revenueLabel={t('revenue')}
                expensesLabel={t('expenses')}
                formatMoney={money}
              />
            </div>

            <div className="space-y-4">
              <InsightCard
                icon={Users}
                title={t('topClient')}
                value={dash.topClient?.companyName || tc('noData')}
                sub={dash.topClient ? money(dash.topClient.revenue) : ''}
              />
              <InsightCard
                icon={TrendingUp}
                title={t('topService')}
                value={dash.topService?.serviceType || tc('noData')}
                sub={dash.topService ? money(dash.topService.revenue) : ''}
              />
              <InsightCard
                icon={RefreshCw}
                title={t('recurringMonthly')}
                value={money(dash.recurringMonthly)}
                sub={t('activeSubscriptions', { count: dash.subscriptionCount })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                {t('unpaidInvoices')}
              </h3>
              {dash.unpaidInvoices.length === 0 ? (
                <p className="text-sm text-[var(--color-text-secondary)]">{tc('noData')}</p>
              ) : (
                <ul className="space-y-2">
                  {dash.unpaidInvoices.map((inv) => (
                    <li key={inv.id} className="flex justify-between rounded-lg border border-[var(--color-border)] px-4 py-3 text-sm">
                      <span>
                        <span className="font-medium">{inv.number}</span>
                        <span className="text-[var(--color-text-secondary)]"> · {inv.client.companyName}</span>
                      </span>
                      <span className="font-semibold">{money(inv.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="mb-3 font-semibold">{t('recentPayments')}</h3>
              {dash.recentPayments.length === 0 ? (
                <p className="text-sm text-[var(--color-text-secondary)]">{tc('noData')}</p>
              ) : (
                <ul className="space-y-2">
                  {dash.recentPayments.map((p) => (
                    <li key={p.id} className="flex justify-between rounded-lg border border-[var(--color-border)] px-4 py-3 text-sm">
                      <span>{p.invoice?.client?.companyName || '—'}</span>
                      <span className="font-semibold text-vega-cyan">{money(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'invoices' && (
        <div className="space-y-4">
          {canCreate('finance') && (
            <button
              type="button"
              onClick={openCreateInvoice}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ background: 'var(--vega-gradient)' }}
            >
              {t('addInvoice')}
            </button>
          )}
          <DataTable
            columns={[
              { key: 'number', header: t('invoiceNumber') },
              { key: 'client', header: t('client'), render: (item) => (item as InvoiceRow).client?.companyName },
              { key: 'serviceType', header: t('serviceType'), render: (item) => (item as InvoiceRow).serviceType || '—' },
              { key: 'total', header: t('amount'), render: (item) => money((item as InvoiceRow).total) },
              { key: 'status', header: tc('status') },
              { key: 'dueDate', header: t('due'), render: (item) => (item as InvoiceRow).dueDate ? new Date((item as InvoiceRow).dueDate!).toLocaleDateString() : '—' },
              {
                key: 'actions',
                header: tc('actions'),
                render: (item) => {
                  const inv = item as InvoiceRow;
                  return (
                    <div className="flex justify-end gap-1">
                      {canCreate('finance') && inv.status !== 'PAID' && (
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentInvoiceId(inv.id);
                            const paid = (inv.payments || []).reduce((s, p) => s + p.amount, 0);
                            setPaymentForm({ amount: String(inv.total - paid), method: 'bank_transfer', reference: '' });
                            setPaymentOpen(true);
                          }}
                          className="rounded px-2 py-1 text-xs font-semibold text-vega-cyan hover:bg-vega-cyan/10"
                        >
                          {t('recordPayment')}
                        </button>
                      )}
                      <CrudActions
                        module="finance"
                        onEdit={canUpdate('finance') ? () => openEditInvoice(inv) : undefined}
                        onDelete={canDelete('finance') ? () => deleteInvoice(inv.id) : undefined}
                      />
                    </div>
                  );
                },
              },
            ]}
            data={data?.invoices || []}
          />
        </div>
      )}

      {tab === 'expenses' && (
        <div className="space-y-4">
          {canCreate('finance') && (
            <button
              type="button"
              onClick={() => { setEditingExpense(null); setExpenseOpen(true); }}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ background: 'var(--vega-gradient)' }}
            >
              {t('addExpense')}
            </button>
          )}
          <DataTable
            columns={[
              { key: 'title', header: t('expenseTitle') },
              { key: 'category', header: t('category') },
              { key: 'amount', header: t('amount'), render: (item) => money((item as ExpenseRow).amount) },
              { key: 'isRecurring', header: t('recurring'), render: (item) => ((item as ExpenseRow).isRecurring ? t('yes') : t('no')) },
              { key: 'date', header: t('date'), render: (item) => new Date((item as ExpenseRow).date).toLocaleDateString() },
              {
                key: 'actions',
                header: tc('actions'),
                render: (item) => {
                  const row = item as ExpenseRow;
                  return (
                    <CrudActions
                      module="finance"
                      onEdit={canUpdate('finance') ? () => { setEditingExpense(row); setExpenseForm({ title: row.title, amount: String(row.amount), category: row.category || '', description: row.description || '', isRecurring: row.isRecurring, date: row.date.slice(0, 10) }); setExpenseOpen(true); } : undefined}
                      onDelete={canDelete('finance') ? () => deleteExpense(row.id) : undefined}
                    />
                  );
                },
              },
            ]}
            data={data?.expenses || []}
          />
        </div>
      )}

      {tab === 'salaries' && (
        <div className="space-y-4">
          {canCreate('finance') && (
            <button
              type="button"
              onClick={() => {
                setEditingPayroll(null);
                setPayrollForm({
                  employeeId: data?.employees[0]?.id || '',
                  amount: '',
                  period: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
                  paidAt: new Date().toISOString().slice(0, 10),
                  notes: '',
                });
                setPayrollOpen(true);
              }}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ background: 'var(--vega-gradient)' }}
            >
              {t('addSalary')}
            </button>
          )}
          <DataTable
            columns={[
              { key: 'employee', header: t('employee'), render: (item) => { const p = item as PayrollRow; return `${p.employee.user.firstName} ${p.employee.user.lastName}`; } },
              { key: 'period', header: t('period') },
              { key: 'amount', header: t('amount'), render: (item) => money((item as PayrollRow).amount) },
              { key: 'paidAt', header: t('paidAt'), render: (item) => (item as PayrollRow).paidAt ? new Date((item as PayrollRow).paidAt!).toLocaleDateString() : t('pending') },
              {
                key: 'actions',
                header: tc('actions'),
                render: (item) => {
                  const row = item as PayrollRow;
                  return (
                    <CrudActions
                      module="finance"
                      onEdit={canUpdate('finance') ? () => { setEditingPayroll(row); setPayrollForm({ employeeId: row.employeeId, amount: String(row.amount), period: row.period, paidAt: row.paidAt?.slice(0, 10) || '', notes: row.notes || '' }); setPayrollOpen(true); } : undefined}
                      onDelete={canDelete('finance') ? () => deletePayroll(row.id) : undefined}
                    />
                  );
                },
              },
            ]}
            data={data?.payroll || []}
          />
        </div>
      )}

      {tab === 'subscriptions' && (
        <div className="space-y-4">
          {canCreate('finance') && (
            <button
              type="button"
              onClick={() => {
                setEditingSub(null);
                setSubForm({ clientId: data?.clients[0]?.id || '', name: '', amount: '', interval: 'monthly', nextDue: '', isActive: true });
                setSubOpen(true);
              }}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ background: 'var(--vega-gradient)' }}
            >
              {t('addSubscription')}
            </button>
          )}
          <DataTable
            columns={[
              { key: 'name', header: t('subscriptionName') },
              { key: 'client', header: t('client'), render: (item) => (item as SubscriptionRow).client?.companyName },
              { key: 'amount', header: t('amount'), render: (item) => money((item as SubscriptionRow).amount) },
              { key: 'interval', header: t('interval') },
              { key: 'nextDue', header: t('nextDue'), render: (item) => (item as SubscriptionRow).nextDue ? new Date((item as SubscriptionRow).nextDue!).toLocaleDateString() : '—' },
              { key: 'isActive', header: tc('status'), render: (item) => ((item as SubscriptionRow).isActive ? t('active') : t('inactive')) },
              {
                key: 'actions',
                header: tc('actions'),
                render: (item) => {
                  const row = item as SubscriptionRow;
                  return (
                    <CrudActions
                      module="finance"
                      onEdit={canUpdate('finance') ? () => { setEditingSub(row); setSubForm({ clientId: row.clientId, name: row.name, amount: String(row.amount), interval: row.interval, nextDue: row.nextDue?.slice(0, 10) || '', isActive: row.isActive }); setSubOpen(true); } : undefined}
                      onDelete={canDelete('finance') ? () => deleteSub(row.id) : undefined}
                    />
                  );
                },
              },
            ]}
            data={data?.subscriptions || []}
          />
        </div>
      )}

      {tab === 'revenue' && dash && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard title={t('totalInvoiced')} value={money(dash.totalInvoiced ?? 0)} icon={DollarSign} />
            <StatCard title={t('totalCollected')} value={money(dash.totalCollected ?? 0)} icon={Wallet} variant="success" />
            <StatCard title={t('collectionRate')} value={`${dash.collectionRate}%`} icon={TrendingUp} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <RankingList title={t('topClients')} items={(dash.topClients || []).map((c) => ({ label: c.companyName, value: money(c.revenue), href: `/clients/${c.clientId}` }))} />
            <RankingList title={t('topServices')} items={(dash.topServices || []).map((s) => ({ label: s.serviceType, value: money(s.revenue) }))} />
          </div>

          <div>
            <h3 className="mb-3 font-semibold">{t('recurringPayments')}</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-[var(--color-border)] p-4">
                <p className="text-sm font-semibold mb-2">{t('subscriptions')}</p>
                <ul className="space-y-2 text-sm">
                  {(dash.activeSubscriptions || []).map((s) => (
                    <li key={s.id} className="flex justify-between">
                      <span>{s.name} · {s.client.companyName}</span>
                      <span className="font-medium">{money(s.amount)}/{s.interval}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-[var(--color-border)] p-4">
                <p className="text-sm font-semibold mb-2">{t('recurringExpenses')}</p>
                <ul className="space-y-2 text-sm">
                  {(dash.recurringExpenses || []).map((e) => (
                    <li key={e.id} className="flex justify-between">
                      <span>{e.title}</span>
                      <span className="font-medium">{money(e.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-3 font-semibold">{t('paymentHistory')}</h3>
            <DataTable
              columns={[
                { key: 'client', header: t('client'), render: (item) => (item as PaymentRow).invoice?.client?.companyName || '—' },
                { key: 'number', header: t('invoiceNumber'), render: (item) => (item as PaymentRow).invoice?.number || '—' },
                { key: 'amount', header: t('amount'), render: (item) => money((item as PaymentRow).amount) },
                { key: 'reason', header: t('paymentReason'), render: (item) => (item as PaymentRow & { reason?: string }).reason || '—' },
                { key: 'method', header: t('method') },
                { key: 'paidAt', header: t('paidAt'), render: (item) => (item as PaymentRow).paidAt ? new Date((item as PaymentRow).paidAt!).toLocaleString() : '—' },
              ]}
              data={data?.payments || []}
            />
          </div>
        </div>
      )}

      <Modal open={invoiceOpen} onClose={() => { setInvoiceOpen(false); resetInvoiceForm(); }} title={editingInvoice ? t('editInvoice') : t('addInvoice')}>
        <form className="space-y-4" onSubmit={saveInvoice}>
          {error && <p className="text-sm text-vega-red">{error}</p>}
          <FormField label={t('client')} required>
            <SelectInput value={invoiceForm.clientId} onChange={(e) => setInvoiceForm((f) => ({ ...f, clientId: e.target.value }))} required>
              <option value="">—</option>
              {(data?.clients || []).map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </SelectInput>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t('amount')} required><TextInput type="number" step="0.01" value={invoiceForm.amount} onChange={(e) => setInvoiceForm((f) => ({ ...f, amount: e.target.value }))} required /></FormField>
            <FormField label={t('tax')}><TextInput type="number" step="0.01" value={invoiceForm.tax} onChange={(e) => setInvoiceForm((f) => ({ ...f, tax: e.target.value }))} /></FormField>
          </div>
          <FormField label={t('serviceType')}>
            <SelectInput value={invoiceForm.serviceType} onChange={(e) => setInvoiceForm((f) => ({ ...f, serviceType: e.target.value }))}>
              {SERVICE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </SelectInput>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={tc('status')}>
              <SelectInput value={invoiceForm.status} onChange={(e) => setInvoiceForm((f) => ({ ...f, status: e.target.value }))}>
                {INVOICE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </SelectInput>
            </FormField>
            <FormField label={t('due')}><TextInput type="date" value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm((f) => ({ ...f, dueDate: e.target.value }))} /></FormField>
          </div>
          <FormField label={t('notes')}><TextArea value={invoiceForm.notes} onChange={(e) => setInvoiceForm((f) => ({ ...f, notes: e.target.value }))} /></FormField>
          <FormActions onCancel={() => { setInvoiceOpen(false); resetInvoiceForm(); }} submitLabel={tc('save')} cancelLabel={tc('cancel')} loading={saving} />
        </form>
      </Modal>

      <Modal open={paymentOpen} onClose={() => setPaymentOpen(false)} title={t('recordPayment')}>
        <form className="space-y-4" onSubmit={savePayment}>
          <FormField label={t('amount')} required><TextInput type="number" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))} required /></FormField>
          <FormField label={t('method')}><TextInput value={paymentForm.method} onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value }))} /></FormField>
          <FormField label={t('paymentReason')} required><TextInput value={paymentForm.reason} onChange={(e) => setPaymentForm((f) => ({ ...f, reason: e.target.value }))} required /></FormField>
          <FormField label={t('reference')}><TextInput value={paymentForm.reference} onChange={(e) => setPaymentForm((f) => ({ ...f, reference: e.target.value }))} /></FormField>
          <FormActions onCancel={() => setPaymentOpen(false)} submitLabel={tc('save')} cancelLabel={tc('cancel')} loading={saving} />
        </form>
      </Modal>

      <Modal open={expenseOpen} onClose={() => setExpenseOpen(false)} title={editingExpense ? t('editExpense') : t('addExpense')}>
        <form className="space-y-4" onSubmit={saveExpense}>
          <FormField label={t('expenseTitle')} required><TextInput value={expenseForm.title} onChange={(e) => setExpenseForm((f) => ({ ...f, title: e.target.value }))} required /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t('amount')} required><TextInput type="number" step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))} required /></FormField>
            <FormField label={t('category')}><TextInput value={expenseForm.category} onChange={(e) => setExpenseForm((f) => ({ ...f, category: e.target.value }))} /></FormField>
          </div>
          <FormField label={t('date')}><TextInput type="date" value={expenseForm.date} onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))} /></FormField>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={expenseForm.isRecurring} onChange={(e) => setExpenseForm((f) => ({ ...f, isRecurring: e.target.checked }))} />
            {t('recurringExpense')}
          </label>
          <FormField label={t('description')}><TextArea value={expenseForm.description} onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))} /></FormField>
          <FormActions onCancel={() => setExpenseOpen(false)} submitLabel={tc('save')} cancelLabel={tc('cancel')} loading={saving} />
        </form>
      </Modal>

      <Modal open={subOpen} onClose={() => setSubOpen(false)} title={editingSub ? t('editSubscription') : t('addSubscription')}>
        <form className="space-y-4" onSubmit={saveSubscription}>
          <FormField label={t('client')} required>
            <SelectInput value={subForm.clientId} onChange={(e) => setSubForm((f) => ({ ...f, clientId: e.target.value }))} required disabled={!!editingSub}>
              {(data?.clients || []).map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
            </SelectInput>
          </FormField>
          <FormField label={t('subscriptionName')} required><TextInput value={subForm.name} onChange={(e) => setSubForm((f) => ({ ...f, name: e.target.value }))} required /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t('amount')} required><TextInput type="number" value={subForm.amount} onChange={(e) => setSubForm((f) => ({ ...f, amount: e.target.value }))} required /></FormField>
            <FormField label={t('interval')}>
              <SelectInput value={subForm.interval} onChange={(e) => setSubForm((f) => ({ ...f, interval: e.target.value }))}>
                <option value="monthly">monthly</option>
                <option value="quarterly">quarterly</option>
                <option value="yearly">yearly</option>
              </SelectInput>
            </FormField>
          </div>
          <FormField label={t('nextDue')}><TextInput type="date" value={subForm.nextDue} onChange={(e) => setSubForm((f) => ({ ...f, nextDue: e.target.value }))} /></FormField>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={subForm.isActive} onChange={(e) => setSubForm((f) => ({ ...f, isActive: e.target.checked }))} />
            {t('active')}
          </label>
          <FormActions onCancel={() => setSubOpen(false)} submitLabel={tc('save')} cancelLabel={tc('cancel')} loading={saving} />
        </form>
      </Modal>

      <Modal open={payrollOpen} onClose={() => setPayrollOpen(false)} title={editingPayroll ? t('editSalary') : t('addSalary')}>
        <form className="space-y-4" onSubmit={savePayroll}>
          <FormField label={t('employee')} required>
            <SelectInput value={payrollForm.employeeId} onChange={(e) => setPayrollForm((f) => ({ ...f, employeeId: e.target.value }))} required disabled={!!editingPayroll}>
              {(data?.employees || []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </SelectInput>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t('amount')} required><TextInput type="number" value={payrollForm.amount} onChange={(e) => setPayrollForm((f) => ({ ...f, amount: e.target.value }))} required /></FormField>
            <FormField label={t('period')} required><TextInput value={payrollForm.period} onChange={(e) => setPayrollForm((f) => ({ ...f, period: e.target.value }))} placeholder="2026-05" required /></FormField>
          </div>
          <FormField label={t('paidAt')}><TextInput type="date" value={payrollForm.paidAt} onChange={(e) => setPayrollForm((f) => ({ ...f, paidAt: e.target.value }))} /></FormField>
          <FormField label={t('notes')}><TextArea value={payrollForm.notes} onChange={(e) => setPayrollForm((f) => ({ ...f, notes: e.target.value }))} /></FormField>
          <FormActions onCancel={() => setPayrollOpen(false)} submitLabel={tc('save')} cancelLabel={tc('cancel')} loading={saving} />
        </form>
      </Modal>
    </DashboardLayout>
  );
}

function InsightCard({ icon: Icon, title, value, sub }: { icon: typeof DollarSign; title: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center gap-2 text-vega-cyan mb-1">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium text-[var(--color-text-secondary)]">{title}</span>
      </div>
      <p className="font-semibold truncate">{value}</p>
      {sub && <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{sub}</p>}
    </div>
  );
}

function RankingList({ title, items }: { title: string; items: { label: string; value: string; href?: string }[] }) {
  const tc = useTranslations('common');
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h3 className="mb-4 font-semibold">{title}</h3>
      {!items.length ? (
        <p className="text-sm text-[var(--color-text-secondary)]">{tc('noData')}</p>
      ) : (
        <ol className="space-y-3">
          {items.map((item, i) => (
            <li key={i} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 min-w-0">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-vega-cyan/15 text-xs font-bold text-vega-cyan">{i + 1}</span>
                {item.href ? (
                  <Link href={item.href} className="truncate font-medium hover:text-vega-cyan">{item.label}</Link>
                ) : (
                  <span className="truncate font-medium">{item.label}</span>
                )}
              </span>
              <span className="shrink-0 font-semibold text-vega-cyan">{item.value}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
