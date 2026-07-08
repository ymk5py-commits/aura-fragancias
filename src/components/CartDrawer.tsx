'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, Plus, Minus, Trash2, ShoppingBag, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import smartImageLoader from '../lib/imageLoader';

const FREE_SHIPPING = 300000;

const CartDrawer: React.FC = () => {
  const { cart, isDrawerOpen, closeDrawer, updateQuantity, removeFromCart, goToCheckout } = useCart();

  useEffect(() => {
    document.body.style.overflow = isDrawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isDrawerOpen]);

  const subtotal = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const remaining = Math.max(0, FREE_SHIPPING - subtotal);
  const pct = Math.min(100, (subtotal / FREE_SHIPPING) * 100);

  return (
    <>
      {/* Scrim */}
      <div
        className={`fixed inset-0 z-[190] bg-aura-ink/70 backdrop-blur-sm transition-opacity duration-300 ${
          isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeDrawer}
        aria-hidden={!isDrawerOpen}
      />

      {/* Panel */}
      <aside
        className={`fixed top-0 right-0 z-[195] h-full w-full max-w-md bg-white flex flex-col shadow-2xl transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-label="Tu carrito"
        aria-modal={isDrawerOpen}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-aura-ink text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <ShoppingBag size={17} className="text-aura-gold" />
            <h2 className="text-[11px] font-bold tracking-[0.3em] uppercase">Tu Carrito</h2>
          </div>
          <button onClick={closeDrawer} aria-label="Cerrar carrito" className="p-1.5 text-white/60 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center gap-5 px-8 text-center">
            <div className="w-16 h-16 rounded-full border border-zinc-200 flex items-center justify-center">
              <ShoppingBag size={24} className="text-zinc-300" />
            </div>
            <p className="text-zinc-500 text-sm">Todavía no agregaste ninguna fragancia.</p>
            <Link href="/hombres" onClick={closeDrawer} className="bg-aura-ink text-white px-8 py-3.5 text-[10px] font-bold tracking-[0.25em] uppercase hover:bg-aura-gold transition-colors">
              Ver Catálogo
            </Link>
          </div>
        ) : (
          <>
            {/* Free shipping progress */}
            <div className="px-6 py-4 bg-aura-ivory border-b border-zinc-100 shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <Truck size={13} className="text-aura-gold-deep" />
                <p className="text-[11px] text-zinc-600 font-medium">
                  {remaining > 0 ? (
                    <>Te faltan <span className="font-bold text-aura-ink">Gs. {remaining.toLocaleString('es-PY')}</span> para el envío gratis</>
                  ) : (
                    <span className="font-bold text-aura-gold-deep">¡Tenés envío gratis! 🎉</span>
                  )}
                </p>
              </div>
              <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                <div className="h-full bg-aura-gold rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>

            {/* Items */}
            <div className="flex-grow overflow-y-auto px-6 py-5 space-y-5">
              {cart.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="relative w-20 h-24 shrink-0 bg-aura-ivory border border-zinc-100 overflow-hidden">
                    {item.perfume.imageUrl && (
                      <Image src={item.perfume.imageUrl} alt={item.perfume.name} fill sizes="80px" loader={smartImageLoader} className="object-cover" />
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    <span className="text-[8px] font-bold text-aura-gold-deep uppercase tracking-[0.2em] block">
                      Inspiración {item.perfume.inspiration}
                    </span>
                    <h3 className="text-[12px] font-semibold text-aura-ink uppercase tracking-[0.05em] leading-tight line-clamp-2 mb-1">
                      {item.perfume.name}
                    </h3>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-widest">{item.size}</span>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-zinc-200">
                        <button onClick={() => updateQuantity(item.id, -1)} aria-label="Restar" className="p-1.5 text-zinc-500 hover:bg-zinc-50"><Minus size={12} /></button>
                        <span className="w-8 text-center text-[11px] font-bold text-aura-ink tabular">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} aria-label="Sumar" className="p-1.5 text-zinc-500 hover:bg-zinc-50"><Plus size={12} /></button>
                      </div>
                      <span className="text-[12px] font-semibold text-aura-ink tabular">Gs. {(item.price * item.quantity).toLocaleString('es-PY')}</span>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} aria-label="Quitar" className="shrink-0 self-start p-1 text-zinc-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-100 px-6 py-5 shrink-0 bg-white">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Subtotal</span>
                <span className="text-lg font-luxury font-semibold text-aura-ink tabular">Gs. {subtotal.toLocaleString('es-PY')}</span>
              </div>
              <button
                onClick={goToCheckout}
                className="w-full bg-aura-ink text-white py-4 text-[11px] font-bold tracking-[0.25em] uppercase hover:bg-aura-gold transition-colors duration-300 active:scale-[0.98]"
              >
                Finalizar Pedido
              </button>
              <button onClick={closeDrawer} className="w-full mt-2 py-3 text-[10px] font-semibold text-zinc-400 hover:text-zinc-700 uppercase tracking-[0.2em] transition-colors">
                Seguir comprando
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
};

export default CartDrawer;
