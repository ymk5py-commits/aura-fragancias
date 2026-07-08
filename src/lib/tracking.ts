'use client';

// Utilidades de tracking compartidas por Pixel (cliente) y CAPI (servidor).
// El mismo eventId se usa en ambos canales para que Meta deduplique.

export function newEventId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[2]) : undefined;
}

export interface CapiUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  city?: string;
}

export interface CapiContent {
  id: string;
  quantity: number;
  item_price: number;
}

export interface CapiOptions {
  eventId: string;
  eventName: string;
  value?: number;
  currency?: string;
  contentIds?: string[];
  contents?: CapiContent[];
  numItems?: number;
  userData?: CapiUserData;
  actionSource?: string;
}

/**
 * Espeja un evento del Pixel por Conversions API (server-side) con el MISMO
 * eventId para dedup. Fire-and-forget con keepalive (sobrevive a la navegación
 * a WhatsApp). Los cookies _fbp/_fbc solo existen si el Pixel ya arrancó.
 */
export function capiTrack(opts: CapiOptions): void {
  if (typeof window === 'undefined') return;
  const body = {
    ...opts,
    eventSourceUrl: window.location.href,
    fbp: getCookie('_fbp'),
    fbc: getCookie('_fbc'),
  };
  try {
    fetch('/api/meta-capi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* noop */
  }
}
