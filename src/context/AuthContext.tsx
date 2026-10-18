'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  changePassword: async () => {},
});

export const useAuth = () => useContext(AuthContext);

/** Solo las cuentas con rol aura_role = admin (lo asigna el servidor) entran al panel. */
export const isAdminUser = (user: User | null | undefined) =>
  (user?.app_metadata as { aura_role?: string } | undefined)?.aura_role === 'admin';

// Solo /admin usa autenticación: el SDK de Supabase se carga lazy y únicamente en esa ruta —
// la tienda pública no descarga nada de este JS para mirar el catálogo.
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isAdmin);

  useEffect(() => {
    if (!isAdmin || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let unsub: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const sb = await getSupabase();
      if (cancelled) return;
      const { data } = sb.auth.onAuthStateChange((_event, session) => {
        setUser(isAdminUser(session?.user) ? session!.user : null);
        setLoading(false);
      });
      unsub = () => data.subscription.unsubscribe();
      const { data: current } = await sb.auth.getSession();
      if (!cancelled) {
        setUser(isAdminUser(current.session?.user) ? current.session!.user : null);
        setLoading(false);
      }
    })().catch(() => setLoading(false));
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [isAdmin]);

  const login = async (email: string, password: string) => {
    if (!isSupabaseConfigured) throw new Error('Supabase no está configurado.');
    const sb = await getSupabase();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw Object.assign(new Error(error.message), { code: error.code || error.name });
    if (!isAdminUser(data.user)) {
      await sb.auth.signOut();
      throw Object.assign(new Error('Esta cuenta no tiene acceso al panel.'), { code: 'not_admin' });
    }
  };

  const logout = async () => {
    if (!isSupabaseConfigured) return;
    const sb = await getSupabase();
    await sb.auth.signOut();
  };

  const changePassword = async (newPassword: string) => {
    if (!isSupabaseConfigured) throw new Error('Supabase no está configurado.');
    const sb = await getSupabase();
    const { error } = await sb.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
};
