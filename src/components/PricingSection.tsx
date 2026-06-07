'use client';


import React from 'react';
import { useSettings } from '../context/SettingsContext';
import { Star, Award } from 'lucide-react';

const PricingSection: React.FC = () => {
  const { prices: PRICES } = useSettings();
  return (
    <section className="py-20 sm:py-28 bg-white border-y border-zinc-100">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16 sm:mb-24">
          <span className="text-aura-gold font-bold tracking-[0.3em] text-[11px] uppercase mb-2 block">Transparencia</span>
          <h2 className="text-2xl sm:text-4xl font-luxury mb-4">Presentaciones y Precios</h2>
          <div className="w-16 h-0.5 bg-aura-gold mx-auto"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 sm:gap-12 max-w-5xl mx-auto items-end">
          {PRICES.map((item, i) => (
            <div key={i} className="flex flex-col items-center text-center group">
              <div className="relative mb-8 flex flex-col items-center">
                <div className={`bg-zinc-900 rounded-t-lg relative transition-all duration-700 group-hover:-translate-y-3 ${
                  i === 0 ? 'w-16 h-20 sm:w-20 sm:h-24' : i === 1 ? 'w-20 h-28 sm:w-24 sm:h-32' : 'w-24 h-36 sm:w-28 sm:h-40'
                }`}>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-4 bg-zinc-800 rounded-sm"></div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-10">
                    <span className="text-white font-bold text-base sm:text-lg">{item.size}</span>
                  </div>
                </div>
                <div className={`mt-2 bg-gradient-to-b from-zinc-100 to-transparent rounded-b-lg opacity-40 blur-[1px] ${
                  i === 0 ? 'w-16 h-4 sm:w-20' : i === 1 ? 'w-20 h-5 sm:w-24' : 'w-24 h-6 sm:w-28'
                }`}></div>
              </div>

              <div className="space-y-1 mb-4">
                <h3 className="text-xl sm:text-2xl font-luxury font-bold text-zinc-600">{item.size}</h3>
                <p className="text-3xl sm:text-4xl font-luxury text-zinc-900 tracking-tight">{item.label}</p>
              </div>
              
              <div className="h-8 mb-4">
                {item.favorite && (
                  <div className="flex items-center gap-1.5 bg-zinc-900 text-white px-4 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-[0.2em] shadow-lg animate-fade-in">
                    <Star size={10} fill="#C5A059" stroke="#C5A059" /> EL FAVORITO
                  </div>
                )}
                
                {item.bestValue && (
                  <div className="flex items-center gap-1.5 bg-aura-gold text-white px-4 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-[0.2em] shadow-lg animate-fade-in">
                    <Award size={10} fill="currentColor" /> MEJOR RELACIÓN
                  </div>
                )}
              </div>

              <p className="text-sm sm:text-base text-zinc-600 font-medium max-w-[180px] sm:max-w-[200px] leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-20 text-center text-[11px] sm:text-xs text-zinc-500 uppercase tracking-[0.3em] max-w-xs sm:max-w-md mx-auto">
          Cada fragancia es entregada en frascos de cristal premium con atomizador de alta precisión.
        </p>
      </div>
    </section>
  );
};

export default PricingSection;