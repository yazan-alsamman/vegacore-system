'use client';

import { useCallback, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import clsx from 'clsx';
import { ArrowRight, Lock, Mail, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { brand } from '@/lib/brand';
import { LoginBackground } from '@/components/brand/login-background';
import { LoginIntro } from '@/components/brand/login-intro';

const MODULES = [
  { key: 'CRM', color: '#00AEEF' },
  { key: 'Projects', color: '#2E3192' },
  { key: 'Marketing', color: '#EC008C' },
  { key: 'Finance', color: '#00A651' },
  { key: 'HR', color: '#F7B040' },
  { key: 'AI', color: '#662D91' },
];

export default function LoginPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const { login } = useAuth();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleIntroComplete = useCallback(() => setReady(true), []);

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

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#0b0e18] text-white">
      {!ready && <LoginIntro onComplete={handleIntroComplete} />}

      <LoginBackground />

      <div
        className={clsx(
          'relative z-10 flex min-h-[100dvh] flex-col lg:flex-row transition-opacity duration-700',
          locale === 'ar' && 'lg:flex-row-reverse',
          ready ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      >
        {/* Brand panel — desktop */}
        <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] flex-col justify-center px-12 xl:px-20 py-16">
          <div className="login-stagger-1 max-w-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={brand.logoSidebar}
              alt="VegaCore"
              width={220}
              className="mb-8 h-auto w-[200px] opacity-95 drop-shadow-[0_0_40px_rgba(0,174,239,0.35)]"
            />
            <h2 className="font-[family-name:var(--font-display)] text-4xl xl:text-5xl font-medium leading-[1.12] tracking-tight text-white">
              Enterprise
              <span className="block text-gradient-vega">Operating System</span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-white/60">{t('tagline')}</p>
          </div>

          <div className="login-stagger-2 mt-12 flex flex-wrap gap-2">
            {MODULES.map((m, i) => (
              <span
                key={m.key}
                className="login-module-pill rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold tracking-wide backdrop-blur-md"
                style={{
                  animationDelay: `${i * 80}ms`,
                  borderColor: `${m.color}33`,
                  boxShadow: `0 0 20px ${m.color}22`,
                }}
              >
                <span className="me-1.5 inline-block h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
                {m.key}
              </span>
            ))}
          </div>

          <div className="login-stagger-3 mt-14 flex items-center gap-4 text-white/40 text-xs">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <Sparkles className="h-4 w-4 text-vega-cyan" />
            <span className="tracking-widest uppercase">VegaCore OS</span>
            <Sparkles className="h-4 w-4 text-vega-cyan" />
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
        </div>

        {/* Login card */}
        <div className="flex flex-1 items-center justify-center p-5 sm:p-8 lg:p-12">
          <div className="login-stagger-2 w-full max-w-md">
            {/* Mobile logo */}
            <div className="login-stagger-1 mb-8 flex justify-center lg:hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={brand.logoSidebar}
                alt="VegaCore"
                width={180}
                className="h-auto w-[160px] opacity-95"
              />
            </div>

            <div className="login-card-shine rounded-2xl border border-white/10 bg-white/[0.07] p-6 sm:p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
              <div className="login-stagger-3 mb-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-vega-cyan">
                  VegaCore OS
                </p>
                <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                  {t('welcome')}
                </h1>
                <p className="mt-2 text-sm text-white/55">{t('loginSubtitle')}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="login-stagger-4 rounded-xl border border-vega-red/30 bg-vega-red/10 px-4 py-3 text-sm text-red-200 animate-[login-fade-up_0.4s_ease-out]">
                    {error}
                  </div>
                )}

                <div className="login-stagger-4 space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                    <Mail className="h-3.5 w-3.5 text-vega-cyan" />
                    {t('email')}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white placeholder:text-white/30 outline-none transition-all focus:border-vega-cyan/60 focus:bg-white/10 focus:ring-2 focus:ring-vega-cyan/25"
                    placeholder="name@company.com"
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="login-stagger-5 space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                    <Lock className="h-3.5 w-3.5 text-vega-cyan" />
                    {t('password')}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white placeholder:text-white/30 outline-none transition-all focus:border-vega-cyan/60 focus:bg-white/10 focus:ring-2 focus:ring-vega-cyan/25"
                    required
                    autoComplete="current-password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="login-stagger-5 group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-vega-cyan/25 active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
                  style={{ background: brand.gradient.primary }}
                >
                  <span className="relative z-10">
                    {loading ? t('signingIn') : t('login')}
                  </span>
                  {!loading && (
                    <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                  )}
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                </button>
              </form>

              <p className="login-stagger-5 mt-6 text-center text-[11px] text-white/35">{t('demoHint')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
