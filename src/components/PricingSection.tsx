'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import Reveal from './Reveal';

const PricingSection: React.FC = () => {
  const { prices } = useSettings();

  return (
    <section className="bg-aura-ivory py-20 sm:py-32">
      <div className="section-shell">
        <Reveal className="grid gap-8 border-b border-aura-ink/12 pb-10 md:grid-cols-[1fr_0.72fr] md:items-end">
          <div>
            <span className="eyebrow mb-5">Elegí tu formato</span>
            <h2 className="max-w-3xl font-luxury text-[clamp(2.8rem,7vw,6rem)] font-semibold leading-[0.9] tracking-[-0.055em] text-aura-ink">
              Un aroma para cada <span className="text-aura-cognac">ritual.</span>
            </h2>
          </div>
          <p className="max-w-[48ch] text-sm leading-relaxed text-aura-ink/62 md:justify-self-end">
            El mismo Extrait de Parfum al 30% en tres tamaños. Probá una inspiración, llevá tu favorita o elegí el formato con mejor rendimiento.
          </p>
        </Reveal>

        <div className="divide-y divide-aura-ink/12 border-b border-aura-ink/12">
          {prices.map((item, index) => {
            const tag = item.favorite ? 'El favorito' : item.bestValue ? 'Mejor rendimiento' : 'Para descubrir';
            return (
              <Reveal key={item.size} delay={index * 80}>
                <article className="group grid gap-5 py-7 sm:grid-cols-[5rem_1fr_auto] sm:items-center sm:gap-8 sm:py-9">
                  <div className="font-luxury text-5xl sm:text-6xl font-semibold leading-none tracking-[-0.06em] text-aura-ink/18 transition-colors duration-300 group-hover:text-aura-cognac tabular">
                    0{index + 1}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[7rem_1fr] sm:items-center sm:gap-8">
                    <div>
                      <h3 className="font-luxury text-3xl sm:text-4xl font-semibold tracking-[-0.04em] text-aura-ink">{item.size}</h3>
                      <span className="mt-1 inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.17em] text-aura-gold-deep">
                        <Check size={11} /> {tag}
                      </span>
                    </div>
                    <p className="max-w-[46ch] text-sm leading-relaxed text-aura-ink/58">{item.desc}</p>
                  </div>
                  <div className="flex items-center justify-between gap-6 sm:justify-end">
                    <span className="font-luxury text-2xl sm:text-3xl font-semibold tracking-[-0.035em] text-aura-ink tabular">{item.label}</span>
                    <Link href={`/buscar?size=${item.size.split(' ')[0]}`} aria-label={`Ver fragancias de ${item.size}`} className="flex h-12 w-12 shrink-0 items-center justify-center border border-aura-ink/18 text-aura-ink transition-all duration-300 group-hover:border-aura-ink group-hover:bg-aura-ink group-hover:text-aura-ivory">
                      <ArrowUpRight size={18} />
                    </Link>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>

        <p className="mt-6 text-[10px] font-medium uppercase tracking-[0.16em] text-aura-ink/46">
          Frascos de cristal con atomizador de alta precisión.
        </p>
      </div>
    </section>
  );
};

export default PricingSection;