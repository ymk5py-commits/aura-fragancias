'use client';

import React, { useEffect, useState } from 'react';
import { ShoppingBag } from 'lucide-react';

/* ============================================================
   Barra de compra fija (solo móvil): aparece cuando el botón
   principal de la ficha sale de la vista al hacer scroll.
   ============================================================ */

const StickyBuyBar: React.FC<{
  anchor: React.RefObject<HTMLElement | null>;
  price: number;
  hint: string;
  onClick: () => void;
}> = ({ anchor, price, hint, onClick }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = anchor.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [anchor]);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-[90] lg:hidden border-t border-zinc-200 bg-white/95 backdrop-blur px-4 py-3 transition-transform duration-300 ${show ? 'translate-y-0' : 'translate-y-full'}`}
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      aria-hidden={!show}
      inert={!show}
    >
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-zinc-900 leading-none tabular">Gs. {price.toLocaleString('es-PY')}</p>
          <p className="mt-1 truncate text-[11px] text-zinc-500">{hint}</p>
        </div>
        <button type="button" onClick={onClick}
          className="shrink-0 bg-aura-ink text-white px-6 py-3.5 rounded-sm text-[10px] font-bold tracking-[0.2em] uppercase flex items-center gap-2 hover:bg-aura-gold transition-colors active:scale-[0.98]">
          <ShoppingBag size={15} /> Agregar
        </button>
      </div>
    </div>
  );
};

export default StickyBuyBar;
