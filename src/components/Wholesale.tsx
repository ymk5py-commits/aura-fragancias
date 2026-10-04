'use client';

import React from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import { SCALES } from '../constants';
import { useSettings } from '../context/SettingsContext';
import Reveal from './Reveal';

const Wholesale: React.FC = () => {
  const { settings } = useSettings();
  const message = encodeURIComponent('Hola Äura, me gustaría recibir información para ser mayorista.');

  return (
    <section id="mayoristas" className="relative overflow-hidden bg-aura-cognac py-20 text-aura-ivory sm:py-32">
      <div className="absolute inset-0 aura-noise" aria-hidden />
      <div className="absolute -right-[8vw] top-1/2 hidden -translate-y-1/2 select-none font-luxury text-[28vw] font-extrabold leading-none text-white/[0.035] lg:block" aria-hidden>
        Ä
      </div>

      <div className="section-shell relative grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-24">
        <Reveal>
          <span className="eyebrow !text-aura-gold-soft mb-6">Comunidad mayorista</span>
          <h2 className="max-w-3xl font-luxury text-[clamp(3.2rem,7vw,7rem)] font-semibold leading-[0.87] tracking-[-0.065em]">
            Tu negocio puede empezar con un <span className="text-aura-gold-soft">gran aroma.</span>
          </h2>
          <p className="mt-7 max-w-[52ch] text-sm sm:text-base font-light leading-relaxed text-white/68">
            Armamos una selección inicial con los perfumes de mayor salida, escalas flexibles y acompañamiento para que puedas vender con seguridad desde el primer pedido.
          </p>

          <div className="mt-8 grid gap-3 text-sm text-white/78 sm:grid-cols-2">
            {['Inversión inicial flexible', 'Selección de top ventas', 'Material para vender', 'Asesoría por WhatsApp'].map((benefit) => (
              <div key={benefit} className="flex items-center gap-3 border-t border-white/15 pt-3">
                <Check size={15} className="text-aura-gold-soft" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>

          <a
            href={`https://wa.me/${settings.whatsappNumber}?text=${message}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-10 inline-flex min-h-12 items-center justify-center gap-3 bg-aura-ivory px-7 py-3 text-[10px] font-bold uppercase tracking-[0.19em] text-aura-cognac transition-all hover:bg-aura-gold-soft active:scale-[0.98]"
          >
            Solicitar lista mayorista
            <ArrowUpRight size={16} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        </Reveal>

        <Reveal delay={120} className="self-end border-t border-white/24">
          <div className="flex items-end justify-between py-5 text-white/55">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Escala de compra</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Beneficio</span>
          </div>
          {SCALES.map((scale, index) => (
            <div key={scale.units} className="group flex items-center justify-between border-t border-white/16 py-6 sm:py-7">
              <div className="flex items-baseline gap-4">
                <span className="font-luxury text-xl font-semibold text-white/28 tabular">0{index + 1}</span>
                <span className="font-luxury text-2xl sm:text-3xl font-semibold tracking-[-0.035em] text-white">{scale.units}</span>
              </div>
              <span className="text-right text-[10px] sm:text-xs font-bold uppercase tracking-[0.17em] text-aura-gold-soft">{scale.discount}</span>
            </div>
          ))}
          <p className="border-t border-white/24 pt-5 text-xs leading-relaxed text-white/52">
            Te recomendamos la escala según tu presupuesto, ciudad y tipo de público.
          </p>
        </Reveal>
      </div>
    </section>
  );
};

export default Wholesale;