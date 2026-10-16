import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setAuthLostHandler } from './api';
import { clearTokens, getTokens, setTokens } from './storage';

export type User = { id: string; name: string; phone: string; role: 'customer' | 'seller' | 'admin'; status: string };

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (name: string, phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAuthLostHandler(() => setUser(null));
    (async () => {
      try {
        if (await getTokens()) {
          const { data } = await api.get<User>('/users/me');
          setUser(data);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
    return () => setAuthLostHandler(null);
  }, []);

  const finish = useCallback(async (data: { user: User; accessToken: string; refreshToken: string }) => {
    await setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    setUser(data.user);
  }, []);

 const login = useCallback(async (phone: string, password: string) => {
  const res = await api.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/login', { phone, password });
  await finish(res.data);
}, [finish]);

 const register = useCallback(async (name: string, phone: string, password: string) => {
  const res = await api.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/register', { name, phone, password });
  await finish(res.data);
}, [finish]);

  const logout = useCallback(async () => {
    try {
      const t = await getTokens();
      if (t) await api.post('/auth/logout', { refreshToken: t.refreshToken });
    } catch {}
    await clearTokens();
    setUser(null);
  }, []);

   const value = useMemo<AuthCtx>(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );
  return <Ctx value={value}>{children}</Ctx>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside AuthProvider');
  return c;
}