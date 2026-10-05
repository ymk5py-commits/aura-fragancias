'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { BANNER_IMAGE } from '../constants';
import { useSettings } from '../context/SettingsContext';
import smartImageLoader from '../lib/imageLoader';

interface HeroProps {
  title?: string;
  subtitle?: string;
  image?: string;
  showCatalogButton?: boolean;
}

export default function Hero({
  title = 'ÄURA',
  subtitle = 'El lujo al alcance de todos.',
  image = BANNER_IMAGE,
  showCatalogButton = true,
}: HeroProps) {
  const { settings } = useSettings();
  const reducedMotion = useReducedMotion();
  const isHome = showCatalogButton;
  const featuredBottle = image === '/editorial/hero-cc180.webp';
  const heroCopy = subtitle === 'El lujo al alcance de todos.'
    ? 'Inspiraciones olfativas con 30% de concentración, creadas para acompañarte mucho después del primer encuentro.'
    : subtitle;
  const reveal = reducedMotion ? false : { opacity: 0, y: 26 };
  const transition = { duration: 0.85, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] };

  if (!isHome) {
    return (
      <section className="bg-aura-ink pt-[104px] lg:pt-[98px]">
        <div className="relative isolate flex min-h-[440px] items-end overflow-hidden sm:min-h-[540px] lg:min-h-[600px]">
          <motion.div
            className="absolute inset-0"
            initial={reducedMotion ? false : { scale: 1.08 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <Image src={image} alt={`Colección de perfumes ${title} de Äura`} fill priority fetchPriority="high" sizes="100vw" loader={smartImageLoader} className="object-cover" />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-r from-aura-ink/85 via-aura-ink/40 to-aura-ink/10" aria-hidden="true" />
          <div className="section-shell relative z-10 pb-12 pt-24 text-aura-ivory sm:pb-16 lg:pb-20">
            <motion.div initial={reveal} animate={{ opacity: 1, y: 0 }} transition={transition}>
              <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.24em] text-aura-gold-soft">Colección Äura / Extrait de Parfum</p>
              <h1 className="max-w-[10ch] font-luxury text-[clamp(4.7rem,13vw,10rem)] font-semibold leading-[0.82] tracking-[-0.07em] text-white">{title}</h1>
              <p className="mt-7 max-w-[36ch] font-luxury text-xl leading-snug text-white/85 sm:text-3xl">{subtitle}</p>
              <Link href={`#${title.toLowerCase()}`} className="mt-9 inline-flex min-h-12 items-center gap-3 border border-white/65 px-6 text-[10px] font-bold uppercase tracking-[0.17em] text-white transition-colors hover:bg-white hover:text-aura-ink">
                Explorar fragancias <ArrowDownRight size={16} />
              </Link>
            </motion.div>
          </div>
          <div className="absolute bottom-0 right-0 hidden border-l border-t border-white/35 bg-aura-wine/80 px-7 py-4 text-[9px] font-bold uppercase tracking-[0.22em] text-white lg:block">
            Hecho para dejar huella
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden bg-aura-wine pt-[104px] text-aura-ivory lg:pt-[98px]">
      <div className="grid lg:min-h-[710px] lg:grid-cols-[48%_52%]">
        <div className="order-2 flex flex-col justify-between px-5 pb-6 pt-5 sm:px-8 sm:pt-12 lg:order-1 lg:px-[clamp(2.5rem,5.5vw,7rem)] lg:pb-9 lg:pt-16">
          <motion.div initial={reveal} animate={{ opacity: 1, y: 0 }} transition={transition} className="max-w-[38rem]">
            <p className="mb-4 flex items-center gap-3 text-[9px] font-bold uppercase tracking-[0.24em] text-aura-gold-soft sm:text-[10px]">
              <span className="h-px w-8 bg-current" aria-hidden="true" />
              Alta perfumería · Paraguay
            </p>
            <h1>
              <span className="sr-only">Äura Fragancias: alta perfumería en Paraguay</span>
              <img src="/brand/aura-wordmark-white.png" alt="" aria-hidden="true" className="h-auto w-[min(64vw,460px)] sm:w-[min(82vw,460px)] lg:w-full" width={1600} height={534} />
            </h1>
            <h2 className="mt-5 max-w-[16ch] font-luxury text-[clamp(2.35rem,4.45vw,4.75rem)] font-medium leading-[0.96] tracking-[-0.055em] text-white lg:mt-8">
              Una presencia que permanece.
            </h2>
            <p className="mt-5 max-w-[43ch] text-sm leading-relaxed text-white/72 sm:text-base lg:mt-6">
              {heroCopy}
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5 lg:mt-8">
              <Link href="/#top-ventas" className="group inline-flex min-h-12 items-center justify-center gap-3 bg-aura-ivory px-6 text-[10px] font-bold uppercase tracking-[0.16em] text-aura-wine transition-colors hover:bg-aura-gold-soft">
                Descubrir fragancias <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <a href={`https://wa.me/${settings.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-3 border border-white/45 px-6 text-[10px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:border-white hover:bg-white/10">
                Asesoramiento personal <ArrowUpRight size={16} />
              </a>
            </div>
          </motion.div>

          <div className="mt-7 grid grid-cols-3 divide-x divide-white/20 border-t border-white/20 pt-6 lg:mt-10">
            {[
              ['30%', 'esencia'],
              ['21 días', 'maceración'],
              ['Todo PY', 'envíos'],
            ].map(([value, label]) => (
              <div key={label} className="px-2 first:pl-0 last:pr-0 sm:px-5">
                <span className="block font-luxury text-lg font-semibold tracking-[-0.04em] text-aura-gold-soft sm:text-2xl">{value}</span>
                <span className="mt-1 block text-[8px] font-semibold uppercase tracking-[0.17em] text-white/54 sm:text-[9px]">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative order-1 h-[170px] overflow-hidden sm:h-[390px] lg:order-2 lg:h-auto lg:min-h-[710px]">
          <motion.div
            className="absolute inset-0"
            initial={reducedMotion ? false : { scale: 1.1, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <Image src={featuredBottle ? '/editorial/hero-cc180-wide.webp' : image} alt={featuredBottle ? 'Äura CC180 sobre piedra clara en una escena editorial' : 'Frasco de perfume en una escena de alta perfumería Äura'} fill priority fetchPriority="high" sizes="(min-width: 1024px) 1px, 100vw" loader={smartImageLoader} className="object-cover lg:hidden" />
            <Image src={image} alt="" aria-hidden="true" fill priority fetchPriority="high" sizes="(min-width: 1024px) 52vw, 1px" loader={smartImageLoader} className="hidden object-cover object-[50%_35%] lg:block" />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-t from-aura-ink/35 via-transparent to-aura-ink/5" aria-hidden="true" />
          {featuredBottle ? (
            <Link href="/producto/CC180" className="absolute bottom-5 left-5 border-l border-white/70 pl-3 text-[9px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:text-aura-gold-soft sm:left-8 lg:bottom-9 lg:left-9">
              CC180 / Conocer la fragancia ↗
            </Link>
          ) : (
            <div className="absolute bottom-5 left-5 border-l border-white/70 pl-3 text-[9px] font-bold uppercase tracking-[0.2em] text-white sm:left-8 lg:bottom-9 lg:left-9">
              Una forma de estar presente
            </div>
          )}
          <span className="absolute right-5 top-5 text-[9px] font-bold tracking-[0.2em] text-white/80 sm:right-8 sm:top-8">01 / ÄURA</span>
        </div>
      </div>
    </section>
  );
}