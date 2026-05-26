'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { canAccessModule, isSuperAdmin } from '@/lib/permissions';
import { getHomeForRole } from '@/lib/nav-config';

export function RequireModule({
  module,
  children,
}: {
  module: string;
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const t = useTranslations('access');

  const hasPerms = Boolean(user?.permissions?.length);
  const allowed = user && hasPerms && (isSuperAdmin(user) || canAccessModule(user, module));

  useEffect(() => {
    if (!loading && user && hasPerms && !allowed) {
      router.replace(getHomeForRole(user.role));
    }
  }, [loading, user, hasPerms, allowed, router]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!hasPerms) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="h-12 w-12 text-vega-red mb-4" />
        <h2 className="text-lg font-semibold">{t('denied')}</h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)] max-w-md">{t('deniedHint')}</p>
      </div>
    );
  }

  return <>{children}</>;
}
