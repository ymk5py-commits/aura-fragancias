'use client';

import React, { useState } from 'react';
import { Citrus, Flower2, TreePine, Flame, Leaf, Candy, type LucideIcon } from 'lucide-react';

interface Family {
  name: string;
  icon: LucideIcon;
  desc: string;
  notes: string[];
  tint: string; // rgb para el degradado
}

const FAMILIES: Family[] = [
  { name: 'Cítrica', icon: Citrus, desc: 'Frescura luminosa que despierta los sentidos al instante.', notes: ['Bergamota', 'Limón', 'Pomelo', 'Mandarina'], tint: '197,164,89' },
  { name: 'Floral', icon: Flower2, desc: 'Elegancia romántica, el corazón femenino de la perfumería.', notes: ['Rosa', 'Jazmín', 'Peonía', 'Flor de Azahar'], tint: '212,160,170' },
  { name: 'Amaderada', icon: TreePine, desc: 'Calidez profunda y envolvente que perdura en la piel.', notes: ['Sándalo', 'Cedro', 'Vetiver', 'Pachulí'], tint: '160,128,86' },
  { name: 'Oriental', icon: Flame, desc: 'Sensualidad cálida y misteriosa para la noche.', notes: ['Vainilla', 'Ámbar', 'Incienso', 'Haba Tonka'], tint: '197,140,72' },
  { name: 'Aromática', icon: Leaf, desc: 'Carácter fresco y sofisticado, frescura con temple.', notes: ['Lavanda', 'Salvia', 'Menta', 'Romero'], tint: '120,150,120' },
  { name: 'Gourmand', icon: Candy, desc: 'Dulzura golosa e irresistible, una adicción elegante.', notes: ['Caramelo', 'Cacao', 'Tófe', 'Coco'], tint: '190,150,110' },
];

const ScentFamilies: React.FC = () => {
  const [active, setActive] = useState(0);

  return (
    <section className="relative overflow-hidden bg-aura-ink py-20 sm:py-32">
      {/* tint de fondo según familia activa */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-700"
        style={{ background: `radial-gradient(80% 60% at 75% 40%, rgba(${FAMILIES[active].tint},0.16), transparent 70%)` }}
        aria-hidden
      />

      <div className="relative section-shell">
        <div className="mb-12 grid gap-6 sm:mb-16 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <span className="eyebrow !text-aura-gold mb-5">El universo Äura</span>
            <h2 className="font-luxury text-[clamp(2.8rem,7vw,6rem)] font-semibold leading-[0.9] tracking-[-0.055em] text-white">Encontrá tu familia olfativa.</h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-white/50">Cada familia cuenta una intención distinta. Explorá sus notas y reconocé cuál se parece más a vos.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Lista */}
          <ul className="flex flex-col">
            {FAMILIES.map((f, i) => {
              const Icon = f.icon;
              const isActive = i === active;
              return (
                <li key={f.name}>
                  <button
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onClick={() => setActive(i)}
                    aria-expanded={isActive}
                    className="w-full text-left group flex items-center gap-4 sm:gap-5 py-4 sm:py-5 border-b border-white/10 transition-colors"
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center border transition-all duration-500 sm:h-12 sm:w-12 ${isActive ? 'border-aura-gold bg-aura-gold/10 text-aura-gold' : 'border-white/15 text-white/40'}`}>
                      <Icon size={20} strokeWidth={1.5} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className={`block font-luxury font-semibold leading-none tracking-[-0.035em] transition-colors duration-300 ${isActive ? 'text-white' : 'text-white/42 group-hover:text-white/70'} text-2xl sm:text-4xl`}>
                        {f.name}
                      </span>
                      {/* Detalle inline (solo móvil) */}
                      <span className={`lg:hidden block overflow-hidden transition-all duration-500 ${isActive ? 'max-h-40 mt-3 opacity-100' : 'max-h-0 opacity-0'}`}>
                        <span className="block text-white/55 text-sm leading-relaxed mb-3">{f.desc}</span>
                        <span className="flex flex-wrap gap-1.5">
                          {f.notes.map((n) => (
                            <span key={n} className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/70 border border-white/15 px-2.5 py-1">{n}</span>
                          ))}
                        </span>
                      </span>
                    </span>
                    <span className={`hidden lg:block h-px transition-all duration-500 ${isActive ? 'w-10 bg-aura-gold' : 'w-0 bg-transparent'}`} />
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Preview (desktop) */}
          <div className="hidden lg:block relative">
            <div className="relative border border-white/10 p-12 min-h-[360px] flex flex-col justify-center overflow-hidden">
              <div
                className="pointer-events-none absolute inset-0 transition-opacity duration-700"
                style={{ background: `radial-gradient(100% 100% at 0% 0%, rgba(${FAMILIES[active].tint},0.18), transparent 60%)` }}
                aria-hidden
              />
              <div key={active} className="relative animate-fade-in">
                {React.createElement(FAMILIES[active].icon, { size: 32, strokeWidth: 1.25, className: 'text-aura-gold mb-6' })}
                <h3 className="text-5xl font-luxury text-white mb-4">{FAMILIES[active].name}</h3>
                <p className="text-white/60 text-lg font-light leading-relaxed mb-8 max-w-md">{FAMILIES[active].desc}</p>
                <div className="flex flex-wrap gap-2">
                  {FAMILIES[active].notes.map((n) => (
                    <span key={n} className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/75 border border-white/20 px-3.5 py-1.5">{n}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ScentFamilies;