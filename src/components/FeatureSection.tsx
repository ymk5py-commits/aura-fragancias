import React from 'react';
import Reveal from './Reveal';

const features = [
  { n: '01', title: '30% Esencia', desc: 'Extrait de Parfum puro, la concentración más alta.' },
  { n: '02', title: '8–12 horas', desc: 'Fijación que acompaña tu día y tu noche.' },
  { n: '03', title: '21 días', desc: 'Macerado y reposo antes de cada envío.' },
  { n: '04', title: '+40 aromas', desc: 'Una colección de las fragancias más icónicas.' },
  { n: '05', title: 'Lujo real', desc: 'Alta perfumería, honesta y accesible.' },
];

const FeatureSection: React.FC = () => {
  return (
    <section className="py-16 sm:py-28 bg-aura-ivory border-y border-zinc-100">
      <div className="container mx-auto px-4 sm:px-6">
        <Reveal className="text-center mb-12 sm:mb-20">
          <span className="text-aura-gold-deep font-semibold tracking-[0.4em] text-[10px] sm:text-[11px] uppercase mb-3 block">
            Por qué elegirnos
          </span>
          <h2 className="text-3xl sm:text-5xl font-luxury text-aura-ink">El Diferencial Äura</h2>
        </Reveal>

        {/* Banda editorial: número grande + título + descripción, divididos por hairlines */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          {features.map((f, i) => (
            <Reveal
              key={f.n}
              delay={i * 80}
              className={`px-2 sm:px-6 py-7 lg:py-3 border-b sm:border-b-0 border-zinc-200/70 ${
                i !== features.length - 1 ? 'lg:border-r' : ''
              } sm:[&:nth-child(odd)]:border-r lg:[&:nth-child(odd)]:border-r`}
            >
              <span className="block font-luxury text-5xl sm:text-6xl text-aura-gold/40 leading-none mb-4 tabular">
                {f.n}
              </span>
              <h3 className="text-lg sm:text-xl font-luxury font-semibold text-aura-ink mb-2 tracking-wide">
                {f.title}
              </h3>
              <p className="text-zinc-500 text-[12px] sm:text-[13px] leading-relaxed max-w-[22ch]">
                {f.desc}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureSection;
