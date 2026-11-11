'use client';

// Admin session + UI theme for client components. Dark mode is admin-only (spec §11.2), so the
// `dark` class is put on <html> while the admin is mounted and removed when leaving it.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { can as canRole, type Permission, type Role } from '@/lib/auth/roles';

export interface AdminSession {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}

type Theme = 'light' | 'dark';

interface AdminContextValue {
  admin: AdminSession;
  can: (p: Permission) => boolean;
  theme: Theme;
  toggleTheme: () => void;
}

const Ctx = createContext<AdminContextValue | null>(null);
const THEME_KEY = 'ld-admin-theme';

export function AdminProvider({ admin, children }: { admin: AdminSession; children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    let initial: Theme = 'light';
    try {
      const saved = window.localStorage.getItem(THEME_KEY);
      initial =
        saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)
          ? 'dark'
          : 'light';
    } catch {
      // ignore
    }
    setTheme(initial);
    return () => document.documentElement.classList.remove('dark');
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      try {
        window.localStorage.setItem(THEME_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const can = useCallback((p: Permission) => canRole(admin.role, p), [admin.role]);

  return <Ctx.Provider value={{ admin, can, theme, toggleTheme }}>{children}</Ctx.Provider>;
}

export function useAdmin() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAdmin must be used inside <AdminProvider>');
  return ctx;
}
