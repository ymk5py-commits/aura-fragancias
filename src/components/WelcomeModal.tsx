'use client';

import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, Gift } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

interface WelcomeModalProps {
  onAccept: (code: string) => void;
  onReject: () => void;
}

/**
 * Regalo de bienvenida como barra compacta abajo, no como modal a pantalla
 * completa: no tapa la tienda, se puede seguir navegando y —importante para
 * Core Web Vitals— su texto es chico, así nunca se convierte en el LCP
 * (el modal grande aparecía a los 12 s y Google medía ese momento como LCP).
 */
const WelcomeModal: React.FC<WelcomeModalProps> = ({ onAccept, onReject }) => {
  const { settings } = useSettings();
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = (callback: () => void) => {
    setIsClosing(true);
    setTimeout(callback, 400);
  };

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-label="Regalo de bienvenida"
      className={`fixed inset-x-3 bottom-3 z-[300] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[420px] transition-all duration-400 ${
        isClosing ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100 animate-slide-up'
      }`}
    >
      <div className="relative overflow-hidden bg-aura-charcoal border border-white/10 shadow-[0_30px_80px_-24px_rgba(0,0,0,0.85)]">
        <div className="h-px bg-gradient-to-r from-transparent via-aura-gold to-transparent w-full" />
        <button
          type="button"
          onClick={() => handleClose(onReject)}
          aria-label="Cerrar"
          className="absolute top-2.5 right-2.5 p-2 text-white/40 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-4 p-4 sm:p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-aura-gold/40 text-aura-gold">
            <Gift size={18} strokeWidth={1.6} />
          </span>
          <div className="min-w-0 flex-1 pr-6">
            <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-aura-gold">Regalo de bienvenida</p>
            <p className="mt-1 text-sm text-white leading-snug">
              <strong className="font-semibold">{settings.welcomePercent}% OFF</strong> en tu primera compra con el código{' '}
              <span className="font-semibold tracking-[0.15em] text-champagne">{settings.welcomeCode}</span>.
            </p>
          </div>
        </div>

        <div className="flex gap-2 px-4 pb-4 sm:px-5 sm:pb-5">
          <button
            type="button"
            onClick={() => handleClose(() => onAccept(settings.welcomeCode))}
            className="flex-1 bg-aura-gold text-aura-ink py-3 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-white transition-colors duration-300 flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <CheckCircle2 size={14} />
            Aplicar descuento
          </button>
          <button
            type="button"
            onClick={() => handleClose(onReject)}
            className="px-4 py-3 text-[10px] font-semibold text-white/45 hover:text-white/80 transition-colors tracking-[0.2em] uppercase"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
