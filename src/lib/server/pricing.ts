/* ============================================================
   Precios vigentes de la tienda, leídos de la configuración pública
   (tabla settings, fila 'site') para no confiar en los montos que manda el
   navegador al iniciar un pago con tarjeta.
   ============================================================ */

import { DEFAULT_SETTINGS } from '../../constants';

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export interface Pricing {
  bySize: Record<string, number>;
  welcomePercent: number;
}

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function currentPricing(): Promise<Pricing> {
  const base: Pricing = {
    bySize: { '10 ML': DEFAULT_SETTINGS.price10, '30 ML': DEFAULT_SETTINGS.price30, '50 ML': DEFAULT_SETTINGS.price50 },
    welcomePercent: DEFAULT_SETTINGS.welcomePercent,
  };
  if (!URL_BASE || !KEY) return base;
  try {
    const res = await fetch(`${URL_BASE}/rest/v1/settings?select=data&id=eq.site`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
      cache: 'no-store',
    });
    if (!res.ok) return base;
    const f = ((await res.json()) as Array<{ data?: Record<string, unknown> }>)[0]?.data || {};
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
