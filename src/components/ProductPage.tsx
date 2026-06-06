
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PERFUMES, PRICES } from '../constants';
import { ShoppingBag, ShieldCheck, Truck, Minus, Plus, ArrowLeft, Check } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import LegalModal from './LegalModal';
import { CartItem, Perfume } from '../types';
import { trackEvent } from '../lib/pixel';

interface Props {
  cart: CartItem[];
  onAddToCart: (perfume: Perfume, size: string, quantity: number) => void;
  onOpenCart: () => void;
}

const ProductPage: React.FC<Props> = ({ cart, onAddToCart, onOpenCart }) => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [perfume, setPerfume] = useState<Perfume | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>(PRICES[1].size);
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);
  const [activeLegal, setActiveLegal] = useState<{title: string, content: string} | null>(null);

  useEffect(() => {
    if (code) {
      const found = PERFUMES.find(p => p.code.toUpperCase() === code.toUpperCase());
      if (found) {
        setPerfume(found);
        window.scrollTo(0, 0);
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [code, navigate]);

  if (!perfume) return null;

  const handleAddToCart = () => {
    onAddToCart(perfume, selectedSize, quantity);
  };

  const IntensityBar = ({ level }: { level: number }) => (
    <div className="flex gap-1.5 justify-start">
      {[1, 2, 3, 4, 5].map((i) => (
        <div 
          key={i} 
          className={`h-[3px] w-6 rounded-full transition-all duration-700 ${i <= level ? 'bg-zinc-800' : 'bg-zinc-200'}`}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header 
        cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)} 
        onOpenCart={onOpenCart}
      />

      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6">
          {/* Botón Volver */}
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors mb-8 group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Volver</span>
          </button>

          <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
            {/* Imagen / Etiqueta */}
            <div className="w-full lg:w-1/2">
              <div className={`relative aspect-[4/5] w-full max-w-[500px] mx-auto bg-white border border-zinc-100 shadow-2xl flex flex-col overflow-hidden rounded-sm`}>
                {perfume.imageUrl ? (
                  <img 
                    src={perfume.imageUrl} 
                    alt={perfume.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col p-10 sm:p-16">
                    <span className="text-[14px] font-bold tracking-[0.8em] text-zinc-900 uppercase text-center mb-auto">ÄURA</span>
                    <div className="flex-grow flex flex-col justify-center items-center text-center py-6">
                      <h3 className="text-7xl sm:text-9xl font-luxury font-light mb-4 text-zinc-900 tracking-tighter leading-none">{perfume.code}</h3>
                      <div className="flex items-center justify-center gap-4 mb-8">
                        <div className="h-[1px] w-12 bg-aura-gold/20"></div>
                        <div className="w-2 h-2 rounded-full bg-aura-gold/40"></div>
                        <div className="h-[1px] w-12 bg-aura-gold/20"></div>
                      </div>
                      <h4 className="text-4xl sm:text-6xl font-luxury font-bold text-zinc-900 leading-tight mb-4">{perfume.name}</h4>
                      <p className="text-2xl sm:text-3xl font-luxury italic text-zinc-400">{perfume.inspiration}</p>
                    </div>
                    <div className="mt-auto flex justify-center pt-6">
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className={`h-2 w-2 rounded-full ${i <= perfume.intensity ? 'bg-aura-gold' : 'bg-zinc-100'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Información */}
            <div className="w-full lg:w-1/2 flex flex-col">
              <div className="mb-10">
                <span className="text-aura-gold font-bold tracking-[0.4em] text-[10px] uppercase mb-3 block">Pirámide Olfativa</span>
                <h1 className="text-5xl sm:text-6xl font-luxury text-zinc-900 leading-none mb-6">{perfume.name}</h1>
                
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-zinc-50 px-4 py-2 rounded-sm border border-zinc-100">
                    <Truck size={14} className="text-aura-gold" />
                    <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Delivery Gratis desde Gs. 300.000</span>
                  </div>
                  <div className="flex items-center gap-2 bg-zinc-900 px-4 py-2 rounded-sm border border-zinc-900">
                    <span className="text-[9px] font-bold text-white uppercase tracking-widest">ID: {perfume.code}</span>
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-sm border transition-all ${copied ? 'bg-green-50 border-green-200' : 'bg-white border-zinc-200 hover:border-zinc-900'}`}
                  >
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${copied ? 'text-green-600' : 'text-zinc-600'}`}>
                      {copied ? 'ENLACE COPIADO' : 'COMPARTIR'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="space-y-12">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600 mb-6">PRESENTACIÓN</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {PRICES.map((p) => (
                      <button 
                        key={p.size} 
                        onClick={() => setSelectedSize(p.size)} 
                        className={`relative py-6 px-2 border transition-all duration-500 rounded-sm ${selectedSize === p.size ? 'border-zinc-900 bg-zinc-900 text-white shadow-xl' : 'border-zinc-100 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'}`}
                      >
                        <span className="text-[10px] font-bold tracking-widest uppercase mb-1 block">{p.size}</span>
                        <span className={`text-lg font-luxury ${selectedSize === p.size ? 'text-aura-gold' : 'text-zinc-700'}`}>Gs. {p.price.toLocaleString('es-PY')}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-12 py-10 border-y border-zinc-50">
                  <div className="flex flex-col gap-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600">Intensidad</h4>
                    <IntensityBar level={perfume.intensity} />
                  </div>
                  <div className="flex flex-col gap-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600">Longevidad</h4>
                    <span className="text-xl text-zinc-900 font-bold tracking-[0.2em] uppercase">{perfume.duration}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-6">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600">CANTIDAD</h4>
                    <div className="flex items-center border border-zinc-100 rounded-sm">
                      <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-4 hover:bg-zinc-50 text-zinc-600"><Minus size={16} /></button>
                      <span className="w-14 text-center text-lg font-bold text-zinc-900">{quantity}</span>
                      <button onClick={() => setQuantity(q => q + 1)} className="p-4 hover:bg-zinc-50 text-zinc-600"><Plus size={16} /></button>
                    </div>
                  </div>
                  <button 
                    onClick={handleAddToCart}
                    className="w-full bg-zinc-900 text-white py-6 rounded-sm text-[12px] font-bold tracking-[0.4em] uppercase flex items-center justify-center gap-4 hover:bg-aura-gold transition-all active:scale-[0.98] shadow-2xl"
                  >
                    <ShoppingBag size={20} /> AGREGAR AL CARRITO
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer onLegalClick={() => {}} />
    </div>
  );
};

export default ProductPage;
