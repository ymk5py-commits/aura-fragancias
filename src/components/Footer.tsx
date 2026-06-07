import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, MessageCircle, Music2 as Tiktok } from 'lucide-react';
import { BRAND_NAME, INSTAGRAM_URL, FACEBOOK_URL, TIKTOK_URL, CATALOG_URL } from '../constants';
import { useSettings } from '../context/SettingsContext';

interface FooterProps {
  onLegalClick: (type: 'inspirations' | 'terms' | 'shipping') => void;
}

const Footer: React.FC<FooterProps> = ({ onLegalClick }) => {
  const { settings } = useSettings();
  return (
    <footer className="bg-aura-ink text-white/80 pt-20 sm:pt-28 pb-10">
      <div className="container mx-auto px-6">
        {/* Closing statement */}
        <div className="flex flex-col items-center text-center mb-16 sm:mb-20">
          <span className="text-aura-gold font-semibold tracking-[0.4em] text-[10px] uppercase mb-5 block">
            Tu firma olfativa
          </span>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-luxury text-white leading-tight max-w-3xl mb-10">
            Elegí tu aroma. Elegí tu presencia.
            <span className="block italic text-champagne">Elegí Äura.</span>
          </h2>
          <a
            href={CATALOG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-shine bg-white text-aura-ink px-12 py-4 text-[11px] font-bold tracking-[0.25em] uppercase hover:bg-aura-gold hover:text-white transition-all duration-300 active-scale"
          >
            Ver Catálogo Completo
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 sm:gap-12 py-12 border-y border-white/10">
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-5">
              <img src="/logo.svg" alt="Äura Fragancias" className="w-11 h-11 rounded-full" width={44} height={44} />
              <h3 className="text-2xl font-luxury font-semibold tracking-[0.2em] text-white">{BRAND_NAME}</h3>
            </div>
            <p className="text-white/55 text-sm font-light leading-relaxed max-w-xs">
              Las fragancias más icónicas del mundo, reinterpretadas con la máxima concentración y fijación.
              Lujo real para personas reales.
            </p>
          </div>

          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] mb-5 text-aura-gold">Navegación</h4>
            <ul className="space-y-3.5 text-sm text-white/65 font-medium">
              <li><Link to="/hombres" className="hover:text-white transition-colors">Hombres</Link></li>
              <li><Link to="/mujeres" className="hover:text-white transition-colors">Mujeres</Link></li>
              <li><Link to="/unisex" className="hover:text-white transition-colors">Nicho & Unisex</Link></li>
              <li><Link to="/#mayoristas" className="hover:text-white transition-colors">Mayoristas</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] mb-5 text-aura-gold">Legal</h4>
            <ul className="space-y-3.5 text-sm text-white/65 font-medium">
              <li><button onClick={() => onLegalClick('inspirations')} className="hover:text-white transition-colors text-left">Inspiraciones</button></li>
              <li><button onClick={() => onLegalClick('terms')} className="hover:text-white transition-colors text-left">Términos y Condiciones</button></li>
              <li><button onClick={() => onLegalClick('shipping')} className="hover:text-white transition-colors text-left">Envíos y Devoluciones</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] mb-5 text-aura-gold">Seguinos</h4>
            <div className="flex gap-3">
              {[
                { href: INSTAGRAM_URL, icon: Instagram, label: 'Instagram' },
                { href: FACEBOOK_URL, icon: Facebook, label: 'Facebook' },
                { href: TIKTOK_URL, icon: Tiktok, label: 'TikTok' },
                { href: `https://wa.me/${settings.whatsappNumber}`, icon: MessageCircle, label: 'WhatsApp' },
              ].map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-10 h-10 rounded-full border border-white/15 flex items-center justify-center text-white/70 hover:bg-aura-gold hover:text-aura-ink hover:border-aura-gold transition-all duration-300"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 text-center text-white/40 text-[10px] uppercase tracking-[0.2em] font-medium leading-relaxed">
          &copy; {new Date().getFullYear()} Äura Perfumes · Todos los derechos reservados.
          <br />
          Los productos aquí mencionados son perfumes de inspiración olfativa.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
