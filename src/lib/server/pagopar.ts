/* ============================================================
   Pagopar — API de comercios (v2.0). SOLO SERVIDOR.
   Documentación: https://soporte.pagopar.com/portal/es/kb/articles/api-integracion-medios-pagos

   El token privado vive únicamente acá. Nunca va al navegador.
   Para iniciar un pago: sha1(privada + id_pedido_comercio + floatval(monto))
   Para consultar estado: sha1(privada + "CONSULTA")
   Para validar el webhook: sha1(privada + hash_pedido)

   Misma cuenta de comercio que albastore.lat: Pagopar solo admite una URL
   de respuesta y una de redirección por comercio, así que apuntan a ALBA,
   que reenvía acá lo que no reconoce como suyo (ver README, "Pagopar").
   ============================================================ */

import { createHash, timingSafeEqual } from 'node:crypto';
import { SITE } from '../site';

export interface PagoparConfig {
  publicKey: string;
  privateKey: string;
  baseUrl: string;
  /** URL pública del sitio, para armar links absolutos de las imágenes. */
  siteUrl: string;
}

export class PagoparError extends Error {
  /** Mensaje crudo que devolvió Pagopar (se muestra tal cual al cliente). */
  resultado: string;

  constructor(message: string) {
    super(message);
    this.name = 'PagoparError';
    this.resultado = message;
  }
}

export function pagoparConfig(): PagoparConfig {
  const publicKey = (process.env.PAGOPAR_PUBLIC_KEY || '').trim();
  const privateKey = (process.env.PAGOPAR_PRIVATE_KEY || '').trim();

  if (!publicKey || !privateKey) {
    throw new PagoparError('El pago con tarjeta no está configurado todavía.');
  }

  return {
    publicKey,
    privateKey,
    baseUrl: (process.env.PAGOPAR_BASE_URL || 'https://api.pagopar.com').replace(/\/+$/, ''),
    siteUrl: (process.env.SITE_URL || SITE).replace(/\/+$/, ''),
  };
}

/* ---------- tokens ---------- */

export function sha1(value: string): string {
  return createHash('sha1').update(value, 'utf8').digest('hex');
}

/** Replica strval(floatval($monto)) de PHP: 100000 → "100000", 100.5 → "100.5". */
export function floatval(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return Number.isInteger(value) ? value.toFixed(0) : String(value);
}

export function tokenIniciarTransaccion(privateKey: string, idPedidoComercio: string, montoTotal: number): string {
  return sha1(`${privateKey}${idPedidoComercio}${floatval(montoTotal)}`);
}

export function tokenConsultarPedido(privateKey: string): string {
  return sha1(`${privateKey}CONSULTA`);
}

export function tokenWebhook(privateKey: string, hashPedido: string): string {
  return sha1(`${privateKey}${hashPedido}`);
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/* ---------- llamadas ---------- */

interface PagoparEnvelope {
  respuesta?: boolean;
  resultado?: unknown;
}

/**
 * POST a la API de Pagopar. Si responde `respuesta:false`, lanza
 * PagoparError con el texto exacto que devolvió la pasarela.
 */
export async function pagoparPost<T>(path: string, body: Record<string, unknown>, timeoutMs = 20000): Promise<T> {
  const { baseUrl } = pagoparConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });
  } catch {
    throw new PagoparError('No pudimos conectar con Pagopar. Probá de nuevo en unos minutos.');
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let json: PagoparEnvelope;
  try {
    json = JSON.parse(text) as PagoparEnvelope;
  } catch {
    throw new PagoparError('Pagopar devolvió una respuesta inesperada.');
  }

  if (json.respuesta !== true) {
    const message =
      typeof json.resultado === 'string' && json.resultado ? json.resultado : 'Pagopar rechazó la operación.';
    throw new PagoparError(message);
  }

  return json.resultado as T;
}

/* ---------- utilidades ---------- */

/** URL de checkout a la que se redirige al comprador. */
export function checkoutUrl(hash: string): string {
  return `https://www.pagopar.com/pagos/${encodeURIComponent(hash)}`;
}

/** Fecha local de Paraguay en formato "YYYY-MM-DD HH:mm:ss". */
export function paraguayDateTime(date: Date): string {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Asuncion',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return formatter.format(date);
}

/** Teléfono paraguayo en formato internacional: +595XXXXXXXXX. */
export function internationalPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('595')) return `+${digits}`;
  if (digits.startsWith('0')) return `+595${digits.slice(1)}`;
  return `+595${digits}`;
}

/**
 * Número de documento como lo espera Pagopar: solo dígitos, sin puntos
 * y sin el dígito verificador del RUC ("4.348.713-0" → "4348713").
 * Con guion, Pagopar responde "El documento debe estar presente.".
 */
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
