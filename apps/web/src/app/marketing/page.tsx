'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Marketing is per-client — redirect legacy /marketing URL to clients list. */
export default function MarketingRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/clients');
  }, [router]);

  return (
    <div className="flex justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-vega-cyan border-t-transparent" />
    </div>
  );
}
