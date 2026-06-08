'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ContentCalendarTable } from '@/components/marketing/content-calendar-table';
import { DataTable } from '@/components/data-table';
import { Modal } from '@/components/ui/modal';
import { FormActions, FormField, SelectInput, TextArea, TextInput } from '@/components/ui/form-fields';
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
    shoots: { id: string; title: string; location?: string; scheduledAt?: string; status: string; notes?: string; shotList?: unknown[]; equipment?: Record<string, unknown>; project?: { clientId?: string } }[];
    reels: { id: string; title: string; editedUrl?: string; rawFileUrl?: string; publishUrl?: string; status: string; shoot?: { project?: { clientId?: string } } }[];
  }>(endpoint);

  const { data: projectsData } = useApiData<{ data: { id: string; name: string; clientId?: string }[] }>(
    `/projects?limit=200&clientId=${encodeURIComponent(clientId)}`,
  );

  const defaultTab: MarketingTab = canMarketing ? 'calendar' : canMedia ? 'shoots' : 'calendar';
  const [tab, setTab] = useState<MarketingTab>(defaultTab);
  const [openShoot, setOpenShoot] = useState(false);
  const [openReel, setOpenReel] = useState(false);

  const [shootForm, setShootForm] = useState({
    title: '',
    projectId: '',
    location: '',
    scheduledAt: '',
    modelRequired: '',
    photographer: '',
    tools: '',
    shotList: '',
  });
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
    const shoots = (data?.shoots || []).map((item) => ({
      ...item,
      clientId: item.project?.clientId,
    }));
    const reels = (data?.reels || []).map((item) => ({
      ...item,
      clientId: item.shoot?.project?.clientId,
    }));
    return { calendar, shoots, reels };
  }, [data?.calendar, data?.reels, data?.shoots]);

  const availableProjects = projectsData?.data || [];
  const availableShoots = scoped.shoots;

  const visibleTabs: { id: MarketingTab; label: string }[] = [];
  if (canMarketing) visibleTabs.push({ id: 'calendar', label: t('tabCalendar') });
  if (canMedia) {
    visibleTabs.push({ id: 'shoots', label: t('tabShoots') });
    visibleTabs.push({ id: 'reels', label: t('tabReels') });
  }

  const activeTab = visibleTabs.some((vt) => vt.id === tab) ? tab : visibleTabs[0]?.id ?? 'calendar';

  const actionLabel = activeTab === 'shoots' ? t('addShoot') : t('addReel');

  const showAction =
    activeTab === 'shoots' || activeTab === 'reels' ? canCreate('media') : false;

  /** Read-only calendar for roles with marketing.read only (e.g. account manager). */
  const canEditCalendar =
    canMarketing && (canCreate('marketing') || canUpdate('marketing'));

  const submitShoot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    await api('/media/shoots', {
      method: 'POST',
      token,
      body: JSON.stringify({
        title: shootForm.title,
        projectId: shootForm.projectId || undefined,
        location: shootForm.location || undefined,
        scheduledAt: shootForm.scheduledAt || undefined,
        equipment: { tools: shootForm.tools, photographer: shootForm.photographer },
        notes: shootForm.modelRequired ? t('modelRequiredNote', { name: shootForm.modelRequired }) : undefined,
        shotList: shootForm.shotList
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      }),
    });
    setOpenShoot(false);
    setShootForm({
      title: '',
      projectId: '',
      location: '',
      scheduledAt: '',
      modelRequired: '',
      photographer: '',
      tools: '',
      shotList: '',
    });
    await refetch();
  };

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
            onClick={() => {
              if (activeTab === 'shoots') setOpenShoot(true);
              else setOpenReel(true);
            }}
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
            <DataTable
              columns={[
                { key: 'title', header: t('shoot') },
                {
                  key: 'scheduledAt',
                  header: t('shootDate'),
                  render: (item) =>
                    item.scheduledAt ? new Date(String(item.scheduledAt)).toLocaleString() : tc('tbd'),
                },
                { key: 'location', header: tc('location') },
                { key: 'status', header: tc('status') },
                {
                  key: 'models',
                  header: t('modelRequired'),
                  render: (item) => (item.notes ? String(item.notes) : tc('dash')),
                },
                {
                  key: 'photographer',
                  header: t('photographer'),
                  render: (item) => (item.equipment as Record<string, string> | undefined)?.photographer || tc('dash'),
                },
                {
                  key: 'tools',
                  header: t('tools'),
                  render: (item) => (item.equipment as Record<string, string> | undefined)?.tools || tc('dash'),
                },
                {
                  key: 'shotList',
                  header: t('shotList'),
                  render: (item) => (Array.isArray(item.shotList) ? item.shotList.join(', ') : tc('dash')),
                },
                {
                  key: 'actions',
                  header: tc('actions'),
                  render: (item) => (
                    <CrudActions
                      module="media"
                      onDelete={async () => {
                        if (!token) return;
                        await api(`/media/shoots/${item.id}`, { method: 'DELETE', token });
                        await refetch();
                      }}
                    />
                  ),
                },
              ]}
              data={scoped.shoots as Array<Record<string, unknown>>}
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

      <Modal open={openShoot} onClose={() => setOpenShoot(false)} title={t('modalAddShoot')}>
        <form className="space-y-4" onSubmit={submitShoot}>
          <FormField label={t('shootTitle')} required>
            <TextInput value={shootForm.title} onChange={(e) => setShootForm((f) => ({ ...f, title: e.target.value }))} required />
          </FormField>
          <FormField label={t('project')}>
            <SelectInput value={shootForm.projectId} onChange={(e) => setShootForm((f) => ({ ...f, projectId: e.target.value }))}>
              <option value="">{tc('selectProject')}</option>
              {availableProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </SelectInput>
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('shootDate')}>
              <TextInput
                type="datetime-local"
                value={shootForm.scheduledAt}
                onChange={(e) => setShootForm((f) => ({ ...f, scheduledAt: e.target.value }))}
              />
            </FormField>
            <FormField label={tc('location')}>
              <TextInput value={shootForm.location} onChange={(e) => setShootForm((f) => ({ ...f, location: e.target.value }))} />
            </FormField>
          </div>
          <FormField label={t('modelRequired')}>
            <TextInput value={shootForm.modelRequired} onChange={(e) => setShootForm((f) => ({ ...f, modelRequired: e.target.value }))} />
          </FormField>
          <FormField label={t('photographer')}>
            <TextInput value={shootForm.photographer} onChange={(e) => setShootForm((f) => ({ ...f, photographer: e.target.value }))} />
          </FormField>
          <FormField label={t('toolsRequired')}>
            <TextInput value={shootForm.tools} onChange={(e) => setShootForm((f) => ({ ...f, tools: e.target.value }))} />
          </FormField>
          <FormField label={t('shotListHint')}>
            <TextArea value={shootForm.shotList} onChange={(e) => setShootForm((f) => ({ ...f, shotList: e.target.value }))} />
          </FormField>
          <FormActions onCancel={() => setOpenShoot(false)} submitLabel={tc('save')} cancelLabel={tc('cancel')} />
        </form>
      </Modal>

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
