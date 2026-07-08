'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSettings } from '../context/SettingsContext';
import { useCart } from '../context/CartContext';
import smartImageLoader from '../lib/imageLoader';
import { ShoppingBag, Truck, Minus, Plus, ChevronRight } from 'lucide-react';
import { Perfume } from '../types';

const IntensityBar = ({ level }: { level: number }) => (
  <div className="flex gap-1.5 justify-start">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className={`h-[3px] w-6 rounded-full ${i <= level ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
    ))}
  </div>
);

interface ProductViewProps {
  perfume: Perfume;
  description?: string;
  related?: Perfume[];
  breadcrumb?: { genderLabel: string; genderPath: string };
}

const ProductView: React.FC<ProductViewProps> = ({ perfume, description, related = [], breadcrumb }) => {
  const { prices: PRICES } = useSettings();
  const { addToCart } = useCart();
  const [selectedSize, setSelectedSize] = useState<string>(PRICES[1].size);
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);

  return (
    <main className="flex-grow pt-28 pb-16 min-h-screen bg-white">
      <div className="container mx-auto px-4 sm:px-6">
        <nav aria-label="Ruta de navegación" className="flex items-center flex-wrap gap-1.5 mb-8 text-[10px] font-bold tracking-[0.15em] uppercase text-zinc-400">
          <Link href="/" className="hover:text-zinc-900 transition-colors">Inicio</Link>
          <ChevronRight size={12} className="shrink-0" />
          {breadcrumb && (
            <>
              <Link href={breadcrumb.genderPath} className="hover:text-zinc-900 transition-colors">{breadcrumb.genderLabel}</Link>
              <ChevronRight size={12} className="shrink-0" />
            </>
          )}
          <span className="text-zinc-700 normal-case tracking-normal font-semibold">{perfume.name}</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
          <div className="w-full lg:w-1/2">
            <div className="relative aspect-[4/5] w-full max-w-[500px] mx-auto bg-white border border-zinc-100 shadow-2xl flex flex-col overflow-hidden rounded-sm">
              {perfume.imageUrl ? (
                <Image
                  src={perfume.imageUrl}
                  alt={`${perfume.name} — inspiración ${perfume.inspiration}`}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 500px"
                  loader={smartImageLoader}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col p-10 sm:p-16 justify-center items-center text-center">
                  <h3 className="text-7xl sm:text-9xl font-luxury font-light text-zinc-900">{perfume.code}</h3>
                  <h4 className="text-3xl sm:text-5xl font-luxury font-bold text-zinc-900 mt-4">{perfume.name}</h4>
                </div>
              )}
            </div>
          </div>

          <div className="w-full lg:w-1/2 flex flex-col">
            <div className="mb-10">
              <span className="text-aura-gold-deep font-bold tracking-[0.4em] text-[10px] uppercase mb-3 block">Inspiración {perfume.inspiration}</span>
              <h1 className="text-5xl sm:text-6xl font-luxury text-zinc-900 leading-none mb-3">{perfume.name}</h1>
              <p className="text-base text-zinc-500 italic font-luxury mb-6">{perfume.family}</p>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-zinc-50 px-4 py-2 rounded-sm border border-zinc-100">
                  <Truck size={14} className="text-aura-gold-deep" />
                  <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Delivery gratis desde Gs. 300.000</span>
                </div>
                <div className="flex items-center gap-2 bg-aura-ink px-4 py-2 rounded-sm">
                  <span className="text-[9px] font-bold text-white uppercase tracking-widest">ID: {perfume.code}</span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-sm border transition-all ${copied ? 'bg-green-50 border-green-200' : 'bg-white border-zinc-200 hover:border-zinc-900'}`}
                >
                  <span className={`text-[9px] font-bold uppercase tracking-widest ${copied ? 'text-green-600' : 'text-zinc-600'}`}>{copied ? 'Copiado ✓' : 'Compartir'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-12">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600 mb-6">Presentación</h4>
                <div className="grid grid-cols-3 gap-4">
                  {PRICES.map((p) => (
                    <button key={p.size} onClick={() => setSelectedSize(p.size)} className={`relative py-6 px-2 border transition-all duration-300 rounded-sm ${selectedSize === p.size ? 'border-zinc-900 bg-zinc-900 text-white shadow-xl' : 'border-zinc-100 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'}`}>
                      <span className="text-[10px] font-bold tracking-widest uppercase mb-1 block">{p.size}</span>
                      <span className={`text-lg font-luxury tabular ${selectedSize === p.size ? 'text-aura-gold' : 'text-zinc-700'}`}>Gs. {p.price.toLocaleString('es-PY')}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-12 py-10 border-y border-zinc-100">
                <div className="flex flex-col gap-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600">Intensidad</h4>
                  <IntensityBar level={perfume.intensity} />
                </div>
                <div className="flex flex-col gap-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600">Longevidad</h4>
                  <span className="text-xl text-zinc-900 font-bold tracking-[0.2em] uppercase">{perfume.duration}</span>
                </div>
              </div>

              {perfume.notes?.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600 mb-4">Notas Olfativas</h4>
                  <div className="flex flex-wrap gap-2">
                    {perfume.notes.map((n) => (
                      <span key={n} className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600 bg-aura-ivory border border-zinc-100 px-3 py-1.5">{n}</span>
                    ))}
                  </div>
                </div>
              )}

              {description && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600 mb-4">Sobre esta fragancia</h4>
                  <p className="text-[15px] leading-relaxed text-zinc-600 font-light max-w-prose">{description}</p>
                </div>
              )}

              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-6">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600">Cantidad</h4>
                  <div className="flex items-center border border-zinc-100 rounded-sm">
                    <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="p-4 hover:bg-zinc-50 text-zinc-600"><Minus size={16} /></button>
                    <span className="w-14 text-center text-lg font-bold text-zinc-900 tabular">{quantity}</span>
                    <button onClick={() => setQuantity((q) => q + 1)} className="p-4 hover:bg-zinc-50 text-zinc-600"><Plus size={16} /></button>
                  </div>
                </div>
                <button onClick={() => addToCart(perfume, selectedSize, quantity)} className="w-full bg-aura-ink text-white py-6 rounded-sm text-[12px] font-bold tracking-[0.4em] uppercase flex items-center justify-center gap-4 hover:bg-aura-gold transition-all active:scale-[0.98] shadow-2xl">
                  <ShoppingBag size={20} /> Agregar al Carrito
                </button>
              </div>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section aria-labelledby="relacionados" className="mt-20 sm:mt-28 border-t border-zinc-100 pt-14">
            <h2 id="relacionados" className="text-2xl sm:text-3xl font-luxury text-zinc-900 mb-8 text-center">
              También te puede gustar
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
              {related.map((p) => (
                <Link key={p.code} href={`/producto/${p.code}`} className="group block">
                  <div className="relative aspect-[4/5] bg-aura-ivory overflow-hidden border border-zinc-100 group-hover:border-aura-gold/40 transition-all duration-500">
                    {p.imageUrl && (
                      <Image
                        src={p.imageUrl}
                        alt={`${p.name} — inspiración ${p.inspiration}`}
                        fill
                        sizes="(max-width: 1024px) 50vw, 25vw"
                        loader={smartImageLoader}
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="pt-3 text-center">
                    <span className="text-[8px] font-bold text-aura-gold-deep uppercase tracking-[0.2em] block mb-1">
                      Inspiración {p.inspiration}
                    </span>
                    <h3 className="text-[11px] sm:text-xs font-semibold text-zinc-900 uppercase tracking-[0.1em] line-clamp-2 group-hover:text-aura-gold-deep transition-colors">
                      {p.name}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
};

export default ProductView;
