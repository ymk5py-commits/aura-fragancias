'use client';

import React from 'react';
import { useSettings } from '../context/SettingsContext';

const MESSAGE = encodeURIComponent(
  '¡Hola Äura! Vengo de la web y quiero asesoría sobre sus fragancias.'
);

// Logo oficial de WhatsApp (glifo de marca)
const WhatsAppGlyph: React.FC<{ size?: number }> = ({ size = 26 }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M16.003 0C7.17 0 0 7.17 0 16.003c0 2.82.737 5.566 2.137 7.99L0 32l8.2-2.137a15.93 15.93 0 0 0 7.803 1.99h.007C24.83 31.853 32 24.683 32 15.85 32 7.017 24.836 0 16.003 0zm0 29.18h-.006a13.2 13.2 0 0 1-6.73-1.843l-.483-.287-4.87 1.277 1.3-4.747-.314-.487a13.18 13.18 0 0 1-2.02-7.04C2.16 8.673 8.39 2.44 16.01 2.44c3.53 0 6.844 1.376 9.34 3.873a13.13 13.13 0 0 1 3.87 9.337c-.003 7.62-6.233 13.53-13.217 13.53zm7.24-9.876c-.397-.198-2.35-1.16-2.713-1.292-.364-.132-.63-.198-.895.198-.265.397-1.027 1.292-1.26 1.557-.232.265-.463.298-.86.1-.397-.198-1.676-.617-3.193-1.97-1.18-1.053-1.977-2.353-2.21-2.75-.232-.397-.025-.612.174-.81.18-.178.397-.463.595-.695.198-.232.265-.397.397-.662.132-.265.066-.497-.033-.695-.1-.198-.895-2.157-1.226-2.953-.323-.775-.65-.67-.895-.683-.232-.01-.497-.013-.762-.013s-.695.1-1.06.497c-.364.397-1.39 1.358-1.39 3.31 0 1.953 1.423 3.84 1.622 4.105.198.265 2.8 4.275 6.783 5.993.948.41 1.687.653 2.263.836.95.302 1.815.26 2.498.158.762-.114 2.35-.96 2.682-1.886.33-.926.33-1.72.232-1.886-.1-.165-.364-.265-.762-.463z" />
  </svg>
);

// Burbuja circular discreta: el verde queda solo en el glifo (reconocible sin
// pelearse con la paleta noir/dorado). El label aparece únicamente al hover.
const WhatsAppButton: React.FC = () => {
  const { settings } = useSettings();
  return (
    <a
      href={`https://wa.me/${settings.whatsappNumber}?text=${MESSAGE}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribinos por WhatsApp"
      className="group fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[120] flex items-center gap-0"
    >
      <span className="pointer-events-none mr-3 hidden sm:block max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover:max-w-[180px] group-hover:opacity-100">
        <span className="block bg-aura-ink text-white text-[10px] font-semibold tracking-[0.2em] uppercase px-4 py-2.5 rounded-full border border-white/10 shadow-xl">
          Asesoría directa
        </span>
      </span>
      <span className="relative flex items-center justify-center w-14 h-14 rounded-full bg-aura-ink text-[#25D366] border border-white/15 shadow-[0_14px_34px_-10px_rgba(0,0,0,0.6)] transition-all duration-300 group-hover:scale-105 group-hover:border-aura-gold/50 active:scale-95">
        <WhatsAppGlyph size={26} />
      </span>
    </a>
  );
};

export default WhatsAppButton;
