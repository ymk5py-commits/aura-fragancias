
import React from 'react';
import { Microscope, Zap, Thermometer } from 'lucide-react';

const TechnicalSection: React.FC = () => {
  return (
    <section id="tecnica" className="py-16 sm:py-24 bg-white">
      <div className="container mx-auto px-5 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <span className="text-aura-gold font-bold tracking-[0.2em] text-[11px] uppercase mb-2 block">Alta Perfumería</span>
            <h2 className="text-2xl sm:text-3xl font-luxury mb-4 leading-tight">Ciencia & Perfumería</h2>
            <p className="text-zinc-700 text-sm sm:text-lg max-w-xl mx-auto px-4">Descubrí por qué nuestras fragancias superan el estándar tradicional.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 mb-12 sm:mb-16">
            <div className="bg-zinc-50 p-8 sm:p-10 rounded-sm border border-zinc-100 flex flex-col">
              <div className="flex items-center gap-4 mb-6">
                <Microscope className="text-aura-gold shrink-0" size={28} />
                <h3 className="text-xl sm:text-2xl font-luxury font-bold">Concentración 30%</h3>
              </div>
              <p className="text-zinc-600 text-sm sm:text-base leading-relaxed mb-6">
                Superamos el estándar de <span className="text-zinc-900 font-semibold">Eau de Parfum</span> (15-20%) formulando con un <span className="text-aura-gold font-bold">30% de esencia pura</span> importada. 
              </p>
              <ul className="space-y-4 mt-auto">
                <li className="flex items-start gap-3 text-xs sm:text-base text-zinc-600">
                  <Zap size={14} className="text-aura-gold shrink-0 mt-0.5" /> 
                  <span>Intensidad inmediata desde el primer spray.</span>
                </li>
                <li className="flex items-start gap-3 text-xs sm:text-base text-zinc-600">
                  <Zap size={14} className="text-aura-gold shrink-0 mt-0.5" /> 
                  <span>Proyección envolvente de larga distancia.</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col justify-center p-4">
              <h3 className="text-xl sm:text-2xl font-luxury font-bold mb-4 sm:mb-6">Fijación Superior</h3>
              <p className="text-zinc-700 text-sm sm:text-lg mb-8 leading-relaxed">
                Nuestras fragancias son sometidas a un proceso de maceración controlada por 21 días, permitiendo que las notas de base se asienten y la longevidad en piel se maximice de forma natural.
              </p>
              <div className="p-5 bg-zinc-50 border border-zinc-100 rounded-sm flex gap-4">
                <Thermometer className="text-zinc-300 shrink-0" size={20} />
                <p className="text-[11px] sm:text-xs text-zinc-500 leading-snug">
                  *La duración real puede variar según el pH de la piel y las condiciones climáticas del entorno.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TechnicalSection;
