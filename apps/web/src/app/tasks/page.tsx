'use client';

import { useState } from 'react';
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

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  projectId?: string;
  assigneeId?: string;
  assignee?: { firstName: string; lastName: string };
  project?: { id: string; name: string };
}

interface ProjectOption {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
}

const INITIAL = {
  title: '',
  description: '',
  projectId: '',
  assigneeId: '',
  status: 'TODO',
  priority: 'MEDIUM',
  dueDate: '',
};

export default function TasksPage() {
  const t = useTranslations('common');
  const tt = useTranslations('tasks');
  const { canCreate } = usePermissions();
  const { data, loading, refetch, token } = useApiData<{ data: Task[] }>('/tasks');
  const { data: projectsData } = useApiData<{ data: ProjectOption[] }>('/projects?limit=100');
  const { data: usersData } = useApiData<{ data: UserOption[] }>('/users?limit=100');
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof typeof INITIAL, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const taskPayload = () => ({
    title: form.title,
    description: form.description || undefined,
    projectId: form.projectId || undefined,
    assigneeId: form.assigneeId || undefined,
    status: form.status,
    priority: form.priority,
    dueDate: form.dueDate || undefined,
  });

  const openCreate = () => {
    setEditId(null);
    setForm(INITIAL);
    setError('');
    setOpen(true);
  };

  const openEdit = (item: Task) => {
    setEditId(item.id);
    setForm({
      title: item.title,
      description: item.description || '',
      projectId: item.projectId || item.project?.id || '',
      assigneeId: item.assigneeId || '',
      status: item.status,
      priority: item.priority,
      dueDate: item.dueDate ? item.dueDate.slice(0, 10) : '',
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
        await api(`/tasks/${editId}`, { method: 'PATCH', token, body: JSON.stringify(taskPayload()) });
      } else {
        await api('/tasks', { method: 'POST', token, body: JSON.stringify(taskPayload()) });
      }
      setOpen(false);
      setForm(INITIAL);
      setEditId(null);
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      await api(`/tasks/${id}`, { method: 'DELETE', token });
      await refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const projects = projectsData?.data || [];
  const users = usersData?.data || [];

  return (
    <DashboardLayout title={tt('title')} module="tasks">
      <PageHeader
        description={tt('description')}
        actionLabel={tt('addTask')}
        onAction={openCreate}
        showAction={canCreate('tasks')}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-vega-cyan border-t-transparent" />
        </div>
      ) : (
        <DataTable
          columns={[
            { key: 'title', header: tt('titleCol') },
            { key: 'project', header: tt('project'), render: (item) => item.project?.name || '-' },
            {
              key: 'assignee',
              header: tt('assignee'),
              render: (item) =>
                item.assignee ? `${item.assignee.firstName} ${item.assignee.lastName}` : tt('unassigned'),
            },
            { key: 'priority', header: tt('priority') },
            { key: 'status', header: tt('status') },
            {
              key: 'dueDate',
              header: tt('dueDate'),
              render: (item) => (item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '-'),
            },
            {
              key: 'actions',
              header: t('actions'),
              render: (item) => (
                <CrudActions
                  module="tasks"
                  onEdit={() => openEdit(item)}
                  onDelete={() => handleDelete(item.id)}
                />
              ),
            },
          ]}
          data={data?.data || []}
        />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? t('edit') : tt('addTask')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-vega-red/10 border border-vega-red/25 px-4 py-3 text-sm text-vega-red">
              {error}
            </div>
          )}
          <FormField label={tt('titleCol')} required>
            <TextInput value={form.title} onChange={(e) => set('title', e.target.value)} required />
          </FormField>
          <FormField label={tt('descLabel')}>
            <TextArea value={form.description} onChange={(e) => set('description', e.target.value)} />
          </FormField>
          <FormField label={tt('project')}>
            <SelectInput value={form.projectId} onChange={(e) => set('projectId', e.target.value)}>
              <option value="">{tt('noProject')}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </SelectInput>
          </FormField>
          <FormField label={tt('assignee')}>
            <SelectInput value={form.assigneeId} onChange={(e) => set('assigneeId', e.target.value)}>
              <option value="">{tt('unassigned')}</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </SelectInput>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label={tt('status')}>
              <SelectInput value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="TODO">TODO</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="IN_REVIEW">IN_REVIEW</option>
                <option value="BLOCKED">BLOCKED</option>
                <option value="DONE">DONE</option>
              </SelectInput>
            </FormField>
            <FormField label={tt('priority')}>
              <SelectInput value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </SelectInput>
            </FormField>
          </div>
          <FormField label={tt('dueDate')}>
            <TextInput type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
          </FormField>
          <FormActions onCancel={() => setOpen(false)} submitLabel={t('save')} cancelLabel={t('cancel')} loading={saving} />
        </form>
      </Modal>
    </DashboardLayout>
  );
}
