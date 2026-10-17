'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { chooseMarketingConsent, marketingConsent } from '../lib/marketingConsent';
import { usePathname } from 'next/navigation';

/**
 * One stored choice controls all advertising and analytics SDKs.
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith('/admin') || marketingConsent()) return;
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, [pathname]);

  const choose = (granted: boolean) => {
    chooseMarketingConsent(granted);
    setVisible(false);
  };

  if (!visible || pathname.startsWith('/admin')) return null;

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
