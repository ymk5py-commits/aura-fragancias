
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Info, MessageCircle, Truck, Wallet, Plus, Minus, Trash2 } from 'lucide-react';
import { CartItem } from '../types';
import { useSettings } from '../context/SettingsContext';
import { trackEvent } from '../lib/pixel';

interface CheckoutProps {
  cart: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  initialDiscount?: number;
  onBack: () => void;
}

const Checkout: React.FC<CheckoutProps> = ({ cart, onUpdateQuantity, onRemoveItem, initialDiscount = 0, onBack }) => {
  const { settings } = useSettings();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    cityAndNeighborhood: '',
    address: '',
    paymentMethod: 'Transferencia Bancaria / QR'
  });
  const [coupon, setCoupon] = useState(initialDiscount > 0 ? 'BIENVENIDA10' : '');
  const [error, setError] = useState<string | null>(null);

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const discountAmount = initialDiscount > 0 ? subtotal * (initialDiscount / 100) : 0;
  const total = subtotal - discountAmount;

  useEffect(() => {
    trackEvent('InitiateCheckout', {
      content_ids: cart.map(item => item.perfume.code),
      content_type: 'product',
      value: total,
      currency: 'PYG',
      num_items: cart.reduce((acc, item) => acc + item.quantity, 0)
    });
  }, []);

  const handleCompleteOrder = () => {
    if (!formData.name || !formData.phone || !formData.cityAndNeighborhood || !formData.address) {
      setError("Se debe completar el formulario");
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (cart.length === 0) {
      setError("Tu carrito está vacío.");
      setTimeout(() => setError(null), 3000);
      return;
    }

    const isFreeShipping = subtotal >= 300000;
    const itemsText = cart.map(item => `- ${item.quantity}x ${item.perfume.name} (${item.perfume.code}) ${item.size}: Gs. ${(item.price * item.quantity).toLocaleString('es-PY')}`).join('\n');
    const message = encodeURIComponent(
      `*COMPRA HECHA EN WEB*\n\n` +
      `*Datos del Cliente:*\n` +
      `Nombre: ${formData.name}\n` +
      `Teléfono: ${formData.phone}\n` +
      `Ciudad y Barrio: ${formData.cityAndNeighborhood}\n` +
      `Dirección: ${formData.address}\n` +
      `Pago: ${formData.paymentMethod}\n\n` +
      `*Pedido:*\n${itemsText}\n\n` +
      `Subtotal: Gs. ${subtotal.toLocaleString('es-PY')}\n` +
      (discountAmount > 0 ? `Descuento (${initialDiscount}%): -Gs. ${discountAmount.toLocaleString('es-PY')}\n` : '') +
      `Envío: ${isFreeShipping ? 'GRATIS' : 'Consultar al WhatsApp'}\n` +
      `*TOTAL: Gs. ${total.toLocaleString('es-PY')}${isFreeShipping ? '' : ' + Envío'}*`
    );

    trackEvent('Purchase', {
      content_ids: cart.map(item => item.perfume.code),
      content_type: 'product',
      value: total,
      currency: 'PYG',
      num_items: cart.reduce((acc, item) => acc + item.quantity, 0)
    });

    window.open(`https://wa.me/${settings.whatsappNumber}?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#F9F9F9] animate-fade-in pb-20">
      {/* Navbar Minimalista */}
      <nav className="bg-white border-b border-zinc-100 py-4 sm:py-6 px-4 sm:px-12 flex items-center sticky top-0 z-50">
        <button onClick={onBack} className="flex items-center gap-1 sm:gap-2 text-[11px] sm:text-xs font-bold tracking-widest text-zinc-600 hover:text-zinc-900 transition-colors uppercase">
          <ChevronLeft size={14} /> VOLVER
        </button>
        <h1 className="flex-grow text-center text-xl sm:text-4xl font-luxury tracking-[0.1em] sm:tracking-[0.2em] text-zinc-900 uppercase">FINALIZAR PEDIDO</h1>
        <div className="w-16 sm:w-20"></div>
      </nav>

      <div className="container mx-auto px-4 sm:px-12 mt-6 sm:mt-12">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-sm text-xs font-bold tracking-widest uppercase animate-fade-in flex items-center gap-3">
            <Info size={16} />
            {error}
          </div>
        )}
        <div className="flex flex-col lg:flex-row gap-6 sm:gap-10">
          
          {/* Columna Izquierda: Datos */}
          <div className="flex-grow space-y-6 sm:space-y-8">
            <div className="bg-white p-6 sm:p-12 shadow-sm border border-zinc-50 rounded-sm">
              <div className="flex items-center gap-3 mb-6 sm:mb-10 border-b border-zinc-100 pb-4 sm:pb-6">
                <Truck size={18} className="text-zinc-900" />
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-[0.3em] text-zinc-900">DATOS DE ENVÍO</h2>
              </div>

              <div className="space-y-6 sm:space-y-8">
                <div>
                  <label className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] text-zinc-600 block mb-2 sm:mb-3">NOMBRE COMPLETO</label>
                  <input 
                    type="text" 
                    placeholder="Juan Pérez"
                    className="w-full bg-zinc-50/50 border-none px-4 sm:px-6 py-4 sm:py-5 rounded-sm focus:ring-1 focus:ring-zinc-900 transition-all placeholder:text-zinc-300 text-sm"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] text-zinc-600 block mb-2 sm:mb-3">TELÉFONO</label>
                  <input 
                    type="tel" 
                    placeholder="0981 123 456"
                    className="w-full bg-zinc-50/50 border-none px-4 sm:px-6 py-4 sm:py-5 rounded-sm focus:ring-1 focus:ring-zinc-900 transition-all placeholder:text-zinc-300 text-sm"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] text-zinc-600 block mb-2 sm:mb-3">CIUDAD Y BARRIO</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Asunción, Barrio Jara"
                    className="w-full bg-zinc-50/50 border-none px-4 sm:px-6 py-4 sm:py-5 rounded-sm focus:ring-1 focus:ring-zinc-900 transition-all placeholder:text-zinc-300 text-sm"
                    value={formData.cityAndNeighborhood}
                    onChange={(e) => setFormData({...formData, cityAndNeighborhood: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] text-zinc-600 block mb-2 sm:mb-3">DIRECCIÓN EXACTA</label>
                  <textarea 
                    placeholder="Ej: Av. Mcal López 1234 c/ San Martín"
                    rows={3}
                    className="w-full bg-zinc-50/50 border-none px-4 sm:px-6 py-4 sm:py-5 rounded-sm focus:ring-1 focus:ring-zinc-900 transition-all placeholder:text-zinc-300 text-sm resize-none"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] text-zinc-600 block mb-2 sm:mb-3">MÉTODO DE PAGO</label>
                  <div className="w-full bg-zinc-50/50 border-none px-4 sm:px-6 py-4 sm:py-5 rounded-sm text-sm text-zinc-900 font-medium">
                    Transferencia Bancaria / QR
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Resumen */}
          <div className="w-full lg:w-[400px] shrink-0">
            <div className="bg-white p-6 sm:p-12 shadow-sm border border-zinc-50 rounded-sm sticky top-24">
              <div className="flex items-center gap-3 mb-6 sm:mb-10 border-b border-zinc-100 pb-4 sm:pb-6">
                <Wallet size={18} className="text-zinc-900" />
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-[0.3em] text-zinc-900">RESUMEN</h2>
              </div>

              <div className="bg-zinc-50/50 p-4 sm:p-6 rounded-sm mb-6 sm:mb-10">
                <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-zinc-600 block mb-2 sm:mb-3">CÓDIGO DE DESCUENTO</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="INGRESAR CUPÓN"
                    className="flex-grow bg-white border border-zinc-100 px-3 sm:px-4 py-2 sm:py-3 rounded-sm text-[9px] sm:text-[10px] focus:outline-none focus:border-zinc-900 transition-all tracking-widest uppercase"
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                  />
                  <button className="bg-zinc-900 text-white px-4 sm:px-5 py-2 sm:py-3 rounded-sm text-[9px] sm:text-[10px] font-bold tracking-widest uppercase hover:bg-zinc-800 transition-all">
                    APLICAR
                  </button>
                </div>
              </div>

              <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-10 border-b border-zinc-100 pb-6 sm:pb-10">
                {cart.length === 0 ? (
                  <p className="text-zinc-400 text-center text-xs italic">Tu carrito está vacío</p>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-[10px] sm:text-[11px] font-bold text-zinc-900 uppercase tracking-wider italic">AURA {item.perfume.code}</span>
                        <span className="text-[8px] sm:text-[9px] text-zinc-400 uppercase tracking-widest">{item.size}</span>
                        
                        {/* Controles de Cantidad */}
                        <div className="flex items-center gap-3 mt-2">
                          <button 
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            className="p-1 hover:bg-zinc-100 rounded-full transition-colors"
                          >
                            <Minus size={12} className="text-zinc-400" />
                          </button>
                          <span className="text-[10px] font-bold text-zinc-900">{item.quantity}</span>
                          <button 
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            className="p-1 hover:bg-zinc-100 rounded-full transition-colors"
                          >
                            <Plus size={12} className="text-zinc-400" />
                          </button>
                          <button 
                            onClick={() => onRemoveItem(item.id)}
                            className="ml-2 p-1 hover:bg-red-50 text-zinc-300 hover:text-red-500 rounded-full transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-bold text-zinc-900 uppercase">Gs. {(item.price * item.quantity).toLocaleString('es-PY')}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-10">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest">SUBTOTAL</span>
                  <span className="text-[11px] sm:text-xs font-bold text-zinc-600">Gs. {subtotal.toLocaleString('es-PY')}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] sm:text-xs font-bold text-aura-gold uppercase tracking-widest">DESCUENTO ({initialDiscount}%)</span>
                    <span className="text-[11px] sm:text-xs font-bold text-aura-gold">-Gs. {discountAmount.toLocaleString('es-PY')}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest">ENVÍO</span>
                  </div>
                  {subtotal >= 300000 ? (
                    <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest bg-green-50 px-2 py-1 rounded-sm">GRATIS</span>
                  ) : (
                    <span className="text-[9px] sm:text-[10px] font-bold text-aura-gold uppercase tracking-tighter">Consultar al WhatsApp</span>
                  )}
                </div>
              </div>

              <div className="border-t-[1px] border-dashed border-zinc-200 pt-4 sm:pt-6 flex justify-between items-end mb-6 sm:mb-10">
                <div className="flex flex-col">
                  <span className="text-lg sm:text-2xl font-luxury font-bold text-zinc-900">TOTAL</span>
                  {subtotal < 300000 && (
                    <span className="text-[8px] sm:text-[9px] text-zinc-400 uppercase tracking-widest">+ COSTO DE ENVÍO</span>
                  )}
                </div>
                <span className="text-lg sm:text-2xl font-bold text-zinc-900">Gs. {total.toLocaleString('es-PY')}</span>
              </div>

              <button 
                onClick={handleCompleteOrder}
                className="w-full bg-[#25D366] text-white py-4 sm:py-5 rounded-sm text-[10px] sm:text-[11px] font-bold tracking-[0.2em] uppercase flex items-center justify-center gap-3 hover:bg-[#1ebe57] transition-all shadow-[0_10px_30px_-10px_rgba(37,211,102,0.4)] active:scale-95"
              >
                <MessageCircle size={18} fill="currentColor" />
                COMPLETAR EN WHATSAPP
              </button>

              <button 
                onClick={onBack}
                className="w-full mt-3 border border-zinc-100 text-zinc-400 py-4 sm:py-5 rounded-sm text-[9px] sm:text-[10px] font-bold tracking-[0.2em] uppercase flex items-center justify-center gap-3 hover:bg-zinc-50 transition-all active:scale-95"
              >
                SEGUIR COMPRANDO
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Checkout;