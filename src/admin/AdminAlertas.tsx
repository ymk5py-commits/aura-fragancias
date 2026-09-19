'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, CheckCheck, Loader2, MessageCircle, Trash2, Undo2 } from 'lucide-react';
import { deleteIncident, deviceLabel, INCIDENT_LABELS, markIncidentsSeen, setIncidentSeen } from '../lib/incidentsService';
import type { Incident } from '../types';

/**
 * Alertas: cada compra que no se pudo completar (pedido no guardado, pago
 * con tarjeta que no abrió, comprobante que no subió, pago sin verificar).
 * La lista llega en tiempo real desde AdminDashboard; acá se revisa,
 * se marca y, si hay teléfono, se recupera la venta por WhatsApp.
 */
const AdminAlertas: React.FC<{ incidents: Incident[]; loading: boolean }> = ({ incidents, loading }) => {
  const [filter, setFilter] = useState<'pendientes' | 'todas'>('pendientes');
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(''), 4000); };

  const unseen = useMemo(() => incidents.filter((i) => !i.seen), [incidents]);
  const list = filter === 'pendientes' ? unseen : incidents;

  const run = async (id: string, fn: () => Promise<void>, ok: string) => {
    setBusy(id);
    try { await fn(); if (ok) notify(ok); }
    catch (e) { notify(e instanceof Error ? e.message : 'No se pudo actualizar.'); }
    finally { setBusy(null); }
  };

  const fecha = (ms: number) =>
    ms ? new Date(ms).toLocaleString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const gs = (n: number) => `Gs. ${n.toLocaleString('es-PY')}`;

  const whatsapp = (i: Incident): string | null => {
    const digits = (i.customerPhone || '').replace(/\D/g, '');
    if (digits.length < 9) return null;
    const nombre = (i.customerName || '').split(' ')[0] || '';
    const texto = encodeURIComponent(
      `Hola${nombre ? ` ${nombre}` : ''} 👋 Soy de Äura Fragancias. Vimos que tuviste un problema al finalizar tu compra${i.orderId ? ` (${i.orderId})` : ''}. ¿Te ayudamos a terminarla?`
    );
    return `https://wa.me/${digits}?text=${texto}`;
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-luxury font-semibold text-aura-ink">Alertas</h2>
          <p className="text-[12px] text-zinc-500">
            {unseen.length
              ? `${unseen.length} ${unseen.length === 1 ? 'cliente no pudo' : 'clientes no pudieron'} terminar la compra y nadie lo revisó todavía.`
              : 'Acá aparece cada compra que no se pudo completar por un error de la tienda o de Pagopar.'}
          </p>
        </div>
        <div className="flex gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:border-aura-ink">
            <option value="pendientes">Sin revisar ({unseen.length})</option>
            <option value="todas">Todas ({incidents.length})</option>
          </select>
          {unseen.length > 0 && (
            <button
              onClick={() => void run('all', () => markIncidentsSeen(unseen.map((i) => i.id)), '✓ Todas marcadas como revisadas.')}
              disabled={busy === 'all'}
              className="inline-flex items-center gap-1.5 bg-aura-ink text-white px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] hover:bg-aura-gold transition-colors disabled:opacity-50"
            >
              <CheckCheck size={13} /> Marcar todas
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-500 text-sm py-16 justify-center"><Loader2 size={18} className="animate-spin" /> Cargando alertas…</div>
      ) : list.length === 0 ? (
        <div className="bg-white border border-zinc-100 py-16 text-center">
          <AlertTriangle size={28} className="text-zinc-300 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">
            {filter === 'pendientes' ? 'Nada sin revisar.' : 'Sin alertas.'} Cuando un cliente no pueda terminar la compra, aparece acá con sus datos para que puedas ayudarlo.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((i) => {
            const wa = whatsapp(i);
            const device = deviceLabel(i.userAgent);
            return (
              <div key={i.id} className={`bg-white border p-4 sm:p-5 ${i.seen ? 'border-zinc-100' : 'border-red-200'}`}>
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-1 ${i.seen ? 'bg-zinc-100 text-zinc-500' : 'bg-red-50 text-red-700'}`}>
                        {INCIDENT_LABELS[i.source] || i.source}
                      </span>
                      <span className="text-[11px] text-zinc-400">{fecha(i.createdAt)}</span>
                      {i.seen && <span className="text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-1 bg-green-50 text-green-700">Revisada</span>}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-zinc-900 leading-snug">{i.message}</p>
                    <p className="mt-1.5 text-[12px] text-zinc-600 flex flex-wrap gap-x-3 gap-y-0.5">
                      {i.customerName && <span>{i.customerName}{i.customerPhone ? ` · ${i.customerPhone}` : ''}</span>}
                      {i.orderId && <span>Pedido {i.orderId}</span>}
                      {typeof i.total === 'number' && i.total > 0 && <span>{gs(i.total)}</span>}
                      {i.paymentMethod && <span className="capitalize">{i.paymentMethod}</span>}
                      {device && <span className="text-zinc-400">{device}{i.page ? ` · ${i.page}` : ''}</span>}
                    </p>
                    {i.detail && (
                      <details className="mt-2 text-[11px] text-zinc-400">
                        <summary className="cursor-pointer select-none hover:text-zinc-700">Detalle técnico</summary>
                        <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">{i.detail}</pre>
                      </details>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {wa && (
                      <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 border border-zinc-200 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-700 hover:border-aura-ink transition-colors">
                        <MessageCircle size={13} /> WhatsApp
                      </a>
                    )}
                    {i.seen ? (
                      <button onClick={() => void run(i.id, () => setIncidentSeen(i.id, false), '')} disabled={busy === i.id} className="inline-flex items-center gap-1.5 border border-zinc-200 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500 hover:border-aura-ink hover:text-aura-ink transition-colors disabled:opacity-50">
                        <Undo2 size={13} /> Pendiente
                      </button>
                    ) : (
                      <button onClick={() => void run(i.id, () => setIncidentSeen(i.id, true), '✓ Marcada como revisada.')} disabled={busy === i.id} className="inline-flex items-center gap-1.5 bg-aura-ink text-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] hover:bg-aura-gold transition-colors disabled:opacity-50">
                        <Check size={13} /> Revisada
                      </button>
                    )}
                    <button
                      onClick={() => { if (confirm('¿Borrar esta alerta?')) void run(i.id, () => deleteIncident(i.id), 'Alerta borrada.'); }}
                      disabled={busy === i.id}
                      className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Borrar"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-aura-ink text-white px-5 py-3 text-sm shadow-lg z-50">{toast}</div>
      )}
    </div>
  );
};

export default AdminAlertas;
