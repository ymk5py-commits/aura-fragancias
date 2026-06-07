'use client';


import React from 'react';
import { X } from 'lucide-react';

interface LegalModalProps {
  title: string;
  content: string;
  onClose: () => void;
}

const LegalModal: React.FC<LegalModalProps> = ({ title, content, onClose }) => {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" 
        onClick={onClose}
      ></div>
      <div className="relative w-full max-w-3xl bg-white shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-zinc-100">
          <h2 className="text-3xl font-luxury text-zinc-900">{title}</h2>
          <button 
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-8 overflow-y-auto">
          <div className="prose prose-zinc prose-sm max-w-none">
            {content.split('\n').map((paragraph, index) => (
              paragraph.trim() ? (
                <p key={index} className="text-zinc-800 text-base leading-relaxed mb-4 whitespace-pre-line">
                  {paragraph}
                </p>
              ) : <br key={index} />
            ))}
          </div>
        </div>
        <div className="p-6 bg-zinc-50 border-t border-zinc-100 text-center">
          <button 
            onClick={onClose}
            className="bg-zinc-900 text-white px-8 py-3 text-xs font-bold tracking-[0.2em] uppercase hover:bg-zinc-800 transition-all"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default LegalModal;