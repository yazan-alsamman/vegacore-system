'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { RequireModule } from '@/components/auth/require-module';
import { Sidebar } from './sidebar';
import { Header } from './header';

export function DashboardLayout({
  children,
  title,
  module,
}: {
  children: React.ReactNode;
  title: string;
  /** RBAC module slug — hides page if user lacks `module.read` */
  module?: string;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const t = useTranslations('layout');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-secondary)]">
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-12 w-12 animate-spin rounded-full border-4 border-t-transparent"
            style={{ borderColor: 'var(--vega-cyan)', borderTopColor: 'transparent' }}
          />
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[var(--color-surface-secondary)]">
      <Sidebar />
      <div className="ps-64 min-h-screen">
        <Header title={title} />
        <main className="p-6">
          {module ? <RequireModule module={module}>{children}</RequireModule> : children}
        </main>
      </div>
    </div>
  );
}
