'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cldn } from '../lib/img';
import { useSettings } from '../context/SettingsContext';
import { useCart } from '../context/CartContext';
import { ShoppingBag, Truck, Minus, Plus, ArrowLeft } from 'lucide-react';
import { Perfume } from '../types';

const IntensityBar = ({ level }: { level: number }) => (
  <div className="flex gap-1.5 justify-start">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className={`h-[3px] w-6 rounded-full ${i <= level ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
    ))}
  </div>
);

const ProductView: React.FC<{ perfume: Perfume }> = ({ perfume }) => {
  const router = useRouter();
  const { prices: PRICES } = useSettings();
  const { addToCart } = useCart();
  const [selectedSize, setSelectedSize] = useState<string>(PRICES[1].size);
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);

  return (
    <main className="flex-grow pt-28 pb-16 min-h-screen bg-white">
      <div className="container mx-auto px-4 sm:px-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors mb-8 group">
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Volver</span>
        </button>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
          <div className="w-full lg:w-1/2">
            <div className="relative aspect-[4/5] w-full max-w-[500px] mx-auto bg-white border border-zinc-100 shadow-2xl flex flex-col overflow-hidden rounded-sm">
              {perfume.imageUrl ? (
                <img src={cldn(perfume.imageUrl, 800)} alt={perfume.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
      </div>
    </main>
  );
};

export default ProductView;
