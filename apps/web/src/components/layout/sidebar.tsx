'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';
import { Settings, LogOut, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Logo } from '@/components/brand/logo';
import { HexPattern } from '@/components/brand/hex-pattern';
import { NAV_ITEMS } from '@/lib/nav-config';
import { canAccessModule, isSuperAdmin } from '@/lib/permissions';
import { useSidebar } from './sidebar-context';

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const tl = useTranslations('layout');
  const { user, logout } = useAuth();
  const { open, close } = useSidebar();

  const visibleNav = NAV_ITEMS.filter((item) =>
    user && (isSuperAdmin(user) || canAccessModule(user, item.module)),
  ).map((item) => {
    if (item.key === 'models' && user?.role === 'model' && user.modelProfile?.id) {
      return { ...item, href: `/models/${user.modelProfile.id}` };
    }
    return item;
  });

  const navLink = (href: string, active: boolean, children: React.ReactNode) => (
    <Link
      href={href}
      onClick={close}
      className={clsx(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200',
        active
          ? 'bg-white/15 text-white shadow-sm border border-white/10'
          : 'text-white/65 hover:bg-white/10 hover:text-white',
      )}
    >
      {children}
    </Link>
  );

  return (
    <>
      {/* Mobile overlay */}
      <button
        type="button"
        aria-label="Close menu"
        className={clsx(
          'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={close}
      />

      <aside
        className={clsx(
          'fixed inset-y-0 start-0 z-50 flex w-[min(100vw-3rem,17rem)] sm:w-64 flex-col bg-vega-hero text-white shadow-xl transition-transform duration-300 ease-out lg:translate-x-0',
          'lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full',
        )}
        aria-hidden={!open}
      >
        <HexPattern />
        <div className="relative z-10 flex items-center justify-between border-b border-white/10 px-4 py-4">
          <Logo size="md" onDark />
          <button
            type="button"
            onClick={close}
            className="rounded-lg p-2 text-white/80 hover:bg-white/10 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative z-10 px-4 py-3">
          <div className="rounded-lg bg-white/10 px-3 py-2 backdrop-blur-sm">
            <p className="text-xs text-white/50 uppercase tracking-wider">{tl('signedInAs')}</p>
            <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-[11px] text-vega-cyan truncate">{user?.roleName}</p>
          </div>
        </div>

        <nav className="relative z-10 flex-1 overflow-y-auto px-3 py-2 space-y-0.5 overscroll-contain">
          {visibleNav.map(({ href, icon: Icon, key }) => {
            const active = pathname.startsWith(href);
            return (
              <div key={href}>
                {navLink(
                  href,
                  active,
                  <>
                    <Icon className={clsx('h-5 w-5 flex-shrink-0', active && 'text-vega-cyan')} />
                    {t(key)}
                    {active && (
                      <span className="ms-auto h-1.5 w-1.5 rounded-full bg-vega-cyan shadow-[0_0_8px_#00AEEF]" />
                    )}
                  </>,
                )}
              </div>
            );
          })}
        </nav>

        <div className="relative z-10 border-t border-white/10 p-3 space-y-0.5">
          <Link
            href="/settings"
            onClick={close}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/65 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Settings className="h-5 w-5" />
            {t('settings')}
          </Link>
          <button
            onClick={() => {
              close();
              logout();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-vega-red hover:bg-vega-red/15 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            {t('logout')}
          </button>
        </div>

        <div className="relative z-10 h-1 w-full" style={{ background: 'var(--vega-gradient-accent)' }} />
      </aside>
    </>
  );
}
