'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getFirebaseDb, isFirebaseConfigured } from '../lib/firebase';
import { DEFAULT_SETTINGS } from '../constants';
import { SiteSettings } from '../types';

export interface PriceTier {
  size: string;
  price: number;
  label: string;
  desc: string;
  favorite?: boolean;
  bestValue?: boolean;
}

interface SettingsContextValue {
  settings: SiteSettings;
  /** Precios derivados (forma compatible con el catálogo). */
  prices: PriceTier[];
  loading: boolean;
}

const buildPrices = (s: SiteSettings): PriceTier[] => [
  { size: '10 ML', price: s.price10, label: `${s.price10.toLocaleString('es-PY')} Gs.`, desc: 'Ideal para probar o llevar de viaje.' },
  { size: '30 ML', price: s.price30, label: `${s.price30.toLocaleString('es-PY')} Gs.`, desc: 'Tamaño estándar.', favorite: true },
  { size: '50 ML', price: s.price50, label: `${s.price50.toLocaleString('es-PY')} Gs.`, desc: 'Mejor valor.', bestValue: true },
];

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  prices: buildPrices(DEFAULT_SETTINGS),
  loading: false,
});

export const useSettings = () => useContext(SettingsContext);

// La tienda usa la configuración que llega por SSR/ISR (initial); la
// suscripción en vivo a Firestore solo corre en /admin.
export const SettingsProvider: React.FC<{ children: React.ReactNode; initial?: SiteSettings }> = ({
  children,
  initial,
}) => {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;
  const [settings, setSettings] = useState<SiteSettings>(initial || DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin || !isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    let unsub: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const [db, { doc, onSnapshot }] = await Promise.all([
        getFirebaseDb(),
        import('firebase/firestore'),
      ]);
      if (cancelled) return;
      unsub = onSnapshot(
        doc(db, 'settings', 'site'),
        (snap) => {
          if (snap.exists()) {
            // Merge: defaults + lo guardado (campos faltantes usan el default).
            setSettings({ ...DEFAULT_SETTINGS, ...(snap.data() as Partial<SiteSettings>) });
          } else {
            setSettings(DEFAULT_SETTINGS);
          }
          setLoading(false);
        },
        (err) => {
          console.warn('[Äura] Error leyendo settings, usando valores por defecto:', err);
          setSettings(DEFAULT_SETTINGS);
          setLoading(false);
        }
      );
    })().catch(() => setLoading(false));
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [isAdmin]);

  return (
    <SettingsContext.Provider value={{ settings, prices: buildPrices(settings), loading }}>
      {children}
    </SettingsContext.Provider>
  );
};
