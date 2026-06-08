'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ContentCalendarTable } from '@/components/marketing/content-calendar-table';
import { ShootManagementTable } from '@/components/marketing/shoot-management-table';
import { useApiData } from '@/hooks/use-api-data';
import { usePermissions } from '@/hooks/use-permissions';

type MarketingTab = 'calendar' | 'shoots';

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
    models: { id: string; name: string }[];
    photographers: { id: string; name: string }[];
  }>(endpoint);

  const defaultTab: MarketingTab = canMarketing ? 'calendar' : 'shoots';
  const [tab, setTab] = useState<MarketingTab>(defaultTab);

  const scoped = useMemo(() => {
    const calendar = (data?.calendar || []).map((item) => ({
      ...item,
      clientId: (item.metadata as { clientId?: string } | undefined)?.clientId,
    }));
    const shoots = data?.shoots || [];
    return { calendar, shoots };
  }, [data?.calendar, data?.shoots]);

  const visibleTabs: { id: MarketingTab; label: string }[] = [];
  if (canMarketing) visibleTabs.push({ id: 'calendar', label: t('tabCalendar') });
  if (canMedia) visibleTabs.push({ id: 'shoots', label: t('tabShoots') });

  const activeTab = visibleTabs.some((vt) => vt.id === tab) ? tab : visibleTabs[0]?.id ?? 'calendar';

  const canEditCalendar =
    canMarketing && (canCreate('marketing') || canUpdate('marketing'));

  const canEditShoots = canMedia && (canCreate('media') || canUpdate('media'));

  if (!canMarketing && !canMedia) {
    return <p className="text-sm text-[var(--color-text-secondary)]">{tc('noData')}</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-text-secondary)]">{t('description')}</p>

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
              calendarItems={scoped.calendar}
              models={data?.models || []}
              photographers={data?.photographers || []}
              token={token}
              canEdit={canEditShoots}
              canDelete={canDelete('media')}
              onChanged={refetch}
            />
          )}
        </>
      )}
    </div>
  );
}
