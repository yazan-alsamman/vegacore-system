const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface FetchOptions extends RequestInit {
  token?: string;
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
}

export function storeTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth:token-refreshed', { detail: accessToken }));
  }
}

export function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth:session-expired'));
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { accessToken: string; refreshToken: string };
    storeTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

function formatApiError(status: number, body: { message?: string | string[] }) {
  const msg = body.message;
  const text = Array.isArray(msg) ? msg.join(', ') : msg;
  if (text) return text;
  if (status === 401) return 'Session expired — please sign in again';
  if (status === 403) return 'You do not have permission for this action';
  return `HTTP ${status}`;
}

export async function api<T>(endpoint: string, options: FetchOptions = {}, isRetry = false): Promise<T> {
  const { token, ...fetchOptions } = options;
  const authToken = token || getStoredToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (authToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));

    if (res.status === 401 && !isRetry && endpoint !== '/auth/refresh') {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return api<T>(endpoint, { ...options, token: newToken }, true);
      }
      clearTokens();
    }

    throw new Error(formatApiError(res.status, error));
  }

  return res.json();
}

export const authApi = {
  login: (email: string, password: string) =>
    api<{ accessToken: string; refreshToken: string; user: Record<string, unknown> }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: (token: string) => api<Record<string, unknown>>('/auth/me', { token }),
  refresh: (refreshToken: string) =>
    api<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),
};
