'use client';

import { useTranslations } from 'next-intl';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { DataTable } from '@/components/data-table';
import { useApiData } from '@/hooks/use-api-data';

export default function MediaPage() {
  const t = useTranslations('media');
  const tc = useTranslations('common');
  const { data, loading } = useApiData<{ data: { id: string; title: string; location?: string; status: string; scheduledAt?: string }[] }>('/media/shoots');

  return (
    <DashboardLayout title={t('title')} module="media">
      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" /></div>
      ) : (
        <DataTable
          columns={[
            { key: 'title', header: t('shoot') },
            { key: 'location', header: tc('location') },
            { key: 'status', header: tc('status') },
            { key: 'scheduledAt', header: t('scheduled'), render: (item) => item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : tc('tbd') },
          ]}
          data={data?.data || []}
        />
      )}
    </DashboardLayout>
  );
}
