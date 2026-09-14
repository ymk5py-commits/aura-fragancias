/* ============================================================
   Pagopar vía el hub de ALBA. SOLO SERVIDOR.

   La cuenta de comercio de Pagopar es una sola para toda la empresa y
   sus tokens viven en albastore.lat. Äura no tiene tokens: le pide al
   hub (https://albastore.lat/api/pagopar/hub) que firme y hable con
   Pagopar, autenticándose con el secreto compartido PAGOPAR_HUB_SECRET.
   ============================================================ */

import { timingSafeEqual } from 'node:crypto';

export class PagoparError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PagoparError';
  }
}

export function hubSecret(): string {
  return (process.env.PAGOPAR_HUB_SECRET || '').trim();
}

function hubUrl(): string {
  return (process.env.PAGOPAR_HUB_URL || 'https://albastore.lat/api/pagopar/hub').trim();
}

export function isConfigured(): boolean {
  return Boolean(hubSecret());
}

/** Compara el secreto compartido en tiempo constante. */
export function secretMatches(given: string | null | undefined): boolean {
  const secret = hubSecret();
  const value = (given || '').trim();
  if (!secret || !value) return false;
  const a = Buffer.from(secret, 'utf8');
  const b = Buffer.from(value, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Llama al hub. Si responde error, lanza PagoparError con el texto tal cual. */
export async function hubCall<T>(body: Record<string, unknown>, timeoutMs = 25000): Promise<T> {
  if (!isConfigured()) throw new PagoparError('El pago con tarjeta no está configurado todavía.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(hubUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Alba-Secret': hubSecret() },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });
  } catch {
    throw new PagoparError('No pudimos conectar con la pasarela. Probá de nuevo en unos minutos.');
  } finally {
    clearTimeout(timer);
  }

  const json = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || !json) throw new PagoparError(json?.error || 'La pasarela no respondió.');
  return json;
}

/** Pagopar quiere el documento solo con dígitos: "4.348.713-0" → "4348713". */
export function documentNumber(value: string): string {
  return String(value || '').split('-')[0].replace(/\D/g, '');
}

/** Quita etiquetas HTML que Pagopar manda en los mensajes. */
export function plainText(html?: string): string {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Fila de pedidos/1.1/traer tal como la devuelve Pagopar (vía hub). */
export interface PagoparRow {
  pagado?: boolean;
  cancelado?: boolean;
  forma_pago?: string;
  forma_pago_identificador?: string;
  numero_comprobante_interno?: string | null;
  fecha_pago?: string | null;
  monto?: string;
  hash_pedido?: string;
  numero_pedido?: string;
  id_pedido_comercio?: string;
  mensaje_resultado_pago?: { titulo?: string; descripcion?: string };
}
