'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, Loader2, MessageCircle, RefreshCw, CreditCard, XCircle } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useCart } from '../context/CartContext';
import {
  fetchPaymentStatus,
  pagoparCheckoutUrl,
  readPaymentSnapshot,
  type PaymentSnapshot,
  type PaymentStatus,
} from '../lib/payments';
import { errorText, reportIncident } from '../lib/incidentsService';
import { trackEvent } from '../lib/pixel';
import { capiTrack } from '../lib/tracking';
import { gaPurchase } from '../lib/gtag';

const POLL_MS = 5000;
const POLL_MAX = 24; // ~2 minutos: Pagopar suele confirmar en segundos

const fmt = (n: number) => `Gs. ${(n || 0).toLocaleString('es-PY')}`;
const montoNumber = (s: string) => Math.round(Number(String(s || '').replace(/[^\d.]/g, '')) || 0);

/**
 * Resultado del pago con tarjeta. Pagopar redirige a ALBA (única URL de
 * la cuenta) y ALBA manda acá con el hash. Consultamos el estado real a
 * Pagopar y, si está pagado, registramos el Purchase (Pixel + CAPI con el
 * mismo event_id). El detalle del pedido sale de la memoria local que dejó
 * el checkout en este navegador.
 */
const PagoResultado: React.FC<{ hash: string }> = ({ hash }) => {
  const { settings } = useSettings();
  const { clearCart } = useCart();
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [snap, setSnap] = useState<PaymentSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const polls = useRef(0);
  const tracked = useRef(false);
  const reported = useRef(false);

  useEffect(() => setSnap(readPaymentSnapshot(hash)), [hash]);

  const load = useCallback(async () => {
    try {
      const data = await fetchPaymentStatus(hash);
      setStatus(data);
      setError(null);
    } catch (e) {
      const message = errorText(e, 'No pudimos consultar el pago.');
      setError(message);
      // Una sola alerta por visita: el cliente ya pagó (o cree que pagó) y no ve el resultado.
      if (!reported.current) {
        reported.current = true;
        const snapshot = readPaymentSnapshot(hash);
        reportIncident({
          source: 'verificacion-pago',
          message,
          detail: `hash ${hash}`,
          orderId: snapshot?.orderId,
          paymentMethod: 'tarjeta',
          total: snapshot?.total,
          customerName: snapshot?.name,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [hash]);

  useEffect(() => { void load(); }, [load]);

  // Mientras esté pendiente, re-consultamos cada 5 s.
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
    const orderId = snap?.orderId || status.orderId || hash;
    const key = `aura_purchase_${orderId}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
    } catch { /* noop */ }
    const value = snap?.total || montoNumber(status.monto);
    const items = snap?.items || [];
    const contents = items.map((i) => ({ id: i.code, quantity: i.quantity, item_price: i.price }));
    const numItems = items.reduce((a, i) => a + i.quantity, 0);
    trackEvent('Purchase', {
      content_ids: items.map((i) => i.code),
      content_type: 'product',
      contents,
      value,
      currency: 'PYG',
      num_items: numItems,
    }, orderId);
    capiTrack({
      eventName: 'Purchase', eventId: orderId, value, currency: 'PYG',
      contentIds: items.map((i) => i.code), contents, numItems,
      userData: { firstName: snap?.name },
      actionSource: 'website',
    });
    gaPurchase(
      items.map((i) => ({ item_id: i.code, item_name: i.name, item_brand: 'Äura Fragancias', item_category: 'Perfumes', item_variant: i.size, price: i.price, quantity: i.quantity })),
      value,
      orderId
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const orderLabel = snap?.orderId || status?.orderId || '';
  const total = snap?.total || montoNumber(status?.monto || '');
  const waText = encodeURIComponent(
    orderLabel
      ? `Hola Äura 👋 Pagué con tarjeta el pedido ${orderLabel}${total ? ` (${fmt(total)})` : ''}. Quiero coordinar el envío.`
      : 'Hola Äura 👋 Tengo una consulta sobre mi pago con tarjeta.'
  );
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
            <h1 className="font-luxury text-3xl sm:text-4xl text-aura-ink mb-4">No pudimos verificar el pago</h1>
            <p className="text-sm text-zinc-500 leading-relaxed mb-8">{error}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button type="button" onClick={() => { setLoading(true); void load(); }}
                className="inline-flex items-center justify-center gap-2 border border-zinc-200 text-zinc-600 px-8 py-4 rounded-sm text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-zinc-50 transition-colors">
                <RefreshCw size={14} /> Reintentar
              </button>
              <a href={waHref} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-aura-ink text-white px-8 py-4 rounded-sm text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-aura-gold transition-colors">
                <MessageCircle size={16} /> Escribinos por WhatsApp
              </a>
            </div>
          </>
        ) : status?.pagado ? (
          <>
            <span className="inline-flex w-16 h-16 rounded-full bg-green-600 text-white items-center justify-center mb-6">
              <CheckCircle2 size={30} />
            </span>
            <h1 className="font-luxury text-3xl sm:text-5xl text-aura-ink mb-4">¡Pago confirmado!</h1>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Recibimos <strong>{fmt(total)}</strong>
              {status.formaPago ? ` con ${status.formaPago}` : ''}
              {orderLabel ? <> por el pedido <strong className="tabular">{orderLabel}</strong></> : ''}.
              {status.numeroComprobante ? ` Comprobante N.º ${status.numeroComprobante}.` : ''}
            </p>
            <p className="text-sm text-zinc-500 leading-relaxed mt-3">
              Ahora coordinamos el envío por WhatsApp{snap?.name ? `, ${snap.name.split(' ')[0]}` : ''}. Tocá el botón y te respondemos con el costo según tu zona.
            </p>

            {snap?.items && snap.items.length > 0 && (
              <div className="mt-8 border border-zinc-100 rounded-sm text-left divide-y divide-zinc-100">
                {snap.items.map((i, idx) => (
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
              {status?.cancelado ? 'El pago se canceló' : 'Pago pendiente'}
            </h1>
            <p className="text-sm text-zinc-600 leading-relaxed">
              {status?.cancelado
                ? 'La transacción no se completó. Podés reintentar o escribirnos para pagar de otra forma.'
                : `Todavía no recibimos la confirmación de Pagopar${orderLabel ? ` para el pedido ${orderLabel}` : ''}. Si cerraste la página de pago antes de terminar, podés retomarlo desde acá.`}
            </p>
            {status?.descripcion && <p className="text-[12px] text-zinc-400 mt-3">{status.descripcion}</p>}
            {error && <p className="text-[12px] text-red-600 mt-3">{error}</p>}

            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
              <a href={pagoparCheckoutUrl(hash)}
                className="inline-flex items-center justify-center gap-2 bg-aura-ink text-white px-8 py-4 rounded-sm text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-aura-gold transition-colors">
                <CreditCard size={16} /> Retomar el pago con tarjeta
              </a>
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
