import { PERFUMES, DEFAULT_SETTINGS } from '../constants';
import { Perfume, SiteSettings } from '../types';

const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

/* eslint-disable @typescript-eslint/no-explicit-any */
function parseValue(v: any): any {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(parseValue);
  if ('mapValue' in v) return parseFields(v.mapValue.fields || {});
  if ('timestampValue' in v) return v.timestampValue;
  return null;
}

function parseFields(fields: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k in fields) out[k] = parseValue(fields[k]);
  return out;
}

/** Lee todos los productos desde Firestore (REST). Fallback: catálogo incluido. */
export async function getProducts(): Promise<{ products: Perfume[]; source: 'firebase' | 'local' }> {
  if (!PROJECT || !KEY) return { products: PERFUMES, source: 'local' };
  try {
    const res = await fetch(`${BASE}/products?key=${KEY}&pageSize=300`, {
      next: { revalidate: 120 }, // ISR: refresca cada 2 min
    });
    if (!res.ok) return { products: PERFUMES, source: 'local' };
    const data = await res.json();
    const docs = data.documents || [];
    if (!docs.length) return { products: PERFUMES, source: 'local' };
    const products: Perfume[] = docs.map((d: any) => {
      const f = parseFields(d.fields || {});
      const id = d.name.split('/').pop();
      return { id, ...f } as Perfume;
    });
    return { products, source: 'firebase' };
  } catch {
    return { products: PERFUMES, source: 'local' };
  }
}

/** Solo productos visibles (para la tienda). */
export async function getVisibleProducts(): Promise<Perfume[]> {
  const { products } = await getProducts();
  return products.filter((p) => p.visible !== false);
}

/** Lee la configuración del sitio desde Firestore. Fallback: defaults. */
export async function getSettings(): Promise<SiteSettings> {
  if (!PROJECT || !KEY) return DEFAULT_SETTINGS;
  try {
    const res = await fetch(`${BASE}/settings/site?key=${KEY}`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return DEFAULT_SETTINGS;
    const data = await res.json();
    if (!data.fields) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(parseFields(data.fields) as Partial<SiteSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
