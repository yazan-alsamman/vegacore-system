'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ContentCalendarTable } from '@/components/marketing/content-calendar-table';
import { ShootManagementTable } from '@/components/marketing/shoot-management-table';
import { DataTable } from '@/components/data-table';
import { Modal } from '@/components/ui/modal';
import { FormActions, FormField, SelectInput, TextInput } from '@/components/ui/form-fields';
import { CrudActions } from '@/components/admin/crud-actions';
import { useApiData } from '@/hooks/use-api-data';
import { usePermissions } from '@/hooks/use-permissions';
import { api } from '@/lib/api';

type MarketingTab = 'calendar' | 'shoots' | 'reels';

interface MarketingWorkspaceProps {
  clientId: string;
}

export function MarketingWorkspace({ clientId }: MarketingWorkspaceProps) {
  const t = useTranslations('marketing');
  const tc = useTranslations('common');
  const { canCreate, canRead, canUpdate, canDelete } = usePermissions();

  const canMarketing = canRead('marketing');
  const canMedia = canRead('media');

  const endpoint = `/marketing/workspace?clientId=${encodeURIComponent(clientId)}`;
  const { data, loading, refetch, token } = useApiData<{
    clients: { id: string; companyName: string }[];
    calendar: { id: string; title: string; script?: string; platform?: string; status: string; publishDate?: string; createdAt?: string; metadata?: { idea?: string; clientId?: string; publishVideoUrl?: string; sourceUrl?: string } }[];
    shoots: { id: string; title: string; scheduledAt?: string; createdAt?: string; equipment?: Record<string, unknown> }[];
    reels: { id: string; title: string; editedUrl?: string; rawFileUrl?: string; publishUrl?: string; status: string; shoot?: { project?: { clientId?: string } } }[];
    models: { id: string; name: string }[];
    photographers: { id: string; name: string }[];
    pendingCalendar: { id: string; label: string }[];
  }>(endpoint);

  const defaultTab: MarketingTab = canMarketing ? 'calendar' : canMedia ? 'shoots' : 'calendar';
  const [tab, setTab] = useState<MarketingTab>(defaultTab);
  const [openReel, setOpenReel] = useState(false);

  const [reelForm, setReelForm] = useState({
    title: '',
    shootId: '',
    editedUrl: '',
    rawFileUrl: '',
    publishUrl: '',
    status: 'editing',
  });

  const scoped = useMemo(() => {
    const calendar = (data?.calendar || []).map((item) => ({
      ...item,
      clientId: (item.metadata as { clientId?: string } | undefined)?.clientId,
    }));
    const shoots = data?.shoots || [];
    const reels = (data?.reels || []).map((item) => ({
      ...item,
      clientId: item.shoot?.project?.clientId,
    }));
    return { calendar, shoots, reels };
  }, [data?.calendar, data?.reels, data?.shoots]);

  const availableShoots = scoped.shoots;

  const visibleTabs: { id: MarketingTab; label: string }[] = [];
  if (canMarketing) visibleTabs.push({ id: 'calendar', label: t('tabCalendar') });
  if (canMedia) {
    visibleTabs.push({ id: 'shoots', label: t('tabShoots') });
    visibleTabs.push({ id: 'reels', label: t('tabReels') });
  }

  const activeTab = visibleTabs.some((vt) => vt.id === tab) ? tab : visibleTabs[0]?.id ?? 'calendar';

  const actionLabel = t('addReel');

  const showAction = activeTab === 'reels' && canCreate('media');

  /** Read-only calendar for roles with marketing.read only (e.g. account manager). */
  const canEditCalendar =
    canMarketing && (canCreate('marketing') || canUpdate('marketing'));

  const canEditShoots = canMedia && (canCreate('media') || canUpdate('media'));

  const submitReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const created = await api<{ id: string }>('/media/videos', {
      method: 'POST',
      token,
      body: JSON.stringify({
        title: reelForm.title,
        shootId: reelForm.shootId || undefined,
        rawFileUrl: reelForm.rawFileUrl || undefined,
      }),
    });
    await api(`/media/videos/${created.id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({
        editedUrl: reelForm.editedUrl || undefined,
        publishUrl: reelForm.publishUrl || undefined,
        status: reelForm.status,
      }),
    });
    setOpenReel(false);
    setReelForm({ title: '', shootId: '', editedUrl: '', rawFileUrl: '', publishUrl: '', status: 'editing' });
    await refetch();
  };

  if (!canMarketing && !canMedia) {
    return <p className="text-sm text-[var(--color-text-secondary)]">{tc('noData')}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-text-secondary)]">{t('description')}</p>
        {showAction && (
          <button
            type="button"
            onClick={() => setOpenReel(true)}
            className="rounded-lg bg-vega-navy px-4 py-2 text-sm font-medium text-white hover:bg-vega-navy/90 dark:bg-vega-cyan dark:text-vega-navy"
          >
            + {actionLabel}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {visibleTabs.map((vt) => (
          <button
            key={vt.id}
            type="button"
            onClick={() => setTab(vt.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              activeTab === vt.id ? 'bg-vega-cyan/15 text-vega-cyan' : 'bg-[var(--color-surface-secondary)]'
            }`}
          >
            {vt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-vega-cyan border-t-transparent" />
        </div>
      ) : (
        <>
          {activeTab === 'calendar' && canMarketing && (
            <ContentCalendarTable
              clientId={clientId}
              items={scoped.calendar}
              token={token}
              canEdit={canEditCalendar}
              canDelete={canDelete('marketing')}
              onChanged={refetch}
            />
          )}

          {activeTab === 'shoots' && canMedia && (
            <ShootManagementTable
              clientId={clientId}
              items={scoped.shoots}
              models={data?.models || []}
              photographers={data?.photographers || []}
              pendingContent={data?.pendingCalendar || []}
              token={token}
              canEdit={canEditShoots}
              canDelete={canDelete('media')}
              onChanged={refetch}
            />
          )}

          {activeTab === 'reels' && canMedia && (
            <DataTable
              columns={[
                { key: 'title', header: t('reel') },
                { key: 'status', header: t('editingStatus') },
                {
                  key: 'editedUrl',
                  header: t('finalVersion'),
                  render: (item) =>
                    item.editedUrl ? (
                      <a href={item.editedUrl as string} target="_blank" rel="noreferrer" className="text-vega-cyan hover:underline">
                        {tc('open')}
                      </a>
                    ) : (
                      tc('dash')
                    ),
                },
                {
                  key: 'rawFileUrl',
                  header: t('clientVersion'),
                  render: (item) =>
                    item.rawFileUrl ? (
                      <a href={item.rawFileUrl as string} target="_blank" rel="noreferrer" className="text-vega-cyan hover:underline">
                        {tc('open')}
                      </a>
                    ) : (
                      tc('dash')
                    ),
                },
                {
                  key: 'publishUrl',
                  header: t('publishedVersion'),
                  render: (item) =>
                    item.publishUrl ? (
                      <a href={item.publishUrl as string} target="_blank" rel="noreferrer" className="text-vega-cyan hover:underline">
                        {tc('open')}
                      </a>
                    ) : (
                      tc('dash')
                    ),
                },
                {
                  key: 'actions',
                  header: tc('actions'),
                  render: (item) => (
                    <CrudActions
                      module="media"
                      onDelete={async () => {
                        if (!token) return;
                        await api(`/media/videos/${item.id}`, { method: 'DELETE', token });
                        await refetch();
                      }}
                    />
                  ),
                },
              ]}
              data={scoped.reels as Array<Record<string, unknown>>}
            />
          )}
        </>
      )}

      <Modal open={openReel} onClose={() => setOpenReel(false)} title={t('modalAddReel')}>
        <form className="space-y-4" onSubmit={submitReel}>
          <FormField label={t('reelTitle')} required>
            <TextInput value={reelForm.title} onChange={(e) => setReelForm((f) => ({ ...f, title: e.target.value }))} required />
          </FormField>
          <FormField label={t('linkedShoot')}>
            <SelectInput value={reelForm.shootId} onChange={(e) => setReelForm((f) => ({ ...f, shootId: e.target.value }))}>
              <option value="">{tc('selectShoot')}</option>
              {availableShoots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </SelectInput>
          </FormField>
          <FormField label={t('editingStatus')}>
            <TextInput value={reelForm.status} onChange={(e) => setReelForm((f) => ({ ...f, status: e.target.value }))} />
          </FormField>
          <FormField label={t('finalVersionUrl')}>
            <TextInput value={reelForm.editedUrl} onChange={(e) => setReelForm((f) => ({ ...f, editedUrl: e.target.value }))} />
          </FormField>
          <FormField label={t('clientVersionUrl')}>
            <TextInput value={reelForm.rawFileUrl} onChange={(e) => setReelForm((f) => ({ ...f, rawFileUrl: e.target.value }))} />
          </FormField>
          <FormField label={t('publishedVersionUrl')}>
            <TextInput value={reelForm.publishUrl} onChange={(e) => setReelForm((f) => ({ ...f, publishUrl: e.target.value }))} />
          </FormField>
          <FormActions onCancel={() => setOpenReel(false)} submitLabel={tc('save')} cancelLabel={tc('cancel')} />
        </form>
      </Modal>
    </div>
  );
}
