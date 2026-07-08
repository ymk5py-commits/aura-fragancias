'use client';

import React, { useEffect, useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

interface WelcomeModalProps {
  onAccept: (code: string) => void;
  onReject: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ onAccept, onReject }) => {
  const { settings } = useSettings();
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 400);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = (callback: () => void) => {
    setIsClosing(true);
    setTimeout(callback, 500);
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-[300] flex items-center justify-center px-4 transition-all duration-500 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
      <div className="absolute inset-0 bg-aura-ink/85 backdrop-blur-md" onClick={() => handleClose(onReject)}></div>

      <div className={`relative w-full max-w-md overflow-hidden bg-aura-charcoal border border-white/10 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] transition-all duration-500 transform ${isClosing ? 'scale-95 translate-y-10' : 'scale-100 translate-y-0'}`}>
        {/* Filete dorado superior */}
        <div className="h-px bg-gradient-to-r from-transparent via-aura-gold to-transparent w-full" />

        <button
          onClick={() => handleClose(onReject)}
          aria-label="Cerrar"
          className="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors z-10"
        >
          <X size={20} />
        </button>

        <div className="p-8 sm:p-12 text-center">
          <img
            src="/logo.svg"
            alt="Äura Fragancias"
            className="w-16 h-16 rounded-full mx-auto mb-7 ring-1 ring-aura-gold/40 ring-offset-4 ring-offset-aura-charcoal"
            width={64}
            height={64}
          />

          <span className="text-aura-gold font-semibold tracking-[0.35em] text-[10px] uppercase mb-4 block">
            Regalo de bienvenida
          </span>
          <h2 className="text-3xl sm:text-4xl font-luxury text-white leading-tight mb-4">
            {settings.welcomePercent}% OFF en tu primera compra
          </h2>

          <p className="text-white/55 text-sm mb-8 leading-relaxed font-light max-w-xs mx-auto">
            Un beneficio exclusivo para conocer la alta perfumería Äura.
          </p>

          <div className="border border-dashed border-aura-gold/40 bg-white/[0.03] p-4 mb-8">
            <span className="text-[9px] font-semibold text-white/40 uppercase tracking-[0.3em] block mb-1.5">Tu código</span>
            <span className="text-xl font-semibold text-champagne tracking-[0.25em] uppercase">{settings.welcomeCode}</span>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleClose(() => onAccept(settings.welcomeCode))}
              className="w-full bg-aura-gold text-aura-ink py-4 text-[11px] font-bold tracking-[0.25em] uppercase hover:bg-white transition-colors duration-300 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <CheckCircle2 size={15} />
              Aplicar mi descuento
            </button>
            <button
              onClick={() => handleClose(onReject)}
              className="w-full py-3 text-[10px] font-semibold text-white/35 hover:text-white/70 transition-colors tracking-[0.25em] uppercase"
            >
              Ahora no
            </button>
          </div>
        </div>

        <div className="border-t border-white/5 p-4 text-center">
          <p className="text-[9px] text-white/30 uppercase tracking-[0.25em]">Válido por tiempo limitado en toda la tienda</p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
