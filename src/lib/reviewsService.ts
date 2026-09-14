import { getFirebaseDb, isFirebaseConfigured } from './firebase';
import type { Review } from '../types';

/* ============================================================
   Reseñas de clientes (cliente / panel).
   El cliente escribe desde la ficha y la reseña queda pendiente;
   en /admin → Reseñas se aprueba o se carga a mano. Las páginas
   públicas leen las aprobadas por SSR (ver server/reviews.ts).
   ============================================================ */

const COLLECTION = 'reviews';

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
    productId: input.productId,
    productName: input.productName.slice(0, 120),
    name: input.name.trim().slice(0, 60),
    city: (input.city || '').trim().slice(0, 60),
    rating: Math.min(5, Math.max(1, Math.round(input.rating))),
    text: input.text.trim().slice(0, 600),
    approved,
    createdAt: Date.now(),
  };
}

/** Desde la tienda: queda pendiente de aprobación. */
export async function submitReview(input: NewReview): Promise<void> {
  if (!isFirebaseConfigured) throw new Error('Las reseñas no están disponibles por el momento.');
  const [db, { collection, addDoc }] = await Promise.all([getFirebaseDb(), import('firebase/firestore')]);
  await addDoc(collection(db, COLLECTION), clean(input, false));
}

/** Desde el panel (por ejemplo, una reseña que llegó por WhatsApp). */
export async function createReviewAsAdmin(input: NewReview): Promise<void> {
  const [db, { collection, addDoc }] = await Promise.all([getFirebaseDb(), import('firebase/firestore')]);
  await addDoc(collection(db, COLLECTION), clean(input, true));
}

function fromDoc(id: string, data: Record<string, unknown>): Review {
  const rating = Math.min(5, Math.max(1, Math.round(Number(data.rating) || 5))) as Review['rating'];
  return {
    id,
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
  const [db, { collection, getDocs, query, orderBy, limit }] = await Promise.all([getFirebaseDb(), import('firebase/firestore')]);
  const snap = await getDocs(query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), limit(300)));
  return snap.docs
    .map((d) => fromDoc(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => Number(a.approved) - Number(b.approved) || b.createdAt - a.createdAt);
}

export async function setReviewApproved(id: string, approved: boolean): Promise<void> {
  const [db, { doc, updateDoc }] = await Promise.all([getFirebaseDb(), import('firebase/firestore')]);
  await updateDoc(doc(db, COLLECTION, id), { approved });
}

export async function deleteReview(id: string): Promise<void> {
  const [db, { doc, deleteDoc }] = await Promise.all([getFirebaseDb(), import('firebase/firestore')]);
  await deleteDoc(doc(db, COLLECTION, id));
}

export function summarize(reviews: Pick<Review, 'rating'>[]): { average: number; count: number } {
  if (!reviews.length) return { average: 0, count: 0 };
  const total = reviews.reduce((n, r) => n + r.rating, 0);
  return { average: Math.round((total / reviews.length) * 10) / 10, count: reviews.length };
}
