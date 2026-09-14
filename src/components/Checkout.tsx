'use client';


import React, { useState, useEffect } from 'react';
import { ChevronLeft, Info, MessageCircle, Truck, Wallet, Plus, Minus, Trash2, ShieldCheck, Copy, Check, Upload, Loader2, Landmark, FileText, X, CreditCard, Lock } from 'lucide-react';
import { CartItem, Order } from '../types';
import { useSettings } from '../context/SettingsContext';
import { trackEvent } from '../lib/pixel';
import { newEventId, capiTrack } from '../lib/tracking';
import { toItem, gaBeginCheckout, gaGenerateLead } from '../lib/gtag';
import { newOrderId, uploadReceipt, saveOrder, validateReceipt, RECEIPT_ACCEPT } from '../lib/ordersService';
import { PAY_TRANSFER, PAY_CARD, isCardPaymentEnabled, startCardPayment, savePaymentSnapshot } from '../lib/payments';
import {
  normalizePhone, validateAddress, validateCity, validateDocument, validateEmail, validateName, validatePhone,
} from '../lib/validation';

interface CheckoutProps {
  cart: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  initialDiscount?: number;
  onBack: () => void;
}

/** Mensaje de error debajo de un campo. */
const FieldError: React.FC<{ msg?: string }> = ({ msg }) =>
  msg ? <p className="mt-2 text-[11px] font-semibold text-red-600" role="alert">{msg}</p> : null;

/** Fila de dato bancario con botón de copiar. */
const CopyRow: React.FC<{ label: string; value: string; big?: boolean }> = ({ label, value, big }) => {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-zinc-100 last:border-0">
      <div className="min-w-0">
        <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-400 mb-0.5">{label}</span>
        <span className={`block text-zinc-900 truncate ${big ? 'text-lg font-bold tabular' : 'text-sm font-semibold'}`}>{value}</span>
      </div>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
        aria-label={`Copiar ${label}`}
        className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 border text-[9px] font-bold uppercase tracking-[0.12em] transition-colors ${
          copied ? 'border-green-200 bg-green-50 text-green-700' : 'border-zinc-200 text-zinc-600 hover:border-aura-ink hover:text-aura-ink'
        }`}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  );
};

const Checkout: React.FC<CheckoutProps> = ({ cart, onUpdateQuantity, onRemoveItem, initialDiscount = 0, onBack }) => {
  const { settings } = useSettings();
  const [step, setStep] = useState<'datos' | 'pago'>('datos');
  const [orderId, setOrderId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    cityAndNeighborhood: '',
    address: '',
    email: '',
    document: '',
    paymentMethod: PAY_TRANSFER,
  });
  /** Con tarjeta, Pagopar exige correo y C.I. del comprador. */
  const paysWithCard = isCardPaymentEnabled && formData.paymentMethod === PAY_CARD;
  // Transacción de Pagopar ya creada (se reutiliza si el guardado falla y se reintenta).
  const [cardStart, setCardStart] = useState<{ hash: string; url: string } | null>(null);
  type Field = 'name' | 'phone' | 'cityAndNeighborhood' | 'address' | 'email' | 'document';
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const setField = (field: Field, value: string) => {
    setFormData((f) => ({ ...f, [field]: value }));
    setFieldErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  };
  /** Celular normalizado (09XXXXXXXX) para guardar y para WhatsApp. */
  const phoneClean = normalizePhone(formData.phone) || formData.phone.trim();
  const [discount, setDiscount] = useState(initialDiscount);
  const [coupon, setCoupon] = useState(initialDiscount > 0 ? settings.welcomeCode : '');
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Comprobante
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptErr, setReceiptErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const discountAmount = discount > 0 ? Math.round(subtotal * (discount / 100)) : 0; // PYG entero
  const total = subtotal - discountAmount;
  const isFreeShipping = subtotal >= 300000;

  const applyCoupon = () => {
    const code = coupon.trim().toUpperCase();
    if (code && code === (settings.welcomeCode || '').toUpperCase()) {
      setDiscount(settings.welcomePercent);
      setCouponMsg(`Cupón aplicado: ${settings.welcomePercent}% OFF`);
    } else {
      setDiscount(0);
      setCouponMsg('Cupón inválido');
    }
    setTimeout(() => setCouponMsg(null), 3000);
  };

  useEffect(() => {
    const eventID = newEventId();
    const contents = cart.map((item) => ({ id: item.perfume.code, quantity: item.quantity, item_price: item.price }));
    trackEvent('InitiateCheckout', {
      content_ids: cart.map(item => item.perfume.code),
      content_type: 'product',
      contents,
      value: total,
      currency: 'PYG',
      num_items: cart.reduce((acc, item) => acc + item.quantity, 0)
    }, eventID);
    gaBeginCheckout(cart.map((i) => toItem(i.perfume, i.price, i.size, i.quantity)), total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Paso 1 -> 2: valida los datos y muestra los datos bancarios. */
  const goToPayment = () => {
    const errs: Partial<Record<Field, string>> = {};
    const check = (field: Field, msg: string | null) => { if (msg) errs[field] = msg; };
    check('name', validateName(formData.name));
    check('phone', validatePhone(formData.phone));
    check('cityAndNeighborhood', validateCity(formData.cityAndNeighborhood));
    check('address', validateAddress(formData.address));
    check('email', validateEmail(formData.email, paysWithCard));
    check('document', validateDocument(formData.document, paysWithCard));
    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      setError('Revisá los datos marcados.');
      setTimeout(() => setError(null), 3000);
      const first = document.querySelector('[aria-invalid="true"]') as HTMLElement | null;
      first?.focus();
      return;
    }
    if (cart.length === 0) {
      setError('Tu carrito está vacío.');
      setTimeout(() => setError(null), 3000);
      return;
    }
    setError(null);
    setOrderId((prev) => prev || newOrderId());
    setStep('pago');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pickReceipt = (file: File | null) => {
    if (!file) { setReceipt(null); setReceiptErr(null); return; }
    const err = validateReceipt(file);
    setReceiptErr(err);
    setReceipt(err ? null : file);
  };

  /** Paso 2 (tarjeta): crea la transacción en Pagopar, guarda el pedido y redirige. */
  const handleCardPayment = async () => {
    if (sending) return;
    setSending(true);
    setError(null);
    const items = cart.map((item) => ({
      code: item.perfume.code,
      name: item.perfume.name,
      size: item.size,
      price: item.price,
      quantity: item.quantity,
    }));
    try {
      // 1) Transacción en Pagopar (el servidor valida los precios).
      let start = cardStart;
      if (!start) {
        start = await startCardPayment({
          orderId,
          name: formData.name.trim(),
          phone: phoneClean,
          email: formData.email.trim(),
          document: formData.document.trim(),
          address: formData.address.trim(),
          cityAndNeighborhood: formData.cityAndNeighborhood.trim(),
          discountPercent: discount,
          items,
        });
        setCardStart(start);
      }

      // 2) Pedido en Firestore, con el hash para que el panel pueda verificar el pago.
      const order: Order = {
        orderId,
        status: 'pendiente',
        name: formData.name.trim(),
        phone: phoneClean,
        email: formData.email.trim(),
        document: formData.document.trim(),
        cityAndNeighborhood: formData.cityAndNeighborhood.trim(),
        address: formData.address.trim(),
        subtotal,
        discountPercent: discount,
        discountAmount,
        total,
        freeShipping: isFreeShipping,
        items,
        paymentMethod: PAY_CARD,
        pagoparHash: start.hash,
        pagoparStatus: 'pendiente',
      };
      let docId: string | undefined;
      try {
        docId = await saveOrder(order);
      } catch (e) {
        // No bloquea el pago: el panel igual lo encuentra por el número de pedido en Pagopar.
        console.warn('[Äura] No se pudo guardar el pedido:', e);
      }

      // 3) Memoria local para la página de resultado (mismo navegador).
      savePaymentSnapshot(start.hash, { orderId, docId, name: formData.name.trim(), total, items, createdAt: Date.now() });

      // 4) A Pagopar.
      window.location.href = start.url;
      setTimeout(() => setSending(false), 8000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos iniciar el pago con tarjeta. Probá con transferencia.');
      setSending(false);
    }
  };

  /** Paso 2: sube el comprobante, guarda el pedido y abre WhatsApp. */
  const handleCompleteOrder = async () => {
    if (sending) return;
    setSending(true);
    setError(null);

    const items = cart.map((item) => ({
      code: item.perfume.code,
      name: item.perfume.name,
      size: item.size,
      price: item.price,
      quantity: item.quantity,
    }));

    // 1) Comprobante (si lo adjuntó). Nunca bloquea la venta si falla.
    let receiptUrl: string | undefined;
    if (receipt) {
      try {
        receiptUrl = await uploadReceipt(receipt, orderId);
      } catch (e) {
        console.warn('[Äura] No se pudo subir el comprobante:', e);
        setReceiptErr('No se pudo subir el comprobante. Podés enviarlo por WhatsApp.');
      }
    }

    // 2) Pedido en Firestore (para verlo en /admin). Tampoco bloquea la venta.
    const order: Order = {
      orderId,
      status: 'pendiente',
      name: formData.name.trim(),
      phone: phoneClean,
      cityAndNeighborhood: formData.cityAndNeighborhood.trim(),
      address: formData.address.trim(),
      subtotal,
      discountPercent: discount,
      discountAmount,
      total,
      freeShipping: isFreeShipping,
      items,
      paymentMethod: formData.paymentMethod,
      ...(receiptUrl ? { receiptUrl } : {}),
    };
    try {
      await saveOrder(order);
    } catch (e) {
      console.warn('[Äura] No se pudo guardar el pedido:', e);
    }

    // 3) Tracking: el redirect a WhatsApp es un Lead (el Purchase real se
    //    confirma desde /admin cuando se verifica la transferencia).
    const eventID = newEventId();
    const contentIds = cart.map(item => item.perfume.code);
    const contents = cart.map(item => ({ id: item.perfume.code, quantity: item.quantity, item_price: item.price }));
    const numItems = cart.reduce((acc, item) => acc + item.quantity, 0);

    trackEvent('Lead', {
      content_ids: contentIds, content_type: 'product', contents,
      value: total, currency: 'PYG', num_items: numItems,
    }, eventID);
    capiTrack({
      eventName: 'Lead', eventId: eventID, value: total, currency: 'PYG',
      contentIds, contents, numItems,
      userData: { phone: phoneClean, firstName: formData.name, city: formData.cityAndNeighborhood },
      actionSource: 'website',
    });
    gaGenerateLead(cart.map((i) => toItem(i.perfume, i.price, i.size, i.quantity)), total, orderId);

    // 4) WhatsApp con todo el detalle
    const itemsText = cart.map(item => `- ${item.quantity}x ${item.perfume.name} (${item.perfume.code}) ${item.size}: Gs. ${(item.price * item.quantity).toLocaleString('es-PY')}`).join('\n');
    const message = encodeURIComponent(
      `*PEDIDO WEB · ${orderId}*\n\n` +
      `*Datos del Cliente:*\n` +
      `Nombre: ${formData.name}\n` +
      `Teléfono: ${phoneClean}\n` +
      `Ciudad y Barrio: ${formData.cityAndNeighborhood}\n` +
      `Dirección: ${formData.address}\n` +
      `Pago: ${formData.paymentMethod}\n\n` +
      `*Pedido:*\n${itemsText}\n\n` +
      `Subtotal: Gs. ${subtotal.toLocaleString('es-PY')}\n` +
      (discountAmount > 0 ? `Descuento (${discount}%): -Gs. ${discountAmount.toLocaleString('es-PY')}\n` : '') +
      `Envío: ${isFreeShipping ? 'GRATIS' : 'A coordinar según zona'}\n` +
      `*TOTAL A TRANSFERIR: Gs. ${total.toLocaleString('es-PY')}*\n` +
      (isFreeShipping ? '\n' : `_El costo del envío se coordina aparte._\n\n`) +
      (receiptUrl
        ? `*Comprobante adjunto:*\n${receiptUrl}`
        : `_Adjunto el comprobante de la transferencia en este chat._`)
    );

    setSending(false);
    window.open(`https://wa.me/${settings.whatsappNumber}?text=${message}`, '_blank');
  };

  const inputCls = 'w-full bg-zinc-50/50 border-none px-4 sm:px-6 py-4 sm:py-5 rounded-sm focus:ring-1 focus:ring-zinc-900 transition-all placeholder:text-zinc-300 text-sm aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-red-500 aria-[invalid=true]:bg-red-50/40';
  const labelCls = 'text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] text-zinc-600 block mb-2 sm:mb-3';

  return (
    <div className="min-h-screen bg-[#F9F9F9] animate-fade-in pb-20">
      {/* Navbar Minimalista */}
      <nav className="bg-white border-b border-zinc-100 py-4 sm:py-6 px-4 sm:px-12 flex items-center sticky top-0 z-50">
        <button
          onClick={() => (step === 'pago' ? setStep('datos') : onBack())}
          className="flex items-center gap-1 sm:gap-2 text-[11px] sm:text-xs font-bold tracking-widest text-zinc-600 hover:text-zinc-900 transition-colors uppercase"
        >
          <ChevronLeft size={14} /> VOLVER
        </button>
        <h1 className="flex-grow text-center text-xl sm:text-4xl font-luxury tracking-[0.1em] sm:tracking-[0.2em] text-zinc-900 uppercase">
          {step === 'datos' ? 'FINALIZAR PEDIDO' : 'REALIZAR EL PAGO'}
        </h1>
        <div className="w-16 sm:w-20"></div>
      </nav>

      {/* Pasos */}
      <div className="container mx-auto px-4 sm:px-12 mt-6 sm:mt-10">
        <div className="flex items-center justify-center gap-3 sm:gap-4 mb-6 sm:mb-10">
          {[{ n: 1, k: 'datos', label: 'Tus datos' }, { n: 2, k: 'pago', label: paysWithCard ? 'Pago con tarjeta' : 'Pago y comprobante' }].map((s, i) => {
            const active = step === s.k;
            const done = s.k === 'datos' && step === 'pago';
            return (
              <React.Fragment key={s.k}>
                {i > 0 && <span className="h-px w-6 sm:w-12 bg-zinc-200" />}
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    done ? 'bg-green-600 text-white' : active ? 'bg-aura-ink text-white' : 'bg-zinc-200 text-zinc-500'
                  }`}>
                    {done ? <Check size={12} /> : s.n}
                  </span>
                  <span className={`text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.15em] ${active ? 'text-aura-ink' : 'text-zinc-400'}`}>
                    {s.label}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-12">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-sm text-xs font-bold tracking-widest uppercase animate-fade-in flex items-center gap-3">
            <Info size={16} />
            {error}
          </div>
        )}
        <div className="flex flex-col lg:flex-row gap-6 sm:gap-10">

          {/* Columna Izquierda */}
          <div className="flex-grow space-y-6 sm:space-y-8">
            {step === 'datos' ? (
              <div className="bg-white p-6 sm:p-12 shadow-sm border border-zinc-50 rounded-sm">
                <div className="flex items-center gap-3 mb-6 sm:mb-10 border-b border-zinc-100 pb-4 sm:pb-6">
                  <Truck size={18} className="text-zinc-900" />
                  <h2 className="text-xs sm:text-sm font-bold uppercase tracking-[0.3em] text-zinc-900">DATOS DE ENVÍO</h2>
                </div>

                <div className="space-y-6 sm:space-y-8">
                  <div>
                    <label className={labelCls}>NOMBRE Y APELLIDO</label>
                    <input type="text" placeholder="Juan Pérez" className={inputCls} autoComplete="name" maxLength={80}
                      aria-invalid={Boolean(fieldErrors.name)}
                      value={formData.name} onChange={(e) => setField('name', e.target.value)} />
                    <FieldError msg={fieldErrors.name} />
                  </div>
                  <div>
                    <label className={labelCls}>CELULAR (WHATSAPP)</label>
                    <input type="tel" inputMode="tel" placeholder="0981 123 456" className={inputCls} autoComplete="tel" maxLength={20}
                      aria-invalid={Boolean(fieldErrors.phone)}
                      value={formData.phone} onChange={(e) => setField('phone', e.target.value.replace(/[^\d\s+()-]/g, ''))} />
                    <FieldError msg={fieldErrors.phone} />
                  </div>
                  <div>
                    <label className={labelCls}>CIUDAD Y BARRIO</label>
                    <input type="text" placeholder="Ej: Asunción, Barrio Jara" className={inputCls} maxLength={80}
                      aria-invalid={Boolean(fieldErrors.cityAndNeighborhood)}
                      value={formData.cityAndNeighborhood} onChange={(e) => setField('cityAndNeighborhood', e.target.value)} />
                    <FieldError msg={fieldErrors.cityAndNeighborhood} />
                  </div>
                  <div>
                    <label className={labelCls}>DIRECCIÓN EXACTA</label>
                    <textarea placeholder="Ej: Av. Mcal López 1234 c/ San Martín" rows={3} className={`${inputCls} resize-none`} maxLength={300}
                      aria-invalid={Boolean(fieldErrors.address)}
                      value={formData.address} onChange={(e) => setField('address', e.target.value)} />
                    <FieldError msg={fieldErrors.address} />
                  </div>
                  <div>
                    <label className={labelCls}>MÉTODO DE PAGO</label>
                    {isCardPaymentEnabled ? (
                      <div className="space-y-2">
                        {[
                          { id: PAY_TRANSFER, label: 'Transferencia bancaria / QR', hint: 'Te mostramos los datos de la cuenta y adjuntás el comprobante.', icon: Landmark },
                          { id: PAY_CARD, label: 'Tarjeta de crédito o débito', hint: 'Pago online seguro procesado por Pagopar (Bancard).', icon: CreditCard },
                        ].map((opt) => {
                          const active = formData.paymentMethod === opt.id;
                          const Icon = opt.icon;
                          return (
                            <label key={opt.id}
                              className={`flex items-start gap-4 px-4 sm:px-6 py-4 rounded-sm border cursor-pointer transition-colors ${
                                active ? 'border-aura-ink bg-zinc-50' : 'border-zinc-100 bg-zinc-50/50 hover:border-zinc-300'
                              }`}>
                              <input type="radio" name="paymentMethod" value={opt.id} checked={active}
                                onChange={() => setFormData({ ...formData, paymentMethod: opt.id })}
                                className="mt-1 accent-aura-ink" />
                              <Icon size={18} className="mt-0.5 shrink-0 text-zinc-900" />
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold text-zinc-900">{opt.label}</span>
                                <span className="block text-[11px] text-zinc-500 leading-relaxed mt-0.5">{opt.hint}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="w-full bg-zinc-50/50 border-none px-4 sm:px-6 py-4 sm:py-5 rounded-sm text-sm text-zinc-900 font-medium">
                        Transferencia Bancaria / QR
                      </div>
                    )}
                  </div>
                  {paysWithCard && (
                    <>
                      <div>
                        <label className={labelCls}>CORREO ELECTRÓNICO</label>
                        <input type="email" placeholder="tu@correo.com" className={inputCls} autoComplete="email" maxLength={120}
                          aria-invalid={Boolean(fieldErrors.email)}
                          value={formData.email} onChange={(e) => setField('email', e.target.value)} />
                        <FieldError msg={fieldErrors.email} />
                        <p className="text-[11px] text-zinc-400 mt-2">Lo pide Pagopar para el pago con tarjeta.</p>
                      </div>
                      <div>
                        <label className={labelCls}>C.I. (SOLO NÚMEROS)</label>
                        <input type="text" inputMode="numeric" placeholder="4348713" className={inputCls} maxLength={12}
                          aria-invalid={Boolean(fieldErrors.document)}
                          value={formData.document} onChange={(e) => setField('document', e.target.value.replace(/[^\d.\s-]/g, ''))} />
                        <FieldError msg={fieldErrors.document} />
                        <p className="text-[11px] text-zinc-400 mt-2">Sin puntos ni dígito verificador. Lo pide Pagopar para el pago con tarjeta.</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : paysWithCard ? (
              <div className="bg-white p-6 sm:p-10 shadow-sm border border-zinc-50 rounded-sm">
                <div className="flex items-center gap-3 mb-6 border-b border-zinc-100 pb-4 sm:pb-6">
                  <CreditCard size={18} className="text-zinc-900" />
                  <h2 className="text-xs sm:text-sm font-bold uppercase tracking-[0.3em] text-zinc-900">PAGO CON TARJETA</h2>
                </div>

                <div className="bg-aura-ink text-white p-5 sm:p-6 rounded-sm mb-6 flex items-center justify-between gap-4">
                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-[0.25em] text-aura-gold mb-1">Monto a pagar</span>
                    <span className="block text-2xl sm:text-3xl font-bold tabular">Gs. {total.toLocaleString('es-PY')}</span>
                    <span className="block text-[9px] text-white/50 uppercase tracking-widest mt-1">
                      {isFreeShipping ? 'Envío gratis incluido' : 'Envío aparte · lo coordinamos por WhatsApp'}
                    </span>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/60 text-right shrink-0">
                    Pedido<br /><span className="text-white tabular">{orderId}</span>
                  </span>
                </div>

                <p className="text-sm text-zinc-700 leading-relaxed">
                  Al tocar <strong>Pagar con tarjeta</strong> te llevamos al checkout seguro de <strong>Pagopar</strong>,
                  donde podés pagar con tarjeta de crédito o débito (Visa, Mastercard y otras, con cuotas según tu banco),
                  código QR o billetera electrónica. Al terminar volvés a Äura con la confirmación del pago.
                </p>
                <ul className="mt-5 space-y-2 text-[11px] text-zinc-500">
                  <li className="flex items-center gap-2"><Lock size={12} className="text-aura-gold-deep shrink-0" /> Tus datos de tarjeta los procesa Pagopar/Bancard; nunca pasan por nuestra web.</li>
                  <li className="flex items-center gap-2"><Check size={12} className="text-aura-gold-deep shrink-0" /> El pedido se confirma solo cuando Pagopar aprueba el pago.</li>
                  <li className="flex items-center gap-2"><MessageCircle size={12} className="text-aura-gold-deep shrink-0" /> El envío lo coordinamos por WhatsApp después de la confirmación.</li>
                </ul>
              </div>
            ) : (
              <>
                {/* Datos bancarios */}
                <div className="bg-white p-6 sm:p-10 shadow-sm border border-zinc-50 rounded-sm">
                  <div className="flex items-center gap-3 mb-6 border-b border-zinc-100 pb-4 sm:pb-6">
                    <Landmark size={18} className="text-zinc-900" />
                    <h2 className="text-xs sm:text-sm font-bold uppercase tracking-[0.3em] text-zinc-900">1 · TRANSFERÍ EL MONTO</h2>
                  </div>

                  <div className="bg-aura-ink text-white p-5 sm:p-6 rounded-sm mb-6 flex items-center justify-between gap-4">
                    <div>
                      <span className="block text-[9px] font-bold uppercase tracking-[0.25em] text-aura-gold mb-1">Monto a transferir</span>
                      <span className="block text-2xl sm:text-3xl font-bold tabular">Gs. {total.toLocaleString('es-PY')}</span>
                      <span className="block text-[9px] text-white/50 uppercase tracking-widest mt-1">
                        {isFreeShipping ? 'Envío gratis incluido' : 'Envío aparte · lo coordinamos por WhatsApp'}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/60 text-right shrink-0">
                      Pedido<br /><span className="text-white tabular">{orderId}</span>
                    </span>
                  </div>

                  <div className="border border-zinc-100 rounded-sm px-4 sm:px-5">
                    <CopyRow label="Banco" value={settings.bankName} />
                    <CopyRow label="Nº de cuenta" value={settings.bankAccount} big />
                    <CopyRow label="Titular" value={settings.bankHolder} />
                    <CopyRow label="C.I." value={settings.bankCi} />
                    <CopyRow label="Alias" value={settings.bankAlias} />
                  </div>

                  <p className="text-[11px] text-zinc-500 leading-relaxed mt-4">
                    Podés transferir desde tu app bancaria o billetera usando el número de cuenta o el alias.
                    El pedido se reserva una vez que verificamos la transferencia.
                  </p>
                </div>

                {/* Comprobante */}
                <div className="bg-white p-6 sm:p-10 shadow-sm border border-zinc-50 rounded-sm">
                  <div className="flex items-center gap-3 mb-6 border-b border-zinc-100 pb-4 sm:pb-6">
                    <FileText size={18} className="text-zinc-900" />
                    <h2 className="text-xs sm:text-sm font-bold uppercase tracking-[0.3em] text-zinc-900">2 · ADJUNTÁ EL COMPROBANTE</h2>
                  </div>

                  {receipt ? (
                    <div className="flex items-center gap-4 border border-green-200 bg-green-50/60 p-4 rounded-sm">
                      {receipt.type.startsWith('image/') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={URL.createObjectURL(receipt)} alt="Comprobante" className="w-16 h-20 object-cover border border-zinc-200 rounded-sm" />
                      ) : (
                        <div className="w-16 h-20 bg-white border border-zinc-200 rounded-sm flex items-center justify-center">
                          <FileText size={22} className="text-zinc-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 truncate">{receipt.name}</p>
                        <p className="text-[11px] text-zinc-500">{(receipt.size / 1024).toFixed(0)} KB · listo para enviar</p>
                      </div>
                      <button type="button" onClick={() => pickReceipt(null)} aria-label="Quitar comprobante"
                        className="p-2 text-zinc-400 hover:text-red-600 transition-colors">
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-zinc-200 hover:border-aura-gold rounded-sm py-10 cursor-pointer transition-colors">
                      <Upload size={22} className="text-zinc-400" />
                      <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-600">Subir comprobante</span>
                      <span className="text-[10px] text-zinc-400">Foto o PDF · hasta 5 MB</span>
                      <input type="file" accept={RECEIPT_ACCEPT} className="hidden"
                        onChange={(e) => pickReceipt(e.target.files?.[0] || null)} />
                    </label>
                  )}

                  {receiptErr && (
                    <p className="mt-3 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-sm">{receiptErr}</p>
                  )}
                  <p className="text-[11px] text-zinc-400 leading-relaxed mt-4">
                    Opcional: si preferís, podés mandarlo directamente por WhatsApp en el siguiente paso.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Columna Derecha: Resumen */}
          <div className="w-full lg:w-[400px] shrink-0">
            <div className="bg-white p-6 sm:p-12 shadow-sm border border-zinc-50 rounded-sm sticky top-24">
              <div className="flex items-center gap-3 mb-6 sm:mb-10 border-b border-zinc-100 pb-4 sm:pb-6">
                <Wallet size={18} className="text-zinc-900" />
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-[0.3em] text-zinc-900">RESUMEN</h2>
              </div>

              {step === 'datos' && (
                <div className="bg-zinc-50/50 p-4 sm:p-6 rounded-sm mb-6 sm:mb-10">
                  <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-zinc-600 block mb-2 sm:mb-3">CÓDIGO DE DESCUENTO</label>
                  <div className="flex gap-2">
                    <input type="text" placeholder="INGRESAR CUPÓN"
                      className="flex-grow bg-white border border-zinc-100 px-3 sm:px-4 py-2 sm:py-3 rounded-sm text-[9px] sm:text-[10px] focus:outline-none focus:border-zinc-900 transition-all tracking-widest uppercase"
                      value={coupon} onChange={(e) => setCoupon(e.target.value)} />
                    <button onClick={applyCoupon} className="bg-zinc-900 text-white px-4 sm:px-5 py-2 sm:py-3 rounded-sm text-[9px] sm:text-[10px] font-bold tracking-widest uppercase hover:bg-zinc-800 transition-all">
                      APLICAR
                    </button>
                  </div>
                  {couponMsg && (
                    <p className={`mt-2 text-[9px] font-bold uppercase tracking-widest ${discount > 0 ? 'text-green-600' : 'text-red-500'}`}>{couponMsg}</p>
                  )}
                </div>
              )}

              <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-10 border-b border-zinc-100 pb-6 sm:pb-10">
                {cart.length === 0 ? (
                  <p className="text-zinc-400 text-center text-xs">Tu carrito está vacío</p>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-[10px] sm:text-[11px] font-bold text-zinc-900 uppercase tracking-wider line-clamp-1">{item.perfume.name}</span>
                        <span className="text-[8px] sm:text-[9px] text-zinc-400 uppercase tracking-widest">{item.perfume.code} · {item.size}</span>

                        {step === 'datos' && (
                          <div className="flex items-center gap-3 mt-2">
                            <button onClick={() => onUpdateQuantity(item.id, -1)} className="p-1 hover:bg-zinc-100 rounded-full transition-colors">
                              <Minus size={12} className="text-zinc-400" />
                            </button>
                            <span className="text-[10px] font-bold text-zinc-900">{item.quantity}</span>
                            <button onClick={() => onUpdateQuantity(item.id, 1)} className="p-1 hover:bg-zinc-100 rounded-full transition-colors">
                              <Plus size={12} className="text-zinc-400" />
                            </button>
                            <button onClick={() => onRemoveItem(item.id)} className="ml-2 p-1 hover:bg-red-50 text-zinc-300 hover:text-red-500 rounded-full transition-colors">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                        {step === 'pago' && (
                          <span className="text-[9px] text-zinc-400 mt-1">x{item.quantity}</span>
                        )}
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
                    <span className="text-[11px] sm:text-xs font-bold text-aura-gold uppercase tracking-widest">DESCUENTO ({discount}%)</span>
                    <span className="text-[11px] sm:text-xs font-bold text-aura-gold">-Gs. {discountAmount.toLocaleString('es-PY')}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[11px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest">ENVÍO</span>
                  {isFreeShipping ? (
                    <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest bg-green-50 px-2 py-1 rounded-sm">GRATIS</span>
                  ) : (
                    <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest">A coordinar</span>
                  )}
                </div>
              </div>

              <div className="border-t-[1px] border-dashed border-zinc-200 pt-4 sm:pt-6 flex justify-between items-end gap-3 mb-3">
                <div className="flex flex-col leading-none">
                  <span className="text-lg sm:text-2xl font-luxury font-bold text-zinc-900">TOTAL</span>
                  <span className="text-[9px] sm:text-[10px] text-zinc-400 uppercase tracking-[0.18em] mt-1">{paysWithCard ? 'a pagar' : 'a transferir'}</span>
                </div>
                <span className="text-lg sm:text-2xl font-bold text-zinc-900 whitespace-nowrap">Gs. {total.toLocaleString('es-PY')}</span>
              </div>

              {!isFreeShipping && (
                <p className="text-[10px] sm:text-[11px] text-zinc-500 leading-relaxed mb-6 sm:mb-8">
                  El envío no está incluido: se cotiza según tu zona y lo coordinamos por WhatsApp
                  después de tu pedido. Por ahora {paysWithCard ? 'pagás' : 'transferí'} solamente este monto.
                </p>
              )}
              {isFreeShipping && <div className="mb-6 sm:mb-8" />}

              {/* Sellos de confianza */}
              <div className="grid grid-cols-2 gap-2 mb-5">
                {['Envío gratis +300k', 'Extrait 30% macerado 21d', 'Atención por WhatsApp'].map((t) => (
                  <div key={t} className="flex items-center gap-1.5 text-[8px] font-semibold text-zinc-500 uppercase tracking-[0.1em]">
                    <ShieldCheck size={12} className="text-aura-gold-deep shrink-0" />
                    {t}
                  </div>
                ))}
              </div>

              {step === 'datos' ? (
                <button
                  onClick={goToPayment}
                  className="w-full bg-aura-ink text-white py-4 sm:py-5 rounded-sm text-[10px] sm:text-[11px] font-bold tracking-[0.2em] uppercase flex items-center justify-center gap-3 hover:bg-aura-gold transition-all shadow-[0_10px_30px_-10px_rgba(12,10,9,0.4)] active:scale-95"
                >
                  {paysWithCard ? <CreditCard size={17} /> : <Landmark size={17} />}
                  CONTINUAR AL PAGO
                </button>
              ) : paysWithCard ? (
                <button
                  onClick={handleCardPayment}
                  disabled={sending}
                  className="w-full bg-aura-ink text-white py-4 sm:py-5 rounded-sm text-[10px] sm:text-[11px] font-bold tracking-[0.2em] uppercase flex items-center justify-center gap-3 hover:bg-aura-gold transition-all shadow-[0_10px_30px_-10px_rgba(12,10,9,0.4)] active:scale-95 disabled:opacity-60"
                >
                  {sending ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
                  {sending ? 'ABRIENDO PAGOPAR…' : 'PAGAR CON TARJETA'}
                </button>
              ) : (
                <button
                  onClick={handleCompleteOrder}
                  disabled={sending}
                  className="w-full bg-aura-ink text-white py-4 sm:py-5 rounded-sm text-[10px] sm:text-[11px] font-bold tracking-[0.2em] uppercase flex items-center justify-center gap-3 hover:bg-aura-gold transition-all shadow-[0_10px_30px_-10px_rgba(12,10,9,0.4)] active:scale-95 disabled:opacity-60"
                >
                  {sending ? <Loader2 size={18} className="animate-spin" /> : <MessageCircle size={18} className="text-[#25D366]" fill="currentColor" />}
                  {sending ? 'ENVIANDO…' : 'CONFIRMAR PAGO Y ENVIAR'}
                </button>
              )}

              <button
                onClick={() => (step === 'pago' ? setStep('datos') : onBack())}
                className="w-full mt-3 border border-zinc-100 text-zinc-400 py-4 sm:py-5 rounded-sm text-[9px] sm:text-[10px] font-bold tracking-[0.2em] uppercase flex items-center justify-center gap-3 hover:bg-zinc-50 transition-all active:scale-95"
              >
                {step === 'pago' ? 'VOLVER A MIS DATOS' : 'SEGUIR COMPRANDO'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Checkout;
