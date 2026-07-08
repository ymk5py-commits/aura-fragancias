'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'aura_consent_v1';

function updateConsent(granted: boolean) {
  if (typeof window === 'undefined') return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gtag = (window as any).gtag;
  if (!gtag) return;
  const v = granted ? 'granted' : 'denied';
  gtag('consent', 'update', {
    ad_storage: v,
    ad_user_data: v,
    ad_personalization: v,
    analytics_storage: v,
  });
}

/**
 * Banner de consentimiento (Consent Mode v2). El default es DENIED (seteado en
 * el layout antes de cargar gtag.js) — requerido por la Ley 7593/2025 de PY y
 * por EU/UK. Al aceptar, se actualiza el consentimiento a granted.
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'granted') {
      updateConsent(true);
      return;
    }
    if (saved === 'denied') return;
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const choose = (granted: boolean) => {
    localStorage.setItem(STORAGE_KEY, granted ? 'granted' : 'denied');
    updateConsent(granted);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[400] p-4 sm:p-5 animate-slide-up">
      <div className="mx-auto max-w-3xl bg-aura-charcoal border border-white/10 shadow-[0_-10px_40px_-20px_rgba(0,0,0,0.8)] p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-white/70 text-[13px] leading-relaxed font-light flex-grow">
          Usamos cookies para mejorar tu experiencia y medir nuestras campañas. Podés aceptarlas o seguir solo con las esenciales.{' '}
          <Link href="/terminos-y-condiciones" className="text-aura-gold hover:underline">Más información</Link>.
        </p>
        <div className="flex gap-3 shrink-0 w-full sm:w-auto">
          <button
            onClick={() => choose(false)}
            className="flex-1 sm:flex-none px-5 py-2.5 text-[10px] font-bold tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors"
          >
            Solo esenciales
          </button>
          <button
            onClick={() => choose(true)}
            className="flex-1 sm:flex-none px-6 py-2.5 bg-aura-gold text-aura-ink text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-white transition-colors"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
