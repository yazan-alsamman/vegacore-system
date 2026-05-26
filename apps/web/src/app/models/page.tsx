'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PageHeader } from '@/components/ui/page-header';
import { Modal } from '@/components/ui/modal';
import { FormActions, FormField, SelectInput, TextArea, TextInput } from '@/components/ui/form-fields';
import { CrudActions } from '@/components/admin/crud-actions';
import { useApiData } from '@/hooks/use-api-data';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

interface ModelRow {
  id: string;
  contentTypes: string[];
  user: { firstName: string; lastName: string; email: string };
  _count: { bookings: number };
}

const EMPTY_NEW = {
  firstName: '',
  lastName: '',
  email: '',
  password: 'Model@123',
  phone: '',
  bio: '',
  contentTypes: 'Fashion, Reels',
};

export default function ModelsPage() {
  const t = useTranslations('models');
  const tc = useTranslations('common');
  const router = useRouter();
  const { user } = useAuth();
  const { canCreate, canUpdate, canDelete } = usePermissions();

  useEffect(() => {
    if (user?.role === 'model' && user.modelProfile?.id) {
      router.replace(`/models/${user.modelProfile.id}`);
    }
  }, [user, router]);
  const { data, loading, refetch, token } = useApiData<ModelRow[]>('/models');
  const { data: eligibleUsers } = useApiData<{ id: string; firstName: string; lastName: string; email: string }[]>('/models/eligible-users');
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [userId, setUserId] = useState('');
  const [form, setForm] = useState(EMPTY_NEW);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      if (mode === 'new') {
        const created = await api<{ id: string }>('/models', {
          method: 'POST',
          token,
          body: JSON.stringify({
            mode: 'new-user',
            email: form.email,
            password: form.password,
            firstName: form.firstName,
            lastName: form.lastName,
            phone: form.phone || undefined,
            bio: form.bio || undefined,
            contentTypes: form.contentTypes.split(',').map((s) => s.trim()).filter(Boolean),
          }),
        });
        setOpen(false);
        setForm(EMPTY_NEW);
        await refetch();
        router.push(`/models/${created.id}`);
      } else {
        if (!userId) return;
        const created = await api<{ id: string }>('/models', {
          method: 'POST',
          token,
          body: JSON.stringify({
            userId,
            bio: form.bio || undefined,
            contentTypes: form.contentTypes.split(',').map((s) => s.trim()).filter(Boolean),
          }),
        });
        setOpen(false);
        setUserId('');
        await refetch();
        router.push(`/models/${created.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    if (!window.confirm(t('deleteModelConfirm'))) return;
    try {
      await api(`/models/${id}`, { method: 'DELETE', token });
      await refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : tc('error'));
    }
  };

  const usersWithoutProfile = useMemo(() => eligibleUsers || [], [eligibleUsers]);

  return (
    <DashboardLayout title={t('title')} module="models">
      <PageHeader
        description={t('description')}
        actionLabel={t('addModel')}
        onAction={() => { setError(''); setOpen(true); }}
        showAction={canCreate('models')}
      />

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" /></div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data || []).map((model) => (
            <div
              key={model.id}
              className="relative rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition-all hover:border-vega-cyan hover:shadow-md"
            >
              {(canUpdate('models') || canDelete('models')) && (
                <div className="absolute top-3 end-3">
                  <CrudActions
                    module="models"
                    onEdit={() => router.push(`/models/${model.id}`)}
                    onDelete={() => handleDelete(model.id)}
                    deleteConfirm={t('deleteModelConfirm')}
                  />
                </div>
              )}
              <Link href={`/models/${model.id}`} className="block">
                <div className="flex h-16 w-16 items-center justify-center rounded-full text-white text-xl font-bold" style={{ background: 'var(--vega-gradient)' }}>
                  {model.user.firstName[0]}{model.user.lastName[0]}
                </div>
                <h3 className="mt-4 font-semibold pe-16">{model.user.firstName} {model.user.lastName}</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">{model.user.email}</p>
                {model.contentTypes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {model.contentTypes.slice(0, 3).map((ct) => (
                      <span key={ct} className="rounded-full bg-vega-cyan/10 px-2 py-0.5 text-[10px] text-vega-cyan">{ct}</span>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-sm font-medium text-vega-cyan">{t('bookings', { count: model._count.bookings })} · {t('viewProfile')}</p>
              </Link>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={t('addModel')}>
        <form className="space-y-4 max-h-[75vh] overflow-y-auto" onSubmit={submit}>
          {error && (
            <div className="rounded-lg border border-vega-red/25 bg-vega-red/10 px-4 py-3 text-sm text-vega-red">{error}</div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('new')}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${mode === 'new' ? 'bg-vega-cyan/15 text-vega-cyan' : 'bg-[var(--color-surface-secondary)]'}`}
            >
              {t('createNewModel')}
            </button>
            <button
              type="button"
              onClick={() => setMode('existing')}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${mode === 'existing' ? 'bg-vega-cyan/15 text-vega-cyan' : 'bg-[var(--color-surface-secondary)]'}`}
            >
              {t('linkExistingUser')}
            </button>
          </div>

          {mode === 'existing' ? (
            <FormField label={t('selectUser')} required>
              <SelectInput value={userId} onChange={(e) => setUserId(e.target.value)} required>
                <option value="">{t('noUser')}</option>
                {usersWithoutProfile.map((u) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
                ))}
              </SelectInput>
            </FormField>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <FormField label={t('firstName')} required>
                  <TextInput value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} required />
                </FormField>
                <FormField label={t('lastName')} required>
                  <TextInput value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} required />
                </FormField>
              </div>
              <FormField label={t('email')} required>
                <TextInput type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
              </FormField>
              <FormField label={t('password')} required>
                <TextInput type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
              </FormField>
              <FormField label={t('phone')}>
                <TextInput value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </FormField>
            </>
          )}

          <FormField label={t('bio')}><TextArea value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} /></FormField>
          <FormField label={t('contentTypes')}>
            <TextInput value={form.contentTypes} onChange={(e) => setForm((f) => ({ ...f, contentTypes: e.target.value }))} placeholder={t('contentTypesHint')} />
          </FormField>

          <FormActions onCancel={() => setOpen(false)} submitLabel={tc('save')} cancelLabel={tc('cancel')} loading={saving} />
        </form>
      </Modal>
    </DashboardLayout>
  );
}
