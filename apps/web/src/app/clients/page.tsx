'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CrudActions } from '@/components/admin/crud-actions';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { DataTable } from '@/components/data-table';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { FormField, TextInput, SelectInput, TextArea, FormActions } from '@/components/ui/form-fields';
import { useApiData } from '@/hooks/use-api-data';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import {
  CLIENT_CLASSIFICATIONS,
  classificationLabel,
  marketingManagerLabel,
  type MarketingManagerOption,
} from '@/lib/client-fields';

interface Client {
  id: string;
  companyName: string;
  ownerName: string;
  email?: string;
  phone?: string;
  status: string;
  classification?: string;
  country?: string;
  businessType?: string;
  notes?: string;
  marketingManagerId?: string | null;
  marketingManager?: MarketingManagerOption | null;
  users?: { id: string; email: string; status: string; lastLoginAt?: string }[];
}

const INITIAL = {
  companyName: '',
  ownerName: '',
  email: '',
  phone: '',
  country: '',
  businessType: '',
  status: 'LEAD',
  classification: 'NORMAL',
  marketingManagerId: '',
  notes: '',
  portalEmail: '',
  portalPassword: '',
};

function clientPayload(form: typeof INITIAL) {
  const payload: Record<string, string | null | undefined> = {
    companyName: form.companyName,
    ownerName: form.ownerName,
    email: form.email || undefined,
    phone: form.phone || undefined,
    country: form.country || undefined,
    businessType: form.businessType || undefined,
    status: form.status,
    classification: form.classification,
    marketingManagerId: form.marketingManagerId.trim() || null,
    notes: form.notes || undefined,
  };
  if (form.portalEmail.trim()) payload.portalEmail = form.portalEmail.trim();
  if (form.portalPassword.trim()) payload.portalPassword = form.portalPassword;
  return payload;
}

export default function ClientsPage() {
  const t = useTranslations('common');
  const tc = useTranslations('clients');
  const { user } = useAuth();
  const router = useRouter();
  const { canCreate } = usePermissions();
  const { data, loading, refetch, token } = useApiData<{ data: Client[] }>('/clients');
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [marketingManagers, setMarketingManagers] = useState<MarketingManagerOption[]>([]);
  const canAssignManager = user?.role !== 'marketing-manager';

  useEffect(() => {
    if (user?.role === 'client' && user.clientId) {
      router.replace(`/clients/${user.clientId}`);
    }
  }, [user, router]);

  const set = (key: keyof typeof INITIAL, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const loadMarketingManagers = async () => {
    if (!token || !canAssignManager) return;
    try {
      const list = await api<MarketingManagerOption[]>('/clients/marketing-managers/options', { token });
      setMarketingManagers(Array.isArray(list) ? list : []);
    } catch {
      setMarketingManagers([]);
    }
  };

  const openCreate = async () => {
    setEditId(null);
    setForm(INITIAL);
    setError('');
    setOpen(true);
    await loadMarketingManagers();
  };

  const openEdit = async (item: Client) => {
    setEditId(item.id);
    setForm({
      companyName: item.companyName,
      ownerName: item.ownerName,
      email: item.email || '',
      phone: item.phone || '',
      country: item.country || '',
      businessType: item.businessType || '',
      status: item.status,
      classification: item.classification || 'NORMAL',
      marketingManagerId: item.marketingManagerId || item.marketingManager?.id || '',
      notes: item.notes || '',
      portalEmail: item.users?.[0]?.email || '',
      portalPassword: '',
    });
    setError('');
    setOpen(true);
    await loadMarketingManagers();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      if (editId) {
        await api(`/clients/${editId}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify(clientPayload(form)),
        });
      } else {
        await api('/clients', {
          method: 'POST',
          token,
          body: JSON.stringify(clientPayload(form)),
        });
      }
      setOpen(false);
      setForm(INITIAL);
      setEditId(null);
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save client');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      await api(`/clients/${id}`, { method: 'DELETE', token });
      await refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  if (user?.role === 'client') {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-vega-cyan border-t-transparent" />
      </div>
    );
  }

  return (
    <DashboardLayout title={tc('title')} module="clients">
      <PageHeader
        description={tc('description')}
        actionLabel={tc('addClient')}
        onAction={openCreate}
        showAction={canCreate('clients')}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-vega-cyan border-t-transparent" />
        </div>
      ) : (
        <DataTable
          columns={[
            {
              key: 'companyName',
              header: tc('company'),
              render: (item) => (
                <Link
                  href={`/clients/${item.id}`}
                  className="font-medium text-vega-cyan hover:underline"
                >
                  {item.companyName}
                </Link>
              ),
            },
            { key: 'ownerName', header: tc('owner') },
            { key: 'email', header: tc('email') },
            {
              key: 'portal',
              header: tc('portalLogin'),
              render: (item) => item.users?.[0]?.email || '—',
            },
            { key: 'country', header: tc('country') },
            {
              key: 'classification',
              header: tc('classification'),
              render: (item) => classificationLabel(tc, item.classification),
            },
            {
              key: 'marketingManager',
              header: tc('marketingManager'),
              render: (item) => marketingManagerLabel(item.marketingManager) || tc('noMarketingManager'),
            },
            {
              key: 'status',
              header: tc('status'),
              render: (item) => (
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    item.status === 'ACTIVE'
                      ? 'bg-vega-green/15 text-vega-green'
                      : item.status === 'LEAD'
                        ? 'bg-vega-cyan/15 text-vega-cyan'
                        : 'bg-vega-navy/10 text-vega-navy'
                  }`}
                >
                  {String(item.status)}
                </span>
              ),
            },
            {
              key: 'actions',
              header: t('actions'),
              render: (item) => (
                <CrudActions
                  module="clients"
                  onEdit={() => openEdit(item)}
                  onDelete={() => handleDelete(item.id)}
                />
              ),
            },
          ]}
          data={data?.data || []}
        />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? t('edit') : tc('addClient')}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-vega-red/10 border border-vega-red/25 px-4 py-3 text-sm text-vega-red">
              {error}
            </div>
          )}
          <FormField label={tc('company')} required>
            <TextInput value={form.companyName} onChange={(e) => set('companyName', e.target.value)} required />
          </FormField>
          <FormField label={tc('owner')} required>
            <TextInput value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} required />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={tc('email')}>
              <TextInput type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </FormField>
            <FormField label={tc('phone')}>
              <TextInput value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </FormField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={tc('country')}>
              <TextInput value={form.country} onChange={(e) => set('country', e.target.value)} />
            </FormField>
            <FormField label={tc('status')}>
              <SelectInput value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="LEAD">LEAD</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="CHURNED">CHURNED</option>
              </SelectInput>
            </FormField>
          </div>
          <FormField label={tc('businessType')}>
            <TextInput value={form.businessType} onChange={(e) => set('businessType', e.target.value)} />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={tc('classification')}>
              <SelectInput value={form.classification} onChange={(e) => set('classification', e.target.value)}>
                {CLIENT_CLASSIFICATIONS.map((c) => (
                  <option key={c} value={c}>
                    {classificationLabel(tc, c)}
                  </option>
                ))}
              </SelectInput>
            </FormField>
            {canAssignManager && (
              <FormField label={tc('marketingManager')}>
                <SelectInput
                  value={form.marketingManagerId}
                  onChange={(e) => set('marketingManagerId', e.target.value)}
                >
                  <option value="">{tc('marketingManagerPlaceholder')}</option>
                  {marketingManagers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {marketingManagerLabel(m)}
                    </option>
                  ))}
                </SelectInput>
              </FormField>
            )}
          </div>
          <FormField label={tc('notes')}>
            <TextArea value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </FormField>

          <div className="rounded-lg border border-vega-cyan/25 bg-vega-cyan/5 p-4 space-y-3">
            <p className="text-sm font-semibold text-vega-cyan">{tc('portalSection')}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">{tc('portalSectionHint')}</p>
            <FormField label={tc('portalEmail')}>
              <TextInput
                type="email"
                value={form.portalEmail}
                onChange={(e) => set('portalEmail', e.target.value)}
                placeholder="client@company.com"
              />
            </FormField>
            <FormField label={tc('portalPassword')}>
              <TextInput
                type="password"
                value={form.portalPassword}
                onChange={(e) => set('portalPassword', e.target.value)}
                placeholder={editId ? tc('portalPasswordEditHint') : tc('portalPasswordHint')}
                autoComplete="new-password"
              />
            </FormField>
          </div>

          <FormActions onCancel={() => setOpen(false)} submitLabel={t('save')} cancelLabel={t('cancel')} loading={saving} />
        </form>
      </Modal>
    </DashboardLayout>
  );
}
