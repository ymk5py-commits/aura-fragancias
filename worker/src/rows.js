// Columnas de `orders` que necesita el trabajador. El rol de base de datos solo puede leer estas.
export const ORDER_COLUMNS = 'id, order_id, status, total, shipping_cost, items, payment_method, pagopar_hash, created_at';

/**
 * Fila de `orders` -> forma del pedido que espera alerts.js (la misma que tenía en Firestore).
 * createdAt imita el Timestamp de Firestore: la fecha real de la fila, no la que mande el comprador.
 */
export function rowToOrder(row) {
  return {
    orderId: row.order_id,
    status: row.status,
    total: row.total,
    shippingCost: row.shipping_cost ?? undefined,
    items: row.items,
    paymentMethod: row.payment_method,
    pagoparHash: row.pagopar_hash ?? undefined,
    createdAt: row.created_at instanceof Date ? { toMillis: () => row.created_at.getTime() } : null,
  };
}

/** Fila de `whatsapp_alert_tests` (la ruta privada de diagnóstico); su fecha de creación es "ahora". */
export function testRowToOrder(row, createdAtMs) {
  return {
    orderId: row.order_id,
    status: row.status,
    total: row.total,
    items: row.items,
    paymentMethod: row.payment_method,
    createdAt: { toMillis: () => createdAtMs },
  };
}

/** Fila de `whatsapp_alerts` -> forma que usa messagePayload() y la lógica de envío. */
export function rowToAlert(row) {
  return {
    id: row.id,
    event: row.event,
    orderCode: row.order_code,
    orderDocumentId: row.order_document_id,
    amount: row.amount,
    method: row.method,
    state: row.state,
    attempts: row.attempts,
    createdAtMs: row.created_at_ms,
    nextAttemptAtMs: row.next_attempt_at_ms,
    expiresAtMs: row.expires_at_ms,
    leaseUntilMs: row.lease_until_ms ?? 0,
    providerId: row.provider_id || '',
    errorCode: row.error_code || '',
    test: row.test === true,
  };
}
