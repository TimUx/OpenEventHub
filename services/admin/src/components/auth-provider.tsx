'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { adminFetch, login as apiLogin, TOKEN_KEY, type AdminUser } from '../lib/api';

type AuthContextValue = {
  readonly token: string | null;
  readonly user: AdminUser | null;
  readonly ready: boolean;
  readonly login: (email: string, password: string) => Promise<void>;
  readonly logout: () => void;
  readonly applySession: (accessToken: string, user: AdminUser) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [ready, setReady] = useState(false);

  const applySession = useCallback((accessToken: string, nextUser: AdminUser) => {
    window.localStorage.setItem(TOKEN_KEY, accessToken);
    setToken(accessToken);
    setUser(nextUser);
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setReady(true);
      return;
    }
    setToken(stored);
    let cancelled = false;
    void (async () => {
      try {
        const me = await adminFetch<AdminUser>('/api/v1/admin/me', stored);
        if (!cancelled) {
          setUser({ id: me.id, email: me.email, role: me.role });
        }
      } catch {
        if (!cancelled) {
          window.localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await apiLogin(email, password);
      applySession(result.accessToken, result.user);
    },
    [applySession],
  );

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ token, user, ready, login, logout, applySession }),
    [token, user, ready, login, logout, applySession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
