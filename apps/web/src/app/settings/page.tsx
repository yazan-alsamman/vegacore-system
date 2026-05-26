'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { FormField, TextInput, FormActions } from '@/components/ui/form-fields';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const { user, token } = useAuth();
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (newPassword.length < 6) {
      setError(t('passwordMinLength'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api('/auth/change-password', {
        method: 'POST',
        token,
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage(t('passwordUpdated'));
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title={t('title')}>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-vega-navy dark:text-vega-cyan">
            {t('account')}
          </h2>
          <div>
            <label className="text-sm text-[var(--color-text-secondary)]">{t('name')}</label>
            <p className="font-medium">{user?.firstName} {user?.lastName}</p>
          </div>
          <div>
            <label className="text-sm text-[var(--color-text-secondary)]">{t('email')}</label>
            <p className="font-medium">{user?.email}</p>
          </div>
          <div>
            <label className="text-sm text-[var(--color-text-secondary)]">{t('role')}</label>
            <p className="font-medium">{user?.roleName}</p>
          </div>
          <div>
            <label className="text-sm text-[var(--color-text-secondary)]">{t('locale')}</label>
            <p className="font-medium">{locale === 'ar' ? t('localeAr') : t('localeEn')}</p>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-vega-navy dark:text-vega-cyan">
            {t('changePassword')}
          </h2>
          <form onSubmit={changePassword} className="space-y-4">
            {error && <div className="text-sm text-vega-red">{error}</div>}
            {message && <div className="text-sm text-vega-green">{message}</div>}
            <FormField label={t('currentPassword')} required>
              <TextInput
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </FormField>
            <FormField label={t('newPassword')} required>
              <TextInput
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </FormField>
            <FormField label={t('confirmPassword')} required>
              <TextInput
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </FormField>
            <FormActions
              onCancel={() => {
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setError('');
                setMessage('');
              }}
              submitLabel={t('updatePassword')}
              cancelLabel={tc('cancel')}
              loading={saving}
            />
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
