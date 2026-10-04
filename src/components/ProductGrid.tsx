'use client';

import React, { useState, useMemo } from 'react';
import ProductCard from './ProductCard';
import { useProducts } from '../context/ProductsContext';
import { Gender, Category } from '../types';
import { Search, XCircle, Zap } from 'lucide-react';

interface Props {
  gender: Gender;
  id: string;
}

type IntensityFilter = 'All' | 'Soft' | 'Moderate' | 'Intense';

const ProductGrid: React.FC<Props> = ({ gender, id }) => {
  const { visibleProducts } = useProducts();
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');
  const [activeIntensity, setActiveIntensity] = useState<IntensityFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    return visibleProducts.filter(p => {
      const matchesGender = gender === 'Unisex' ? p.gender === 'Unisex' : p.gender === gender;
      if (!matchesGender) return false;

      const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
      if (!matchesCategory) return false;

      let matchesIntensity = true;
      if (activeIntensity === 'Soft') matchesIntensity = p.intensity <= 2;
      else if (activeIntensity === 'Moderate') matchesIntensity = p.intensity >= 3 && p.intensity <= 4;
      else if (activeIntensity === 'Intense') matchesIntensity = p.intensity === 5;
      if (!matchesIntensity) return false;

      const searchLower = searchQuery.toLowerCase().trim();
      if (!searchLower) return true;

      return (
        p.name.toLowerCase().includes(searchLower) || 
        p.code.toLowerCase().includes(searchLower) || 
        p.inspiration.toLowerCase().includes(searchLower)
      );
    });
  }, [visibleProducts, gender, activeCategory, activeIntensity, searchQuery]);

  const categories: (Category | 'All')[] = ['All', 'Daily', 'Casual', 'Night'];
  const intensities: { label: string, value: IntensityFilter }[] = [
    { label: 'Todas', value: 'All' },
    { label: 'Suave', value: 'Soft' },
    { label: 'Moderada', value: 'Moderate' },
    { label: 'Intensa', value: 'Intense' }
  ];

  const categoryLabels = {
    'All': 'Todos',
    'Daily': 'Diario',
    'Casual': 'Salidas',
    'Night': 'Noche'
  };

  const hasAnyForGender = visibleProducts.some(p => gender === 'Unisex' ? p.gender === 'Unisex' : p.gender === gender);
  if (!hasAnyForGender) return null;

  const sectionTitle = {
    'Man': 'Hombres',
    'Woman': 'Mujeres',
    'Unisex': 'Nicho & Unisex'
  }[gender];

  return (
    <section id={id} className="scroll-mt-20 overflow-hidden bg-aura-ivory py-16 sm:py-28">
      <div className="section-shell">
        <div className="mb-10 grid gap-9 border-b border-aura-ink/12 pb-9 sm:mb-16 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <div>
            <span className="eyebrow mb-4">Selección de autor</span>
            <h2 className="font-luxury text-[clamp(3rem,7vw,6.5rem)] font-semibold leading-[0.9] tracking-[-0.055em] text-aura-ink">{sectionTitle}</h2>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-aura-ink/42 tabular">{filtered.length} fragancias</p>
          </div>

          <div className="flex w-full flex-col items-start justify-center gap-5 lg:items-end">
            
            {/* Search and Category Row */}
            <div className="flex w-full flex-col items-start gap-4 sm:flex-row sm:items-center lg:justify-end">
              <div className="group relative w-full sm:max-w-[260px]">
                <input
                  type="text"
                  aria-label="Buscar fragancias"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="min-h-11 w-full border-b border-aura-ink/25 bg-transparent py-2.5 pl-7 pr-11 text-sm font-medium text-aura-ink placeholder:text-aura-ink/50 focus:border-aura-cognac focus:outline-none"
                />
                <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-zinc-900 transition-colors" size={12} />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    aria-label="Limpiar búsqueda"
                    className="absolute right-0 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center text-aura-ink/55 hover:text-aura-ink"
                  >
                    <XCircle size={16} />
                  </button>
                )}
              </div>

              <div className="no-scrollbar flex max-w-full items-center overflow-x-auto border border-aura-ink/14">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    aria-pressed={activeCategory === cat}
                    className={`min-h-11 shrink-0 whitespace-nowrap border-r border-aura-ink/12 px-4 text-[10px] font-bold uppercase tracking-[0.11em] transition-all last:border-r-0 sm:px-5 ${
                      activeCategory === cat
                        ? 'bg-aura-ink text-aura-ivory'
                        : 'bg-transparent text-aura-ink/56 hover:bg-aura-sand hover:text-aura-ink'
                    }`}
                  >
                    {categoryLabels[cat]}
                  </button>
                ))}
              </div>
            </div>

            {/* Intensity Filter Row */}
            <div className="flex w-full flex-col items-start gap-2 sm:flex-row sm:items-center lg:justify-end">
              <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-aura-ink/55">
                <Zap size={11} className="text-aura-cognac" /> Intensidad
              </span>
              <div className="grid w-full grid-cols-4 border-b border-aura-ink/14 sm:flex sm:w-auto">
                {intensities.map((int) => (
                  <button
                    key={int.value}
                    onClick={() => setActiveIntensity(int.value)}
                    aria-pressed={activeIntensity === int.value}
                    className={`min-h-11 px-1 text-[10px] font-bold uppercase tracking-[0.08em] transition-all sm:px-4 sm:tracking-[0.12em] ${
                      activeIntensity === int.value
                        ? 'border-b-2 border-aura-cognac text-aura-cognac'
                        : 'text-aura-ink/45 hover:text-aura-ink'
                    }`}
                  >
                    {int.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-x-3 gap-y-10 min-[360px]:grid-cols-2 sm:gap-x-7 sm:gap-y-14 lg:grid-cols-4 animate-fade-in">
            {filtered.map(perfume => (
              <ProductCard key={perfume.code} perfume={perfume} />
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-xl border-y border-aura-ink/15 py-16 text-center">
            <h3 className="mb-3 font-luxury text-2xl font-semibold text-aura-ink">Aroma no encontrado</h3>
            <p className="text-sm text-aura-ink/60">Probá con otra búsqueda o combinación de filtros.</p>
            <button 
              onClick={() => {setSearchQuery(''); setActiveCategory('All'); setActiveIntensity('All');}}
              className="mt-6 min-h-11 border-b border-aura-cognac pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-aura-cognac transition-colors hover:text-aura-ink"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductGrid;