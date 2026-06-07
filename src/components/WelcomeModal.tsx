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
    const timer = setTimeout(() => setIsVisible(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = (callback: () => void) => {
    setIsClosing(true);
    setTimeout(callback, 500);
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-[300] flex items-center justify-center px-4 transition-all duration-500 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
      <div className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm" onClick={() => handleClose(onReject)}></div>
      
      <div className={`relative bg-white w-full max-w-md overflow-hidden rounded-sm shadow-2xl transition-all duration-500 transform ${isClosing ? 'scale-95 translate-y-10' : 'scale-100 translate-y-0'}`}>
        {/* Decoración superior */}
        <div className="h-2 bg-aura-gold w-full"></div>
        
        <button 
          onClick={() => handleClose(onReject)}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 transition-colors z-10"
        >
          <X size={20} />
        </button>

        <div className="p-8 sm:p-12 text-center">
          <div className="mb-6">
            <img 
              src="/logo.svg" 
              alt="Äura Logo" 
              className="w-20 h-20 rounded-full mx-auto border-2 border-aura-gold/20 object-cover shadow-lg"
              referrerPolicy="no-referrer"
            />
          </div>

          <span className="text-aura-gold font-bold tracking-[0.3em] text-[10px] uppercase mb-3 block">Regalo Exclusivo</span>
          <h2 className="text-2xl sm:text-3xl font-luxury mb-4 text-zinc-900">Descuento de bienvenida · {settings.welcomePercent}% OFF</h2>

          <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
            Te damos la bienvenida a nuestra comunidad de lujo. Disfrutá de un beneficio especial en tu primera compra.
          </p>

          <div className="bg-zinc-50 border-2 border-dashed border-zinc-200 p-4 mb-8 rounded-sm group">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Tu Código</span>
            <span className="text-xl font-bold text-zinc-900 tracking-[0.2em] uppercase">{settings.welcomeCode}</span>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleClose(() => onAccept(settings.welcomeCode))}
              className="w-full bg-zinc-900 text-white py-4 rounded-sm text-xs font-bold tracking-[0.2em] uppercase hover:bg-aura-gold transition-all flex items-center justify-center gap-2 group"
            >
              <CheckCircle2 size={16} className="group-hover:scale-110 transition-transform" />
              ACEPTAR Y APLICAR
            </button>
            <button 
              onClick={() => handleClose(onReject)}
              className="w-full py-3 text-[10px] font-bold text-zinc-400 hover:text-zinc-600 transition-colors tracking-widest uppercase"
            >
              NO, GRACIAS
            </button>
          </div>
        </div>

        <div className="bg-zinc-50 p-4 text-center border-t border-zinc-100">
          <p className="text-[9px] text-zinc-400 uppercase tracking-widest">Válido por tiempo limitado en toda la tienda</p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;