/* ============================================================
   Pagos (cliente)
   La tienda cobra por transferencia (con comprobante y WhatsApp) y,
   cuando está habilitado, con tarjeta a través de Pagopar.

   Con tarjeta el navegador manda los datos del pedido a
   /api/pagopar/iniciar; el servidor valida los precios contra la
   configuración de la tienda y le pide al hub de ALBA (que tiene los
   tokens de Pagopar) que cree la transacción. Devuelve el hash y el
   link de pago; el pedido se guarda en Firestore con ese hash.

   Se activa con NEXT_PUBLIC_PAGOPAR_ENABLED=true (y PAGOPAR_HUB_SECRET
   en el servidor).
   ============================================================ */

import type { OrderItem } from '../types';

export const PAY_TRANSFER = 'Transferencia Bancaria / QR';
export const PAY_CARD = 'Tarjeta de crédito o débito (Pagopar)';

export const isCardPaymentEnabled = process.env.NEXT_PUBLIC_PAGOPAR_ENABLED === 'true';

export function isCardPayment(method?: string): boolean {
  return /pagopar|tarjeta/i.test(method || '');
}

/** Pagopar exige documento numérico: "4.348.713-0" → "4348713". */
export function documentDigits(value: string): string {
  return String(value || '').split('-')[0].replace(/\D/g, '');
}

/** URL del checkout de Pagopar para un hash (sirve para retomar un pago). */
export function pagoparCheckoutUrl(hash: string): string {
  return `https://www.pagopar.com/pagos/${encodeURIComponent(hash)}`;
}

export interface CardPaymentRequest {
  orderId: string;
  name: string;
  phone: string;
  email: string;
  document: string;
  address: string;
  cityAndNeighborhood: string;
  discountPercent: number;
  /** Delivery ya coordinado (opcional): se cobra en la misma transacción como un ítem más. */
  shippingCost?: number;
  /** Ítems con la foto del producto (Pagopar la muestra en su checkout). */
  items: Array<OrderItem & { image?: string }>;
  /** Factura con RUC (opcional): va al comprador de Pagopar. */
  ruc?: string;
  razonSocial?: string;
}

export interface CardPaymentStart {
  hash: string;
  url: string;
  numeroPedido: string;
  total: number;
}

/** Crea la transacción en Pagopar y devuelve el hash y el link de pago. */
export async function startCardPayment(input: CardPaymentRequest): Promise<CardPaymentStart> {
  if (!isCardPaymentEnabled) throw new Error('El pago con tarjeta todavía no está habilitado.');

  const res = await fetch('/api/pagopar/iniciar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = (await res.json().catch(() => null)) as (CardPaymentStart & { error?: string }) | null;

  if (!res.ok || !data) throw new Error(data?.error || 'No pudimos generar el link de pago. Probá con transferencia.');
  if (!data.url || !data.hash) throw new Error('La pasarela no devolvió un link de pago.');
  return data;
}

export interface PaymentStatus {
  hash: string;
  orderId: string;
  pagado: boolean;
  cancelado: boolean;
  formaPago: string;
  formaPagoId: string;
  monto: string;
  fechaPago: string;
  numeroComprobante: string;
  numeroPedido: string;
  titulo: string;
  descripcion: string;
}

/** Estado real de un pago (Pagopar vía el servidor). */
export async function fetchPaymentStatus(hash: string): Promise<PaymentStatus> {
  const res = await fetch(`/api/pagopar/estado?hash=${encodeURIComponent(hash)}`, { cache: 'no-store' });
  const data = (await res.json().catch(() => null)) as (PaymentStatus & { error?: string }) | null;
  if (!res.ok || !data) throw new Error(data?.error || 'No pudimos consultar el estado del pago.');
  return data;
}

/* ---------- memoria local del pedido (para la página /pago) ---------- */

export interface PaymentSnapshot {
  orderId: string;
  docId?: string;
  name: string;
  /** Productos (con descuento), sin el delivery. */
  total: number;
  /** Delivery cobrado junto con el pedido, si el cliente lo cargó. */
  shippingCost?: number;
  items: OrderItem[];
  createdAt: number;
}

const snapshotKey = (hash: string) => `aura_pago_${hash}`;

export function savePaymentSnapshot(hash: string, snap: PaymentSnapshot): void {
  try {
    localStorage.setItem(snapshotKey(hash), JSON.stringify(snap));
  } catch {
    /* localStorage no disponible */
  }
}

export function readPaymentSnapshot(hash: string): PaymentSnapshot | null {
  try {
    const raw = localStorage.getItem(snapshotKey(hash));
    return raw ? (JSON.parse(raw) as PaymentSnapshot) : null;
  } catch {
    return null;
  }
}
