import React from 'react';
import { Clock3, FlaskConical, MapPin, ShieldCheck } from 'lucide-react';
import Reveal from './Reveal';

const facts = [
  { icon: Clock3, value: '8–12 h', title: 'Fijación real', text: 'Una estela presente que evoluciona con tu piel durante el día.' },
  { icon: FlaskConical, value: '21 días', title: 'Maceración', text: 'Cada lote reposa para integrar sus notas antes de llegar a vos.' },
  { icon: ShieldCheck, value: '+40', title: 'Aromas seleccionados', text: 'Un catálogo curado de perfiles icónicos, clásicos y de nicho.' },
  { icon: MapPin, value: 'Todo PY', title: 'Cobertura nacional', text: 'Despachamos a todo Paraguay y coordinamos cada entrega.' },
];

const FeatureSection: React.FC = () => (
  <section className="relative overflow-hidden bg-aura-ink py-20 text-aura-ivory sm:py-32">
    <div className="absolute inset-0 aura-noise" aria-hidden />
    <div className="section-shell relative grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
      <Reveal className="lg:sticky lg:top-32 lg:self-start">
        <span className="eyebrow !text-aura-gold mb-6">La fórmula Äura</span>
        <div className="flex items-start gap-4 sm:gap-7">
          <span className="font-luxury text-[clamp(6rem,16vw,12rem)] font-semibold leading-[0.75] tracking-[-0.08em] text-champagne tabular">30</span>
          <span className="font-luxury text-4xl sm:text-6xl font-semibold text-aura-gold">%</span>
        </div>
        <h2 className="mt-8 max-w-lg font-luxury text-[clamp(2.2rem,5vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.045em]">
          Más esencia. Más presencia. <span className="text-aura-gold">Más vos.</span>
        </h2>
        <p className="mt-6 max-w-[48ch] text-sm sm:text-base font-light leading-relaxed text-white/58">
          Formulamos cada fragancia como Extrait de Parfum. La alta concentración no busca gritar, busca permanecer y revelar nuevas notas con el paso de las horas.
        </p>
      </Reveal>

      <div className="border-t border-white/14">
        {facts.map((fact, index) => (
          <Reveal key={fact.title} delay={index * 70}>
            <article className="group grid grid-cols-[auto_1fr] gap-5 border-b border-white/14 py-7 sm:grid-cols-[4rem_9rem_1fr] sm:items-center sm:gap-6 sm:py-9">
              <div className="flex h-11 w-11 items-center justify-center border border-white/16 text-aura-gold transition-colors duration-300 group-hover:border-aura-gold sm:h-12 sm:w-12">
                <fact.icon size={19} strokeWidth={1.4} />
              </div>
              <div>
                <span className="font-luxury text-2xl sm:text-3xl font-semibold tracking-[-0.04em] text-white tabular">{fact.value}</span>
                <h3 className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-aura-gold sm:hidden">{fact.title}</h3>
              </div>
              <div className="col-start-2 sm:col-start-auto">
                <h3 className="hidden text-xs font-bold uppercase tracking-[0.2em] text-aura-gold sm:block">{fact.title}</h3>
                <p className="mt-1 max-w-[42ch] text-sm leading-relaxed text-white/52 sm:mt-2">{fact.text}</p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

export default FeatureSection;