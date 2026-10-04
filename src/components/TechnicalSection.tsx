import React from 'react';
import { Droplets, Hourglass, SprayCan } from 'lucide-react';
import Reveal from './Reveal';

const stages = [
  { number: '01', icon: Droplets, title: 'Concentración', text: 'Trabajamos con 30% de esencia, por encima del rango habitual de un Eau de Parfum.' },
  { number: '02', icon: Hourglass, title: 'Maceración', text: 'El reposo controlado integra salida, corazón y fondo para una evolución más armoniosa.' },
  { number: '03', icon: SprayCan, title: 'Desempeño', text: 'La proyección aparece desde el primer spray y la base permanece cerca de la piel.' },
];

const TechnicalSection: React.FC = () => (
  <section id="tecnica" className="bg-aura-sand py-20 sm:py-32">
    <div className="section-shell">
      <Reveal className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:gap-24">
        <div>
          <span className="eyebrow mb-5">Del laboratorio a tu piel</span>
          <h2 className="font-luxury text-[clamp(2.8rem,6vw,5.4rem)] font-semibold leading-[0.92] tracking-[-0.05em] text-aura-ink">
            La ciencia detrás de una estela memorable.
          </h2>
        </div>
        <div className="flex items-end">
          <p className="max-w-[58ch] text-base sm:text-lg font-light leading-relaxed text-aura-ink/66">
            Una fragancia no se mide solamente por cómo huele al abrirla. Importan la concentración, el tiempo de reposo y cómo sus notas evolucionan durante horas.
          </p>
        </div>
      </Reveal>

      <div className="mt-14 grid border-t border-aura-ink/15 md:grid-cols-3 md:divide-x md:divide-aura-ink/15">
        {stages.map((stage, index) => (
          <Reveal key={stage.number} delay={index * 90}>
            <article className="group border-b border-aura-ink/15 py-8 md:min-h-[20rem] md:border-b-0 md:px-8 md:first:pl-0 md:last:pr-0">
              <div className="flex items-center justify-between">
                <span className="font-luxury text-5xl font-semibold tracking-[-0.06em] text-aura-ink/14 transition-colors group-hover:text-aura-cognac">{stage.number}</span>
                <stage.icon size={24} strokeWidth={1.25} className="text-aura-cognac" />
              </div>
              <h3 className="mt-14 font-luxury text-2xl sm:text-3xl font-semibold tracking-[-0.035em] text-aura-ink">{stage.title}</h3>
              <p className="mt-4 max-w-[38ch] text-sm leading-relaxed text-aura-ink/58">{stage.text}</p>
            </article>
          </Reveal>
        ))}
      </div>

      <p className="mt-6 max-w-2xl text-[11px] leading-relaxed text-aura-ink/46">
        La duración puede variar según el pH de la piel, la aplicación y las condiciones climáticas.
      </p>
    </div>
  </section>
);

export default TechnicalSection;