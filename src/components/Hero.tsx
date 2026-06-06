import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, Sparkles } from 'lucide-react';
import { WHATSAPP_NUMBER, BANNER_IMAGE } from '../constants';

interface HeroProps {
  title?: string;
  subtitle?: string;
  image?: string;
  showCatalogButton?: boolean;
}

const Hero: React.FC<HeroProps> = ({
  title = 'ÄURA',
  subtitle = 'El lujo al alcance de todos.',
  image = BANNER_IMAGE,
  showCatalogButton = true,
}) => {
  const isHome = showCatalogButton;

  return (
    <section
      className={`relative w-full flex items-center justify-center overflow-hidden bg-aura-ink ${
        isHome ? 'min-h-dvh' : 'min-h-[62vh] sm:min-h-[68vh]'
      }`}
    >
      {/* Cinematic background */}
      <div className="absolute inset-0 z-0">
        <img
          src={image}
          alt={`${title} — perfumería de lujo`}
          className="w-full h-full object-cover animate-kenburns"
          referrerPolicy="no-referrer"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-aura-ink/85 via-aura-ink/55 to-aura-ink/95" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_30%,transparent_30%,rgba(12,10,9,0.75)_100%)]" />
      </div>

      <div className="relative z-10 text-center px-5 max-w-4xl mx-auto flex flex-col items-center pt-24 pb-16">
        {/* Kicker */}
        <div
          className="flex items-center gap-3 mb-6 sm:mb-8 opacity-0 animate-slide-up"
          style={{ animationDelay: '0.1s' }}
        >
          <span className="h-px w-8 bg-aura-gold/60" />
          <span className="inline-flex items-center gap-1.5 text-aura-gold text-[9px] sm:text-[11px] font-semibold tracking-[0.45em] uppercase">
            <Sparkles size={11} strokeWidth={2} />
            {isHome ? 'Alta Perfumería · Paraguay' : 'Colección Äura'}
          </span>
          <span className="h-px w-8 bg-aura-gold/60" />
        </div>

        {/* Brand / title */}
        <h1
          className={`font-luxury font-medium text-white leading-[0.95] mb-5 sm:mb-7 select-none uppercase opacity-0 animate-slide-up ${
            isHome
              ? 'text-6xl sm:text-8xl md:text-[8.5rem] tracking-[0.06em]'
              : 'text-5xl sm:text-7xl tracking-[0.08em]'
          }`}
          style={{ animationDelay: '0.2s' }}
        >
          {isHome ? <span className="text-gold-gradient">{title}</span> : title}
        </h1>

        {/* Subtitle */}
        <div className="space-y-3 sm:space-y-4 mb-9 sm:mb-12">
          <h2
            className="text-2xl sm:text-4xl md:text-5xl font-luxury italic text-white/90 leading-tight opacity-0 animate-slide-up"
            style={{ animationDelay: '0.35s' }}
          >
            {subtitle}
          </h2>
          <p
            className="text-[10px] sm:text-sm font-medium text-white/55 tracking-[0.35em] uppercase max-w-xs sm:max-w-none mx-auto opacity-0 animate-slide-up"
            style={{ animationDelay: '0.5s' }}
          >
            Extrait de Parfum · 30% Concentración
          </p>
        </div>

        {/* CTAs */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full px-4 sm:px-0 opacity-0 animate-slide-up"
          style={{ animationDelay: '0.65s' }}
        >
          {showCatalogButton && (
            <Link
              to="/hombres"
              className="btn-shine group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-white text-aura-ink px-10 py-4 sm:px-12 sm:py-[18px] text-[11px] font-bold tracking-[0.25em] uppercase hover:bg-aura-gold hover:text-white transition-all duration-300 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)] active-scale text-center"
            >
              Ver Catálogo
              <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          )}
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto border border-white/30 text-white px-10 py-4 sm:px-12 sm:py-[18px] text-[11px] font-bold tracking-[0.25em] uppercase hover:bg-white/10 hover:border-white/60 transition-all duration-300 active-scale text-center backdrop-blur-sm"
          >
            Asesoría Privada
          </a>
        </div>

        {/* Trust strip (home only) */}
        {isHome && (
          <div
            className="mt-12 sm:mt-16 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:gap-x-10 opacity-0 animate-slide-up"
            style={{ animationDelay: '0.85s' }}
          >
            {['30% Esencia Pura', 'Fijación 8–12h', 'Envío a todo Paraguay'].map((t, i) => (
              <React.Fragment key={t}>
                {i > 0 && <span className="hidden sm:block w-1 h-1 rounded-full bg-aura-gold/50" />}
                <span className="text-[9px] sm:text-[10px] font-semibold tracking-[0.25em] uppercase text-white/60">
                  {t}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Scroll indicator */}
      {isHome && (
        <div
          className="absolute bottom-7 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-2 opacity-0 animate-fade-in"
          style={{ animationDelay: '1.2s' }}
        >
          <span className="text-[8px] tracking-[0.3em] uppercase text-white/40">Explorar</span>
          <ArrowDown size={14} className="text-aura-gold/70 animate-float" />
        </div>
      )}
    </section>
  );
};

export default Hero;
