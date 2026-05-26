'use client';

import { useTheme } from 'next-themes';
import { useLocale, useTranslations } from 'next-intl';
import { Moon, Sun, Globe } from 'lucide-react';
import { NotificationCenter } from '@/components/notifications/notification-center';
import { useAuth } from '@/lib/auth-context';

export function Header({ title }: { title: string }) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const locale = useLocale();
  const t = useTranslations('layout');

  const toggleLocale = () => {
    const next = locale === 'ar' ? 'en' : 'ar';
    document.cookie = `locale=${next};path=/;max-age=31536000`;
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-md px-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text)]">{title}</h1>
        <div className="mt-0.5 h-0.5 w-12 rounded-full bg-vega-gradient" />
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={toggleLocale}
          className="rounded-lg p-2.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-vega-navy transition-colors"
          title={t('toggleLanguage')}
        >
          <Globe className="h-5 w-5" />
        </button>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded-lg p-2.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-vega-navy transition-colors"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <NotificationCenter />
        <div className="ms-3 flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-1.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ background: 'var(--vega-gradient)' }}
          >
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="hidden sm:block pe-1">
            <p className="text-sm font-semibold leading-tight">{user?.firstName} {user?.lastName}</p>
            <p className="text-[11px] text-vega-navy dark:text-vega-cyan font-medium">{user?.roleName}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
