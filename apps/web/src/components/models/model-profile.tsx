'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Calendar, Camera, DollarSign, Film, Ruler, Trash2, User } from 'lucide-react';
import { CrudActions } from '@/components/admin/crud-actions';
import { Modal } from '@/components/ui/modal';
import { FormActions, FormField, SelectInput, TextArea, TextInput } from '@/components/ui/form-fields';
import { usePermissions } from '@/hooks/use-permissions';
import { api } from '@/lib/api';
import { formatMoney, SYSTEM_CURRENCY } from '@/lib/money';

type Tab = 'overview' | 'photos' | 'videos' | 'bookings' | 'rates' | 'projects';

type MediaItem = { url: string; title?: string };
type ProjectItem = { name: string; client?: string; year?: string; url?: string };
type DaySlot = { from?: string; to?: string; available?: boolean };

export interface ModelProfileData {
  id: string;
  bio?: string | null;
  contentTypes: string[];
  photos: MediaItem[];
  videos: MediaItem[];
  previousProjects: ProjectItem[];
  availability: Record<string, DaySlot>;
  measurements: Record<string, string>;
  rates: Record<string, string | number>;
  stats: { totalBookings: number; upcomingBookings: number; completedBookings: number };
  upcomingBookings: BookingRow[];
  bookingHistory: BookingRow[];
  user: { id: string; firstName: string; lastName: string; email: string; phone?: string | null };
}

interface BookingRow {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  notes?: string | null;
  shoot?: { id: string; title: string; location?: string | null } | null;
}

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

function fmtDt(v: string) {
  return new Date(v).toLocaleString();
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ModelProfile({ modelId, data, token, onRefresh }: {
  modelId: string;
  data: ModelProfileData;
  token: string | null;
  onRefresh: () => void;
}) {
  const t = useTranslations('models');
  const tc = useTranslations('common');
  const router = useRouter();
  const { canUpdate, canDelete } = usePermissions();
  const [tab, setTab] = useState<Tab>('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<BookingRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    firstName: data.user.firstName,
    lastName: data.user.lastName,
    phone: data.user.phone || '',
    bio: data.bio || '',
    contentTypes: data.contentTypes.join(', '),
    height: data.measurements.height || '',
    bust: data.measurements.bust || '',
    waist: data.measurements.waist || '',
    hips: data.measurements.hips || '',
    shoe: data.measurements.shoe || '',
    hair: data.measurements.hair || '',
    eyes: data.measurements.eyes || '',
    hourly: String(data.rates.hourly ?? ''),
    halfDay: String(data.rates.halfDay ?? ''),
    fullDay: String(data.rates.fullDay ?? ''),
    availability: DAYS.reduce(
      (acc, day) => {
        const slot = data.availability[day];
        acc[day] = {
          from: slot?.from || '',
          to: slot?.to || '',
          available: slot?.available !== false,
        };
        return acc;
      },
      {} as Record<string, { from: string; to: string; available: boolean }>,
    ),
  });

  const [bookingForm, setBookingForm] = useState({
    startTime: '',
    endTime: '',
    notes: '',
    status: 'confirmed',
  });

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: t('tabOverview') },
    { id: 'photos', label: t('tabPhotos') },
    { id: 'videos', label: t('tabVideos') },
    { id: 'bookings', label: t('tabBookings') },
    { id: 'rates', label: t('tabRates') },
    { id: 'projects', label: t('tabProjects') },
  ];

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      await api(`/models/${modelId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone || undefined,
          bio: form.bio,
          contentTypes: form.contentTypes.split(',').map((s) => s.trim()).filter(Boolean),
          availability: form.availability,
          measurements: {
            height: form.height,
            bust: form.bust,
            waist: form.waist,
            hips: form.hips,
            shoe: form.shoe,
            hair: form.hair,
            eyes: form.eyes,
          },
          rates: {
            hourly: Number(form.hourly) || form.hourly,
            halfDay: Number(form.halfDay) || form.halfDay,
            fullDay: Number(form.fullDay) || form.fullDay,
            currency: SYSTEM_CURRENCY,
          } as { hourly: number | string; halfDay: number | string; fullDay: number | string; currency: string },
        }),
      });
      setEditOpen(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const saveBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      if (editingBooking) {
        await api(`/models/${modelId}/bookings/${editingBooking.id}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify(bookingForm),
        });
        setEditingBooking(null);
      } else {
        await api(`/models/${modelId}/bookings`, {
          method: 'POST',
          token,
          body: JSON.stringify(bookingForm),
        });
        setBookingOpen(false);
      }
      setBookingForm({ startTime: '', endTime: '', notes: '', status: 'confirmed' });
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const openEditBooking = (b: BookingRow) => {
    setEditingBooking(b);
    setBookingForm({
      startTime: toLocalInput(b.startTime),
      endTime: toLocalInput(b.endTime),
      notes: b.notes || '',
      status: b.status,
    });
  };

  const deleteBooking = async (bookingId: string) => {
    if (!token) return;
    await api(`/models/${modelId}/bookings/${bookingId}`, { method: 'DELETE', token });
    onRefresh();
  };

  const deleteModel = async () => {
    if (!token) return;
    if (!window.confirm(t('deleteModelConfirm'))) return;
    await api(`/models/${modelId}`, { method: 'DELETE', token });
    router.push('/models');
  };

  const fullName = `${data.user.firstName} ${data.user.lastName}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-bold text-white" style={{ background: 'var(--vega-gradient)' }}>
            {data.user.firstName[0]}{data.user.lastName[0]}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{fullName}</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">{data.user.email}</p>
            {data.user.phone != null && String(data.user.phone) !== '' && (
              <p className="text-sm text-[var(--color-text-secondary)]">{String(data.user.phone)}</p>
            )}
            {data.bio != null && String(data.bio) !== '' && (
              <p className="mt-2 max-w-xl text-sm">{String(data.bio)}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canUpdate('models') && (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ background: 'var(--vega-gradient)' }}
            >
              {t('editProfile')}
            </button>
          )}
          {canDelete('models') && (
            <button
              type="button"
              onClick={deleteModel}
              className="rounded-lg border border-vega-red/40 px-4 py-2 text-sm font-semibold text-vega-red hover:bg-vega-red/10"
            >
              {t('deleteModel')}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat icon={Calendar} label={t('totalBookings')} value={data.stats.totalBookings} />
        <Stat icon={User} label={t('upcomingBookings')} value={data.stats.upcomingBookings} />
        <Stat icon={Camera} label={t('photos')} value={data.photos.length} />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-1">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === id ? 'bg-vega-cyan/15 text-vega-cyan' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card title={t('contentTypes')} icon={Film}>
            {data.contentTypes.length ? (
              <div className="flex flex-wrap gap-2">
                {data.contentTypes.map((ct) => (
                  <span key={ct} className="rounded-full bg-vega-cyan/15 px-3 py-1 text-xs font-medium text-vega-cyan">{ct}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-secondary)]">{tc('noData')}</p>
            )}
          </Card>
          <Card title={t('measurements')} icon={Ruler}>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(data.measurements).map(([k, v]) => (
                <div key={k}><dt className="text-[var(--color-text-secondary)] capitalize">{k}</dt><dd className="font-medium">{v}</dd></div>
              ))}
            </dl>
          </Card>
        </div>
      )}

      {tab === 'photos' && (
        <MediaSection
          items={data.photos}
          canEdit={canUpdate('models')}
          onAdd={async (item) => {
            if (!token) return;
            await api(`/models/${modelId}`, { method: 'PATCH', token, body: JSON.stringify({ photos: [...data.photos, item] }) });
            onRefresh();
          }}
          onRemove={canDelete('models') ? async (index) => {
            if (!token) return;
            const photos = data.photos.filter((_, i) => i !== index);
            await api(`/models/${modelId}`, { method: 'PATCH', token, body: JSON.stringify({ photos }) });
            onRefresh();
          } : undefined}
          empty={tc('noData')}
          addLabel={t('addPhoto')}
          urlLabel={t('mediaUrl')}
          titleLabel={t('mediaTitle')}
          openLabel={t('openPortfolio')}
        />
      )}

      {tab === 'videos' && (
        <MediaSection
          items={data.videos}
          canEdit={canUpdate('models')}
          onAdd={async (item) => {
            if (!token) return;
            await api(`/models/${modelId}`, { method: 'PATCH', token, body: JSON.stringify({ videos: [...data.videos, item] }) });
            onRefresh();
          }}
          onRemove={canDelete('models') ? async (index) => {
            if (!token) return;
            const videos = data.videos.filter((_, i) => i !== index);
            await api(`/models/${modelId}`, { method: 'PATCH', token, body: JSON.stringify({ videos }) });
            onRefresh();
          } : undefined}
          empty={tc('noData')}
          addLabel={t('addVideo')}
          urlLabel={t('mediaUrl')}
          titleLabel={t('mediaTitle')}
          openLabel={t('openPortfolio')}
        />
      )}

      {tab === 'rates' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card title={t('rates')} icon={DollarSign}>
            <dl className="space-y-2 text-sm">
              <Row label={t('hourly')} value={data.rates.hourly != null ? formatMoney(data.rates.hourly) : '—'} />
              <Row label={t('halfDay')} value={data.rates.halfDay != null ? formatMoney(data.rates.halfDay) : '—'} />
              <Row label={t('fullDay')} value={data.rates.fullDay != null ? formatMoney(data.rates.fullDay) : '—'} />
            </dl>
          </Card>
          <Card title={t('availability')} icon={Calendar}>
            <div className="space-y-2">
              {DAYS.map((day) => {
                const slot = data.availability[day];
                const dayLabel = t(day);
                return (
                  <div key={day} className="flex justify-between text-sm border-b border-[var(--color-border)] py-2 last:border-0">
                    <span className="font-medium">{dayLabel}</span>
                    <span className="text-[var(--color-text-secondary)]">
                      {slot?.available === false
                        ? '—'
                        : slot?.from && slot?.to
                          ? `${slot.from} – ${slot.to}`
                          : tc('dash')}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {tab === 'projects' && (
        <ProjectsSection
          projects={data.previousProjects}
          canEdit={canUpdate('models')}
          onAdd={async (item) => {
            if (!token) return;
            await api(`/models/${modelId}`, {
              method: 'PATCH',
              token,
              body: JSON.stringify({ previousProjects: [...data.previousProjects, item] }),
            });
            onRefresh();
          }}
          onRemove={canDelete('models') ? async (index) => {
            if (!token) return;
            const previousProjects = data.previousProjects.filter((_, i) => i !== index);
            await api(`/models/${modelId}`, { method: 'PATCH', token, body: JSON.stringify({ previousProjects }) });
            onRefresh();
          } : undefined}
          labels={{
            empty: tc('noData'),
            add: t('addProject'),
            name: t('projectName'),
            client: t('projectClient'),
            year: t('projectYear'),
            url: t('projectUrl'),
            open: t('openPortfolio'),
          }}
        />
      )}

      {tab === 'bookings' && (
        <div className="space-y-6">
          {canUpdate('models') && (
            <button
              type="button"
              onClick={() => setBookingOpen(true)}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ background: 'var(--vega-gradient)' }}
            >
              {t('addBooking')}
            </button>
          )}
          <BookingTable
            title={t('upcoming')}
            rows={data.upcomingBookings}
            onEdit={canUpdate('models') ? openEditBooking : undefined}
            onDelete={canUpdate('models') ? deleteBooking : undefined}
          />
          <BookingTable
            title={t('history')}
            rows={data.bookingHistory}
            onEdit={canUpdate('models') ? openEditBooking : undefined}
            onDelete={canUpdate('models') ? deleteBooking : undefined}
          />
        </div>
      )}

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={t('editProfile')}>
        <form className="space-y-4 max-h-[70vh] overflow-y-auto" onSubmit={saveProfile}>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t('firstName')} required><TextInput value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} required /></FormField>
            <FormField label={t('lastName')} required><TextInput value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} required /></FormField>
          </div>
          <FormField label={t('phone')}><TextInput value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></FormField>
          <FormField label={t('bio')}><TextArea value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} /></FormField>
          <FormField label={t('contentTypes')}><TextInput value={form.contentTypes} onChange={(e) => setForm((f) => ({ ...f, contentTypes: e.target.value }))} placeholder={t('contentTypesHint')} /></FormField>
          <p className="text-sm font-semibold">{t('measurements')}</p>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t('height')}><TextInput value={form.height} onChange={(e) => setForm((f) => ({ ...f, height: e.target.value }))} /></FormField>
            <FormField label={t('bust')}><TextInput value={form.bust} onChange={(e) => setForm((f) => ({ ...f, bust: e.target.value }))} /></FormField>
            <FormField label={t('waist')}><TextInput value={form.waist} onChange={(e) => setForm((f) => ({ ...f, waist: e.target.value }))} /></FormField>
            <FormField label={t('hips')}><TextInput value={form.hips} onChange={(e) => setForm((f) => ({ ...f, hips: e.target.value }))} /></FormField>
            <FormField label={t('shoe')}><TextInput value={form.shoe} onChange={(e) => setForm((f) => ({ ...f, shoe: e.target.value }))} /></FormField>
            <FormField label={t('hair')}><TextInput value={form.hair} onChange={(e) => setForm((f) => ({ ...f, hair: e.target.value }))} /></FormField>
          </div>
          <p className="text-sm font-semibold">{t('rates')}</p>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t('hourly')}><TextInput value={form.hourly} onChange={(e) => setForm((f) => ({ ...f, hourly: e.target.value }))} /></FormField>
            <FormField label={t('halfDay')}><TextInput value={form.halfDay} onChange={(e) => setForm((f) => ({ ...f, halfDay: e.target.value }))} /></FormField>
            <FormField label={t('fullDay')}><TextInput value={form.fullDay} onChange={(e) => setForm((f) => ({ ...f, fullDay: e.target.value }))} /></FormField>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">{t('currencyUsdNote')}</p>
          <p className="text-sm font-semibold">{t('availability')}</p>
          <div className="space-y-2">
            {DAYS.map((day) => (
              <div key={day} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 text-sm">
                <span className="font-medium">{t(day)}</span>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={form.availability[day].available}
                    onChange={(e) => setForm((f) => ({
                      ...f,
                      availability: { ...f.availability, [day]: { ...f.availability[day], available: e.target.checked } },
                    }))}
                  />
                  {t('available')}
                </label>
                <TextInput
                  type="time"
                  value={form.availability[day].from}
                  onChange={(e) => setForm((f) => ({
                    ...f,
                    availability: { ...f.availability, [day]: { ...f.availability[day], from: e.target.value } },
                  }))}
                  className="!py-1"
                />
                <TextInput
                  type="time"
                  value={form.availability[day].to}
                  onChange={(e) => setForm((f) => ({
                    ...f,
                    availability: { ...f.availability, [day]: { ...f.availability[day], to: e.target.value } },
                  }))}
                  className="!py-1"
                />
              </div>
            ))}
          </div>
          <FormActions onCancel={() => setEditOpen(false)} submitLabel={tc('save')} cancelLabel={tc('cancel')} loading={saving} />
        </form>
      </Modal>

      <Modal
        open={bookingOpen || !!editingBooking}
        onClose={() => { setBookingOpen(false); setEditingBooking(null); setBookingForm({ startTime: '', endTime: '', notes: '', status: 'confirmed' }); }}
        title={editingBooking ? t('editBooking') : t('addBooking')}
      >
        <form className="space-y-4" onSubmit={saveBooking}>
          <FormField label={t('bookingStart')} required><TextInput type="datetime-local" value={bookingForm.startTime} onChange={(e) => setBookingForm((f) => ({ ...f, startTime: e.target.value }))} required /></FormField>
          <FormField label={t('bookingEnd')} required><TextInput type="datetime-local" value={bookingForm.endTime} onChange={(e) => setBookingForm((f) => ({ ...f, endTime: e.target.value }))} required /></FormField>
          <FormField label={t('bookingStatus')}><SelectInput value={bookingForm.status} onChange={(e) => setBookingForm((f) => ({ ...f, status: e.target.value }))}>
            <option value="confirmed">confirmed</option>
            <option value="pending">pending</option>
            <option value="cancelled">cancelled</option>
          </SelectInput></FormField>
          <FormField label={t('bookingNotes')}><TextArea value={bookingForm.notes} onChange={(e) => setBookingForm((f) => ({ ...f, notes: e.target.value }))} /></FormField>
          <FormActions onCancel={() => { setBookingOpen(false); setEditingBooking(null); }} submitLabel={tc('save')} cancelLabel={tc('cancel')} loading={saving} />
        </form>
      </Modal>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof User; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex items-center gap-3">
      <div className="rounded-lg bg-vega-cyan/15 p-2"><Icon className="h-5 w-5 text-vega-cyan" /></div>
      <div><p className="text-xs text-[var(--color-text-secondary)]">{label}</p><p className="text-xl font-bold">{value}</p></div>
    </div>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: typeof User; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="mb-3 flex items-center gap-2"><Icon className="h-4 w-4 text-vega-cyan" /><h3 className="font-semibold">{title}</h3></div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><dt className="text-[var(--color-text-secondary)]">{label}</dt><dd className="font-medium">{value}</dd></div>;
}

function MediaSection({
  items,
  canEdit,
  onAdd,
  onRemove,
  empty,
  addLabel,
  urlLabel,
  titleLabel,
  openLabel,
}: {
  items: MediaItem[];
  canEdit: boolean;
  onAdd: (item: MediaItem) => Promise<void>;
  onRemove?: (index: number) => Promise<void>;
  empty: string;
  addLabel: string;
  urlLabel: string;
  titleLabel: string;
  openLabel: string;
}) {
  const tc = useTranslations('common');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setSaving(true);
    try {
      await onAdd({ url: url.trim(), title: title.trim() || undefined });
      setUrl('');
      setTitle('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {canEdit && (
        <form onSubmit={handleAdd} className="flex flex-wrap gap-2 items-end rounded-xl border border-[var(--color-border)] p-4">
          <FormField label={urlLabel}><TextInput value={url} onChange={(e) => setUrl(e.target.value)} required className="min-w-[200px]" /></FormField>
          <FormField label={titleLabel}><TextInput value={title} onChange={(e) => setTitle(e.target.value)} /></FormField>
          <button type="submit" disabled={saving} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white mb-0.5" style={{ background: 'var(--vega-gradient)' }}>{addLabel}</button>
        </form>
      )}
      {!items.length ? (
        <p className="text-sm text-[var(--color-text-secondary)]">{empty}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item, i) => (
            <div key={i} className="group relative rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface-secondary)] aspect-[3/4]">
              <a href={item.url} target="_blank" rel="noreferrer" className="flex h-full flex-col items-center justify-center hover:border-vega-cyan transition-colors">
                <Camera className="h-10 w-10 text-vega-cyan/50 group-hover:text-vega-cyan" />
                <p className="mt-2 px-2 text-center text-xs font-medium">{item.title || openLabel}</p>
              </a>
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="absolute top-2 end-2 rounded-lg bg-vega-red/90 p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  title={tc('delete')}
                  aria-label={tc('delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectsSection({
  projects,
  canEdit,
  onAdd,
  onRemove,
  labels,
}: {
  projects: ProjectItem[];
  canEdit: boolean;
  onAdd: (item: ProjectItem) => Promise<void>;
  onRemove?: (index: number) => Promise<void>;
  labels: { empty: string; add: string; name: string; client: string; year: string; url: string; open: string };
}) {
  const tc = useTranslations('common');
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [year, setYear] = useState('');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onAdd({ name: name.trim(), client: client.trim() || undefined, year: year.trim() || undefined, url: url.trim() || undefined });
      setName('');
      setClient('');
      setYear('');
      setUrl('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {canEdit && (
        <form onSubmit={handleAdd} className="grid gap-3 rounded-xl border border-[var(--color-border)] p-4 md:grid-cols-2">
          <FormField label={labels.name} required><TextInput value={name} onChange={(e) => setName(e.target.value)} required /></FormField>
          <FormField label={labels.client}><TextInput value={client} onChange={(e) => setClient(e.target.value)} /></FormField>
          <FormField label={labels.year}><TextInput value={year} onChange={(e) => setYear(e.target.value)} /></FormField>
          <FormField label={labels.url}><TextInput value={url} onChange={(e) => setUrl(e.target.value)} /></FormField>
          <div className="md:col-span-2">
            <button type="submit" disabled={saving} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: 'var(--vega-gradient)' }}>{labels.add}</button>
          </div>
        </form>
      )}
      {projects.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)]">{labels.empty}</p>
      ) : (
        projects.map((p, i) => (
          <div key={i} className="flex items-start justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div>
              <p className="font-semibold">{p.name}</p>
              <p className="text-sm text-[var(--color-text-secondary)]">{p.client} {p.year ? `· ${p.year}` : ''}</p>
              {p.url && (
                <a href={p.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-vega-cyan hover:underline">{labels.open}</a>
              )}
            </div>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="rounded-lg p-2 text-vega-red hover:bg-vega-red/10 shrink-0"
                title={tc('delete')}
                aria-label={tc('delete')}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function BookingTable({ title, rows, onEdit, onDelete }: { title: string; rows: BookingRow[]; onEdit?: (row: BookingRow) => void; onDelete?: (id: string) => void }) {
  const t = useTranslations('models');
  const tc = useTranslations('common');
  if (!rows.length) return <div><h3 className="mb-2 font-semibold">{title}</h3><p className="text-sm text-[var(--color-text-secondary)]">{tc('noData')}</p></div>;
  return (
    <div>
      <h3 className="mb-3 font-semibold">{title}</h3>
      <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-vega-navy/5 dark:bg-vega-navy/20">
            <tr>
              <th className="px-4 py-3 text-start">{t('bookingSchedule')}</th>
              <th className="px-4 py-3 text-start">{t('bookingStatus')}</th>
              <th className="px-4 py-3 text-start">{t('shoot')}</th>
              {(onEdit || onDelete) && <th className="px-4 py-3 text-end">{tc('actions')}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-3">{fmtDt(b.startTime)} – {fmtDt(b.endTime)}</td>
                <td className="px-4 py-3">{b.status}</td>
                <td className="px-4 py-3">{b.shoot?.title || '—'}</td>
                {(onEdit || onDelete) && (
                  <td className="px-4 py-3 text-end">
                    <CrudActions module="models" onEdit={onEdit ? () => onEdit(b) : undefined} onDelete={onDelete ? () => onDelete(b.id) : undefined} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
