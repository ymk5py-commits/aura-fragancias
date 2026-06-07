import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
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

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(
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
    return unsub;
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, prices: buildPrices(settings), loading }}>
      {children}
    </SettingsContext.Provider>
  );
};
