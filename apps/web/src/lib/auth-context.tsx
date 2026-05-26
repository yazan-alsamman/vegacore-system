'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, clearTokens, getStoredToken, storeTokens } from './api';
import { getHomeForRole } from './nav-config';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roleName: string;
  permissions: string[];
  locale: string;
  modelProfile?: { id: string } | null;
  employeeProfile?: { id: string } | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const t = getStoredToken();
    if (t) {
      setToken(t);
      authApi.me(t)
        .then((data) => setUser(data as unknown as User))
        .catch(() => { clearTokens(); setToken(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    storeTokens(res.accessToken, res.refreshToken);
    setToken(res.accessToken);
    const me = (await authApi.me(res.accessToken)) as unknown as User;
    setUser(me);
    const home =
      me.role === 'model' && me.modelProfile?.id
        ? `/models/${me.modelProfile.id}`
        : getHomeForRole(me.role);
    router.push(home);
  };

  const logout = () => {
    clearTokens();
    setUser(null);
    setToken(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
