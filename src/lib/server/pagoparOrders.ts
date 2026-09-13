/* ============================================================
   Lógica compartida por las rutas /api/pagopar. SOLO SERVIDOR.
   - marcar un pedido como pagado / reversado según lo que diga Pagopar
   - avisar el Purchase real a Meta por Conversions API
   ============================================================ */

import { updateOrder } from './firestoreRest';
import { pagoparConfig } from './pagopar';
import type { OrderDoc, PagoparPayment } from './types';

export interface PagoparOrderRow {
  pagado?: boolean;
  cancelado?: boolean;
  forma_pago?: string;
  forma_pago_identificador?: string;
  numero_comprobante_interno?: string | null;
  fecha_pago?: string | null;
  monto?: string;
  hash_pedido?: string;
  numero_pedido?: string;
}

export function paymentFromRow(row: PagoparOrderRow): PagoparPayment {
  return {
    formaPago: row.forma_pago || '',
    formaPagoId: row.forma_pago_identificador || '',
    numeroComprobante: row.numero_comprobante_interno || '',
    fechaPago: row.fecha_pago || '',
    monto: row.monto || '',
  };
}

/**
 * Aplica al pedido lo que informa Pagopar. Devuelve true si el pedido
 * acaba de pasar a pagado (para disparar el Purchase una sola vez).
 */
export async function applyPagoparResult(order: OrderDoc, row: PagoparOrderRow): Promise<boolean> {
  const now = Date.now();
  const patch: Record<string, unknown> = { pagoparLastEventAt: now };
  let justPaid = false;

  if (row.pagado === true) {
    patch.pagoparStatus = 'pagado';
    patch.pagoparPayment = paymentFromRow(row);
    if (order.pagoparStatus !== 'pagado') {
      patch.paidAt = now;
      justPaid = true;
    }
    // Pagado por Pagopar = venta confirmada. No pisamos un pedido cancelado a mano.
    if (order.status !== 'cancelado') patch.status = 'confirmado';
  } else if (order.pagoparStatus === 'pagado') {
    // Reversión: la plata volvió, el pedido deja de estar confirmado.
    patch.pagoparStatus = 'reversado';
    if (order.status === 'confirmado') patch.status = 'pendiente';
  } else {
    patch.pagoparStatus = 'pendiente';
  }

  await updateOrder(order.id, patch);
  return justPaid;
}

/**
 * Purchase real por Conversions API (mismo event_id que el Pixel de la
 * página /pago, así Meta deduplica). Fire-and-forget: nunca rompe el webhook.
 */
export async function sendPurchaseToMeta(order: OrderDoc): Promise<void> {
  try {
    const { siteUrl } = pagoparConfig();
    await fetch(`${siteUrl}/api/meta-capi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: 'Purchase',
        eventId: order.orderId,
        value: order.total,
        currency: 'PYG',
        contentIds: (order.items || []).map((i) => i.code),
        contents: (order.items || []).map((i) => ({ id: i.code, quantity: i.quantity, item_price: i.price })),
        numItems: (order.items || []).reduce((a, i) => a + (Number(i.quantity) || 0), 0),
        userData: { phone: order.phone, firstName: order.name, city: order.cityAndNeighborhood, email: order.email },
        actionSource: 'website',
        eventSourceUrl: `${siteUrl}/pago/${order.pagoparHash || ''}`,
      }),
      cache: 'no-store',
    });
  } catch (error) {
    console.warn('[pagopar] no se pudo enviar el Purchase a Meta:', error);
  }
}
