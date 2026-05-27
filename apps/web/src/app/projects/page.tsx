'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { DataTable } from '@/components/data-table';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { FormField, TextInput, SelectInput, TextArea, FormActions } from '@/components/ui/form-fields';
import { CrudActions } from '@/components/admin/crud-actions';
import { useApiData } from '@/hooks/use-api-data';
import { usePermissions } from '@/hooks/use-permissions';
import { api } from '@/lib/api';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority?: string;
  progress: number;
  clientId?: string;
  client?: { id: string; companyName: string };
  _count?: { tasks: number };
}

interface ClientOption {
  id: string;
  companyName: string;
}

const INITIAL = {
  name: '',
  description: '',
  clientId: '',
  status: 'PLANNING',
  priority: 'MEDIUM',
};

export default function ProjectsPage() {
  const t = useTranslations('common');
  const tp = useTranslations('projects');
  const { canCreate } = usePermissions();
  const { data, loading, refetch, token } = useApiData<{ data: Project[] }>('/projects');
  const { data: clientsData } = useApiData<{ data: ClientOption[] }>('/clients?limit=100');
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof typeof INITIAL, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const projectPayload = () => ({
    name: form.name,
    description: form.description || undefined,
    clientId: form.clientId || undefined,
    status: form.status,
    priority: form.priority,
    template: 'software',
    initPhases: true,
  });

  const openCreate = () => {
    setEditId(null);
    setForm(INITIAL);
    setError('');
    setOpen(true);
  };

  const openEdit = (item: Project) => {
    setEditId(item.id);
    setForm({
      name: item.name,
      description: item.description || '',
      clientId: item.clientId || item.client?.id || '',
      status: item.status,
      priority: item.priority || 'MEDIUM',
    });
    setError('');
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      if (editId) {
        await api(`/projects/${editId}`, { method: 'PATCH', token, body: JSON.stringify(projectPayload()) });
      } else {
        await api('/projects', { method: 'POST', token, body: JSON.stringify(projectPayload()) });
      }
      setOpen(false);
      setForm(INITIAL);
      setEditId(null);
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      await api(`/projects/${id}`, { method: 'DELETE', token });
      await refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const clients = clientsData?.data || [];

  return (
    <DashboardLayout title={tp('title')} module="projects">
      <PageHeader
        description={tp('description')}
        actionLabel={tp('addProject')}
        onAction={openCreate}
        showAction={canCreate('projects')}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-vega-cyan border-t-transparent" />
        </div>
      ) : (
        <DataTable
          columns={[
            {
              key: 'name',
              header: tp('name'),
              render: (item) => (
                <Link
                  href={`/projects/${item.id}`}
                  className="text-vega-navy dark:text-vega-cyan hover:underline font-semibold"
                >
                  {item.name}
                </Link>
              ),
            },
            { key: 'client', header: tp('client'), render: (item) => item.client?.companyName || '-' },
            {
              key: 'status',
              header: tp('status'),
              render: (item) => (
                <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold bg-vega-navy/10 text-vega-navy dark:text-vega-cyan">
                  {item.status}
                </span>
              ),
            },
            {
              key: 'progress',
              header: tp('progress'),
              render: (item) => (
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 rounded-full bg-[var(--color-surface-secondary)]">
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${item.progress}%`, background: 'var(--vega-gradient)' }}
                    />
                  </div>
                  <span className="text-xs">{item.progress}%</span>
                </div>
              ),
            },
            { key: 'tasks', header: tp('tasks'), render: (item) => item._count?.tasks ?? 0 },
            {
              key: 'actions',
              header: t('actions'),
              render: (item) => (
                <CrudActions
                  module="projects"
                  onEdit={() => openEdit(item)}
                  onDelete={() => handleDelete(item.id)}
                />
              ),
            },
          ]}
          data={data?.data || []}
        />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? t('edit') : tp('addProject')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-vega-red/10 border border-vega-red/25 px-4 py-3 text-sm text-vega-red">
              {error}
            </div>
          )}
          <FormField label={tp('name')} required>
            <TextInput value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </FormField>
          <FormField label={tp('descLabel')}>
            <TextArea value={form.description} onChange={(e) => set('description', e.target.value)} />
          </FormField>
          <FormField label={tp('client')}>
            <SelectInput value={form.clientId} onChange={(e) => set('clientId', e.target.value)}>
              <option value="">{tp('noClient')}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
                </option>
              ))}
            </SelectInput>
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={tp('status')}>
              <SelectInput value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="PLANNING">PLANNING</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="ON_HOLD">ON_HOLD</option>
                <option value="REVIEW">REVIEW</option>
                <option value="COMPLETED">COMPLETED</option>
              </SelectInput>
            </FormField>
            <FormField label={tp('priority')}>
              <SelectInput value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </SelectInput>
            </FormField>
          </div>
          <FormActions onCancel={() => setOpen(false)} submitLabel={t('save')} cancelLabel={t('cancel')} loading={saving} />
        </form>
      </Modal>
    </DashboardLayout>
  );
}
