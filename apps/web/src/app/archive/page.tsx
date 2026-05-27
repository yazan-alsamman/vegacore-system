'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Archive,
  FileText,
  Film,
  FolderArchive,
  MessageSquare,
  Package,
  Palette,
  Search,
  Tag,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Modal } from '@/components/ui/modal';
import { FormActions, FormField, SelectInput, TextArea, TextInput } from '@/components/ui/form-fields';
import { CrudActions } from '@/components/admin/crud-actions';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/hooks/use-permissions';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/money';

type Category = 'all' | 'projects' | 'clients' | 'contracts' | 'designs' | 'videos' | 'conversations' | 'releases' | 'media';

const ASSET_TYPES = [
  'CONTRACT', 'LOGO', 'BRANDING', 'DESIGN', 'CREDENTIAL', 'DOMAIN', 'HOSTING',
  'MEDIA', 'VIDEO', 'DOCUMENT', 'CONVERSATION', 'RELEASE', 'OTHER',
] as const;

interface AssetRow {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  fileUrl: string;
  version: number;
  tags: string[];
  mimeType?: string | null;
  createdAt: string;
  client?: { id: string; companyName: string } | null;
  project?: { id: string; name: string; status?: string } | null;
  versions?: { id: string; version: number; fileUrl: string; notes?: string | null; createdAt: string }[];
  _count?: { versions: number };
}

interface Workspace {
  assets: AssetRow[];
  assetsMeta: { total: number; page: number; totalPages: number };
  contracts: { id: string; title: string; fileUrl?: string; value?: number; status: string; client: { companyName: string } }[];
  archivedProjects: { id: string; name: string; status: string; archivedAt?: string; client?: { companyName: string }; _count: { assets: number; tasks: number } }[];
  timeline: { id: string; kind: string; name: string; type: string; content?: string; client?: { companyName: string }; createdAt: string }[];
  videos: { id: string; title: string; rawFileUrl?: string; editedUrl?: string; publishUrl?: string; status: string; shoot?: { title: string; project?: { name: string } } }[];
  clients: { id: string; companyName: string }[];
  projects: { id: string; name: string; clientId?: string; status: string }[];
  tags: string[];
  stats: { totalAssets: number; projectsArchived: number; contracts: number; videos: number; conversations: number };
}

export default function ArchivePage() {
  const t = useTranslations('archive');
  const tc = useTranslations('common');
  const { token } = useAuth();
  const { canCreate, canUpdate, canDelete } = usePermissions();

  const [category, setCategory] = useState<Category>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [selected, setSelected] = useState<AssetRow | null>(null);
  const [editingContract, setEditingContract] = useState<Workspace['contracts'][0] | null>(null);
  const [saving, setSaving] = useState(false);

  const [uploadForm, setUploadForm] = useState({
    name: '',
    description: '',
    type: 'DOCUMENT' as string,
    fileUrl: '',
    tags: '',
    clientId: '',
    projectId: '',
  });
  const [versionForm, setVersionForm] = useState({ fileUrl: '', notes: '' });
  const [contractForm, setContractForm] = useState({
    clientId: '',
    title: '',
    fileUrl: '',
    value: '',
    status: 'active',
    startDate: '',
    endDate: '',
  });

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (category !== 'all') params.set('category', category);
      if (clientId) params.set('clientId', clientId);
      if (projectId) params.set('projectId', projectId);
      if (tagFilter) params.set('tags', tagFilter);
      if (typeFilter) params.set('type', typeFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const ws = await api<Workspace>(`/archive/workspace?${params}`, { token });
      setData(ws);
    } finally {
      setLoading(false);
    }
  }, [token, debouncedSearch, category, clientId, projectId, tagFilter, typeFilter, dateFrom, dateTo]);

  useEffect(() => {
    const tmr = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(tmr);
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const categories: { id: Category; label: string; icon: typeof Archive }[] = [
    { id: 'all', label: t('catAll'), icon: Archive },
    { id: 'projects', label: t('catProjects'), icon: FolderArchive },
    { id: 'contracts', label: t('catContracts'), icon: FileText },
    { id: 'designs', label: t('catDesigns'), icon: Palette },
    { id: 'videos', label: t('catVideos'), icon: Film },
    { id: 'conversations', label: t('catConversations'), icon: MessageSquare },
    { id: 'releases', label: t('catReleases'), icon: Package },
    { id: 'media', label: t('catMedia'), icon: Film },
  ];

  const saveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      await api('/archive/assets', {
        method: 'POST',
        token,
        body: JSON.stringify({
          ...uploadForm,
          tags: uploadForm.tags.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean),
          clientId: uploadForm.clientId || undefined,
          projectId: uploadForm.projectId || undefined,
        }),
      });
      setUploadOpen(false);
      setUploadForm({ name: '', description: '', type: 'DOCUMENT', fileUrl: '', tags: '', clientId: '', projectId: '' });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const saveVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selected) return;
    setSaving(true);
    try {
      await api(`/archive/assets/${selected.id}/versions`, {
        method: 'POST',
        token,
        body: JSON.stringify(versionForm),
      });
      setVersionOpen(false);
      setVersionForm({ fileUrl: '', notes: '' });
      await load();
      const detail = await api<AssetRow>(`/archive/assets/${selected.id}`, { token });
      setSelected(detail);
    } finally {
      setSaving(false);
    }
  };

  const saveContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      const body = {
        ...contractForm,
        value: contractForm.value ? Number(contractForm.value) : undefined,
        startDate: contractForm.startDate || undefined,
        endDate: contractForm.endDate || undefined,
      };
      if (editingContract) {
        await api(`/archive/contracts/${editingContract.id}`, { method: 'PATCH', token, body: JSON.stringify(body) });
      } else {
        await api('/archive/contracts', { method: 'POST', token, body: JSON.stringify(body) });
      }
      setContractOpen(false);
      setEditingContract(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (asset: AssetRow) => {
    if (!token) return;
    const detail = await api<AssetRow>(`/archive/assets/${asset.id}`, { token });
    setSelected(detail);
    setDetailOpen(true);
  };

  const archiveProject = async (id: string) => {
    if (!token || !window.confirm(t('archiveProjectConfirm'))) return;
    await api(`/archive/projects/${id}/archive`, { method: 'POST', token });
    await load();
  };

  const deleteAsset = async (id: string) => {
    if (!token) return;
    await api(`/archive/assets/${id}`, { method: 'DELETE', token });
    await load();
  };

  const deleteContract = async (id: string) => {
    if (!token) return;
    await api(`/archive/contracts/${id}`, { method: 'DELETE', token });
    await load();
  };

  const stats = data?.stats;

  return (
    <DashboardLayout title={t('title')} module="archive">
      <PageHeader description={t('description')} actionLabel="" onAction={() => {}} showAction={false} />

      {stats && (
        <div className="mb-6 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard title={t('totalFiles')} value={stats.totalAssets} icon={Archive} />
          <StatCard title={t('archivedProjects')} value={stats.projectsArchived} icon={FolderArchive} />
          <StatCard title={t('contracts')} value={stats.contracts} icon={FileText} />
          <StatCard title={t('videos')} value={stats.videos} icon={Film} />
          <StatCard title={t('conversations')} value={stats.conversations} icon={MessageSquare} />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] py-2.5 ps-10 pe-4 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                category === c.id ? 'bg-vega-cyan/15 text-vega-cyan' : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-vega-cyan'
              }`}
            >
              <c.icon className="h-3.5 w-3.5" />
              {c.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          <SelectInput value={clientId} onChange={(e) => setClientId(e.target.value)} className="text-sm">
            <option value="">{t('allClients')}</option>
            {(data?.clients || []).map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
          </SelectInput>
          <SelectInput value={projectId} onChange={(e) => setProjectId(e.target.value)} className="text-sm">
            <option value="">{t('allProjects')}</option>
            {(data?.projects || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </SelectInput>
          <SelectInput value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="text-sm">
            <option value="">{t('allTypes')}</option>
            {ASSET_TYPES.map((ty) => <option key={ty} value={ty}>{ty}</option>)}
          </SelectInput>
          <SelectInput value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="text-sm">
            <option value="">{t('allTags')}</option>
            {(data?.tags || []).map((tag) => <option key={tag} value={tag}>{tag}</option>)}
          </SelectInput>
          <TextInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="text-sm" />
          <TextInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="text-sm" />
        </div>
        {(data?.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <Tag className="h-3.5 w-3.5 text-vega-cyan" />
            {(data?.tags || []).slice(0, 12).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setTagFilter(tagFilter === tag ? '' : tag)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  tagFilter === tag ? 'bg-vega-cyan text-white' : 'bg-vega-cyan/10 text-vega-cyan'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {canCreate('archive') && (
          <>
            <button type="button" onClick={() => setUploadOpen(true)} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: 'var(--vega-gradient)' }}>
              {t('uploadFile')}
            </button>
            <button type="button" onClick={() => { setEditingContract(null); setContractForm({ clientId: data?.clients[0]?.id || '', title: '', fileUrl: '', value: '', status: 'active', startDate: '', endDate: '' }); setContractOpen(true); }} className="rounded-lg border border-vega-cyan/40 px-4 py-2 text-sm font-semibold text-vega-cyan hover:bg-vega-cyan/10">
              {t('addContract')}
            </button>
          </>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" /></div>
      ) : (
        <div className="space-y-8">
          {(category === 'all' || category === 'projects') && (data?.archivedProjects?.length ?? 0) > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">{t('archivedProjects')}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data!.archivedProjects.map((p) => (
                  <div key={p.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm text-[var(--color-text-secondary)]">{p.client?.companyName} · {p.status}</p>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{p._count.tasks} {t('tasks')} · {p._count.assets} {t('files')}</p>
                    <div className="mt-3 flex gap-2">
                      <Link href={`/projects/${p.id}`} className="text-xs font-semibold text-vega-cyan hover:underline">{t('viewProject')}</Link>
                      {canUpdate('archive') && p.status !== 'ARCHIVED' && (
                        <button type="button" onClick={() => archiveProject(p.id)} className="text-xs font-semibold text-amber-500 hover:underline">{t('archiveProject')}</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(category === 'all' || category === 'contracts') && (data?.contracts?.length ?? 0) > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">{t('contracts')}</h2>
              <DataTable
                columns={[
                  { key: 'title', header: t('file') },
                  { key: 'client', header: t('client'), render: (item) => (item as Workspace['contracts'][0]).client.companyName },
                  { key: 'value', header: t('value'), render: (item) => (item as Workspace['contracts'][0]).value ? formatMoney((item as Workspace['contracts'][0]).value!) : '—' },
                  { key: 'status', header: tc('status') },
                  {
                    key: 'actions',
                    header: tc('actions'),
                    render: (item) => {
                      const c = item as Workspace['contracts'][0];
                      return (
                        <CrudActions
                          module="archive"
                          onEdit={canUpdate('archive') ? () => { setEditingContract(c); setContractForm({ clientId: '', title: c.title, fileUrl: c.fileUrl || '', value: String(c.value || ''), status: c.status, startDate: '', endDate: '' }); setContractOpen(true); } : undefined}
                          onDelete={canDelete('archive') ? () => deleteContract(c.id) : undefined}
                        />
                      );
                    },
                  },
                ]}
                data={data?.contracts || []}
              />
            </section>
          )}

          {(category === 'all' || category === 'conversations') && (data?.timeline?.length ?? 0) > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">{t('clientConversations')}</h2>
              <ul className="space-y-2">
                {data!.timeline.map((item) => (
                  <li key={item.id} className="rounded-lg border border-[var(--color-border)] px-4 py-3 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-xs text-[var(--color-text-secondary)]">{new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-vega-cyan">{item.client?.companyName} · {item.type}</p>
                    {item.content && <p className="mt-1 text-[var(--color-text-secondary)]">{item.content}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(category === 'all' || category === 'videos') && (data?.videos?.length ?? 0) > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">{t('videoLibrary')}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data!.videos.map((v) => (
                  <div key={v.id} className="rounded-xl border border-[var(--color-border)] p-4">
                    <Film className="h-8 w-8 text-vega-cyan/60 mb-2" />
                    <p className="font-semibold">{v.title}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{v.shoot?.project?.name || v.shoot?.title || '—'} · {v.status}</p>
                    {(v.editedUrl || v.publishUrl) && (
                      <a href={v.publishUrl || v.editedUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-vega-cyan hover:underline">{t('openFile')}</a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {category !== 'projects' && category !== 'contracts' && category !== 'conversations' && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">
                {t('files')} {data?.assetsMeta ? `(${data.assetsMeta.total})` : ''}
              </h2>
              {!(data?.assets?.length) ? (
                <p className="text-sm text-[var(--color-text-secondary)]">{tc('noData')}</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {data!.assets.map((asset) => (
                    <div key={asset.id} className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 hover:border-vega-cyan/50 transition-colors">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <span className="rounded bg-vega-cyan/10 px-2 py-0.5 text-[10px] font-bold uppercase text-vega-cyan">{asset.type}</span>
                        <span className="text-xs text-[var(--color-text-secondary)]">v{asset.version}</span>
                      </div>
                      <button type="button" onClick={() => openDetail(asset)} className="text-start w-full">
                        <p className="font-semibold line-clamp-2 hover:text-vega-cyan">{asset.name}</p>
                        {asset.description && <p className="mt-1 text-xs text-[var(--color-text-secondary)] line-clamp-2">{asset.description}</p>}
                      </button>
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{asset.client?.companyName || asset.project?.name || '—'}</p>
                      {asset.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {asset.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="rounded-full bg-[var(--color-surface-secondary)] px-2 py-0.5 text-[10px]">{tag}</span>
                          ))}
                        </div>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <a href={asset.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-vega-cyan hover:underline">{t('openFile')}</a>
                        <CrudActions
                          module="archive"
                          onEdit={canUpdate('archive') ? () => openDetail(asset) : undefined}
                          onDelete={canDelete('archive') ? () => deleteAsset(asset.id) : undefined}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title={t('uploadFile')}>
        <form className="space-y-4" onSubmit={saveAsset}>
          <FormField label={t('file')} required><TextInput value={uploadForm.name} onChange={(e) => setUploadForm((f) => ({ ...f, name: e.target.value }))} required /></FormField>
          <FormField label={t('fileDescription')}><TextArea value={uploadForm.description} onChange={(e) => setUploadForm((f) => ({ ...f, description: e.target.value }))} /></FormField>
          <FormField label={t('type')} required>
            <SelectInput value={uploadForm.type} onChange={(e) => setUploadForm((f) => ({ ...f, type: e.target.value }))}>
              {ASSET_TYPES.map((ty) => <option key={ty} value={ty}>{ty}</option>)}
            </SelectInput>
          </FormField>
          <FormField label={t('fileUrl')} required><TextInput value={uploadForm.fileUrl} onChange={(e) => setUploadForm((f) => ({ ...f, fileUrl: e.target.value }))} required placeholder="https://..." /></FormField>
          <FormField label={t('tags')}><TextInput value={uploadForm.tags} onChange={(e) => setUploadForm((f) => ({ ...f, tags: e.target.value }))} placeholder={t('tagsHint')} /></FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label={t('client')}>
              <SelectInput value={uploadForm.clientId} onChange={(e) => setUploadForm((f) => ({ ...f, clientId: e.target.value }))}>
                <option value="">—</option>
                {(data?.clients || []).map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
              </SelectInput>
            </FormField>
            <FormField label={t('project')}>
              <SelectInput value={uploadForm.projectId} onChange={(e) => setUploadForm((f) => ({ ...f, projectId: e.target.value }))}>
                <option value="">—</option>
                {(data?.projects || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </SelectInput>
            </FormField>
          </div>
          <FormActions onCancel={() => setUploadOpen(false)} submitLabel={tc('save')} cancelLabel={tc('cancel')} loading={saving} />
        </form>
      </Modal>

      <Modal open={detailOpen} onClose={() => { setDetailOpen(false); setSelected(null); }} title={selected?.name || t('fileDetails')}>
        {selected && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <p className="text-sm"><span className="text-[var(--color-text-secondary)]">{t('type')}:</span> {selected.type}</p>
            {selected.description && <p className="text-sm">{selected.description}</p>}
            <p className="text-sm">{t('version')}: {selected.version}</p>
            <a href={selected.fileUrl} target="_blank" rel="noreferrer" className="text-sm text-vega-cyan hover:underline">{t('openFile')}</a>
            {selected.versions && selected.versions.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">{t('versionHistory')}</h4>
                <ul className="space-y-2 text-sm">
                  {selected.versions.map((v) => (
                    <li key={v.id} className="rounded border border-[var(--color-border)] px-3 py-2">
                      <span className="font-medium">v{v.version}</span>
                      {v.notes && <span className="text-[var(--color-text-secondary)]"> — {v.notes}</span>}
                      <a href={v.fileUrl} className="block text-xs text-vega-cyan mt-1">{v.fileUrl}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {canUpdate('archive') && (
              <button type="button" onClick={() => { setVersionForm({ fileUrl: '', notes: '' }); setVersionOpen(true); }} className="rounded-lg border border-vega-cyan/40 px-4 py-2 text-sm font-semibold text-vega-cyan">
                {t('addVersion')}
              </button>
            )}
          </div>
        )}
      </Modal>

      <Modal open={versionOpen} onClose={() => setVersionOpen(false)} title={t('addVersion')}>
        <form className="space-y-4" onSubmit={saveVersion}>
          <FormField label={t('fileUrl')} required><TextInput value={versionForm.fileUrl} onChange={(e) => setVersionForm((f) => ({ ...f, fileUrl: e.target.value }))} required /></FormField>
          <FormField label={t('versionNotes')}><TextArea value={versionForm.notes} onChange={(e) => setVersionForm((f) => ({ ...f, notes: e.target.value }))} /></FormField>
          <FormActions onCancel={() => setVersionOpen(false)} submitLabel={tc('save')} cancelLabel={tc('cancel')} loading={saving} />
        </form>
      </Modal>

      <Modal open={contractOpen} onClose={() => setContractOpen(false)} title={editingContract ? t('editContract') : t('addContract')}>
        <form className="space-y-4" onSubmit={saveContract}>
          {!editingContract && (
            <FormField label={t('client')} required>
              <SelectInput value={contractForm.clientId} onChange={(e) => setContractForm((f) => ({ ...f, clientId: e.target.value }))} required>
                {(data?.clients || []).map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
              </SelectInput>
            </FormField>
          )}
          <FormField label={t('file')} required><TextInput value={contractForm.title} onChange={(e) => setContractForm((f) => ({ ...f, title: e.target.value }))} required /></FormField>
          <FormField label={t('fileUrl')}><TextInput value={contractForm.fileUrl} onChange={(e) => setContractForm((f) => ({ ...f, fileUrl: e.target.value }))} /></FormField>
          <FormField label={t('value')}><TextInput type="number" value={contractForm.value} onChange={(e) => setContractForm((f) => ({ ...f, value: e.target.value }))} /></FormField>
          <FormActions onCancel={() => setContractOpen(false)} submitLabel={tc('save')} cancelLabel={tc('cancel')} loading={saving} />
        </form>
      </Modal>
    </DashboardLayout>
  );
}
