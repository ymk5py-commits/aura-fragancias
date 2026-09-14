/* ============================================================
   Precios vigentes de la tienda, leídos del Firestore público
   (settings/site) para no confiar en los montos que manda el
   navegador al iniciar un pago con tarjeta.
   ============================================================ */

import { DEFAULT_SETTINGS } from '../../constants';

const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

export interface Pricing {
  bySize: Record<string, number>;
  welcomePercent: number;
}

function num(v: unknown, fallback: number): number {
  const n = Number((v as { integerValue?: string; doubleValue?: number })?.integerValue ?? (v as { doubleValue?: number })?.doubleValue);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function currentPricing(): Promise<Pricing> {
  const base: Pricing = {
    bySize: { '10 ML': DEFAULT_SETTINGS.price10, '30 ML': DEFAULT_SETTINGS.price30, '50 ML': DEFAULT_SETTINGS.price50 },
    welcomePercent: DEFAULT_SETTINGS.welcomePercent,
  };
  if (!PROJECT || !KEY) return base;
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/settings/site?key=${KEY}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return base;
    const f = ((await res.json()) as { fields?: Record<string, unknown> }).fields || {};
    return {
      bySize: {
        '10 ML': num(f.price10, base.bySize['10 ML']),
        '30 ML': num(f.price30, base.bySize['30 ML']),
        '50 ML': num(f.price50, base.bySize['50 ML']),
      },
      welcomePercent: num(f.welcomePercent, 0) || 0,
    };
  } catch {
    return base;
  }
}
