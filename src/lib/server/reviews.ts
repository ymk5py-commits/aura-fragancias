/* ============================================================
   Reseñas aprobadas por SSR/ISR (Firestore REST público).
   Como los productos: si falla, la página sale sin reseñas.
   ============================================================ */

import type { Review } from '../../types';

const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

type FsValue = Record<string, unknown>;
function decode(v: FsValue | undefined): unknown {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  return null;
}

function toReview(id: string, f: Record<string, FsValue>): Review {
  const rating = Math.min(5, Math.max(1, Math.round(Number(decode(f.rating)) || 5))) as Review['rating'];
  return {
    id,
    productId: String(decode(f.productId) ?? ''),
    productName: decode(f.productName) ? String(decode(f.productName)) : undefined,
    name: String(decode(f.name) ?? ''),
    city: decode(f.city) ? String(decode(f.city)) : undefined,
    rating,
    text: String(decode(f.text) ?? ''),
    approved: decode(f.approved) === true,
    createdAt: Number(decode(f.createdAt)) || 0,
  };
}

/** Reseñas aprobadas; de un producto si se pasa el código. Revalida cada 5 min. */
export async function getApprovedReviews(productId?: string, max = 60): Promise<Review[]> {
  if (!PROJECT || !KEY) return [];
  const filters: unknown[] = [
    { fieldFilter: { field: { fieldPath: 'approved' }, op: 'EQUAL', value: { booleanValue: true } } },
  ];
  if (productId) {
    filters.push({ fieldFilter: { field: { fieldPath: 'productId' }, op: 'EQUAL', value: { stringValue: productId } } });
  }
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery?key=${KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'reviews' }],
            where: filters.length === 1 ? filters[0] : { compositeFilter: { op: 'AND', filters } },
            limit: max,
          },
        }),
        next: { revalidate: 300 },
      }
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{ document?: { name: string; fields?: Record<string, FsValue> } }>;
    return rows
      .filter((r) => r.document?.fields)
      .map((r) => toReview(r.document!.name.split('/').pop() || '', r.document!.fields || {}))
      .sort((a, b) => b.createdAt - a.createdAt);
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
