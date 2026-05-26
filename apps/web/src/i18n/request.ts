import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { routing } from './routing';
import en from '../../messages/en.json';
import ar from '../../messages/ar.json';

const MESSAGES = { en, ar } as const;

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as 'en' | 'ar')) {
    const store = await cookies();
    locale = (store.get('locale')?.value as 'en' | 'ar') || routing.defaultLocale;
  }

  const resolved = (locale === 'ar' ? 'ar' : 'en') as keyof typeof MESSAGES;

  return {
    locale: resolved,
    messages: MESSAGES[resolved],
  };
});
