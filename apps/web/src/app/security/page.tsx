'use client';

import { useTranslations } from 'next-intl';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { DataTable } from '@/components/data-table';
import { useApiData } from '@/hooks/use-api-data';

export default function SecurityPage() {
  const t = useTranslations('security');
  const tc = useTranslations('common');
  const { data, loading } = useApiData<{ data: { id: string; title: string; type: string; severity: string; status: string; _count: { vulnerabilities: number } }[] }>('/security/reports');

  return (
    <DashboardLayout title={t('title')} module="security">
      <p className="mb-4 text-[var(--color-text-secondary)]">{t('description')}</p>
      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" /></div>
      ) : (
        <DataTable
          columns={[
            { key: 'title', header: t('report') },
            { key: 'type', header: t('type') },
            {
              key: 'severity',
              header: t('severity'),
              render: (item) => (
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  item.severity === 'CRITICAL' ? 'bg-vega-red/15 text-vega-red' :
                  item.severity === 'HIGH' ? 'bg-vega-gold/15 text-[#c8870a]' : 'bg-vega-navy/10 text-vega-navy'
                }`}>{item.severity}</span>
              ),
            },
            { key: 'vulnerabilities', header: t('issues'), render: (item) => item._count.vulnerabilities },
            { key: 'status', header: tc('status') },
          ]}
          data={data?.data || []}
        />
      )}
    </DashboardLayout>
  );
}
