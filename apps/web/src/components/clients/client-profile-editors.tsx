'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CrudActions } from '@/components/admin/crud-actions';
import { Modal } from '@/components/ui/modal';
import { FormField, TextInput, SelectInput, TextArea, FormActions } from '@/components/ui/form-fields';
import { usePermissions } from '@/hooks/use-permissions';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import {
  parseSocialEntry,
  serializeSocialEntry,
  socialEntryHasData,
  type SocialLinkEntry,
  type SocialLinksMap,
} from '@/lib/social-links';

function parseMetaLines(text: string): Record<string, string> {
  const meta: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return meta;
}

function metaToLines(meta: Record<string, string> | undefined): string {
  if (!meta) return '';
  return Object.entries(meta)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

function EditBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-vega-cyan/40 px-3 py-1.5 text-xs font-semibold text-vega-cyan hover:bg-vega-cyan/10"
    >
      {label}
    </button>
  );
}

function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-vega-cyan hover:bg-vega-cyan/10"
    >
      <Plus className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

const SOCIAL_PLATFORMS = [
  'instagram',
  'linkedin',
  'facebook',
  'tiktok',
  'youtube',
  'twitter',
  'snapchat',
  'website',
] as const;

function platformLabel(key: string, tc: (k: string) => string) {
  const known = SOCIAL_PLATFORMS.includes(key as (typeof SOCIAL_PLATFORMS)[number]);
  return known ? tc(`platforms.${key}`) : key;
}

function formatSocialUrl(platform: string, value: string) {
  const v = value.trim();
  if (!v) return null;
  if (v.startsWith('http://') || v.startsWith('https://')) return v;
  if (platform === 'website') return `https://${v}`;
  if (platform === 'instagram' && !v.startsWith('@')) return `https://instagram.com/${v.replace(/^@/, '')}`;
  return v;
}

export function SocialMediaSection({
  clientId,
  socialLinks,
  token,
  onSaved,
  notes,
}: {
  clientId: string;
  socialLinks: SocialLinksMap;
  token: string | null;
  onSaved: () => void;
  notes?: React.ReactNode;
}) {
  const t = useTranslations('common');
  const tc = useTranslations('clientProfile');
  const { canUpdate } = usePermissions();
  const [open, setOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [customPlatform, setCustomPlatform] = useState('');
  const [handle, setHandle] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const entries = Object.entries(socialLinks)
    .map(([key, val]) => [key, parseSocialEntry(val)] as const)
    .filter(([, entry]) => socialEntryHasData(entry));

  const resetForm = () => {
    setPlatform('instagram');
    setCustomPlatform('');
    setHandle('');
    setLoginUsername('');
    setLoginPassword('');
    setEditingKey(null);
    setError('');
  };

  const openAdd = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (key: string, entry: SocialLinkEntry) => {
    setEditingKey(key);
    if (SOCIAL_PLATFORMS.includes(key as (typeof SOCIAL_PLATFORMS)[number])) {
      setPlatform(key);
      setCustomPlatform('');
    } else {
      setPlatform('custom');
      setCustomPlatform(key);
    }
    setHandle(entry.handle);
    setLoginUsername(entry.loginUsername || '');
    setLoginPassword(entry.loginPassword || '');
    setOpen(true);
  };

  const saveLinks = async (next: SocialLinksMap) => {
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      await api(`/clients/${clientId}/social-links`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ socialLinks: next }),
      });
      setOpen(false);
      resetForm();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const plat = platform === 'custom' ? customPlatform.trim().toLowerCase().replace(/\s+/g, '_') : platform;
    if (!plat) {
      setError(tc('platformRequired'));
      return;
    }
    if (!handle.trim() && !loginUsername.trim() && !loginPassword.trim()) {
      setError(tc('valueRequired'));
      return;
    }
    const next = { ...socialLinks };
    if (editingKey && editingKey !== plat) delete next[editingKey];
    next[plat] = serializeSocialEntry({
      handle: handle.trim(),
      loginUsername: loginUsername.trim() || undefined,
      loginPassword: loginPassword.trim() || undefined,
    });
    await saveLinks(next);
  };

  const handleDelete = async (key: string) => {
    if (!window.confirm(tc('deleteSocialConfirm'))) return;
    const next = { ...socialLinks };
    delete next[key];
    await saveLinks(next);
  };

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-vega-navy dark:text-vega-cyan">
          {tc('socialMedia')}
        </h3>
        {canUpdate('clients') && <AddBtn onClick={openAdd} label={tc('addSocial')} />}
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)]">{t('noData')}</p>
      ) : (
        <ul className="space-y-2">
          {entries.map(([key, entry]) => {
            const href = entry.handle ? formatSocialUrl(key, entry.handle) : null;
            return (
              <li
                key={key}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2.5"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs font-semibold uppercase text-vega-navy dark:text-vega-cyan">
                    {platformLabel(key, tc)}
                  </p>
                  {entry.handle &&
                    (href && (href.startsWith('http') || href.startsWith('https')) ? (
                      <a href={href} target="_blank" rel="noreferrer" className="text-sm text-vega-cyan hover:underline break-all">
                        {entry.handle}
                      </a>
                    ) : (
                      <p className="text-sm break-all">{entry.handle}</p>
                    ))}
                  {entry.loginUsername && (
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {tc('accountUsername')}: <span className="text-[var(--color-text-primary)]">{entry.loginUsername}</span>
                    </p>
                  )}
                  {entry.loginPassword && (
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {tc('accountPassword')}:{' '}
                      <span className="break-all text-[var(--color-text-primary)]">{entry.loginPassword}</span>
                    </p>
                  )}
                </div>
                {canUpdate('clients') && (
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => openEdit(key, entry)} className="text-xs text-vega-cyan hover:underline">
                      {t('edit')}
                    </button>
                    <button type="button" onClick={() => handleDelete(key)} className="text-xs text-vega-red hover:underline">
                      {t('delete')}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {notes}

      <Modal open={open} onClose={() => { setOpen(false); resetForm(); }} title={editingKey ? tc('editSocial') : tc('addSocial')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-sm text-vega-red">{error}</div>}
          <FormField label={tc('platform')} required>
            <SelectInput value={platform} onChange={(e) => setPlatform(e.target.value)} disabled={!!editingKey}>
              {SOCIAL_PLATFORMS.map((p) => (
                <option key={p} value={p}>{tc(`platforms.${p}`)}</option>
              ))}
              <option value="custom">{tc('platforms.custom')}</option>
            </SelectInput>
          </FormField>
          {platform === 'custom' && (
            <FormField label={tc('customPlatform')} required>
              <TextInput
                value={customPlatform}
                onChange={(e) => setCustomPlatform(e.target.value)}
                placeholder={tc('customPlatformPlaceholder')}
                disabled={!!editingKey}
              />
            </FormField>
          )}
          <FormField label={tc('handleOrUrl')}>
            <TextInput value={handle} onChange={(e) => setHandle(e.target.value)} placeholder={tc('handlePlaceholder')} />
          </FormField>
          <FormField label={tc('accountUsername')}>
            <TextInput
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              placeholder={tc('accountUsernamePlaceholder')}
              autoComplete="username"
            />
          </FormField>
          <FormField label={tc('accountPassword')}>
            <TextInput
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder={tc('accountPasswordPlaceholder')}
              autoComplete="new-password"
            />
          </FormField>
          <FormActions onCancel={() => { setOpen(false); resetForm(); }} submitLabel={t('save')} cancelLabel={t('cancel')} loading={saving} />
        </form>
      </Modal>
    </div>
  );
}

export function ClientInfoEditor({
  clientId,
  client,
  token,
  onSaved,
}: {
  clientId: string;
  client: Record<string, unknown>;
  token: string | null;
  onSaved: () => void;
}) {
  const t = useTranslations('common');
  const tc = useTranslations('clientProfile');
  const { canUpdate } = usePermissions();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    ownerName: String(client.ownerName || ''),
    companyName: String(client.companyName || ''),
    phone: String(client.phone || ''),
    email: String(client.email || ''),
    country: String(client.country || ''),
    businessType: String(client.businessType || ''),
    onboardingDate: client.onboardingDate ? String(client.onboardingDate).slice(0, 10) : '',
    status: String(client.status || 'ACTIVE'),
    notes: String(client.notes || ''),
  });

  if (!canUpdate('clients')) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      await api(`/clients/${clientId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          ownerName: form.ownerName,
          companyName: form.companyName,
          phone: form.phone || undefined,
          email: form.email || undefined,
          country: form.country || undefined,
          businessType: form.businessType || undefined,
          onboardingDate: form.onboardingDate || undefined,
          status: form.status,
          notes: form.notes || undefined,
        }),
      });
      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <EditBtn onClick={() => setOpen(true)} label={t('edit')} />
      <Modal open={open} onClose={() => setOpen(false)} title={tc('editClientData')}>
        <form onSubmit={save} className="space-y-4 max-h-[70vh] overflow-y-auto pe-1">
          {error && <div className="text-sm text-vega-red">{error}</div>}
          <FormField label={tc('ownerName')} required>
            <TextInput value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} required />
          </FormField>
          <FormField label={tc('company')} required>
            <TextInput value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} required />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label={tc('phone')}>
              <TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </FormField>
            <FormField label={tc('email')}>
              <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </FormField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label={tc('country')}>
              <TextInput value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </FormField>
            <FormField label={tc('startDate')}>
              <TextInput type="date" value={form.onboardingDate} onChange={(e) => setForm({ ...form, onboardingDate: e.target.value })} />
            </FormField>
          </div>
          <FormField label={tc('businessType')}>
            <TextInput value={form.businessType} onChange={(e) => setForm({ ...form, businessType: e.target.value })} />
          </FormField>
          <FormField label={tc('status')}>
            <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="LEAD">LEAD</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="CHURNED">CHURNED</option>
            </SelectInput>
          </FormField>
          <FormField label={tc('notes')}>
            <TextArea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </FormField>
          <FormActions onCancel={() => setOpen(false)} submitLabel={t('save')} cancelLabel={t('cancel')} loading={saving} />
        </form>
      </Modal>
    </>
  );
}

const EMPTY_PKG = {
  name: '',
  packageType: '',
  subscribedServices: '',
  reelsQuota: '0',
  designQuota: '0',
  visitsQuota: '0',
  developmentHours: '0',
  hostingType: '',
  contractStart: '',
  contractEnd: '',
};

export function PackageEditor({
  clientId,
  pkg,
  token,
  onSaved,
}: {
  clientId: string;
  pkg?: Record<string, unknown>;
  token: string | null;
  onSaved: () => void;
}) {
  const t = useTranslations('common');
  const tc = useTranslations('clientProfile');
  const { canUpdate } = usePermissions();
  const [open, setOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_PKG);

  if (!canUpdate('clients')) return null;

  const isActive = Boolean(pkg?.isActive);

  const openCreate = () => {
    setEditingPkg(null);
    setForm(EMPTY_PKG);
    setOpen(true);
  };

  const openEdit = (target: Record<string, unknown>) => {
    setEditingPkg(target);
    const services = (target.subscribedServices as string[]) || [];
    setForm({
      name: String(target.name || ''),
      packageType: String(target.packageType || ''),
      subscribedServices: services.join(', '),
      reelsQuota: String(target.reelsQuota ?? 0),
      designQuota: String(target.designQuota ?? 0),
      visitsQuota: String(target.visitsQuota ?? 0),
      developmentHours: String(target.developmentHours ?? 0),
      hostingType: String(target.hostingType || ''),
      contractStart: target.contractStart ? String(target.contractStart).slice(0, 10) : '',
      contractEnd: target.contractEnd ? String(target.contractEnd).slice(0, 10) : '',
    });
    setOpen(true);
  };

  const buildPayload = () => ({
    name: form.name,
    packageType: form.packageType || undefined,
    subscribedServices: form.subscribedServices
      ? form.subscribedServices.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined,
    reelsQuota: Number(form.reelsQuota) || 0,
    designQuota: Number(form.designQuota) || 0,
    visitsQuota: Number(form.visitsQuota) || 0,
    developmentHours: Number(form.developmentHours) || 0,
    hostingType: form.hostingType || undefined,
    contractStart: form.contractStart || undefined,
    contractEnd: form.contractEnd || undefined,
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      if (editingPkg?.id) {
        await api(`/clients/${clientId}/packages/${editingPkg.id}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify(buildPayload()),
        });
      } else {
        await api(`/clients/${clientId}/packages`, {
          method: 'POST',
          token,
          body: JSON.stringify(buildPayload()),
        });
      }
      setOpen(false);
      setEditingPkg(null);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setSaving(false);
    }
  };

  const setPackageActive = async (packageId: string, active: boolean) => {
    if (!token) return;
    if (!active && !window.confirm(tc('deactivatePackageConfirm'))) return;
    setSaving(true);
    try {
      await api(`/clients/${clientId}/packages/${packageId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ isActive: active }),
      });
      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : t('error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {pkg && (
          <EditBtn onClick={() => openEdit(pkg)} label={t('edit')} />
        )}
        {pkg && isActive && (
          <button
            type="button"
            disabled={saving}
            onClick={() => setPackageActive(String(pkg.id), false)}
            className="rounded-lg border border-amber-500/40 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
          >
            {tc('deactivatePackage')}
          </button>
        )}
        <AddBtn onClick={openCreate} label={pkg ? tc('addAnotherPackage') : tc('addPackage')} />
      </div>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditingPkg(null);
        }}
        title={editingPkg ? tc('editPackage') : tc('addPackage')}
      >
        <form onSubmit={save} className="space-y-4 max-h-[70vh] overflow-y-auto pe-1">
          {error && <div className="text-sm text-vega-red">{error}</div>}
          <FormField label={tc('packageName')} required>
            <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </FormField>
          <FormField label={tc('packageType')}>
            <TextInput value={form.packageType} onChange={(e) => setForm({ ...form, packageType: e.target.value })} />
          </FormField>
          <FormField label={tc('agreedServices')}>
            <TextInput
              value={form.subscribedServices}
              onChange={(e) => setForm({ ...form, subscribedServices: e.target.value })}
              placeholder="social, design, development"
            />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label={tc('reelsQuota')}>
              <TextInput type="number" value={form.reelsQuota} onChange={(e) => setForm({ ...form, reelsQuota: e.target.value })} />
            </FormField>
            <FormField label={tc('designQuota')}>
              <TextInput type="number" value={form.designQuota} onChange={(e) => setForm({ ...form, designQuota: e.target.value })} />
            </FormField>
            <FormField label={tc('visitsQuota')}>
              <TextInput type="number" value={form.visitsQuota} onChange={(e) => setForm({ ...form, visitsQuota: e.target.value })} />
            </FormField>
            <FormField label={tc('devHours')}>
              <TextInput type="number" value={form.developmentHours} onChange={(e) => setForm({ ...form, developmentHours: e.target.value })} />
            </FormField>
          </div>
          <FormField label={tc('hostingType')}>
            <TextInput value={form.hostingType} onChange={(e) => setForm({ ...form, hostingType: e.target.value })} />
          </FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label={tc('contractStart')}>
              <TextInput type="date" value={form.contractStart} onChange={(e) => setForm({ ...form, contractStart: e.target.value })} />
            </FormField>
            <FormField label={tc('contractEnd')}>
              <TextInput type="date" value={form.contractEnd} onChange={(e) => setForm({ ...form, contractEnd: e.target.value })} />
            </FormField>
          </div>
          <FormActions onCancel={() => setOpen(false)} submitLabel={t('save')} cancelLabel={t('cancel')} loading={saving} />
        </form>
      </Modal>
    </>
  );
}

export function PackageActivateButton({
  clientId,
  packageId,
  token,
  onSaved,
}: {
  clientId: string;
  packageId: string;
  token: string | null;
  onSaved: () => void;
}) {
  const t = useTranslations('common');
  const tc = useTranslations('clientProfile');
  const { canUpdate } = usePermissions();
  const [saving, setSaving] = useState(false);

  if (!canUpdate('clients')) return null;

  const activate = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await api(`/clients/${clientId}/packages/${packageId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ isActive: true }),
      });
      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : t('error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      type="button"
      disabled={saving}
      onClick={activate}
      className="text-xs font-semibold text-vega-cyan hover:underline"
    >
      {tc('activatePackage')}
    </button>
  );
}

export function AssetEditor({
  clientId,
  assetType,
  asset,
  token,
  onSaved,
}: {
  clientId: string;
  assetType: string;
  asset?: Record<string, unknown>;
  token: string | null;
  onSaved: () => void;
}) {
  const t = useTranslations('common');
  const tc = useTranslations('clientProfile');
  const { canUpdate } = usePermissions();
  const meta = (asset?.metadata || {}) as Record<string, string>;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', fileUrl: '', metaLines: '' });

  if (!canUpdate('clients')) return null;

  const openForm = () => {
    setForm({
      name: asset ? String(asset.name) : '',
      fileUrl: asset && String(asset.fileUrl) !== '#' ? String(asset.fileUrl) : '',
      metaLines: metaToLines(meta),
    });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const body = {
        name: form.name,
        categoryKey: assetType,
        fileUrl: form.fileUrl || '#',
        metadata: parseMetaLines(form.metaLines),
      };
      if (asset?.id) {
        await api(`/clients/${clientId}/assets/${asset.id}`, { method: 'PATCH', token, body: JSON.stringify(body) });
      } else {
        await api(`/clients/${clientId}/assets`, { method: 'POST', token, body: JSON.stringify(body) });
      }
      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!token || !asset?.id) return;
    try {
      await api(`/clients/${clientId}/assets/${asset.id}`, { method: 'DELETE', token });
      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : t('error'));
    }
  };

  return (
    <>
      {asset ? (
        <CrudActions module="clients" onEdit={openForm} onDelete={remove} />
      ) : (
        <AddBtn onClick={openForm} label={t('create')} />
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={asset ? tc('editFile') : tc('addFile')}>
        <form onSubmit={save} className="space-y-4">
          {error && <div className="text-sm text-vega-red">{error}</div>}
          <FormField label={tc('fileName')} required>
            <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </FormField>
          <FormField label={tc('fileUrl')}>
            <TextInput value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} placeholder="https://..." />
          </FormField>
          <FormField label={tc('metadataHint')}>
            <TextArea
              value={form.metaLines}
              onChange={(e) => setForm({ ...form, metaLines: e.target.value })}
              placeholder={'registrar: Namecheap\nexpiresAt: 2027-01-01'}
            />
          </FormField>
          <FormActions onCancel={() => setOpen(false)} submitLabel={t('save')} cancelLabel={t('cancel')} loading={saving} />
        </form>
      </Modal>
    </>
  );
}

export function AddFileSectionButton({
  clientId,
  token,
  onSaved,
}: {
  clientId: string;
  token: string | null;
  onSaved: () => void;
}) {
  const t = useTranslations('common');
  const tc = useTranslations('clientProfile');
  const { canUpdate } = usePermissions();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!canUpdate('clients')) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      await api(`/clients/${clientId}/file-sections`, {
        method: 'POST',
        token,
        body: JSON.stringify({ label }),
      });
      setOpen(false);
      setLabel('');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-lg border border-vega-cyan/40 px-3 py-1.5 text-xs font-semibold text-vega-cyan hover:bg-vega-cyan/10"
      >
        <Plus className="h-3.5 w-3.5" />
        {tc('addFileType')}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={tc('addFileType')}>
        <form onSubmit={save} className="space-y-4">
          {error && <div className="text-sm text-vega-red">{error}</div>}
          <FormField label={tc('fileTypeName')} required>
            <TextInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder={tc('fileTypeNamePlaceholder')} required />
          </FormField>
          <FormActions onCancel={() => setOpen(false)} submitLabel={t('save')} cancelLabel={t('cancel')} loading={saving} />
        </form>
      </Modal>
    </>
  );
}

export function FileSectionActions({
  clientId,
  sectionKey,
  displayTitle,
  token,
  onSaved,
}: {
  clientId: string;
  sectionKey: string;
  displayTitle: string;
  token: string | null;
  onSaved: () => void;
}) {
  const t = useTranslations('common');
  const tc = useTranslations('clientProfile');
  const { canUpdate } = usePermissions();
  const [renameOpen, setRenameOpen] = useState(false);
  const [label, setLabel] = useState(displayTitle);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!canUpdate('clients')) return null;

  const rename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      await api(`/clients/${clientId}/file-sections/${encodeURIComponent(sectionKey)}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ label }),
      });
      setRenameOpen(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!token) return;
    if (!window.confirm(tc('deleteFileTypeConfirm'))) return;
    try {
      await api(`/clients/${clientId}/file-sections/${encodeURIComponent(sectionKey)}`, {
        method: 'DELETE',
        token,
      });
      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : t('error'));
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => { setLabel(displayTitle); setRenameOpen(true); }} className="text-xs text-vega-cyan hover:underline">
          {tc('renameFileType')}
        </button>
        <button type="button" onClick={remove} className="text-xs text-vega-red hover:underline">
          {tc('deleteFileType')}
        </button>
      </div>
      <Modal open={renameOpen} onClose={() => setRenameOpen(false)} title={tc('renameFileType')}>
        <form onSubmit={rename} className="space-y-4">
          {error && <div className="text-sm text-vega-red">{error}</div>}
          <FormField label={tc('fileTypeName')} required>
            <TextInput value={label} onChange={(e) => setLabel(e.target.value)} required />
          </FormField>
          <FormActions onCancel={() => setRenameOpen(false)} submitLabel={t('save')} cancelLabel={t('cancel')} loading={saving} />
        </form>
      </Modal>
    </>
  );
}

export function TimelineEditor({
  clientId,
  token,
  onSaved,
}: {
  clientId: string;
  token: string | null;
  onSaved: () => void;
}) {
  const t = useTranslations('common');
  const tc = useTranslations('clientProfile');
  const { canUpdate } = usePermissions();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: 'note', title: '', content: '' });

  if (!canUpdate('clients')) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      await api(`/clients/${clientId}/timeline`, {
        method: 'POST',
        token,
        body: JSON.stringify(form),
      });
      setOpen(false);
      setForm({ type: 'note', title: '', content: '' });
      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : t('error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <EditBtn onClick={() => setOpen(true)} label={tc('addHistory')} />
      <Modal open={open} onClose={() => setOpen(false)} title={tc('addHistory')}>
        <form onSubmit={save} className="space-y-4">
          <FormField label={tc('historyType')}>
            <SelectInput value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="note">note</option>
              <option value="message">message</option>
              <option value="meeting">meeting</option>
              <option value="call">call</option>
            </SelectInput>
          </FormField>
          <FormField label={tc('historyTitle')} required>
            <TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </FormField>
          <FormField label={tc('historyContent')}>
            <TextArea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </FormField>
          <FormActions onCancel={() => setOpen(false)} submitLabel={t('save')} cancelLabel={t('cancel')} loading={saving} />
        </form>
      </Modal>
    </>
  );
}

export function TimelineDelete({
  clientId,
  item,
  token,
  onSaved,
}: {
  clientId: string;
  item: { id: string; source?: string };
  token: string | null;
  onSaved: () => void;
}) {
  const t = useTranslations('common');
  const { canDelete } = usePermissions();
  if (!canDelete('clients') || item.source !== 'timeline') return null;

  const remove = async () => {
    if (!token || !confirm(t('deleteConfirm'))) return;
    await api(`/clients/${clientId}/timeline/${item.id}`, { method: 'DELETE', token });
    onSaved();
  };

  return (
    <button type="button" onClick={remove} className="text-xs text-vega-red hover:underline ms-2">
      ×
    </button>
  );
}

export function useClientFinancialEditor(
  clientId: string,
  invoices: Record<string, unknown>[],
  token: string | null,
  onSaved: () => void,
) {
  const t = useTranslations('common');
  const tc = useTranslations('clientProfile');
  const { canCreate, canUpdate, canDelete } = usePermissions();

  const [invOpen, setInvOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [editInv, setEditInv] = useState<Record<string, unknown> | null>(null);
  const [editSub, setEditSub] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const [invForm, setInvForm] = useState({ amount: '', tax: '0', dueDate: '', status: 'SENT', notes: '' });
  const [payForm, setPayForm] = useState({ invoiceId: '', amount: '', method: 'bank', reason: '' });
  const [subForm, setSubForm] = useState({ name: '', amount: '', interval: 'monthly', nextDue: '' });

  const openAddInvoice = () => {
    setEditInv(null);
    setInvForm({ amount: '', tax: '0', dueDate: '', status: 'SENT', notes: '' });
    setInvOpen(true);
  };

  const openEditInvoice = (inv: Record<string, unknown>) => {
    setEditInv(inv);
    setInvForm({
      amount: String(inv.amount ?? ''),
      tax: String(inv.tax ?? 0),
      dueDate: inv.dueDate ? String(inv.dueDate).slice(0, 10) : '',
      status: String(inv.status ?? 'SENT'),
      notes: String(inv.notes ?? ''),
    });
    setInvOpen(true);
  };

  const deleteInvoice = async (id: string) => {
    if (!token || !confirm(t('deleteConfirm'))) return;
    await api(`/finance/invoices/${id}`, { method: 'DELETE', token });
    onSaved();
  };

  const openAddPayment = () => {
    setPayForm({ invoiceId: invoices[0] ? String(invoices[0].id) : '', amount: '', method: 'bank', reason: '' });
    setPayOpen(true);
  };

  const openAddSubscription = () => {
    setEditSub(null);
    setSubForm({ name: '', amount: '', interval: 'monthly', nextDue: '' });
    setSubOpen(true);
  };

  const openEditSubscription = (s: Record<string, unknown>) => {
    setEditSub(s);
    setSubForm({
      name: String(s.name),
      amount: String(s.amount),
      interval: String(s.interval),
      nextDue: s.nextDue ? String(s.nextDue).slice(0, 10) : '',
    });
    setSubOpen(true);
  };

  const deleteSubscription = async (id: string) => {
    if (!token || !confirm(t('deleteConfirm'))) return;
    await api(`/clients/${clientId}/subscriptions/${id}`, { method: 'DELETE', token });
    onSaved();
  };

  const deletePayment = async (id: string) => {
    if (!token || !confirm(tc('deletePaymentConfirm'))) return;
    try {
      await api(`/finance/payments/${id}`, { method: 'DELETE', token });
      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : t('error'));
    }
  };

  const saveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      const body = {
        clientId,
        amount: Number(invForm.amount),
        tax: Number(invForm.tax) || 0,
        dueDate: invForm.dueDate || undefined,
        notes: invForm.notes || undefined,
        status: invForm.status,
      };
      if (editInv?.id) {
        await api(`/finance/invoices/${editInv.id}`, { method: 'PATCH', token, body: JSON.stringify(body) });
      } else {
        await api('/finance/invoices', { method: 'POST', token, body: JSON.stringify(body) });
      }
      setInvOpen(false);
      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : t('error'));
    } finally {
      setSaving(false);
    }
  };

  const savePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!payForm.invoiceId) {
      alert(tc('invoiceRequiredForPayment'));
      return;
    }
    if (!payForm.reason.trim()) {
      alert(tc('paymentReasonRequired'));
      return;
    }
    setSaving(true);
    try {
      await api('/finance/payments', {
        method: 'POST',
        token,
        body: JSON.stringify({
          invoiceId: payForm.invoiceId,
          amount: Number(payForm.amount),
          method: payForm.method,
          reason: payForm.reason.trim(),
        }),
      });
      setPayOpen(false);
      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : t('error'));
    } finally {
      setSaving(false);
    }
  };

  const saveSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      const body = {
        name: subForm.name,
        amount: Number(subForm.amount),
        interval: subForm.interval,
        nextDue: subForm.nextDue || undefined,
      };
      if (editSub?.id) {
        await api(`/clients/${clientId}/subscriptions/${editSub.id}`, { method: 'PATCH', token, body: JSON.stringify(body) });
      } else {
        await api(`/clients/${clientId}/subscriptions`, { method: 'POST', token, body: JSON.stringify(body) });
      }
      setSubOpen(false);
      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : t('error'));
    } finally {
      setSaving(false);
    }
  };

  const toolbar =
    canCreate('finance') || canUpdate('clients') ? (
      <div className="flex flex-wrap gap-2 mb-4">
        {canCreate('finance') && (
          <>
            <EditBtn onClick={openAddInvoice} label={tc('addInvoice')} />
            <EditBtn onClick={openAddPayment} label={tc('recordPayment')} />
          </>
        )}
        {canUpdate('clients') && <EditBtn onClick={openAddSubscription} label={tc('addSubscription')} />}
      </div>
    ) : null;

  const modals = (
    <>
      <Modal open={invOpen} onClose={() => setInvOpen(false)} title={editInv ? tc('editInvoice') : tc('addInvoice')}>
        <form onSubmit={saveInvoice} className="space-y-4">
          <FormField label={tc('amount')} required>
            <TextInput type="number" value={invForm.amount} onChange={(e) => setInvForm({ ...invForm, amount: e.target.value })} required />
          </FormField>
          <FormField label={tc('tax')}>
            <TextInput type="number" value={invForm.tax} onChange={(e) => setInvForm({ ...invForm, tax: e.target.value })} />
          </FormField>
          <FormField label={tc('dueDate')}>
            <TextInput type="date" value={invForm.dueDate} onChange={(e) => setInvForm({ ...invForm, dueDate: e.target.value })} />
          </FormField>
          <FormField label={tc('status')}>
            <SelectInput value={invForm.status} onChange={(e) => setInvForm({ ...invForm, status: e.target.value })}>
              <option value="DRAFT">DRAFT</option>
              <option value="SENT">SENT</option>
              <option value="PAID">PAID</option>
              <option value="OVERDUE">OVERDUE</option>
            </SelectInput>
          </FormField>
          <FormField label={tc('notes')}>
            <TextArea value={invForm.notes} onChange={(e) => setInvForm({ ...invForm, notes: e.target.value })} />
          </FormField>
          <FormActions onCancel={() => setInvOpen(false)} submitLabel={t('save')} cancelLabel={t('cancel')} loading={saving} />
        </form>
      </Modal>
      <Modal open={payOpen} onClose={() => setPayOpen(false)} title={tc('recordPayment')}>
        <form onSubmit={savePayment} className="space-y-4">
          <FormField label={tc('invoiceNumber')} required>
            <SelectInput value={payForm.invoiceId} onChange={(e) => setPayForm({ ...payForm, invoiceId: e.target.value })} required>
              <option value="">{invoices.length === 0 ? tc('noInvoicesForPayment') : '—'}</option>
              {invoices.map((inv) => (
                <option key={String(inv.id)} value={String(inv.id)}>
                  {String(inv.number)} ({formatMoney(inv.total)})
                </option>
              ))}
            </SelectInput>
          </FormField>
          <FormField label={tc('amount')} required>
            <TextInput type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} required />
          </FormField>
          <FormField label={tc('paymentMethod')}>
            <TextInput value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })} />
          </FormField>
          <FormField label={tc('paymentReason')} required>
            <TextInput
              value={payForm.reason}
              onChange={(e) => setPayForm({ ...payForm, reason: e.target.value })}
              placeholder={tc('paymentReasonPlaceholder')}
              required
            />
          </FormField>
          <FormActions onCancel={() => setPayOpen(false)} submitLabel={t('save')} cancelLabel={t('cancel')} loading={saving} />
        </form>
      </Modal>
      <Modal open={subOpen} onClose={() => setSubOpen(false)} title={editSub ? tc('editSubscription') : tc('addSubscription')}>
        <form onSubmit={saveSub} className="space-y-4">
          <FormField label={tc('subscriptionName')} required>
            <TextInput value={subForm.name} onChange={(e) => setSubForm({ ...subForm, name: e.target.value })} required />
          </FormField>
          <FormField label={tc('amount')} required>
            <TextInput type="number" value={subForm.amount} onChange={(e) => setSubForm({ ...subForm, amount: e.target.value })} required />
          </FormField>
          <FormField label={tc('interval')}>
            <SelectInput value={subForm.interval} onChange={(e) => setSubForm({ ...subForm, interval: e.target.value })}>
              <option value="monthly">monthly</option>
              <option value="yearly">yearly</option>
              <option value="quarterly">quarterly</option>
            </SelectInput>
          </FormField>
          <FormField label={tc('renewalDate')}>
            <TextInput type="date" value={subForm.nextDue} onChange={(e) => setSubForm({ ...subForm, nextDue: e.target.value })} />
          </FormField>
          <FormActions onCancel={() => setSubOpen(false)} submitLabel={t('save')} cancelLabel={t('cancel')} loading={saving} />
        </form>
      </Modal>
    </>
  );

  return {
    toolbar,
    modals,
    openEditInvoice,
    deleteInvoice,
    deletePayment,
    openEditSubscription,
    deleteSubscription,
    canUpdateFinance: canUpdate('finance'),
    canDeleteFinance: canDelete('finance'),
    canUpdateClients: canUpdate('clients'),
    canDeleteClients: canDelete('clients'),
  };
}
