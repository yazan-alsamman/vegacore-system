'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import clsx from 'clsx';
import { ArrowRight, Lock, Mail, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { brand } from '@/lib/brand';
import { LoginIntro } from '@/components/brand/login-intro';
import './login.css';

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
  const [mounted, setMounted] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onIntroDone = useCallback(() => setShowLogin(true), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* Fallback: never block login if intro fails */
  useEffect(() => {
    if (!mounted) return;
    const fallback = window.setTimeout(() => setShowLogin(true), 5500);
    return () => window.clearTimeout(fallback);
  }, [mounted]);

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

  if (!mounted) {
    return (
      <div className="login-page flex min-h-[100dvh] items-center justify-center">
        <div className="login-mesh absolute inset-0" />
        <div
          style={{
            width: 48,
            height: 48,
            border: '3px solid rgba(0,174,239,0.25)',
            borderTopColor: '#00AEEF',
            borderRadius: '50%',
            animation: 'login-spin 0.8s linear infinite',
          }}
        />
      </div>
    );
  }

  return (
    <div className="login-page">
      {!showLogin && <LoginIntro onComplete={onIntroDone} />}

      <div className="login-mesh absolute inset-0 pointer-events-none" />
      <div className="login-orb login-orb-1 absolute pointer-events-none" />
      <div className="login-orb login-orb-2 absolute pointer-events-none" />
      <div className="login-orb login-orb-3 absolute pointer-events-none" />

      <div
        className={clsx(
          'login-main',
          showLogin ? 'is-visible' : 'is-waiting',
          locale === 'ar' ? 'login-rtl' : 'login-ltr',
        )}
      >
        {/* Brand — desktop */}
        <section className="hidden lg:flex lg:w-[52%] xl:w-[55%] flex-col justify-center px-12 xl:px-20 py-16">
          <div className="login-fade-up login-delay-1" style={{ maxWidth: 520 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={brand.logoSidebar}
              alt="VegaCore"
              width={220}
              style={{ width: 200, height: 'auto', marginBottom: 32, filter: 'drop-shadow(0 0 40px rgba(0,174,239,0.4))' }}
            />
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 500, lineHeight: 1.15, color: '#fff' }}>
              Enterprise
              <span className="login-gradient-text" style={{ display: 'block' }}>Operating System</span>
            </h2>
            <p style={{ marginTop: 20, fontSize: '1rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.6)' }}>{t('tagline')}</p>
          </div>

          <div className="login-fade-up login-delay-2" style={{ marginTop: 48, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {MODULES.map((m, i) => (
              <span
                key={m.key}
                className="login-module-pill"
                style={{ animationDelay: `${0.3 + i * 0.07}s`, borderColor: `${m.color}44`, boxShadow: `0 0 16px ${m.color}33` }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.color }} />
                {m.key}
              </span>
            ))}
          </div>

          <div className="login-fade-up login-delay-3" style={{ marginTop: 56, display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' }} />
            <Sparkles size={16} color="#00AEEF" />
            <span style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}>VegaCore OS</span>
            <Sparkles size={16} color="#00AEEF" />
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' }} />
          </div>
        </section>

        {/* Form */}
        <section className="flex flex-1 items-center justify-center p-5 sm:p-8 lg:p-12">
          <div className="w-full max-w-md">
            <div className="login-fade-up login-delay-1 mb-8 flex justify-center lg:hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={brand.logoSidebar} alt="VegaCore" width={160} style={{ width: 150, height: 'auto' }} />
            </div>

            <div className="login-card login-fade-up login-delay-2">
              <div className="login-fade-up login-delay-3" style={{ marginBottom: 28 }}>
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.2em', color: '#00AEEF', textTransform: 'uppercase' }}>
                  VegaCore OS
                </p>
                <h1 style={{ marginTop: 8, fontSize: 'clamp(1.5rem, 4vw, 1.875rem)', fontWeight: 600, color: '#fff' }}>
                  {t('welcome')}
                </h1>
                <p style={{ marginTop: 8, fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>{t('loginSubtitle')}</p>
              </div>

              <form onSubmit={handleSubmit}>
                {error && (
                  <div
                    className="login-fade-up"
                    style={{
                      marginBottom: 16,
                      padding: '12px 16px',
                      borderRadius: 12,
                      border: '1px solid rgba(237,28,36,0.35)',
                      background: 'rgba(237,28,36,0.12)',
                      color: '#fecaca',
                      fontSize: 14,
                    }}
                  >
                    {error}
                  </div>
                )}

                <div className="login-fade-up login-delay-4" style={{ marginBottom: 18 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                    <Mail size={14} color="#00AEEF" />
                    {t('email')}
                  </label>
                  <input
                    type="email"
                    className="login-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="login-fade-up login-delay-5" style={{ marginBottom: 22 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
                    <Lock size={14} color="#00AEEF" />
                    {t('password')}
                  </label>
                  <input
                    type="password"
                    className="login-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>

                <button type="submit" className="login-btn login-fade-up login-delay-5" disabled={loading}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {loading ? t('signingIn') : t('login')}
                    {!loading && <ArrowRight size={16} style={{ transform: locale === 'ar' ? 'scaleX(-1)' : undefined }} />}
                  </span>
                </button>
              </form>

              <p style={{ marginTop: 22, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{t('demoHint')}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
