'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Loader2, FileText, ExternalLink, CheckCircle2, XCircle, PackageOpen, Search, Phone, MapPin, RefreshCw, CreditCard,
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { subscribeOrders, setOrderStatus, updateOrderFields } from '../lib/ordersService';
import { fetchPaymentStatus, isCardPayment } from '../lib/payments';

const STATUS_STYLE: Record<OrderStatus, string> = {
  pendiente: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmado: 'bg-green-50 text-green-700 border-green-200',
  cancelado: 'bg-zinc-100 text-zinc-500 border-zinc-200',
};

const fmt = (n: number) => `Gs. ${(n || 0).toLocaleString('es-PY')}`;

/**
 * Pedidos entrantes de la web. Cuando verificás la transferencia (comprobante),
 * "Confirmar venta" marca el pedido y dispara el Purchase REAL a Meta por CAPI.
 */
const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<OrderStatus | 'todos'>('todos');
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    let unsub: (() => void) | undefined;
    subscribeOrders((list) => { setOrders(list); setLoading(false); }).then((u) => { unsub = u; });
    return () => unsub?.();
  }, []);

  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(''), 4000); };

  /**
   * Pedidos con tarjeta: Pagopar es la fuente de verdad. Consultamos el
   * estado real y, si está pagado, dejamos el pedido confirmado con los
   * datos del cobro (forma de pago, comprobante).
   */
  const verifyCard = async (o: Order, silent = false): Promise<boolean> => {
    if (!o.id || !o.pagoparHash) return false;
    setBusy(o.id);
    try {
      const st = await fetchPaymentStatus(o.pagoparHash);
      if (st.pagado) {
        await updateOrderFields(o.id, {
          status: 'confirmado',
          pagoparStatus: 'pagado',
          paidAt: Date.now(),
          pagoparPayment: {
            formaPago: st.formaPago,
            formaPagoId: st.formaPagoId,
            numeroComprobante: st.numeroComprobante,
            fechaPago: st.fechaPago,
            monto: st.monto,
          },
        });
        if (!silent) notify(`✓ ${o.orderId} pagado con ${st.formaPago || 'Pagopar'}.`);
        return true;
      }
      if (!silent) notify(`${o.orderId}: ${st.titulo || 'todavía sin pagar'}.`);
    } catch (e) {
      if (!silent) notify(e instanceof Error ? e.message : 'No se pudo consultar Pagopar.');
    } finally {
      setBusy(null);
    }
    return false;
  };

  // Al abrir la bandeja, verificamos una vez los pedidos con tarjeta pendientes.
  const verified = React.useRef(false);
  useEffect(() => {
    if (loading || verified.current) return;
    const pending = orders.filter((o) => o.status === 'pendiente' && o.pagoparHash && o.pagoparStatus !== 'pagado');
    if (!pending.length) return;
    verified.current = true;
    (async () => {
      let paid = 0;
      for (const o of pending) if (await verifyCard(o, true)) paid++;
      if (paid) notify(`✓ ${paid} ${paid === 1 ? 'pago con tarjeta confirmado' : 'pagos con tarjeta confirmados'} por Pagopar.`);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, orders]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return orders
      .filter((o) => filter === 'todos' || o.status === filter)
      .filter((o) => !q || [o.orderId, o.name, o.phone, o.cityAndNeighborhood].some((f) => (f || '').toLowerCase().includes(q)));
  }, [orders, query, filter]);

  const pendientes = orders.filter((o) => o.status === 'pendiente').length;
  const confirmados = orders.filter((o) => o.status === 'confirmado');
  const facturado = confirmados.reduce((a, o) => a + (o.total || 0), 0);

  /** Marca confirmado + envía el Purchase real a Meta. */
  const confirmSale = async (o: Order) => {
    if (!o.id) return;
    if (!confirm(`¿Confirmar la venta ${o.orderId} por ${fmt(o.total)}?\n\nSe marcará como pagada y se enviará la conversión a Meta.`)) return;
    setBusy(o.id);
    try {
      await setOrderStatus(o.id, 'confirmado');
      const res = await fetch('/api/meta-capi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: 'Purchase',
          eventId: o.orderId,
          value: o.total,
          currency: 'PYG',
          contentIds: o.items?.map((i) => i.code),
          contents: o.items?.map((i) => ({ id: i.code, quantity: i.quantity, item_price: i.price })),
          numItems: o.items?.reduce((a, i) => a + i.quantity, 0),
          userData: { phone: o.phone, firstName: o.name, city: o.cityAndNeighborhood },
          actionSource: 'website',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (json.skipped) notify('Pedido confirmado. (Falta META_CAPI_TOKEN para enviar la conversión a Meta.)');
      else if (json.ok) notify(`✓ Venta ${o.orderId} confirmada y Purchase enviado a Meta.`);
      else notify(`Pedido confirmado, pero Meta rechazó el evento: ${JSON.stringify(json.meta?.error || json).slice(0, 120)}`);
    } catch {
      notify('Se marcó el pedido, pero falló el envío a Meta.');
    } finally {
      setBusy(null);
    }
  };

  const cancel = async (o: Order) => {
    if (!o.id) return;
    if (!confirm(`¿Cancelar el pedido ${o.orderId}?`)) return;
    setBusy(o.id);
    try { await setOrderStatus(o.id, 'cancelado'); notify('Pedido cancelado.'); }
    catch { notify('No se pudo cancelar.'); }
    finally { setBusy(null); }
  };

  const when = (o: Order) => {
    const ts = o.createdAt as { seconds?: number } | undefined;
    if (!ts?.seconds) return '—';
    return new Date(ts.seconds * 1000).toLocaleString('es-PY', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-zinc-500 text-sm py-16 justify-center"><Loader2 size={18} className="animate-spin" /> Cargando pedidos…</div>;
  }

  return (
    <div>
      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Pedidos', value: orders.length },
          { label: 'Pendientes', value: pendientes },
          { label: 'Confirmados', value: confirmados.length },
          { label: 'Facturado', value: fmt(facturado) },
        ].map((m) => (
          <div key={m.label} className="bg-white border border-zinc-100 p-4">
            <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 mb-1">{m.label}</span>
            <span className="block text-xl font-luxury font-semibold text-aura-ink tabular">{m.value}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-luxury font-semibold text-aura-ink">Pedidos</h2>
          <p className="text-[12px] text-zinc-500">Verificá el comprobante y confirmá la venta para enviar el Purchase a Meta.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar pedido, nombre…"
              className="w-full border border-zinc-200 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-aura-ink" />
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value as OrderStatus | 'todos')}
            className="border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:border-aura-ink">
            <option value="todos">Todos</option>
            <option value="pendiente">Pendientes</option>
            <option value="confirmado">Confirmados</option>
            <option value="cancelado">Cancelados</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-zinc-100 py-16 text-center">
          <PackageOpen size={28} className="text-zinc-300 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">
            {orders.length === 0 ? 'Todavía no entró ningún pedido desde la web.' : 'No hay pedidos que coincidan con el filtro.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <div key={o.id} className="bg-white border border-zinc-100 p-4 sm:p-5">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Comprobante */}
                <div className="shrink-0">
                  {o.receiptUrl ? (
                    <a href={o.receiptUrl} target="_blank" rel="noopener noreferrer"
                      className="block w-20 h-24 border border-zinc-200 overflow-hidden hover:border-aura-gold transition-colors relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={o.receiptUrl} alt={`Comprobante ${o.orderId}`} className="w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      <span className="absolute inset-0 flex items-center justify-center bg-aura-ink/0 group-hover:bg-aura-ink/60 transition-colors">
                        <ExternalLink size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                    </a>
                  ) : /pagopar|tarjeta/i.test(o.paymentMethod || '') ? (
                    <div className={`w-20 h-24 border flex flex-col items-center justify-center gap-1 ${o.pagoparStatus === 'pagado' ? 'border-green-200 bg-green-50 text-green-700' : 'border-dashed border-zinc-200 text-zinc-300'}`}>
                      <CreditCard size={18} />
                      <span className="text-[8px] uppercase tracking-wider text-center leading-tight px-1">{o.pagoparStatus === 'pagado' ? 'Pagado' : 'Tarjeta'}<br />Pagopar</span>
                    </div>
                  ) : (
                    <div className="w-20 h-24 border border-dashed border-zinc-200 flex flex-col items-center justify-center gap-1 text-zinc-300">
                      <FileText size={18} />
                      <span className="text-[8px] uppercase tracking-wider text-center leading-tight px-1">Sin<br />comprobante</span>
                    </div>
                  )}
                </div>

                {/* Datos */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="font-bold text-aura-ink tabular text-sm">{o.orderId}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 border ${STATUS_STYLE[o.status]}`}>{o.status}</span>
                    <span className="text-[11px] text-zinc-400">{when(o)}</span>
                  </div>
                  <p className="text-sm font-semibold text-zinc-900">{o.name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-zinc-500 mt-1">
                    <span className="inline-flex items-center gap-1"><Phone size={12} /> {o.phone}</span>
                    <span className="inline-flex items-center gap-1 min-w-0"><MapPin size={12} className="shrink-0" /> <span className="truncate">{o.cityAndNeighborhood} · {o.address}</span></span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">
                    {(o.items || []).map((i) => `${i.quantity}× ${i.name} (${i.size})`).join(' · ')}
                  </p>
                  {o.invoice?.ruc && (
                    <p className="text-[11px] text-zinc-700 mt-1.5">
                      <span className="font-bold uppercase tracking-[0.12em] text-[9px] text-aura-gold-deep mr-1.5">Factura</span>
                      RUC {o.invoice.ruc} · {o.invoice.razonSocial}
                    </p>
                  )}
                  {/pagopar|tarjeta/i.test(o.paymentMethod || '') && (
                    <p className={`inline-flex items-center gap-1.5 mt-2 text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-1 border ${
                      o.pagoparStatus === 'pagado'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : o.pagoparStatus === 'reversado'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-zinc-50 text-zinc-500 border-zinc-200'
                    }`}>
                      <CreditCard size={11} />
                      {o.pagoparStatus === 'pagado'
                        ? `Pagado con Pagopar${o.pagoparPayment?.formaPago ? ` · ${o.pagoparPayment.formaPago}` : ''}${o.pagoparPayment?.numeroComprobante ? ` · Comp. ${o.pagoparPayment.numeroComprobante}` : ''}`
                        : o.pagoparStatus === 'reversado'
                          ? 'Pago con tarjeta reversado'
                          : 'Tarjeta (Pagopar) · pago pendiente'}
                    </p>
                  )}
                </div>

                {/* Importe + acciones */}
                <div className="shrink-0 flex lg:flex-col items-center lg:items-end justify-between gap-3 lg:w-52">
                  <div className="text-right">
                    <span className="block text-lg font-bold text-aura-ink tabular">{fmt(o.total)}</span>
                    {o.discountAmount > 0 && <span className="block text-[10px] text-aura-gold-deep">−{fmt(o.discountAmount)} ({o.discountPercent}%)</span>}
                    <span className="block text-[10px] text-zinc-400">{o.freeShipping ? 'Envío gratis' : '+ envío'}</span>
                  </div>
                  {o.status === 'pendiente' && isCardPayment(o.paymentMethod) && o.pagoparHash && (
                    <button onClick={() => void verifyCard(o)} disabled={busy === o.id}
                      className="inline-flex items-center gap-1.5 border border-zinc-200 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600 hover:border-aura-ink hover:text-aura-ink transition-colors disabled:opacity-50">
                      {busy === o.id ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Verificar pago
                    </button>
                  )}
                  {o.status === 'pendiente' && (
                    <div className="flex gap-2">
                      <button onClick={() => cancel(o)} disabled={busy === o.id}
                        className="inline-flex items-center gap-1.5 border border-zinc-200 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500 hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50">
                        <XCircle size={13} /> Cancelar
                      </button>
                      <button onClick={() => confirmSale(o)} disabled={busy === o.id}
                        className="inline-flex items-center gap-1.5 bg-aura-ink text-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] hover:bg-aura-gold transition-colors disabled:opacity-50">
                        {busy === o.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Confirmar
                      </button>
                    </div>
                  )}
                  {o.status === 'confirmado' && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-green-700">
                      <CheckCircle2 size={13} /> Venta confirmada
                    </span>
                  )}
                  {o.status === 'cancelado' && (
                    <button onClick={() => o.id && setOrderStatus(o.id, 'pendiente')}
                      className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400 hover:text-aura-ink transition-colors">
                      <RefreshCw size={12} /> Reabrir
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1100] bg-aura-ink text-white px-6 py-3 text-[11px] font-bold tracking-[0.12em] shadow-2xl max-w-md text-center">
          {toast}
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
