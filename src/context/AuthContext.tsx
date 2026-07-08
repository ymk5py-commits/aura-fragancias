'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { User } from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from '../lib/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// Solo /admin usa autenticación: el SDK de Firebase Auth se carga lazy y
// únicamente en esa ruta — la tienda pública no descarga nada de Firebase.
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isAdmin);

  useEffect(() => {
    if (!isAdmin || !isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let unsub: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const [auth, { onAuthStateChanged }] = await Promise.all([
        getFirebaseAuth(),
        import('firebase/auth'),
      ]);
      if (cancelled) return;
      unsub = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setLoading(false);
      });
    })().catch(() => setLoading(false));
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [isAdmin]);

  const login = async (email: string, password: string) => {
    if (!isFirebaseConfigured) throw new Error('Firebase no está configurado.');
    const [auth, { signInWithEmailAndPassword }] = await Promise.all([
      getFirebaseAuth(),
      import('firebase/auth'),
    ]);
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    if (!isFirebaseConfigured) return;
    const [auth, { signOut }] = await Promise.all([getFirebaseAuth(), import('firebase/auth')]);
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
