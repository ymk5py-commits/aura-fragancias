'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Instagram, Facebook, MessageCircle, Music2 as Tiktok } from 'lucide-react';
import { INSTAGRAM_URL, FACEBOOK_URL, TIKTOK_URL, CATALOG_URL } from '../constants';
import { useSettings } from '../context/SettingsContext';

const collections = [
  { label: 'Hombres', href: '/hombres' },
  { label: 'Mujeres', href: '/mujeres' },
  { label: 'Nicho & Unisex', href: '/unisex' },
];

const Footer: React.FC = () => {
  const { settings } = useSettings();

  return (
    <footer className="bg-aura-ink text-aura-ivory">
      <div className="section-shell">
        <div className="grid gap-12 border-b border-white/16 py-20 lg:grid-cols-[1.2fr_0.8fr] lg:gap-20 lg:py-28">
          <div>
            <span className="eyebrow !text-aura-gold mb-6">Tu firma olfativa</span>
            <h2 className="max-w-4xl font-luxury text-[clamp(3rem,6vw,6rem)] font-semibold leading-[0.92] tracking-[-0.055em] text-white">
              Hay aromas que se vuelven <span className="text-champagne">parte de vos.</span>
            </h2>
          </div>
          <div className="flex flex-col justify-end">
            <p className="mb-8 max-w-[42ch] text-sm leading-relaxed text-white/60 sm:text-base">
              Explorá las colecciones y encontrá la inspiración que encaja con tu estilo.
            </p>
            <div className="border-t border-white/22">
              {collections.map(({ label, href }) => (
                <Link key={href} href={href} className="group flex min-h-14 items-center justify-between border-b border-white/22 font-luxury text-xl font-medium text-white transition-colors hover:text-aura-gold-soft">
                  {label}
                  <ArrowRight size={18} strokeWidth={1.5} className="transition-transform group-hover:translate-x-1" />
                </Link>
              ))}
            </div>
            <a href={CATALOG_URL} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-11 items-center gap-2 self-start border-b border-aura-gold/55 text-[10px] font-bold uppercase tracking-[0.17em] text-aura-gold-soft transition-colors hover:text-white">
              Ver catálogo completo
              <ArrowUpRight size={14} />
            </a>
          </div>
        </div>

        <div className="grid gap-10 border-b border-white/12 py-12 md:grid-cols-[1.5fr_0.7fr_0.9fr_1fr] md:gap-8">
          <div>
            <img src="/brand/aura-wordmark-white.png" alt="Äura Fragancias" className="mb-5 h-auto w-44" width={1600} height={534} />
            <p className="max-w-xs text-sm leading-relaxed text-white/55">
              Inspiraciones olfativas con 30% de concentración, hechas para acompañarte mucho después del primer encuentro.
            </p>
          </div>

          <div>
            <h4 className="mb-5 text-[10px] font-bold uppercase tracking-[0.2em] text-aura-gold">Tienda</h4>
            <ul className="space-y-3 text-sm text-white/65">
              {collections.map(({ label, href }) => <li key={href}><Link href={href} className="transition-colors hover:text-white">{label}</Link></li>)}
              <li><Link href="/buscar" className="transition-colors hover:text-white">Buscar fragancias</Link></li>
              <li><Link href="/mayoristas" className="transition-colors hover:text-white">Mayoristas</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-5 text-[10px] font-bold uppercase tracking-[0.2em] text-aura-gold">Información</h4>
            <ul className="space-y-3 text-sm text-white/65">
              <li><Link href="/guias" className="transition-colors hover:text-white">Guías para elegir</Link></li>
              <li><Link href="/sobre-inspiraciones" className="transition-colors hover:text-white">Sobre las inspiraciones</Link></li>
              <li><Link href="/terminos-y-condiciones" className="transition-colors hover:text-white">Términos y condiciones</Link></li>
              <li><Link href="/envios-y-devoluciones" className="transition-colors hover:text-white">Envíos y devoluciones</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-5 text-[10px] font-bold uppercase tracking-[0.2em] text-aura-gold">Conectemos</h4>
            <div className="flex flex-wrap gap-2">
              {[
                { href: INSTAGRAM_URL, icon: Instagram, label: 'Instagram' },
                { href: FACEBOOK_URL, icon: Facebook, label: 'Facebook' },
                { href: TIKTOK_URL, icon: Tiktok, label: 'TikTok' },
                { href: `https://wa.me/${settings.whatsappNumber}`, icon: MessageCircle, label: 'WhatsApp' },
              ].map(({ href, icon: Icon, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="flex min-h-11 min-w-11 items-center justify-center border border-white/18 text-white/70 transition-colors hover:border-aura-gold hover:text-aura-gold">
                  <Icon size={18} strokeWidth={1.7} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 py-7 text-[10px] font-medium uppercase tracking-[0.14em] text-white/38 sm:flex-row sm:justify-between">
          <span>&copy; {new Date().getFullYear()} Äura Fragancias. Todos los derechos reservados.</span>
          <span>Perfumes de inspiración olfativa.</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;