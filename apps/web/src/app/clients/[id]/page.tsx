'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  AddFileSectionButton,
  AssetEditor,
  ClientInfoEditor,
  FileSectionActions,
  SocialMediaSection,
  PackageEditor,
  PackageActivateButton,
  TimelineDelete,
  TimelineEditor,
  useClientFinancialEditor,
} from '@/components/clients/client-profile-editors';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useApiData } from '@/hooks/use-api-data';
import { usePermissions } from '@/hooks/use-permissions';
import { fileSectionTitle, type FileSection } from '@/lib/client-file-sections';
import { formatMoney } from '@/lib/money';
import type { SocialLinksMap } from '@/lib/social-links';

type Tab = 'info' | 'package' | 'files' | 'history' | 'financial';

interface ClientProfile {
  client: Record<string, unknown>;
  package?: Record<string, unknown>;
  packages: Record<string, unknown>[];
  fileSections: FileSection[];
  assetsByType: Record<string, Record<string, unknown>[]>;
  contracts: Record<string, unknown>[];
  invoices: Record<string, unknown>[];
  payments: {
    id: string;
    amount: number;
    method?: string | null;
    reason?: string | null;
    paidAt?: string | null;
    invoiceNumber?: string;
  }[];
  subscriptions: Record<string, unknown>[];
  financial: {
    totalInvoiced: number;
    totalPaid: number;
    remaining: number;
    renewalDate: string | null;
    alerts: { level: string; message: string }[];
  };
  history: {
    id: string;
    type: string;
    title: string;
    content?: string | null;
    createdAt: string;
    source?: string;
    metadata?: Record<string, unknown>;
  }[];
}

function fmtDate(v: unknown) {
  if (!v) return '—';
  return new Date(String(v)).toLocaleDateString();
}

const fmtMoney = formatMoney;

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4 py-2.5 border-b border-[var(--color-border)] last:border-0">
      <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">{label}</span>
      <span className="text-sm text-[var(--color-text)] sm:text-end">{value || '—'}</span>
    </div>
  );
}

function SectionCard({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-vega-navy dark:text-vega-cyan">{title}</h3>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export default function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('common');
  const tc = useTranslations('clientProfile');
  const { canRead } = usePermissions();
  const { data, loading, error, refetch, token } = useApiData<ClientProfile>(`/clients/${id}/profile`);
  const [tab, setTab] = useState<Tab>('info');

  const client = data?.client;
  const pkg = data?.package;
  const social = (client?.socialLinks || {}) as SocialLinksMap;
  const services = (pkg?.subscribedServices as string[]) || [];

  const fin = useClientFinancialEditor(id, data?.invoices || [], token, () => refetch());

  const tabs: { id: Tab; label: string }[] = [
    { id: 'info', label: tc('tabInfo') },
    { id: 'package', label: tc('tabPackage') },
    { id: 'files', label: tc('tabFiles') },
    { id: 'history', label: tc('tabHistory') },
    ...(canRead('finance') ? [{ id: 'financial' as Tab, label: tc('tabFinancial') }] : []),
  ];

  return (
    <DashboardLayout title={(client?.companyName as string) || tc('title')} module="clients">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/clients" className="text-sm text-vega-cyan hover:underline">
          ← {tc('backToList')}
        </Link>
        {client?.status != null && String(client.status) !== '' && (
          <span className="rounded-full bg-vega-cyan/15 px-3 py-0.5 text-xs font-semibold text-vega-cyan">
            {String(client.status)}
          </span>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-vega-cyan border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-vega-red/25 bg-vega-red/10 px-4 py-3 text-sm text-vega-red">{error}</div>
      )}

      {data && client && token && (
        <>
          <div className="mb-6 flex gap-2 overflow-x-auto border-b border-[var(--color-border)] pb-1 -mx-1 px-1 scrollbar-thin">
            {tabs.map((tb) => (
              <button
                key={tb.id}
                type="button"
                onClick={() => setTab(tb.id)}
                className={`shrink-0 whitespace-nowrap rounded-t-lg px-3 py-2 sm:px-4 text-sm font-medium transition-colors ${
                  tab === tb.id
                    ? 'bg-vega-navy text-white dark:bg-vega-cyan dark:text-vega-navy'
                    : 'text-[var(--color-text-secondary)] hover:bg-vega-navy/5'
                }`}
              >
                {tb.label}
              </button>
            ))}
          </div>

          {tab === 'info' && (
            <div className="grid gap-6 lg:grid-cols-2">
              <SectionCard
                title={tc('clientData')}
                actions={<ClientInfoEditor clientId={id} client={client} token={token} onSaved={refetch} />}
              >
                <InfoRow label={tc('ownerName')} value={String(client.ownerName)} />
                <InfoRow label={tc('company')} value={String(client.companyName)} />
                <InfoRow label={tc('phone')} value={String(client.phone || '')} />
                <InfoRow label={tc('email')} value={String(client.email || '')} />
                <InfoRow label={tc('country')} value={String(client.country || '')} />
                <InfoRow label={tc('businessType')} value={String(client.businessType || '')} />
                <InfoRow label={tc('startDate')} value={fmtDate(client.onboardingDate)} />
              </SectionCard>
              <SocialMediaSection
                clientId={id}
                socialLinks={social}
                token={token}
                onSaved={refetch}
                notes={
                  client.notes != null && String(client.notes) !== '' ? (
                    <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                      <p className="text-xs font-medium uppercase text-[var(--color-text-secondary)] mb-1">{tc('notes')}</p>
                      <p className="text-sm">{String(client.notes)}</p>
                    </div>
                  ) : undefined
                }
              />
            </div>
          )}

          {tab === 'package' && (
            <div className="grid gap-6 lg:grid-cols-2">
              <SectionCard
                title={tc('packageDetails')}
                actions={<PackageEditor clientId={id} pkg={pkg?.isActive ? pkg : undefined} token={token} onSaved={refetch} />}
              >
                {pkg?.isActive ? (
                  <>
                    <div className="mb-3">
                      <span className="inline-flex rounded-full bg-vega-green/15 px-2.5 py-0.5 text-xs font-semibold text-vega-green">
                        {tc('active')}
                      </span>
                    </div>
                    <InfoRow label={tc('packageName')} value={String(pkg.name)} />
                    <InfoRow label={tc('packageType')} value={String(pkg.packageType || pkg.name)} />
                    <InfoRow label={tc('agreedServices')} value={services.length ? services.join(', ') : '—'} />
                    <InfoRow label={tc('reelsQuota')} value={String(pkg.reelsQuota ?? 0)} />
                    <InfoRow label={tc('designQuota')} value={String(pkg.designQuota ?? 0)} />
                    <InfoRow label={tc('visitsQuota')} value={String(pkg.visitsQuota ?? 0)} />
                    <InfoRow label={tc('devHours')} value={String(pkg.developmentHours ?? 0)} />
                    <InfoRow label={tc('hostingType')} value={String(pkg.hostingType || '—')} />
                    <InfoRow label={tc('contractStart')} value={fmtDate(pkg.contractStart)} />
                    <InfoRow label={tc('contractEnd')} value={fmtDate(pkg.contractEnd)} />
                  </>
                ) : (
                  <p className="text-sm text-[var(--color-text-secondary)]">{tc('noActivePackage')}</p>
                )}
              </SectionCard>
              {data.packages.length > 0 && (
                <SectionCard title={tc('allPackages')}>
                  <ul className="space-y-3 text-sm">
                    {data.packages.map((p) => (
                      <li
                        key={String(p.id)}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2.5"
                      >
                        <div>
                          <p className="font-medium">{String(p.name)}</p>
                          <p className="text-xs text-[var(--color-text-secondary)]">
                            {p.packageType ? String(p.packageType) : '—'}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={p.isActive ? 'text-xs font-semibold text-vega-green' : 'text-xs text-[var(--color-text-secondary)]'}>
                            {p.isActive ? tc('active') : tc('inactive')}
                          </span>
                          {!p.isActive && (
                            <PackageActivateButton clientId={id} packageId={String(p.id)} token={token} onSaved={refetch} />
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              )}
            </div>
          )}

          {tab === 'files' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <AddFileSectionButton clientId={id} token={token} onSaved={refetch} />
              </div>
              <div className="grid gap-6 md:grid-cols-2">
              {(data.fileSections || []).map((section) => {
                const key = section.key;
                const title = fileSectionTitle(section, tc);
                const items = data.assetsByType[key] || [];
                return (
                  <SectionCard
                    key={key}
                    title={title}
                    actions={
                      <div className="flex flex-wrap items-center gap-3">
                        <FileSectionActions
                          clientId={id}
                          sectionKey={key}
                          displayTitle={title}
                          token={token}
                          onSaved={refetch}
                        />
                        <AssetEditor clientId={id} assetType={key} token={token} onSaved={refetch} />
                      </div>
                    }
                  >
                    {items.length === 0 ? (
                      <p className="text-sm text-[var(--color-text-secondary)]">{t('noData')}</p>
                    ) : (
                      <ul className="space-y-3">
                        {items.map((asset) => {
                          const meta = (asset.metadata || {}) as Record<string, string>;
                          return (
                            <li
                              key={String(asset.id)}
                              className="rounded-lg border border-[var(--color-border)] p-3 text-sm"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-medium">{String(asset.name)}</p>
                                <AssetEditor
                                  clientId={id}
                                  assetType={key}
                                  asset={asset}
                                  token={token}
                                  onSaved={refetch}
                                />
                              </div>
                              {asset.fileUrl != null && String(asset.fileUrl) !== '' && String(asset.fileUrl) !== '#' && (
                                <a
                                  href={String(asset.fileUrl)}
                                  className="mt-1 inline-block text-xs text-vega-cyan hover:underline"
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {tc('openFile')}
                                </a>
                              )}
                              {Object.keys(meta).length > 0 && (
                                <dl className="mt-2 space-y-1 text-xs text-[var(--color-text-secondary)]">
                                  {Object.entries(meta).map(([mk, mv]) => (
                                    <div key={mk} className="flex gap-2">
                                      <dt className="font-medium">{mk}:</dt>
                                      <dd>{mv}</dd>
                                    </div>
                                  ))}
                                </dl>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </SectionCard>
                );
              })}
              </div>
            </div>
          )}

          {tab === 'history' && (
            <SectionCard
              title={tc('fullHistory')}
              actions={<TimelineEditor clientId={id} token={token} onSaved={refetch} />}
            >
              {data.history.length === 0 ? (
                <p className="text-sm text-[var(--color-text-secondary)]">{t('noData')}</p>
              ) : (
                <ul className="space-y-4">
                  {data.history.map((item) => (
                    <li key={item.id} className="flex gap-4 border-s-2 border-vega-cyan/40 ps-4">
                      <div className="min-w-[88px] text-xs text-[var(--color-text-secondary)]">
                        {fmtDate(item.createdAt)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          <span className="mb-1 inline-block rounded bg-vega-navy/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-vega-navy dark:bg-vega-cyan/15 dark:text-vega-cyan">
                            {item.type}
                          </span>
                          <TimelineDelete clientId={id} item={item} token={token} onSaved={refetch} />
                        </div>
                        <p className="font-medium text-sm">{item.title}</p>
                        {item.content != null && String(item.content) !== '' && (
                          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{String(item.content)}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          )}

          {tab === 'financial' && (
            <>
              {fin.toolbar}
              {fin.modals}
              <div className="grid gap-6 lg:grid-cols-3">
                <SectionCard title={tc('financialStatus')}>
                  <InfoRow label={tc('totalInvoiced')} value={fmtMoney(data.financial.totalInvoiced)} />
                  <InfoRow label={tc('totalPaid')} value={fmtMoney(data.financial.totalPaid)} />
                  <InfoRow label={tc('remaining')} value={fmtMoney(data.financial.remaining)} />
                  <InfoRow label={tc('renewalDate')} value={fmtDate(data.financial.renewalDate)} />
                </SectionCard>

                <div className="lg:col-span-2 space-y-6">
                  {data.financial.alerts.length > 0 && (
                    <SectionCard title={tc('financialAlerts')}>
                      <ul className="space-y-2">
                        {data.financial.alerts.map((a, i) => (
                          <li
                            key={i}
                            className={`rounded-lg px-3 py-2 text-sm ${
                              a.level === 'error'
                                ? 'bg-vega-red/10 text-vega-red'
                                : a.level === 'warning'
                                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                                  : 'bg-vega-cyan/10 text-vega-cyan'
                            }`}
                          >
                            {a.message}
                          </li>
                        ))}
                      </ul>
                    </SectionCard>
                  )}

                  <SectionCard title={tc('invoices')}>
                    {data.invoices.length === 0 ? (
                      <p className="text-sm text-[var(--color-text-secondary)]">{t('noData')}</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-xs uppercase text-[var(--color-text-secondary)]">
                              <th className="py-2 text-start">{tc('invoiceNumber')}</th>
                              <th className="py-2 text-start">{tc('amount')}</th>
                              <th className="py-2 text-start">{tc('status')}</th>
                              <th className="py-2 text-start">{tc('dueDate')}</th>
                              <th className="py-2 text-end">{t('actions')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.invoices.map((inv) => (
                              <tr key={String(inv.id)} className="border-b border-[var(--color-border)] last:border-0">
                                <td className="py-2">{String(inv.number)}</td>
                                <td className="py-2">{fmtMoney(Number(inv.total))}</td>
                                <td className="py-2">{String(inv.status)}</td>
                                <td className="py-2">{fmtDate(inv.dueDate)}</td>
                                <td className="py-2 text-end">
                                  <div className="flex justify-end gap-2">
                                    {fin.canUpdateFinance && (
                                      <button
                                        type="button"
                                        onClick={() => fin.openEditInvoice(inv)}
                                        className="text-xs text-vega-cyan hover:underline"
                                      >
                                        {t('edit')}
                                      </button>
                                    )}
                                    {fin.canDeleteFinance && (
                                      <button
                                        type="button"
                                        onClick={() => fin.deleteInvoice(String(inv.id))}
                                        className="text-xs text-vega-red hover:underline"
                                      >
                                        {t('delete')}
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </SectionCard>

                  <SectionCard title={tc('payments')}>
                    {(data.payments || []).length === 0 ? (
                      <p className="text-sm text-[var(--color-text-secondary)]">{t('noData')}</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-xs uppercase text-[var(--color-text-secondary)]">
                              <th className="py-2 text-start">{tc('paidAt')}</th>
                              <th className="py-2 text-start">{tc('invoiceNumber')}</th>
                              <th className="py-2 text-start">{tc('amount')}</th>
                              <th className="py-2 text-start">{tc('paymentReason')}</th>
                              <th className="py-2 text-start">{tc('paymentMethod')}</th>
                              <th className="py-2 text-end">{t('actions')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(data.payments || []).map((p) => (
                              <tr key={p.id} className="border-b border-[var(--color-border)] last:border-0">
                                <td className="py-2">{fmtDate(p.paidAt)}</td>
                                <td className="py-2">{p.invoiceNumber || '—'}</td>
                                <td className="py-2">{fmtMoney(p.amount)}</td>
                                <td className="py-2">{p.reason || '—'}</td>
                                <td className="py-2">{p.method || '—'}</td>
                                <td className="py-2 text-end">
                                  {fin.canDeleteFinance && (
                                    <button
                                      type="button"
                                      onClick={() => fin.deletePayment(p.id)}
                                      className="text-xs text-vega-red hover:underline"
                                    >
                                      {t('delete')}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </SectionCard>

                  <SectionCard title={tc('subscriptions')}>
                    {data.subscriptions.length === 0 ? (
                      <p className="text-sm text-[var(--color-text-secondary)]">{t('noData')}</p>
                    ) : (
                      <ul className="space-y-2 text-sm">
                        {data.subscriptions.map((s) => (
                          <li key={String(s.id)} className="flex flex-wrap items-center justify-between gap-2">
                            <span>
                              {String(s.name)} — {fmtMoney(Number(s.amount))}/{String(s.interval)}
                            </span>
                            <div className="flex items-center gap-2">
                              <span>{fmtDate(s.nextDue)}</span>
                              {fin.canUpdateClients && (
                                <button
                                  type="button"
                                  onClick={() => fin.openEditSubscription(s)}
                                  className="text-xs text-vega-cyan hover:underline"
                                >
                                  {t('edit')}
                                </button>
                              )}
                              {fin.canDeleteClients && (
                                <button
                                  type="button"
                                  onClick={() => fin.deleteSubscription(String(s.id))}
                                  className="text-xs text-vega-red hover:underline"
                                >
                                  {t('delete')}
                                </button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </SectionCard>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
