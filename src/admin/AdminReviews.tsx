'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, EyeOff, Loader2, MessageSquareQuote, Plus, Trash2, X } from 'lucide-react';
import { useProducts } from '../context/ProductsContext';
import { Stars } from '../components/Reviews';
import { createReviewAsAdmin, deleteReview, fetchAllReviews, setReviewApproved } from '../lib/reviewsService';
import type { Review } from '../types';

/**
 * Reseñas: las que dejan los clientes quedan pendientes hasta aprobarlas;
 * también se pueden cargar a mano (por ejemplo, un mensaje de WhatsApp).
 */
const AdminReviews: React.FC = () => {
  const { products } = useProducts();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'todas' | 'pendientes' | 'aprobadas'>('todas');
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ productId: '', name: '', city: '', rating: 5, text: '' });

  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(''), 4000); };

  const load = async () => {
    setLoading(true);
    try { setReviews(await fetchAllReviews()); }
    catch (e) { notify(e instanceof Error ? e.message : 'No se pudieron leer las reseñas.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const list = useMemo(
    () => reviews.filter((r) => (filter === 'pendientes' ? !r.approved : filter === 'aprobadas' ? r.approved : true)),
    [reviews, filter]
  );
  const pendientes = reviews.filter((r) => !r.approved).length;

  const approve = async (r: Review, approved: boolean) => {
    setBusy(r.id);
    try {
      await setReviewApproved(r.id, approved);
      setReviews((l) => l.map((x) => (x.id === r.id ? { ...x, approved } : x)));
      notify(approved ? '✓ Reseña publicada.' : 'Reseña ocultada.');
    } catch { notify('No se pudo actualizar.'); }
    finally { setBusy(null); }
  };

  const remove = async (r: Review) => {
    if (!confirm(`¿Borrar la reseña de ${r.name}?`)) return;
    setBusy(r.id);
    try { await deleteReview(r.id); setReviews((l) => l.filter((x) => x.id !== r.id)); notify('Reseña borrada.'); }
    catch { notify('No se pudo borrar.'); }
    finally { setBusy(null); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find((p) => p.code === form.productId);
    if (!product) return notify('Elegí el producto.');
    if (form.name.trim().length < 2) return notify('Escribí el nombre del cliente.');
    if (form.text.trim().length < 10) return notify('El comentario es muy corto.');
    setBusy('form');
    try {
      await createReviewAsAdmin({ productId: product.code, productName: product.name, name: form.name, city: form.city, rating: form.rating, text: form.text });
      notify('✓ Reseña cargada y publicada.');
      setForm({ productId: '', name: '', city: '', rating: 5, text: '' });
      setShowForm(false);
      await load();
    } catch (err) { notify(err instanceof Error ? err.message : 'No se pudo guardar.'); }
    finally { setBusy(null); }
  };

  const fecha = (ms: number) => (ms ? new Date(ms).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');
  const input = 'w-full border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:border-aura-ink';

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-luxury font-semibold text-aura-ink">Reseñas</h2>
          <p className="text-[12px] text-zinc-500">
            {pendientes ? `${pendientes} ${pendientes === 1 ? 'pendiente' : 'pendientes'} de aprobación.` : 'Las aprobadas se ven en la ficha y en la portada.'}
          </p>
        </div>
        <div className="flex gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:border-aura-ink">
            <option value="todas">Todas ({reviews.length})</option>
            <option value="pendientes">Pendientes ({pendientes})</option>
            <option value="aprobadas">Aprobadas ({reviews.length - pendientes})</option>
          </select>
          <button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-1.5 bg-aura-ink text-white px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] hover:bg-aura-gold transition-colors">
            {showForm ? <X size={13} /> : <Plus size={13} />} {showForm ? 'Cancelar' : 'Cargar reseña'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white border border-zinc-100 p-5 mb-5 grid gap-3 md:grid-cols-2">
          <p className="md:col-span-2 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">Nueva reseña (por ejemplo, de WhatsApp)</p>
          <select value={form.productId} onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))} className={`${input} md:col-span-2`}>
            <option value="">Elegí la fragancia…</option>
            {products.map((p) => <option key={p.code} value={p.code}>{p.code} · {p.name}</option>)}
          </select>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nombre del cliente" className={input} />
          <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Ciudad (opcional)" className={input} />
          <div className="md:col-span-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setForm((f) => ({ ...f, rating: n }))} aria-pressed={form.rating === n}
                className={`px-3 py-2 text-[11px] font-bold border ${form.rating === n ? 'bg-aura-ink text-white border-aura-ink' : 'border-zinc-200 text-zinc-600'}`}>
                {n} ★
              </button>
            ))}
          </div>
          <textarea value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} rows={3} maxLength={600} placeholder="Comentario" className={`${input} md:col-span-2`} />
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" disabled={busy === 'form'} className="bg-aura-ink text-white px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] hover:bg-aura-gold transition-colors disabled:opacity-50">
              {busy === 'form' ? 'Guardando…' : 'Publicar reseña'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-500 text-sm py-16 justify-center"><Loader2 size={18} className="animate-spin" /> Cargando reseñas…</div>
      ) : list.length === 0 ? (
        <div className="bg-white border border-zinc-100 py-16 text-center">
          <MessageSquareQuote size={28} className="text-zinc-300 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">Cuando un cliente deje una reseña en la ficha, aparece acá para aprobarla.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((r) => (
            <div key={r.id} className={`bg-white border p-4 sm:p-5 ${r.approved ? 'border-zinc-100' : 'border-amber-200'}`}>
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars value={r.rating} />
                    <span className="font-semibold text-zinc-900 text-sm">{r.name}</span>
                    {r.city && <span className="text-[11px] text-zinc-400">· {r.city}</span>}
                    <span className="text-[11px] text-zinc-400">· {fecha(r.createdAt)}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 border ${r.approved ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {r.approved ? 'Publicada' : 'Pendiente'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">{r.productName || r.productId}</p>
                  <p className="text-sm text-zinc-700 mt-2 leading-relaxed">{r.text}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {r.approved ? (
                    <button onClick={() => approve(r, false)} disabled={busy === r.id} className="inline-flex items-center gap-1.5 border border-zinc-200 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500 hover:border-aura-ink hover:text-aura-ink transition-colors disabled:opacity-50">
                      <EyeOff size={13} /> Ocultar
                    </button>
                  ) : (
                    <button onClick={() => approve(r, true)} disabled={busy === r.id} className="inline-flex items-center gap-1.5 bg-aura-ink text-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] hover:bg-aura-gold transition-colors disabled:opacity-50">
                      <Check size={13} /> Aprobar
                    </button>
                  )}
                  <button onClick={() => remove(r)} disabled={busy === r.id} className="inline-flex items-center gap-1.5 border border-zinc-200 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500 hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1100] bg-aura-ink text-white px-6 py-3 text-[11px] font-bold tracking-[0.12em] shadow-2xl max-w-md text-center">{toast}</div>
      )}
    </div>
  );
};

export default AdminReviews;
