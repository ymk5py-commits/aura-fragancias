/* ============================================================
   Reseñas aprobadas por SSR/ISR (PostgREST público).
   Como los productos: si falla, la página sale sin reseñas.
   ============================================================ */

import type { Review } from '../../types';

const URL_BASE = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function toReview(row: Record<string, unknown>): Review {
  const rating = Math.min(5, Math.max(1, Math.round(Number(row.rating) || 5))) as Review['rating'];
  return {
    id: String(row.id ?? ''),
    productId: String(row.product_id ?? ''),
    productName: row.product_name ? String(row.product_name) : undefined,
    name: String(row.name ?? ''),
    city: row.city ? String(row.city) : undefined,
    rating,
    text: String(row.text ?? ''),
    approved: row.approved === true,
    createdAt: Number(row.created_at) || 0,
  };
}

/** Reseñas aprobadas; de un producto si se pasa el código. Revalida cada 5 min. */
export async function getApprovedReviews(productId?: string, max = 60): Promise<Review[]> {
  if (!URL_BASE || !KEY) return [];
  const params = new URLSearchParams({ select: '*', approved: 'eq.true', order: 'created_at.desc', limit: String(max) });
  if (productId) params.set('product_id', `eq.${productId}`);
  try {
    const res = await fetch(`${URL_BASE}/rest/v1/reviews?${params}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return ((await res.json()) as Record<string, unknown>[]).map(toReview).sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export function ratingJsonLd(reviews: Review[]) {
  if (!reviews.length) return {};
  const total = reviews.reduce((n, r) => n + r.rating, 0);
  return {
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: Math.round((total / reviews.length) * 10) / 10,
      reviewCount: reviews.length,
      bestRating: 5,
      worstRating: 1,
    },
    review: reviews.slice(0, 10).map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.name },
      reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
      reviewBody: r.text,
      ...(r.createdAt ? { datePublished: new Date(r.createdAt).toISOString().slice(0, 10) } : {}),
    })),
  };
}
