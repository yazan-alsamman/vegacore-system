'use client';

import { useTheme } from 'next-themes';
import { useLocale, useTranslations } from 'next-intl';
import { Menu, Moon, Sun, Globe } from 'lucide-react';
import { NotificationCenter } from '@/components/notifications/notification-center';
import { useAuth } from '@/lib/auth-context';
import { useSidebar } from './sidebar-context';

export function Header({ title }: { title: string }) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const locale = useLocale();
  const t = useTranslations('layout');
  const { toggle } = useSidebar();

  const toggleLocale = () => {
    const next = locale === 'ar' ? 'en' : 'ar';
    document.cookie = `locale=${next};path=/;max-age=31536000`;
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-30 flex min-h-14 sm:min-h-16 items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-md px-3 sm:px-5 lg:px-6 safe-top">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={toggle}
          className="rounded-lg p-2.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-vega-navy transition-colors lg:hidden shrink-0"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold text-[var(--color-text)] sm:text-lg lg:text-xl">{title}</h1>
          <div className="mt-0.5 h-0.5 w-10 sm:w-12 rounded-full bg-vega-gradient" />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <button
          onClick={toggleLocale}
          className="rounded-lg p-2 sm:p-2.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-vega-navy transition-colors"
          title={t('toggleLanguage')}
        >
          <Globe className="h-5 w-5" />
        </button>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded-lg p-2 sm:p-2.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-vega-navy transition-colors"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <NotificationCenter />
        <div className="ms-1 sm:ms-3 flex items-center gap-2 sm:gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-2 py-1 sm:px-3 sm:py-1.5">
          <div
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-xs sm:text-sm font-bold text-white shrink-0"
            style={{ background: 'var(--vega-gradient)' }}
          >
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="hidden md:block pe-1 min-w-0">
            <p className="text-sm font-semibold leading-tight truncate max-w-[120px] lg:max-w-none">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[11px] text-vega-navy dark:text-vega-cyan font-medium truncate">{user?.roleName}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
