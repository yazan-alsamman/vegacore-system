'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/ui/page-header';
import { Modal } from '@/components/ui/modal';
import { FormActions, FormField, SelectInput, TextArea, TextInput } from '@/components/ui/form-fields';
import { CrudActions } from '@/components/admin/crud-actions';
import { useApiData } from '@/hooks/use-api-data';
import { usePermissions } from '@/hooks/use-permissions';
import { api } from '@/lib/api';

const CONTENT_STATUSES = ['DRAFT', 'IN_PRODUCTION', 'PENDING_APPROVAL', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'REJECTED'] as const;

export default function MarketingPage() {
  const t = useTranslations('marketing');
  const tc = useTranslations('common');
  const ts = useTranslations('contentStatus');
  const { canCreate } = usePermissions();
  const { data, loading, refetch, token } = useApiData<{
    clients: { id: string; companyName: string }[];
    calendar: { id: string; title: string; script?: string; platform?: string; status: string; publishDate?: string; metadata?: { idea?: string } }[];
    scripts: { id: string; title: string; content: string; platform?: string; clientId?: string }[];
    shoots: { id: string; title: string; location?: string; scheduledAt?: string; status: string; notes?: string; shotList?: unknown[]; equipment?: Record<string, unknown>; project?: { clientId?: string } }[];
    reels: { id: string; title: string; editedUrl?: string; rawFileUrl?: string; publishUrl?: string; status: string; shoot?: { project?: { clientId?: string } } }[];
  }>('/marketing/workspace');
  const { data: projectsData } = useApiData<{ data: { id: string; name: string; clientId?: string }[] }>('/projects?limit=200');
  const [tab, setTab] = useState<'calendar' | 'shoots' | 'reels'>('calendar');
  const [clientId, setClientId] = useState('');
  const [openCalendar, setOpenCalendar] = useState(false);
  const [openScript, setOpenScript] = useState(false);
  const [openShoot, setOpenShoot] = useState(false);
  const [openReel, setOpenReel] = useState(false);

  const [calendarForm, setCalendarForm] = useState({
    title: '',
    idea: '',
    script: '',
    platform: 'Instagram',
    status: 'DRAFT',
    publishDate: '',
  });
  const [scriptForm, setScriptForm] = useState({
    title: '',
    content: '',
    platform: 'Instagram',
  });
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
    const byClient = <T extends { clientId?: string }>(items: T[]) => (clientId ? items.filter((i) => i.clientId === clientId) : items);
    const calendar = byClient((data?.calendar || []).map((item) => ({ ...item, clientId: (item.metadata as { clientId?: string } | undefined)?.clientId })));
    const scripts = byClient((data?.scripts || []).map((item) => ({ ...item, clientId: item.clientId })));
    const shoots = byClient((data?.shoots || []).map((item) => ({ ...item, clientId: item.project?.clientId })));
    const reels = byClient((data?.reels || []).map((item) => ({ ...item, clientId: item.shoot?.project?.clientId })));
    return { calendar, scripts, shoots, reels };
  }, [clientId, data?.calendar, data?.reels, data?.scripts, data?.shoots]);

  const availableProjects = (projectsData?.data || []).filter((p) => !clientId || p.clientId === clientId);
  const availableShoots = scoped.shoots;

  const actionLabel = tab === 'calendar' ? t('addContent') : tab === 'shoots' ? t('addShoot') : t('addReel');

  const submitCalendar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    await api('/marketing/calendar', {
      method: 'POST',
      token,
      body: JSON.stringify({
        title: calendarForm.title,
        script: calendarForm.script || undefined,
        platform: calendarForm.platform,
        status: calendarForm.status,
        publishDate: calendarForm.publishDate || undefined,
        metadata: { idea: calendarForm.idea, clientId: clientId || undefined },
      }),
    });
    setOpenCalendar(false);
    setCalendarForm({ title: '', idea: '', script: '', platform: 'Instagram', status: 'DRAFT', publishDate: '' });
    await refetch();
  };

  const submitScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    await api('/marketing/scripts', {
      method: 'POST',
      token,
      body: JSON.stringify({ ...scriptForm, clientId: clientId || undefined }),
    });
    setOpenScript(false);
    setScriptForm({ title: '', content: '', platform: 'Instagram' });
    await refetch();
  };

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
    setShootForm({ title: '', projectId: '', location: '', scheduledAt: '', modelRequired: '', photographer: '', tools: '', shotList: '' });
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

  return (
    <DashboardLayout title={t('title')} module="marketing">
      <PageHeader
        description={t('description')}
        actionLabel={actionLabel}
        onAction={() => {
          if (tab === 'calendar') setOpenCalendar(true);
          else if (tab === 'shoots') setOpenShoot(true);
          else setOpenReel(true);
        }}
        showAction={canCreate(tab === 'calendar' ? 'marketing' : 'media')}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <button onClick={() => setTab('calendar')} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === 'calendar' ? 'bg-vega-cyan/15 text-vega-cyan' : 'bg-[var(--color-surface-secondary)]'}`}>{t('tabCalendar')}</button>
        <button onClick={() => setTab('shoots')} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === 'shoots' ? 'bg-vega-cyan/15 text-vega-cyan' : 'bg-[var(--color-surface-secondary)]'}`}>{t('tabShoots')}</button>
        <button onClick={() => setTab('reels')} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === 'reels' ? 'bg-vega-cyan/15 text-vega-cyan' : 'bg-[var(--color-surface-secondary)]'}`}>{t('tabReels')}</button>
        <SelectInput value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">{t('allClients')}</option>
          {(data?.clients || []).map((c) => (
            <option key={c.id} value={c.id}>{c.companyName}</option>
          ))}
        </SelectInput>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" /></div>
      ) : (
        <>
          {tab === 'calendar' && (
            <>
              <DataTable
                columns={[
                  { key: 'title', header: t('ideaContent') },
                  { key: 'script', header: t('script') },
                  { key: 'status', header: t('contentStatus'), render: (item) => ts(item.status as 'DRAFT') },
                  { key: 'platform', header: tc('platform') },
                  { key: 'publishDate', header: t('publishDate'), render: (item) => item.publishDate ? new Date(item.publishDate).toLocaleDateString() : tc('tbd') },
                  {
                    key: 'actions',
                    header: tc('actions'),
                    render: (item) => <CrudActions module="marketing" onDelete={async () => { if (!token) return; await api(`/marketing/calendar/${item.id}`, { method: 'DELETE', token }); await refetch(); }} />,
                  },
                ]}
                data={scoped.calendar}
              />
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold">{t('clientScripts')}</h3>
                <DataTable
                  columns={[
                    { key: 'title', header: tc('title') },
                    { key: 'platform', header: tc('platform') },
                    { key: 'content', header: t('scriptContent') },
                    { key: 'actions', header: tc('actions'), render: (item) => <CrudActions module="marketing" onDelete={async () => { if (!token) return; await api(`/marketing/scripts/${item.id}`, { method: 'DELETE', token }); await refetch(); }} /> },
                  ]}
                  data={scoped.scripts}
                />
                <div className="mt-3">
                  <button className="rounded-lg bg-[var(--color-surface-secondary)] px-3 py-2 text-sm" onClick={() => setOpenScript(true)}>{t('addScript')}</button>
                </div>
              </div>
            </>
          )}
          {tab === 'shoots' && (
            <DataTable
              columns={[
                { key: 'title', header: t('shoot') },
                { key: 'scheduledAt', header: t('shootDate'), render: (item) => item.scheduledAt ? new Date(String(item.scheduledAt)).toLocaleString() : tc('tbd') },
                { key: 'location', header: tc('location') },
                { key: 'status', header: tc('status') },
                { key: 'models', header: t('modelRequired'), render: (item) => (item.notes ? String(item.notes) : tc('dash')) },
                { key: 'photographer', header: t('photographer'), render: (item) => (item.equipment as Record<string, string> | undefined)?.photographer || tc('dash') },
                { key: 'tools', header: t('tools'), render: (item) => (item.equipment as Record<string, string> | undefined)?.tools || tc('dash') },
                { key: 'shotList', header: t('shotList'), render: (item) => Array.isArray(item.shotList) ? item.shotList.join(', ') : tc('dash') },
                { key: 'actions', header: tc('actions'), render: (item) => <CrudActions module="media" onDelete={async () => { if (!token) return; await api(`/media/shoots/${item.id}`, { method: 'DELETE', token }); await refetch(); }} /> },
              ]}
              data={scoped.shoots as Array<Record<string, unknown>>}
            />
          )}
          {tab === 'reels' && (
            <DataTable
              columns={[
                { key: 'title', header: t('reel') },
                { key: 'status', header: t('editingStatus') },
                { key: 'editedUrl', header: t('finalVersion'), render: (item) => item.editedUrl ? <a href={item.editedUrl as string} target="_blank" className="text-vega-cyan hover:underline">{tc('open')}</a> : tc('dash') },
                { key: 'rawFileUrl', header: t('clientVersion'), render: (item) => item.rawFileUrl ? <a href={item.rawFileUrl as string} target="_blank" className="text-vega-cyan hover:underline">{tc('open')}</a> : tc('dash') },
                { key: 'publishUrl', header: t('publishedVersion'), render: (item) => item.publishUrl ? <a href={item.publishUrl as string} target="_blank" className="text-vega-cyan hover:underline">{tc('open')}</a> : tc('dash') },
                { key: 'actions', header: tc('actions'), render: (item) => <CrudActions module="media" onDelete={async () => { if (!token) return; await api(`/media/videos/${item.id}`, { method: 'DELETE', token }); await refetch(); }} /> },
              ]}
              data={scoped.reels as Array<Record<string, unknown>>}
            />
          )}
        </>
      )}

      <Modal open={openCalendar} onClose={() => setOpenCalendar(false)} title={t('modalAddContent')}>
        <form className="space-y-4" onSubmit={submitCalendar}>
          <FormField label={t('idea')} required><TextInput value={calendarForm.idea} onChange={(e) => setCalendarForm((f) => ({ ...f, idea: e.target.value }))} required /></FormField>
          <FormField label={tc('title')} required><TextInput value={calendarForm.title} onChange={(e) => setCalendarForm((f) => ({ ...f, title: e.target.value }))} required /></FormField>
          <FormField label={t('script')}><TextArea value={calendarForm.script} onChange={(e) => setCalendarForm((f) => ({ ...f, script: e.target.value }))} /></FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label={tc('platform')}><TextInput value={calendarForm.platform} onChange={(e) => setCalendarForm((f) => ({ ...f, platform: e.target.value }))} /></FormField>
            <FormField label={t('publishDate')}><TextInput type="date" value={calendarForm.publishDate} onChange={(e) => setCalendarForm((f) => ({ ...f, publishDate: e.target.value }))} /></FormField>
          </div>
          <FormField label={t('contentStatus')}>
            <SelectInput value={calendarForm.status} onChange={(e) => setCalendarForm((f) => ({ ...f, status: e.target.value }))}>
              {CONTENT_STATUSES.map((s) => (
                <option key={s} value={s}>{ts(s)}</option>
              ))}
            </SelectInput>
          </FormField>
          <FormActions onCancel={() => setOpenCalendar(false)} submitLabel={tc('save')} cancelLabel={tc('cancel')} />
        </form>
      </Modal>

      <Modal open={openScript} onClose={() => setOpenScript(false)} title={t('modalAddScript')}>
        <form className="space-y-4" onSubmit={submitScript}>
          <FormField label={tc('title')} required><TextInput value={scriptForm.title} onChange={(e) => setScriptForm((f) => ({ ...f, title: e.target.value }))} required /></FormField>
          <FormField label={tc('platform')}><TextInput value={scriptForm.platform} onChange={(e) => setScriptForm((f) => ({ ...f, platform: e.target.value }))} /></FormField>
          <FormField label={t('scriptContent')} required><TextArea value={scriptForm.content} onChange={(e) => setScriptForm((f) => ({ ...f, content: e.target.value }))} required /></FormField>
          <FormActions onCancel={() => setOpenScript(false)} submitLabel={tc('save')} cancelLabel={tc('cancel')} />
        </form>
      </Modal>

      <Modal open={openShoot} onClose={() => setOpenShoot(false)} title={t('modalAddShoot')}>
        <form className="space-y-4" onSubmit={submitShoot}>
          <FormField label={t('shootTitle')} required><TextInput value={shootForm.title} onChange={(e) => setShootForm((f) => ({ ...f, title: e.target.value }))} required /></FormField>
          <FormField label={t('project')}>
            <SelectInput value={shootForm.projectId} onChange={(e) => setShootForm((f) => ({ ...f, projectId: e.target.value }))}>
              <option value="">{tc('selectProject')}</option>
              {availableProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </SelectInput>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('shootDate')}><TextInput type="datetime-local" value={shootForm.scheduledAt} onChange={(e) => setShootForm((f) => ({ ...f, scheduledAt: e.target.value }))} /></FormField>
            <FormField label={tc('location')}><TextInput value={shootForm.location} onChange={(e) => setShootForm((f) => ({ ...f, location: e.target.value }))} /></FormField>
          </div>
          <FormField label={t('modelRequired')}><TextInput value={shootForm.modelRequired} onChange={(e) => setShootForm((f) => ({ ...f, modelRequired: e.target.value }))} /></FormField>
          <FormField label={t('photographer')}><TextInput value={shootForm.photographer} onChange={(e) => setShootForm((f) => ({ ...f, photographer: e.target.value }))} /></FormField>
          <FormField label={t('toolsRequired')}><TextInput value={shootForm.tools} onChange={(e) => setShootForm((f) => ({ ...f, tools: e.target.value }))} /></FormField>
          <FormField label={t('shotListHint')}><TextArea value={shootForm.shotList} onChange={(e) => setShootForm((f) => ({ ...f, shotList: e.target.value }))} /></FormField>
          <FormActions onCancel={() => setOpenShoot(false)} submitLabel={tc('save')} cancelLabel={tc('cancel')} />
        </form>
      </Modal>

      <Modal open={openReel} onClose={() => setOpenReel(false)} title={t('modalAddReel')}>
        <form className="space-y-4" onSubmit={submitReel}>
          <FormField label={t('reelTitle')} required><TextInput value={reelForm.title} onChange={(e) => setReelForm((f) => ({ ...f, title: e.target.value }))} required /></FormField>
          <FormField label={t('linkedShoot')}>
            <SelectInput value={reelForm.shootId} onChange={(e) => setReelForm((f) => ({ ...f, shootId: e.target.value }))}>
              <option value="">{tc('selectShoot')}</option>
              {availableShoots.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </SelectInput>
          </FormField>
          <FormField label={t('editingStatus')}><TextInput value={reelForm.status} onChange={(e) => setReelForm((f) => ({ ...f, status: e.target.value }))} /></FormField>
          <FormField label={t('finalVersionUrl')}><TextInput value={reelForm.editedUrl} onChange={(e) => setReelForm((f) => ({ ...f, editedUrl: e.target.value }))} /></FormField>
          <FormField label={t('clientVersionUrl')}><TextInput value={reelForm.rawFileUrl} onChange={(e) => setReelForm((f) => ({ ...f, rawFileUrl: e.target.value }))} /></FormField>
          <FormField label={t('publishedVersionUrl')}><TextInput value={reelForm.publishUrl} onChange={(e) => setReelForm((f) => ({ ...f, publishUrl: e.target.value }))} /></FormField>
          <FormActions onCancel={() => setOpenReel(false)} submitLabel={tc('save')} cancelLabel={tc('cancel')} />
        </form>
      </Modal>
    </DashboardLayout>
  );
}
