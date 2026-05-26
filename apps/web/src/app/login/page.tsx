'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import clsx from 'clsx';
import { useAuth } from '@/lib/auth-context';
import { BrandLogoStack } from '@/components/brand/brand-logo-stack';
import { HexOutlinePattern } from '@/components/brand/hex-outline-pattern';
import { DashboardMockups } from '@/components/brand/dashboard-mockups';

export default function LoginPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@vegasystem.local');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const modules = ['CRM', 'Projects', 'Marketing', 'Media', 'Finance', 'HR', 'AI'];

  return (
    <div className={clsx('flex min-h-screen bg-white', locale === 'ar' && 'flex-row-reverse')}>
      {/* Login — left */}
      <div className="flex w-full lg:w-[42%] flex-col justify-center px-8 py-12 sm:px-14 lg:px-16">
        <div className="lg:hidden mb-10">
          <BrandLogoStack size="md" align="start" />
        </div>

        <div className="w-full max-w-sm">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[#231F20] tracking-tight">
            {t('welcome')}
          </h1>
          <p className="mt-2 text-sm text-[#5c6478]">{t('loginSubtitle')}</p>

          <form onSubmit={handleSubmit} className="mt-10 space-y-5">
            {error && (
              <div className="rounded-lg bg-vega-red/8 border border-vega-red/20 px-4 py-3 text-sm text-vega-red">
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#5c6478] mb-2">
                {t('email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-b border-[#dde2ef] bg-transparent px-0 py-2.5 text-sm text-[#231F20] placeholder:text-[#8e97b0] focus:outline-none focus:border-vega-navy transition-colors"
                placeholder="name@company.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#5c6478] mb-2">
                {t('password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-b border-[#dde2ef] bg-transparent px-0 py-2.5 text-sm text-[#231F20] focus:outline-none focus:border-vega-navy transition-colors"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-[#231F20] text-white py-3.5 text-sm font-semibold tracking-wide hover:bg-vega-navy transition-colors disabled:opacity-50"
            >
              {loading ? t('signingIn') : t('login')}
            </button>
          </form>

          <p className="mt-8 text-[11px] text-[#8e97b0]">{t('demoHint')}</p>
        </div>
      </div>

      {/* Brand panel — right (matches visual identity) */}
      <div className="relative hidden lg:flex lg:w-[58%] flex-col justify-between bg-white px-14 py-12 overflow-hidden">
        <HexOutlinePattern className="absolute top-0 end-0 w-48 h-44 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-end text-end ms-auto max-w-xl w-full gap-10 pt-4">
          <DashboardMockups />

          <BrandLogoStack size="lg" align="end" />

          <div className="space-y-4">
            <h2 className="font-[family-name:var(--font-display)] text-4xl xl:text-[2.75rem] font-normal text-[#231F20] leading-[1.15] tracking-tight">
              Enterprise Operating System
            </h2>
            <p className="text-sm text-[#5c6478] leading-relaxed max-w-md ms-auto">
              {t('tagline')}
            </p>
            <p className="text-xs text-[#8e97b0] tracking-wide">
              {modules.join(' · ')}
            </p>
          </div>

          <div className="space-y-6 pt-4">
            <DashboardMockups />
            <BrandLogoStack size="md" align="end" />
          </div>
        </div>
      </div>
    </div>
  );
}
