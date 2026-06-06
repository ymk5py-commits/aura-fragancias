import React from 'react';
import { Award, Clock, Droplets, FlaskConical, Tag } from 'lucide-react';

const features = [
  { icon: FlaskConical, title: '30% Esencia', desc: 'Extrait de Parfum puro' },
  { icon: Clock, title: '8–12h', desc: 'Fijación prolongada' },
  { icon: Droplets, title: 'Macerado', desc: '21 días de reposo' },
  { icon: Award, title: '+40 Aromas', desc: 'Colección icónica' },
  { icon: Tag, title: 'Lujo Real', desc: 'Accesible y honesto' },
];

const FeatureSection: React.FC = () => {
  return (
    <section className="py-16 sm:py-28 bg-aura-ivory border-y border-zinc-100">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-12 sm:mb-20">
          <span className="text-aura-gold-deep font-semibold tracking-[0.4em] text-[10px] sm:text-[11px] uppercase mb-3 block">
            Por qué elegirnos
          </span>
          <h2 className="text-3xl sm:text-5xl font-luxury text-aura-ink mb-5">El Diferencial Äura</h2>
          <div className="rule-gold w-20 mx-auto" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-5">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className="group flex flex-col items-center text-center p-5 sm:p-7 bg-white border border-zinc-100 hover:border-aura-gold/40 hover:shadow-[var(--shadow-card)] transition-all duration-500"
            >
              <div className="mb-4 sm:mb-6 w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full bg-aura-ivory text-aura-gold-deep group-hover:bg-aura-ink group-hover:text-aura-gold transition-all duration-500">
                <Icon size={20} strokeWidth={1.5} />
              </div>
              <h3 className="text-lg sm:text-2xl font-luxury font-semibold text-aura-ink mb-1.5 tracking-wide">
                {title}
              </h3>
              <p className="text-zinc-500 text-[9px] sm:text-[11px] leading-relaxed uppercase tracking-[0.15em]">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureSection;
