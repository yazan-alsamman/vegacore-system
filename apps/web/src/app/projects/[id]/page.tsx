'use client';

import { use } from 'react';
import { useTranslations } from 'next-intl';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ProjectDashboard } from '@/components/projects/project-dashboard';
import { useApiData } from '@/hooks/use-api-data';

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const tp = useTranslations('projects');
  const { data, loading, error, refetch, token } = useApiData<Record<string, unknown>>(`/projects/${id}/dashboard`);
  const { data: kanban } = useApiData<Record<string, Record<string, unknown>[]>>(`/projects/${id}/kanban`);
  const { data: usersData } = useApiData<{ data: { id: string; firstName: string; lastName: string }[] }>('/users?limit=100');

  return (
    <DashboardLayout title={tp('title')} module="projects">
      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-vega-cyan border-t-transparent" />
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-vega-red/25 bg-vega-red/10 px-4 py-3 text-sm text-vega-red">{error}</div>
      )}
      {data && (
        <ProjectDashboard
          projectId={id}
          data={data as unknown as Parameters<typeof ProjectDashboard>[0]['data']}
          kanban={kanban || null}
          users={usersData?.data || []}
          token={token}
          onRefresh={refetch}
        />
      )}
    </DashboardLayout>
  );
}
