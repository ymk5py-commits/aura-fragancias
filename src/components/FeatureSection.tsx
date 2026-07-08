import React from 'react';
import { Droplets, Clock, FlaskConical, Sparkles, Truck } from 'lucide-react';
import Reveal from './Reveal';

const cards = [
  { icon: Clock, stat: '8–12h', title: 'Fijación', desc: 'Estela que acompaña tu día y tu noche.' },
  { icon: FlaskConical, stat: '21 días', title: 'Macerado', desc: 'Reposo controlado antes de cada envío.' },
  { icon: Sparkles, stat: '+40', title: 'Aromas icónicos', desc: 'Las fragancias más deseadas del mundo.' },
  { icon: Truck, stat: 'País', title: 'Envío a todo Paraguay', desc: 'Gratis en compras desde Gs. 300.000.' },
];

const FeatureSection: React.FC = () => {
  return (
    <section className="py-16 sm:py-28 bg-aura-ivory border-y border-zinc-100">
      <div className="container mx-auto px-4 sm:px-6">
        <Reveal className="text-center mb-12 sm:mb-16">
          <span className="text-aura-gold-deep font-semibold tracking-[0.4em] text-[10px] sm:text-[11px] uppercase mb-3 block">
            Por qué elegirnos
          </span>
          <h2 className="text-3xl sm:text-5xl font-luxury text-aura-ink">El Diferencial Äura</h2>
        </Reveal>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Card hero (noir, ocupa columna alta) */}
          <Reveal className="col-span-2 lg:col-span-1 lg:row-span-2">
            <div className="group relative h-full min-h-[240px] lg:min-h-[420px] bg-aura-ink text-white p-8 sm:p-10 flex flex-col justify-between overflow-hidden">
              <div className="absolute -right-10 -top-10 opacity-[0.06] transition-transform duration-700 group-hover:scale-110">
                <Droplets size={220} strokeWidth={0.5} />
              </div>
              <Droplets size={28} strokeWidth={1.25} className="text-aura-gold relative z-10" />
              <div className="relative z-10">
                <span className="block font-luxury text-champagne text-6xl sm:text-8xl leading-none mb-3 tabular">30%</span>
                <h3 className="font-luxury text-2xl sm:text-3xl text-white mb-2">Extrait de Parfum</h3>
                <p className="text-white/55 text-sm leading-relaxed max-w-[30ch] font-light">
                  La concentración más alta de la perfumería. Esencia pura, no agua: por eso la estela dura y se siente.
                </p>
              </div>
            </div>
          </Reveal>

          {/* Cards de beneficio */}
          {cards.map((c, i) => (
            <Reveal key={c.title} delay={i * 80}>
              <div className="group h-full min-h-[180px] lg:min-h-[200px] bg-white border border-zinc-100 p-6 sm:p-8 flex flex-col justify-between transition-colors duration-300 hover:border-aura-gold/40">
                <c.icon size={24} strokeWidth={1.25} className="text-aura-gold-deep transition-transform duration-500 group-hover:-translate-y-0.5" />
                <div>
                  <span className="block font-luxury text-3xl sm:text-4xl text-aura-ink leading-none mb-1.5 tabular">{c.stat}</span>
                  <h3 className="text-[13px] font-semibold text-aura-ink uppercase tracking-[0.15em] mb-1.5">{c.title}</h3>
                  <p className="text-zinc-500 text-[12px] leading-relaxed max-w-[24ch]">{c.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureSection;
