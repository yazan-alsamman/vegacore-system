'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function RedirectPage({ to }: { to: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(to);
  }, [router, to]);

  return (
    <div className="flex justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-vega-cyan border-t-transparent" />
    </div>
  );
}
