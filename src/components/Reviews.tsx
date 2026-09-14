'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { submitReview, summarize } from '../lib/reviewsService';
import type { Review } from '../types';

/* ============================================================
   Reseñas: estrellas, tarjetas y formulario (queda pendiente
   hasta que se apruebe en /admin → Reseñas).
   ============================================================ */

export const Stars: React.FC<{ value: number; size?: number; className?: string }> = ({ value, size = 14, className = '' }) => (
  <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${value} de 5 estrellas`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star key={n} size={size} strokeWidth={1.4} className={n <= Math.round(value) ? 'fill-aura-gold text-aura-gold' : 'text-zinc-300'} />
    ))}
  </span>
);

const fecha = (ms: number) => (ms ? new Date(ms).toLocaleDateString('es-PY', { month: 'short', year: 'numeric' }) : '');

export const ReviewCard: React.FC<{ review: Review; showProduct?: boolean; dark?: boolean }> = ({ review, showProduct, dark }) => (
  <figure className={`p-6 border ${dark ? 'border-white/10 bg-white/[0.03]' : 'border-zinc-100 bg-white'}`}>
    <Stars value={review.rating} />
    <blockquote className={`mt-3 text-sm leading-relaxed ${dark ? 'text-white/80' : 'text-zinc-700'}`}>“{review.text}”</blockquote>
    <figcaption className={`mt-4 text-[11px] uppercase tracking-[0.15em] ${dark ? 'text-white/45' : 'text-zinc-500'}`}>
      <span className={`font-bold ${dark ? 'text-white' : 'text-zinc-900'}`}>{review.name}</span>
      {review.city ? ` · ${review.city}` : ''}
      {review.createdAt ? ` · ${fecha(review.createdAt)}` : ''}
      {showProduct && review.productName ? <span className="block mt-1 normal-case tracking-normal">sobre {review.productName}</span> : null}
    </figcaption>
  </figure>
);

const ReviewForm: React.FC<{ productId: string; productName: string; onDone: () => void }> = ({ productId, productName, onDone }) => {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setMsg({ ok: false, text: 'Escribí tu nombre.' });
    if (text.trim().length < 10) return setMsg({ ok: false, text: 'Contanos un poco más (mínimo 10 caracteres).' });
    setSending(true);
    setMsg(null);
    try {
      await submitReview({ productId, productName, name, city, rating, text });
      setMsg({ ok: true, text: '¡Gracias! Tu reseña se publica apenas la revisamos.' });
      setName(''); setCity(''); setText(''); setRating(5);
      setTimeout(onDone, 2500);
    } catch {
      setMsg({ ok: false, text: 'No pudimos guardar tu reseña. Probá de nuevo o escribinos por WhatsApp.' });
    } finally {
      setSending(false);
    }
  };

  const input = 'w-full bg-zinc-50/50 border-none px-4 py-3.5 rounded-sm focus:ring-1 focus:ring-zinc-900 text-sm placeholder:text-zinc-300';

  return (
    <form onSubmit={submit} className="bg-white border border-zinc-100 p-6 sm:p-8 rounded-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600 mb-3">Tu puntuación</p>
      <div className="flex gap-1" role="radiogroup" aria-label="Puntuación">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`}
            onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setRating(n)} className="p-1">
            <Star size={24} strokeWidth={1.4} className={n <= (hover || rating) ? 'fill-aura-gold text-aura-gold' : 'text-zinc-300'} />
          </button>
        ))}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" className={input} maxLength={60} required />
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ciudad (opcional)" className={input} maxLength={60} />
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={600} required className={`${input} mt-3 resize-none`}
        placeholder="¿Cómo te fue con la fragancia? Fijación, estela, ocasión…" />
      {msg && <p className={`mt-3 text-[12px] ${msg.ok ? 'text-green-700' : 'text-red-600'}`} role="alert">{msg.text}</p>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-zinc-400">Se publica después de que la revisamos.</p>
        <button type="submit" disabled={sending}
          className="bg-aura-ink text-white px-7 py-3.5 rounded-sm text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-aura-gold transition-colors disabled:opacity-60">
          {sending ? 'Enviando…' : 'Publicar reseña'}
        </button>
      </div>
    </form>
  );
};

/** Sección de reseñas de la ficha (las reseñas llegan por SSR). */
export const ProductReviews: React.FC<{ productId: string; productName: string; reviews: Review[] }> = ({ productId, productName, reviews }) => {
  const [open, setOpen] = useState(false);
  const { average, count } = summarize(reviews);
  return (
    <section id="resenas" aria-labelledby="resenas-titulo" className="mt-20 sm:mt-28 border-t border-zinc-100 pt-14">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h2 id="resenas-titulo" className="text-2xl sm:text-3xl font-luxury text-zinc-900">Reseñas</h2>
          {count > 0 ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-zinc-600">
              <Stars value={average} size={18} />
              <span><strong className="text-zinc-900">{average.toFixed(1)}</strong> de 5 · {count} {count === 1 ? 'reseña' : 'reseñas'}</span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">Todavía no hay reseñas de esta fragancia. ¿Ya la probaste? Contanos.</p>
          )}
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)}
          className="border border-aura-ink text-aura-ink px-6 py-3.5 rounded-sm text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-aura-ink hover:text-white transition-colors">
          {open ? 'Cerrar' : 'Escribir una reseña'}
        </button>
      </div>
      {open && <div className="mb-8"><ReviewForm productId={productId} productName={productName} onDone={() => setOpen(false)} /></div>}
      {reviews.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reviews.slice(0, 9).map((r) => <ReviewCard key={r.id} review={r} />)}
        </div>
      )}
    </section>
  );
};

/** Bloque de la portada (fondo oscuro): últimas reseñas de toda la tienda. */
export const HomeReviews: React.FC<{ reviews: Review[] }> = ({ reviews }) => {
  if (reviews.length < 2) return null;
  const { average, count } = summarize(reviews);
  return (
    <section aria-labelledby="home-resenas" className="bg-aura-ink text-white py-20 sm:py-28">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-aura-gold font-semibold tracking-[0.35em] text-[10px] uppercase mb-3">Clientes reales</p>
            <h2 id="home-resenas" className="text-3xl sm:text-4xl font-luxury">Lo que dicen de Äura</h2>
          </div>
          <p className="flex items-center gap-2 text-sm text-white/70"><Stars value={average} size={18} /> {average.toFixed(1)} · {count} reseñas</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {reviews.slice(0, 3).map((r) => <ReviewCard key={r.id} review={r} showProduct dark />)}
        </div>
      </div>
    </section>
  );
};
