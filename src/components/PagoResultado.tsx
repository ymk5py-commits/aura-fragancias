'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, Loader2, MessageCircle, RefreshCw, CreditCard, XCircle } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useCart } from '../context/CartContext';
import { fetchPaymentStatus, startCardPayment, type PaymentStatus } from '../lib/payments';
import { trackEvent } from '../lib/pixel';
import { gaPurchase } from '../lib/gtag';

const POLL_MS = 5000;
const POLL_MAX = 24; // ~2 minutos: el webhook de Pagopar suele llegar en segundos

const fmt = (n: number) => `Gs. ${(n || 0).toLocaleString('es-PY')}`;
const montoNumber = (s: string) => Math.round(Number(String(s || '').replace(/[^\d.]/g, '')) || 0);

/**
 * Resultado del pago con tarjeta. Pagopar redirige acá con el hash del
 * pedido; consultamos el estado real y, si está pagado, registramos el
 * Purchase (Pixel con el mismo event_id que manda el servidor por CAPI).
 */
const PagoResultado: React.FC<{ hash: string }> = ({ hash }) => {
  const { settings } = useSettings();
  const { clearCart } = useCart();
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const polls = useRef(0);
  const tracked = useRef(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchPaymentStatus(hash);
      setStatus(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos consultar el pago.');
    } finally {
      setLoading(false);
    }
  }, [hash]);

  useEffect(() => { void load(); }, [load]);

  // Mientras esté pendiente, re-consultamos cada 5 s por si el webhook se demora.
  useEffect(() => {
    if (!status || status.pagado || status.cancelado) return;
    if (polls.current >= POLL_MAX) return;
    const t = setTimeout(() => { polls.current += 1; void load(); }, POLL_MS);
    return () => clearTimeout(t);
  }, [status, load]);

  // Purchase una sola vez por pedido + vaciar el carrito.
  useEffect(() => {
    if (!status?.pagado || tracked.current) return;
    tracked.current = true;
    clearCart();
    const key = `aura_purchase_${status.number || status.orderId}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
    } catch { /* noop */ }
    const value = status.total || montoNumber(status.monto);
    const contents = (status.items || []).map((i) => ({ id: i.code, quantity: i.quantity, item_price: i.price }));
    trackEvent('Purchase', {
      content_ids: (status.items || []).map((i) => i.code),
      content_type: 'product',
      contents,
      value,
      currency: 'PYG',
      num_items: (status.items || []).reduce((a, i) => a + i.quantity, 0),
    }, status.number || status.orderId);
    gaPurchase(
      (status.items || []).map((i) => ({ item_id: i.code, item_name: i.name, item_brand: 'Äura Fragancias', item_category: 'Perfumes', item_variant: i.size, price: i.price, quantity: i.quantity })),
      value,
      status.number || status.orderId
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const retry = async () => {
    if (!status || retrying) return;
    setRetrying(true);
    try {
      window.location.href = await startCardPayment(status.orderId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos abrir el pago.');
      setRetrying(false);
    }
  };

  const waText = status
    ? encodeURIComponent(`Hola Äura 👋 Pagué con tarjeta el pedido ${status.number} (${fmt(status.total)}). Quiero coordinar el envío.`)
    : encodeURIComponent('Hola Äura 👋 Tengo una consulta sobre mi pago con tarjeta.');
  const waHref = `https://wa.me/${settings.whatsappNumber}?text=${waText}`;

  return (
    <main className="min-h-[70vh] bg-[#F9F9F9] py-16 sm:py-24 px-4">
      <div className="max-w-2xl mx-auto bg-white shadow-sm border border-zinc-50 rounded-sm p-8 sm:p-14 text-center animate-fade-in">
        {loading ? (
          <div className="flex flex-col items-center gap-4 text-zinc-500 py-10">
            <Loader2 size={28} className="animate-spin text-aura-gold" />
            <p className="text-[11px] font-bold uppercase tracking-[0.2em]">Verificando tu pago…</p>
          </div>
        ) : error && !status ? (
          <>
            <XCircle size={40} className="mx-auto text-zinc-300 mb-6" />
            <h1 className="font-luxury text-3xl sm:text-4xl text-aura-ink mb-4">No encontramos ese pago</h1>
            <p className="text-sm text-zinc-500 leading-relaxed mb-8">{error}</p>
            <a href={waHref} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-aura-ink text-white px-8 py-4 rounded-sm text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-aura-gold transition-colors">
              <MessageCircle size={16} /> Escribinos por WhatsApp
            </a>
          </>
        ) : status?.pagado ? (
          <>
            <span className="inline-flex w-16 h-16 rounded-full bg-green-600 text-white items-center justify-center mb-6">
              <CheckCircle2 size={30} />
            </span>
            <h1 className="font-luxury text-3xl sm:text-5xl text-aura-ink mb-4">¡Pago confirmado!</h1>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Recibimos <strong>{fmt(status.total || montoNumber(status.monto))}</strong>
              {status.formaPago ? ` con ${status.formaPago}` : ''} por el pedido <strong className="tabular">{status.number}</strong>.
              {status.numeroComprobante ? ` Comprobante N.º ${status.numeroComprobante}.` : ''}
            </p>
            <p className="text-sm text-zinc-500 leading-relaxed mt-3">
              Ahora coordinamos el envío por WhatsApp{status.name ? `, ${status.name.split(' ')[0]}` : ''}. Tocá el botón y te respondemos con el costo según tu zona.
            </p>

            {status.items?.length > 0 && (
              <div className="mt-8 border border-zinc-100 rounded-sm text-left divide-y divide-zinc-100">
                {status.items.map((i, idx) => (
                  <div key={`${i.code}-${idx}`} className="flex justify-between items-center px-5 py-3 text-[12px]">
                    <span className="text-zinc-700"><span className="font-semibold">{i.quantity}×</span> {i.name} <span className="text-zinc-400">· {i.size}</span></span>
                    <span className="font-semibold text-zinc-900 tabular">{fmt(i.price * i.quantity)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
              <a href={waHref} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-aura-ink text-white px-8 py-4 rounded-sm text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-aura-gold transition-colors">
                <MessageCircle size={16} className="text-[#25D366]" fill="currentColor" /> Coordinar envío por WhatsApp
              </a>
              <Link href="/" className="inline-flex items-center justify-center gap-2 border border-zinc-200 text-zinc-600 px-8 py-4 rounded-sm text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-zinc-50 transition-colors">
                Seguir comprando
              </Link>
            </div>
          </>
        ) : (
          <>
            <span className="inline-flex w-16 h-16 rounded-full bg-zinc-100 text-zinc-500 items-center justify-center mb-6">
              <Clock size={28} />
            </span>
            <h1 className="font-luxury text-3xl sm:text-5xl text-aura-ink mb-4">
              {status?.pagoparStatus === 'reversado' ? 'El pago se reversó' : status?.cancelado ? 'El pago se canceló' : 'Pago pendiente'}
            </h1>
            <p className="text-sm text-zinc-600 leading-relaxed">
              {status?.pagoparStatus === 'reversado'
                ? 'La transacción no se completó y el dinero volvió a tu cuenta. Podés reintentar o escribirnos para pagar de otra forma.'
                : `Todavía no recibimos la confirmación de Pagopar para el pedido ${status?.number || ''}. Si cerraste la página de pago antes de terminar, podés retomarlo desde acá.`}
            </p>
            {status?.descripcion && <p className="text-[12px] text-zinc-400 mt-3">{status.descripcion}</p>}
            {error && <p className="text-[12px] text-red-600 mt-3">{error}</p>}

            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
              <button type="button" onClick={() => void retry()} disabled={retrying}
                className="inline-flex items-center justify-center gap-2 bg-aura-ink text-white px-8 py-4 rounded-sm text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-aura-gold transition-colors disabled:opacity-60">
                {retrying ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                {retrying ? 'Abriendo Pagopar…' : 'Reintentar pago con tarjeta'}
              </button>
              <button type="button" onClick={() => { setLoading(true); void load(); }}
                className="inline-flex items-center justify-center gap-2 border border-zinc-200 text-zinc-600 px-8 py-4 rounded-sm text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-zinc-50 transition-colors">
                <RefreshCw size={14} /> Actualizar estado
              </button>
            </div>
            <a href={waHref} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-6 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500 hover:text-aura-ink transition-colors">
              <MessageCircle size={14} /> ¿Dudas? Escribinos por WhatsApp
            </a>
          </>
        )}
      </div>
    </main>
  );
};

export default PagoResultado;
