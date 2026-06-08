'use client';

import { RedirectPage } from '@/components/layout/redirect-page';

/** Media production is managed per client — redirect legacy /media URL. */
export default function MediaRedirectPage() {
  return <RedirectPage to="/clients" />;
}
