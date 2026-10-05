'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Perfume } from '../types';
import { useSettings } from '../context/SettingsContext';
import { useCart } from '../context/CartContext';
import smartImageLoader from '../lib/imageLoader';
import { productLink, sizeKey } from '../lib/catalogSeo';
import { ShoppingBag, X, Eye, Plus, Minus, Truck, ArrowRight } from 'lucide-react';

interface Props {
  perfume: Perfume;
  rank?: number;
  featured?: boolean;
}

const ProductCard: React.FC<Props> = ({ perfume, rank, featured }) => {
  const { prices: PRICES } = useSettings();
  const { addToCart } = useCart();
  const [showDetails, setShowDetails] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>(PRICES[1].size); // 30ML default
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setShowDetails(false);
  }, [pathname]);

  useEffect(() => {
    const productCode = new URLSearchParams(window.location.search).get('p');
    if (productCode && productCode.toUpperCase() === perfume.code.toUpperCase()) {
      const timer = setTimeout(() => setShowDetails(true), 500);
      return () => clearTimeout(timer);
    }
  }, [perfume.code]);

  useEffect(() => {
    if (showDetails) {
      document.body.style.overflow = 'hidden';
      setQuantity(1);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showDetails]);

  const getBadgeStyles = (badge: string) => {
    switch (badge) {
      case 'Bestseller': return 'bg-aura-ink text-white border-aura-ink';
      case 'Recommended': return 'bg-aura-gold text-white border-aura-gold';
      case 'New': return 'bg-white text-aura-ink border-aura-ink/20';
      default: return 'bg-white text-zinc-400 border-zinc-200';
    }
  };

  const getBadgeLabel = (badge: string) => {
    switch (badge) {
      case 'Bestseller': return 'TOP VENTA';
      case 'Recommended': return 'EXCLUSIVO';
      case 'New': return 'NUEVO';
      default: return badge;
    }
  };

  const IntensityBar = ({ level }: { level: number }) => (
    <div className="flex gap-1.5 justify-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`h-[3px] w-5 rounded-full transition-all duration-700 ${i <= level ? 'bg-aura-gold' : 'bg-zinc-200'}`}
        />
      ))}
    </div>
  );

  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(perfume, selectedSize, quantity);
    setShowDetails(false);
  };

  // Los títulos llevan <Link href> real (crawleable, cmd+click abre la ficha);
  // el click simple conserva la UX de modal.
  const productHref = productLink(perfume.code, sizeKey(selectedSize.split(' ')[0]));
  const openModal = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return; // respeta abrir en pestaña nueva
    e.preventDefault();
    e.stopPropagation();
    setShowDetails(true);
  };

  const fromPrice = PRICES[0].price;

  // ── Layout DESTACADO (editorial, ocupa ancho completo) ──────────────
  if (featured) {
    return (
      <>
        <div
          className="group grid grid-cols-1 sm:grid-cols-12 bg-aura-ink text-white cursor-pointer overflow-hidden border border-white/5"
          onClick={() => setShowDetails(true)}
        >
          <div className="sm:col-span-7 relative aspect-[16/12] sm:aspect-auto sm:min-h-[420px] overflow-hidden">
            {perfume.imageUrl && (
              <Image
                src={perfume.imageUrl}
                alt={`${perfume.name} — inspiración ${perfume.inspiration}`}
                fill
                sizes="(max-width: 640px) 100vw, 58vw"
                loader={smartImageLoader}
                className="object-cover transition-transform duration-[1.2s] group-hover:scale-105"
              />
            )}
            <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-aura-gold text-aura-ink px-3 py-1 text-[8px] sm:text-[9px] font-bold tracking-[0.2em]">
              <span className="text-[11px] leading-none">★</span> Nº1 EN VENTAS
            </div>
          </div>
          <div className="sm:col-span-5 flex flex-col justify-center p-7 sm:p-12">
            <span className="text-aura-gold font-semibold tracking-[0.35em] text-[10px] uppercase mb-4">
              Inspiración {perfume.inspiration}
            </span>
            <h3 className="text-3xl sm:text-5xl font-luxury leading-[1.05] mb-3">
              <Link href={productHref} onClick={openModal} className="hover:text-aura-gold transition-colors">{perfume.name}</Link>
            </h3>
            <p className="text-white/50 text-[11px] font-medium tracking-[0.25em] uppercase mb-7">{perfume.family}</p>
            <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <div>
                <span className="block text-[9px] tracking-[0.2em] uppercase text-white/40 mb-1.5">Intensidad</span>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className={`h-[3px] w-5 rounded-full ${i <= perfume.intensity ? 'bg-aura-gold' : 'bg-white/15'}`} />
                  ))}
                </div>
              </div>
              <div>
                <span className="block text-[9px] tracking-[0.2em] uppercase text-white/40 mb-1">Desde</span>
                <span className="whitespace-nowrap font-luxury text-2xl text-champagne tabular">Gs. {fromPrice.toLocaleString('es-PY')}</span>
              </div>
            </div>
            <Link
              href={productHref}
              onClick={(e) => e.stopPropagation()}
              className="self-start bg-white text-aura-ink px-8 py-3.5 text-[10px] font-bold tracking-[0.25em] uppercase hover:bg-aura-gold transition-colors duration-300 active-scale"
            >
              Descubrir
            </Link>
          </div>
        </div>
        {renderModal()}
      </>
    );
  }

  return (
    <>
      <div
        className="group flex h-full cursor-pointer flex-col"
        onClick={() => setShowDetails(true)}
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-aura-sand transition-shadow duration-500 group-hover:shadow-[var(--shadow-card)]">
          <button
            onClick={(e) => { e.stopPropagation(); setShowDetails(true); }}
            aria-label={`Vista rápida de ${perfume.name}`}
            className="absolute bottom-3 right-3 z-30 hidden h-12 w-12 translate-y-3 items-center justify-center bg-aura-ivory text-aura-ink opacity-0 shadow-xl transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 hover:bg-aura-ink hover:text-aura-ivory sm:flex"
          >
            <Eye size={16} strokeWidth={1.8} />
          </button>

          {perfume.imageUrl ? (
            <Image
              src={perfume.imageUrl}
              alt={`${perfume.name} — inspiración ${perfume.inspiration}`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              loader={smartImageLoader}
              className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.035]"
            />
          ) : (
            <div className="w-full h-full flex flex-col p-5 sm:p-8 bg-white">
              <span className="text-[10px] font-bold tracking-[0.5em] text-aura-ink uppercase text-center opacity-70">ÄURA</span>
              <div className="flex-grow flex flex-col justify-center items-center text-center">
                <h3 className="text-3xl sm:text-5xl font-luxury font-light text-aura-ink tracking-tight">{perfume.code}</h3>
                <h4 className="text-xs sm:text-base font-luxury font-semibold text-aura-ink mt-2 line-clamp-2">{perfume.name}</h4>
              </div>
            </div>
          )}

          {rank === 1 ? (
            <div className="absolute left-3 top-3 z-20 flex items-center gap-1 bg-aura-ink px-2.5 py-1.5 text-[9px] font-bold tracking-[0.08em] text-aura-ivory">
              Nº1 EN VENTAS
            </div>
          ) : perfume.badge ? (
            <div className={`absolute left-3 top-3 z-20 border px-2.5 py-1.5 text-[9px] font-bold tracking-[0.08em] ${getBadgeStyles(perfume.badge)}`}>
              {getBadgeLabel(perfume.badge)}
            </div>
          ) : null}
          <span className="absolute right-3 top-3 z-20 bg-aura-ivory/88 px-2 py-1 text-[9px] font-bold tracking-[0.1em] text-aura-ink/70 backdrop-blur-sm">
            {perfume.code}
          </span>
        </div>

        <div className="flex flex-col items-start px-0.5 pb-2 pt-4 text-left">
          <span className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-aura-cognac">
            Inspiración {perfume.inspiration}
          </span>
          <h3 className="mb-2 min-h-[2.35em] line-clamp-2 font-luxury text-base font-semibold leading-[1.12] tracking-[-0.025em] text-aura-ink transition-colors group-hover:text-aura-cognac sm:text-xl">
            <Link href={productHref} onClick={openModal}>{perfume.name}</Link>
          </h3>
          <div className="mb-3 flex w-full items-center justify-between gap-2 border-t border-aura-ink/10 pt-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-aura-ink/55">Desde</span>
            <span className="font-luxury text-sm font-semibold tracking-[-0.02em] text-aura-ink tabular sm:text-base">Gs. {fromPrice.toLocaleString('es-PY')}</span>
          </div>

          <div className="flex w-full flex-col gap-2 sm:hidden">
            <div className="grid grid-cols-3 border border-aura-ink/12">
              {PRICES.map((p) => (
                <button
                  key={p.size}
                  onClick={(e) => { e.stopPropagation(); setSelectedSize(p.size); }}
                  aria-pressed={selectedSize === p.size}
                  className={`min-h-11 border-r border-aura-ink/10 px-1 text-[10px] font-bold transition-all last:border-r-0 ${
                    selectedSize === p.size ? 'bg-aura-ink text-aura-ivory' : 'bg-transparent text-aura-ink/52'
                  }`}
                >
                  {p.size}
                </button>
              ))}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); addToCart(perfume, selectedSize, 1); }}
              className="flex min-h-11 items-center justify-center gap-1.5 bg-aura-ink py-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-aura-ivory transition-colors active:bg-aura-cognac"
            >
              <ShoppingBag size={11} /> Agregar
            </button>
          </div>
        </div>
      </div>

      {renderModal()}
    </>
  );

  function renderModal() {
    // Portal a <body>: el modal es position:fixed y las tarjetas viven dentro de
    // <Reveal> (que tiene transform), lo que anclaría el fixed a la tarjeta y lo
    // rompería. El portal lo saca de ese contexto y lo centra en la pantalla.
    if (!showDetails || typeof document === 'undefined') return null;
    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="absolute inset-0 bg-aura-ink/92 backdrop-blur-xl" onClick={() => setShowDetails(false)} />
          <div className="relative w-full h-full sm:h-auto sm:max-w-4xl bg-white shadow-2xl overflow-y-auto sm:overflow-hidden animate-scale-in flex flex-col md:flex-row sm:max-h-[90vh] z-[1001]">
            <button
              onClick={() => setShowDetails(false)}
              aria-label="Cerrar"
              className="absolute top-5 right-5 p-2.5 text-zinc-400 hover:text-aura-ink z-[1100] transition-all bg-white/80 rounded-full hover:rotate-90"
            >
              <X size={22} />
            </button>

            {/* Visual */}
            <div className="w-full md:w-5/12 bg-aura-ivory p-5 sm:p-10 flex items-center justify-center shrink-0 border-b md:border-b-0 md:border-r border-zinc-100">
              <div className="relative w-full max-w-[360px] aspect-[4/5] bg-white border border-zinc-100 shadow-2xl overflow-hidden">
                {perfume.imageUrl ? (
                  <Image
                    src={perfume.imageUrl}
                    alt={perfume.name}
                    fill
                    sizes="(max-width: 768px) 90vw, 360px"
                    loader={smartImageLoader}
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col justify-center items-center p-8 text-center">
                    <h3 className="text-6xl font-luxury font-light text-aura-ink">{perfume.code}</h3>
                    <h4 className="text-2xl font-luxury font-semibold text-aura-ink mt-4">{perfume.name}</h4>
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="w-full md:w-7/12 p-7 sm:p-12 flex flex-col bg-white overflow-y-auto">
              <div className="mb-8">
                <span className="text-aura-gold-deep font-semibold tracking-[0.35em] text-[10px] uppercase mb-3 block">
                  Inspiración {perfume.inspiration}
                </span>
                <h2 className="text-3xl sm:text-4xl font-luxury text-aura-ink leading-tight mb-2">{perfume.name}</h2>
                <p className="text-[11px] text-zinc-500 font-medium tracking-[0.2em] uppercase">{perfume.family}</p>
                <div className="flex flex-wrap items-center gap-2 mt-5">
                  <div className="flex items-center gap-2 bg-aura-ivory px-3.5 py-2 border border-zinc-100">
                    <Truck size={13} className="text-aura-gold-deep" />
                    <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.15em]">Envío gratis +Gs. 300.000</span>
                  </div>
                  <div className="flex items-center bg-aura-ink px-3.5 py-2">
                    <span className="text-[9px] font-bold text-white uppercase tracking-[0.15em]">ID: {perfume.code}</span>
                  </div>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}${productHref}`;
                      navigator.clipboard.writeText(url);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className={`px-3.5 py-2 border transition-all ${copied ? 'bg-green-50 border-green-200' : 'bg-white border-zinc-200 hover:border-aura-ink'}`}
                  >
                    <span className={`text-[9px] font-bold uppercase tracking-[0.15em] ${copied ? 'text-green-600' : 'text-zinc-600'}`}>
                      {copied ? 'Copiado ✓' : 'Compartir'}
                    </span>
                  </button>
                  <Link
                    href={productHref}
                    className="flex items-center gap-1.5 px-3.5 py-2 border border-zinc-200 bg-white hover:border-aura-gold transition-all"
                  >
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-600">Ver ficha completa</span>
                    <ArrowRight size={11} className="text-aura-gold-deep" />
                  </Link>
                </div>
              </div>

              <div className="space-y-8 flex-grow">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500 mb-4">Presentación</h4>
                  <div className="grid grid-cols-3 gap-2.5">
                    {PRICES.map((p) => (
                      <button
                        key={p.size}
                        onClick={() => setSelectedSize(p.size)}
                        className={`py-4 px-2 border transition-all duration-300 ${
                          selectedSize === p.size ? 'border-aura-ink bg-aura-ink text-white shadow-lg' : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'
                        }`}
                      >
                        <span className="text-[10px] font-bold tracking-[0.1em] uppercase mb-1 block">{p.size}</span>
                        <span className={`text-[12px] font-luxury font-semibold tabular ${selectedSize === p.size ? 'text-aura-gold' : 'text-zinc-700'}`}>
                          Gs. {p.price.toLocaleString('es-PY')}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 py-7 border-y border-zinc-100">
                  <div className="flex flex-col gap-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">Intensidad</h4>
                    <IntensityBar level={perfume.intensity} />
                  </div>
                  <div className="flex flex-col gap-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">Longevidad</h4>
                    <span className="text-sm text-aura-ink font-bold tracking-[0.15em] uppercase">{perfume.duration}</span>
                  </div>
                </div>

                {perfume.notes?.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500 mb-4">Notas Olfativas</h4>
                    <div className="flex flex-wrap gap-2">
                      {perfume.notes.map((n) => (
                        <span key={n} className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-600 bg-aura-ivory border border-zinc-100 px-3 py-1.5">
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-10 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">Cantidad</h4>
                  <div className="flex items-center border border-zinc-200">
                    <button onClick={(e) => { e.stopPropagation(); setQuantity((q) => Math.max(1, q - 1)); }} className="p-3 hover:bg-zinc-50 text-zinc-600">
                      <Minus size={14} />
                    </button>
                    <span className="w-12 text-center text-sm font-bold text-aura-ink tabular">{quantity}</span>
                    <button onClick={(e) => { e.stopPropagation(); setQuantity((q) => q + 1); }} className="p-3 hover:bg-zinc-50 text-zinc-600">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleAddToCartClick}
                  className="w-full bg-aura-ink text-white py-5 text-[11px] font-bold tracking-[0.3em] uppercase flex items-center justify-center gap-3 hover:bg-aura-gold transition-all duration-300 active:scale-[0.98] shadow-xl"
                >
                  <ShoppingBag size={17} /> Agregar al Carrito
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
    );
  }
};

export default ProductCard;
