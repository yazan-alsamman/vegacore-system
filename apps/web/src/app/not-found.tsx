import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function NotFound() {
  const t = await getTranslations('notFound');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-surface-secondary)] px-4">
      <p className="text-6xl font-bold text-vega-navy">404</p>
      <h1 className="mt-4 text-xl font-semibold">{t('title')}</h1>
      <p className="mt-2 text-[var(--color-text-secondary)]">{t('description')}</p>
      <Link
        href="/login"
        className="mt-8 rounded-lg px-6 py-3 text-sm font-semibold text-white"
        style={{ background: 'var(--vega-gradient)' }}
      >
        {t('goLogin')}
      </Link>
    </div>
  );
}
