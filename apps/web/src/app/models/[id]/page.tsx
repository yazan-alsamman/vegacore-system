'use client';

import { use } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ModelProfile, type ModelProfileData } from '@/components/models/model-profile';
import { useApiData } from '@/hooks/use-api-data';

export default function ModelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('models');
  const { data, loading, error, refetch, token } = useApiData<ModelProfileData>(`/models/${id}/profile`);

  const title = data ? `${data.user.firstName} ${data.user.lastName}` : t('title');

  return (
    <DashboardLayout title={title} module="models">
      <Link href="/models" className="mb-4 inline-block text-sm text-vega-cyan hover:underline">
        ← {t('backToList')}
      </Link>
      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-vega-cyan border-t-transparent" />
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-vega-red/25 bg-vega-red/10 px-4 py-3 text-sm text-vega-red">{error}</div>
      )}
      {data && (
        <ModelProfile modelId={id} data={data} token={token} onRefresh={refetch} />
      )}
    </DashboardLayout>
  );
}
