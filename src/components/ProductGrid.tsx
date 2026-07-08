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
    'Man': 'Caballeros',
    'Woman': 'Damas',
    'Unisex': 'Nicho & Unisex'
  }[gender];

  return (
    <section id={id} className="py-12 sm:py-32 bg-white overflow-hidden scroll-mt-20">
      <div className="container mx-auto px-2 sm:px-8">
        
        <div className="flex flex-col items-center text-center mb-8 sm:mb-20">
          <span className="text-aura-gold font-bold tracking-[0.4em] text-[11px] uppercase mb-2 block">Selección de Autor</span>
          <h2 className="text-2xl sm:text-4xl font-luxury leading-none tracking-tight mb-6 sm:mb-8">{sectionTitle}</h2>
          
          <div className="flex flex-col gap-6 items-center w-full max-w-5xl justify-center mt-2">
            
            {/* Search and Category Row */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center w-full justify-center">
              <div className="relative w-full max-w-[240px] group">
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border-b border-zinc-300 py-2 pl-7 pr-4 text-xs font-bold uppercase tracking-[0.2em] focus:outline-none focus:border-zinc-900 transition-all placeholder:text-zinc-500"
                />
                <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-zinc-900 transition-colors" size={12} />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-900"
                  >
                    <XCircle size={12} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 px-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`whitespace-nowrap px-4 sm:px-6 py-2 rounded-full text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase transition-all border shrink-0 ${
                      activeCategory === cat 
                        ? 'bg-zinc-900 text-white border-zinc-900 shadow-md' 
                        : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                    }`}
                  >
                    {categoryLabels[cat]}
                  </button>
                ))}
              </div>
            </div>

            {/* Intensity Filter Row */}
            <div className="flex items-center gap-4 py-2 border-t border-zinc-50 w-full justify-center">
              <span className="text-[9px] sm:text-xs font-bold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-1.5">
                <Zap size={10} className="text-aura-gold" /> Intensidad:
              </span>
              <div className="flex gap-1.5">
                {intensities.map((int) => (
                  <button
                    key={int.value}
                    onClick={() => setActiveIntensity(int.value)}
                    className={`px-3 sm:px-4 py-1.5 rounded-sm text-[9px] sm:text-xs font-bold tracking-widest uppercase transition-all border ${
                      activeIntensity === int.value
                        ? 'bg-aura-gold/10 border-aura-gold text-aura-gold'
                        : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400'
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-10 animate-fade-in">
            {filtered.map(perfume => (
              <ProductCard key={perfume.code} perfume={perfume} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center border-y border-zinc-50 max-w-xl mx-auto">
            <h3 className="text-xl font-luxury text-zinc-300 mb-3">Aroma no encontrado</h3>
            <p className="text-zinc-400 text-[8px] uppercase tracking-[0.2em]">Intenta con otra combinación de filtros.</p>
            <button 
              onClick={() => {setSearchQuery(''); setActiveCategory('All'); setActiveIntensity('All');}}
              className="mt-6 text-aura-gold text-[8px] font-bold uppercase tracking-[0.2em] border-b border-aura-gold/20 pb-1 hover:border-aura-gold transition-all"
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
