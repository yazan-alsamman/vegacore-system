'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

export function useApiData<T>(endpoint: string) {
  const { token } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    if (!token) return Promise.resolve();
    setLoading(true);
    setError(null);
    return api<T>(endpoint, { token })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [endpoint, token]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch, token };
}
