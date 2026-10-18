import { getSupabase, isSupabaseConfigured, toError } from './supabase';
import { camelizeRow, type Row } from './supabaseMap';
import type { Review } from '../types';

/* ============================================================
   Reseñas de clientes (cliente / panel).
   El cliente escribe desde la ficha y la reseña queda pendiente;
   en /admin → Reseñas se aprueba o se carga a mano. Las páginas
   públicas leen las aprobadas por SSR (ver server/reviews.ts).
   ============================================================ */

const TABLE = 'reviews';

export interface NewReview {
  productId: string;
  productName: string;
  name: string;
  city?: string;
  rating: number;
  text: string;
}

function clean(input: NewReview, approved: boolean) {
  return {
    product_id: input.productId,
    product_name: input.productName.slice(0, 120),
    name: input.name.trim().slice(0, 60),
    city: (input.city || '').trim().slice(0, 60),
    rating: Math.min(5, Math.max(1, Math.round(input.rating))),
    text: input.text.trim().slice(0, 600),
    approved,
    created_at: Date.now(),
  };
}

/** Desde la tienda: queda pendiente de aprobación. */
export async function submitReview(input: NewReview): Promise<void> {
  if (!isSupabaseConfigured) throw new Error('Las reseñas no están disponibles por el momento.');
  const sb = await getSupabase();
  const { error } = await sb.from(TABLE).insert(clean(input, false));
  if (error) throw toError(error);
}

/** Desde el panel (por ejemplo, una reseña que llegó por WhatsApp). */
export async function createReviewAsAdmin(input: NewReview): Promise<void> {
  const sb = await getSupabase();
  const { error } = await sb.from(TABLE).insert(clean(input, true));
  if (error) throw toError(error);
}

function fromRow(row: Row): Review {
  const data = camelizeRow(row);
  const rating = Math.min(5, Math.max(1, Math.round(Number(data.rating) || 5))) as Review['rating'];
  return {
    id: String(row.id),
    productId: String(data.productId ?? ''),
    productName: data.productName ? String(data.productName) : undefined,
    name: String(data.name ?? ''),
    city: data.city ? String(data.city) : undefined,
    rating,
    text: String(data.text ?? ''),
    approved: data.approved === true,
    createdAt: Number(data.createdAt) || 0,
  };
}

/** Todas las reseñas (solo admin), pendientes primero. */
export async function fetchAllReviews(): Promise<Review[]> {
  const sb = await getSupabase();
  const { data, error } = await sb.from(TABLE).select('*').order('created_at', { ascending: false }).limit(300);
  if (error) throw toError(error);
  return (data as Row[])
    .map(fromRow)
    .sort((a, b) => Number(a.approved) - Number(b.approved) || b.createdAt - a.createdAt);
}

export async function setReviewApproved(id: string, approved: boolean): Promise<void> {
  const sb = await getSupabase();
  const { error } = await sb.from(TABLE).update({ approved }).eq('id', id);
  if (error) throw toError(error);
}

export async function deleteReview(id: string): Promise<void> {
  const sb = await getSupabase();
  const { error } = await sb.from(TABLE).delete().eq('id', id);
  if (error) throw toError(error);
}

export function summarize(reviews: Pick<Review, 'rating'>[]): { average: number; count: number } {
  if (!reviews.length) return { average: 0, count: 0 };
  const total = reviews.reduce((n, r) => n + r.rating, 0);
  return { average: Math.round((total / reviews.length) * 10) / 10, count: reviews.length };
}
