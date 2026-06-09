'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CrudActions } from '@/components/admin/crud-actions';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { DataTable } from '@/components/data-table';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { FormField, FormGrid, TextInput, SelectInput, FormActions } from '@/components/ui/form-fields';
import { useApiData } from '@/hooks/use-api-data';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

interface RoleOption {
  id: string;
  name: string;
  slug: string;
}

interface TeamUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  status: string;
  role: { id: string; name: string; slug: string };
  employeeProfile?: { department?: string | null } | null;
}

const DEPARTMENTS = ['marketing', 'programming'] as const;
type Department = (typeof DEPARTMENTS)[number];

const EMPTY = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  roleId: '',
  department: '' as '' | Department,
  status: 'ACTIVE',
};

function departmentLabel(th: (key: string) => string, value?: string | null) {
  if (value === 'marketing') return th('departmentMarketing');
  if (value === 'programming') return th('departmentProgramming');
  return value || '—';
}

export default function HrPage() {
  const t = useTranslations('common');
  const th = useTranslations('hr');
  const { user } = useAuth();
  const { canCreate, canUpdate } = usePermissions();
  const canAddEmployee = canCreate('users');
  const canEditEmployee = canUpdate('users');
  const { data, loading, error: loadError, refetch, token } = useApiData<TeamUser[]>('/users/team');
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const loadRoles = useCallback(async (): Promise<RoleOption[]> => {
    if (!token || (!canAddEmployee && !canEditEmployee)) return [];
    setRolesLoading(true);
    try {
      const list = await api<RoleOption[]>('/users/roles/options', { token });
      const items = Array.isArray(list) ? list : [];
      setRoles(items);
      return items;
    } catch {
      setRoles([]);
      return [];
    } finally {
      setRolesLoading(false);
    }
  }, [token, canAddEmployee, canEditEmployee]);

  useEffect(() => {
    if (!user || (!canAddEmployee && !canEditEmployee)) return;
    void loadRoles();
  }, [user?.id, canAddEmployee, canEditEmployee, loadRoles]);

  const staff = data || [];

  const openCreate = async () => {
    setEditId(null);
    setFormError('');
    setOpen(true);
    const list = roles.length ? roles : await loadRoles();
    setForm({ ...EMPTY, roleId: list[0]?.id || '' });
  };

  const openEdit = async (item: TeamUser) => {
    setEditId(item.id);
    setFormError('');
    setOpen(true);
    if (!roles.length) await loadRoles();
    const dept = item.employeeProfile?.department;
    setForm({
      firstName: item.firstName,
      lastName: item.lastName,
      email: item.email,
      password: '',
      phone: item.phone || '',
      roleId: item.role.id,
      department: (dept === 'marketing' || dept === 'programming' ? dept : '') as '' | Department,
      status: item.status || 'ACTIVE',
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setFormError('');
    try {
      if (editId) {
        const body: Record<string, string | undefined> = {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          roleId: form.roleId,
          department: form.department.trim() || undefined,
          status: form.status,
        };
        if (form.password.trim()) body.password = form.password;
        await api(`/users/${editId}`, { method: 'PATCH', token, body: JSON.stringify(body) });
      } else {
        await api('/users', {
          method: 'POST',
          token,
          body: JSON.stringify({
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            email: form.email.trim(),
            password: form.password,
            phone: form.phone.trim() || undefined,
            roleId: form.roleId,
            department: form.department.trim() || undefined,
          }),
        });
      }
      setOpen(false);
      setEditId(null);
      setForm(EMPTY);
      await refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title={th('title')} module="hr">
      <PageHeader
        description={th('description')}
        actionLabel={th('addEmployee')}
        onAction={openCreate}
        showAction={canAddEmployee}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      ) : loadError ? (
        <div className="rounded-xl border border-vega-red/30 bg-vega-red/5 p-6 text-center text-sm text-vega-red">
          {loadError}
        </div>
      ) : (
        <DataTable
          columns={[
            {
              key: 'name',
              header: th('employee'),
              render: (item) => `${item.firstName} ${item.lastName}`,
            },
            { key: 'email', header: th('email') },
            { key: 'role', header: th('role'), render: (item) => item.role.name },
            {
              key: 'department',
              header: th('department'),
              render: (item) => departmentLabel(th, item.employeeProfile?.department),
            },
            {
              key: 'status',
              header: t('status'),
              render: (item) => (
                <span className={item.status === 'ACTIVE' ? 'text-vega-green' : 'text-[var(--color-text-secondary)]'}>
                  {item.status === 'ACTIVE' ? th('statusActive') : th('statusInactive')}
                </span>
              ),
            },
            ...(canEditEmployee
              ? [
                  {
                    key: 'actions',
                    header: t('actions'),
                    render: (item: TeamUser) => (
                      <CrudActions module="users" onEdit={() => void openEdit(item)} />
                    ),
                  },
                ]
              : []),
          ]}
          data={staff}
        />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? th('editEmployee') : th('addEmployee')}
      >
        <form onSubmit={save} className="space-y-4 max-h-[70vh] overflow-y-auto pe-1">
          {formError && <div className="text-sm text-vega-red">{formError}</div>}
          <FormGrid>
            <FormField label={th('firstName')} required>
              <TextInput value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            </FormField>
            <FormField label={th('lastName')} required>
              <TextInput value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
            </FormField>
          </FormGrid>
          <FormField label={th('email')} required>
            <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </FormField>
          <FormField label={editId ? th('newPassword') : th('password')} required={!editId}>
            <TextInput
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={6}
              required={!editId}
              autoComplete="new-password"
              placeholder={editId ? th('passwordEditHint') : undefined}
            />
          </FormField>
          <FormField label={th('role')} required>
            <SelectInput
              value={form.roleId}
              onChange={(e) => setForm({ ...form, roleId: e.target.value })}
              required
              disabled={rolesLoading}
            >
              <option value="">{rolesLoading ? th('loadingRoles') : '—'}</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </SelectInput>
          </FormField>
          <FormField label={th('phone')}>
            <TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </FormField>
          <FormField label={th('department')}>
            <SelectInput
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value as typeof form.department })}
            >
              <option value="">—</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {departmentLabel(th, d)}
                </option>
              ))}
            </SelectInput>
          </FormField>
          {editId && (
            <FormField label={t('status')}>
              <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="ACTIVE">{th('statusActive')}</option>
                <option value="INACTIVE">{th('statusInactive')}</option>
              </SelectInput>
            </FormField>
          )}
          <FormActions onCancel={() => setOpen(false)} submitLabel={t('save')} cancelLabel={t('cancel')} loading={saving} />
        </form>
      </Modal>
    </DashboardLayout>
  );
}
