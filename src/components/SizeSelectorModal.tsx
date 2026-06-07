'use client';


import React, { useState, useEffect } from 'react';
import { X, MessageCircle, Sparkles, Check } from 'lucide-react';
import { PRICES, WHATSAPP_NUMBER } from '../constants';
import { Perfume } from '../types';

interface SizeSelectorModalProps {
  onClose: () => void;
  perfume?: Perfume; // Opcional: si viene de una tarjeta específica
}

const SizeSelectorModal: React.FC<SizeSelectorModalProps> = ({ onClose, perfume }) => {
  const [perfumeRef, setPerfumeRef] = useState('');

  useEffect(() => {
    if (perfume) {
      setPerfumeRef(`${perfume.name} (${perfume.code})`);
    }
  }, [perfume]);

  const handleSelectSize = (size: string) => {
    const finalRef = perfume ? `${perfume.name} (${perfume.code})` : perfumeRef.trim();
    const perfumePart = finalRef ? ` el perfume "${finalRef}"` : ' un perfume';
    const message = encodeURIComponent(`Hola Äura, me interesa${perfumePart} en su presentación de ${size}. ¿Tienen disponibilidad?`);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md" 
        onClick={onClose}
      ></div>
      <div className="relative w-full max-w-md bg-white shadow-2xl rounded-sm overflow-hidden animate-scale-in">
        <div className="p-6 sm:p-8 border-b border-zinc-100 text-center relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-zinc-300 hover:text-zinc-900 transition-colors"
          >
            <X size={24} />
          </button>
          <span className="text-aura-gold font-bold tracking-widest text-[10px] uppercase mb-2 block">Confirmación de Pedido</span>
          <h2 className="text-2xl sm:text-3xl font-luxury text-zinc-900">Elegí el Tamaño</h2>
          <p className="text-zinc-500 text-xs sm:text-sm mt-2">Personalizá tu experiencia con {perfume ? 'esta fragancia' : 'tu aroma favorito'}.</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Input Field o Display del Perfume */}
          <div className="space-y-2">
            <label htmlFor="perfume-ref" className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <Sparkles size={12} className="text-aura-gold" /> {perfume ? 'Fragancia Seleccionada' : 'Nombre o Código del Perfume'}
            </label>
            {perfume ? (
              <div className="w-full px-4 py-4 bg-zinc-50 border border-zinc-200 rounded-sm text-sm font-bold text-zinc-900 flex justify-between items-center">
                <span>{perfume.name} <span className="text-zinc-400 font-medium ml-1">({perfume.code})</span></span>
                <Check size={16} className="text-green-500" />
              </div>
            ) : (
              <input 
                id="perfume-ref"
                type="text" 
                value={perfumeRef}
                onChange={(e) => setPerfumeRef(e.target.value)}
                placeholder="Ej: CC034 o Creed Aventus"
                className="w-full px-4 py-4 bg-zinc-50 border border-zinc-200 rounded-sm text-sm focus:outline-none focus:border-zinc-900 transition-all placeholder:text-zinc-300"
              />
            )}
          </div>

          {/* Size Options */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Presentaciones Disponibles (30% Extrait)</label>
            {PRICES.map((item, index) => (
              <button
                key={index}
                onClick={() => handleSelectSize(item.size)}
                className="w-full group flex items-center justify-between p-4 sm:p-5 bg-zinc-50 border border-zinc-100 hover:border-zinc-900 hover:bg-white transition-all rounded-sm text-left active-scale"
              >
                <div>
                  <h4 className="text-lg sm:text-xl font-luxury font-bold text-zinc-900">{item.size}</h4>
                  <p className="text-xs sm:text-sm text-zinc-500">{item.label}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-300 group-hover:bg-zinc-900 group-hover:text-white group-hover:border-zinc-900 transition-all shadow-sm">
                  <MessageCircle size={18} />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 bg-zinc-50 text-center">
          <p className="text-[9px] sm:text-[10px] text-zinc-400 uppercase tracking-widest leading-relaxed">
            Un asesor de Äura te atenderá <br /> personalmente en WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SizeSelectorModal;