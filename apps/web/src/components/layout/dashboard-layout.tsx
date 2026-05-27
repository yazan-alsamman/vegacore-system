'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { RequireModule } from '@/components/auth/require-module';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { SidebarProvider } from './sidebar-context';

export function DashboardLayout({
  children,
  title,
  module,
}: {
  children: React.ReactNode;
  title: string;
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
    <SidebarProvider>
      <div className="min-h-[100dvh] bg-[var(--color-surface-secondary)]">
        <Sidebar />
        <div className="min-h-[100dvh] lg:ps-64">
          <Header title={title} />
          <main className="p-4 sm:p-5 lg:p-6 max-w-[100vw] overflow-x-hidden">
            {module ? <RequireModule module={module}>{children}</RequireModule> : children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
