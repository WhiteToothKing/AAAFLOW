import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { AuthContext, type AuthContextValue } from './auth-context';
import { authApi } from '../services/api';
import { getAccessToken } from '../services/authStorage';
import { isAuthDisabled } from '../utils/authMode';
import type { AuthUser } from '../types';

/** 全应用共享当前用户，避免 AppLayout / DesktopAppShell / 审计页各打一次 /auth/me */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!isAuthDisabled() && !getAccessToken()) {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }
      if (!cancelled) setLoading(true);
      try {
        const u = await authApi.me();
        if (!cancelled) setUser(u);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    const onAuthChanged = () => {
      void load();
    };
    window.addEventListener('aaaflow:auth-changed', onAuthChanged);
    return () => {
      cancelled = true;
      window.removeEventListener('aaaflow:auth-changed', onAuthChanged);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAdmin: user?.role === 'admin',
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
