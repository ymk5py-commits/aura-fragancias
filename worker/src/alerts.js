import { createHash } from 'node:crypto';

// Destino autorizado por el dueño. Nunca se toma del checkout ni del webhook.
export const SENDER = '+595994414986';
export const RECIPIENT = '+595984348058';
export const TEMPLATES = { pedido: 'aura_pedido_web', pago: 'aura_pago_confirmado_web' };
export const MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const CODE_PATTERN = /^AURA-[A-Z0-9]{5,32}$/;

export function orderAmount(order) {
  const total = order?.total;
  const delivery = order?.shippingCost ?? 0;
  if (!Number.isSafeInteger(total) || total <= 0 || !Number.isSafeInteger(delivery) || delivery < 0) return null;
  const amount = total + delivery;
  return amount <= 100_000_000 ? amount : null;
}

export function eligibleOrder(order, startedAt) {
  const created = order?.createdAt?.toMillis?.();
  const start = Date.parse(startedAt);
  return Number.isFinite(start) && Number.isFinite(created) && created >= start
    && CODE_PATTERN.test(order?.orderId) && orderAmount(order) !== null
    && Array.isArray(order?.items) && order.items.length > 0
    && ['pendiente', 'confirmado'].includes(order.status);
}

export function alertKey(orderCode, event) {
  if (!CODE_PATTERN.test(orderCode) || !Object.hasOwn(TEMPLATES, event)) throw new Error('Invalid alert identity');
  return createHash('sha256').update(`${orderCode}:${event}`).digest('hex');
}

export function makeAlert(order, documentId, event, now = Date.now(), verifiedMethod) {
  if (!CODE_PATTERN.test(order?.orderId) || orderAmount(order) === null || !Object.hasOwn(TEMPLATES, event)) throw new Error('Invalid order');
  return {
    event, orderCode: order.orderId, orderDocumentId: documentId,
    amount: orderAmount(order),
    method: verifiedMethod || /pagopar|tarjeta/i.test(order.paymentMethod || '') ? 'Pagopar' : 'Transferencia',
    state: 'pending', attempts: 0, createdAtMs: now, nextAttemptAtMs: now,
    expiresAtMs: now + MAX_AGE_MS,
  };
}

export function messagePayload(alert) {
  if (!TEMPLATES[alert.event] || !CODE_PATTERN.test(alert.orderCode)
    || !Number.isSafeInteger(alert.amount) || alert.amount <= 0 || alert.amount > 100_000_000) throw new Error('Invalid alert');
  const parameters = [alert.orderCode, new Intl.NumberFormat('es-PY').format(alert.amount)];
  if (alert.event === 'pago') parameters.push(alert.method === 'Pagopar' ? 'Pagopar' : 'Transferencia');
  return {
    from: SENDER, to: RECIPIENT, type: 'template',
    externalId: `aura-${alertKey(alert.orderCode, alert.event)}`,
    template: {
      name: TEMPLATES[alert.event], language: { code: 'es', policy: 'deterministic' },
      components: [{ type: 'body', parameters: parameters.map(text => ({ type: 'text', text })) }],
    },
  };
}

export function paymentMatches(order, payment) {
  return order?.status !== 'cancelado' && /pagopar|tarjeta/i.test(order?.paymentMethod || '')
    && typeof order?.pagoparHash === 'string' && order.pagoparHash === payment?.hash
    && order.orderId === payment.orderCode && Number.isSafeInteger(payment.amount)
    && orderAmount(order) === payment.amount;
}

/** Única fuente admitida para verificar tarjetas: la API existente de Äura/Pagopar. */
export async function verifiedPayment(order, request = fetch) {
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(order?.pagoparHash || '') || !/pagopar|tarjeta/i.test(order?.paymentMethod || '')) return null;
  const response = await request(`https://www.aurafragancias.store/api/pagopar/estado?hash=${encodeURIComponent(order.pagoparHash)}`, {
    signal: AbortSignal.timeout(10_000), redirect: 'error', headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Payment status unavailable');
  const status = await response.json();
  const payment = { hash: status.hash, orderCode: status.orderId, amount: Number(status.monto) };
  return status.pagado === true && status.cancelado !== true && paymentMatches(order, payment) ? payment : null;
}

// externalId es una referencia de conciliación; YCloud NO documenta que deduplique.
// Ante una respuesta incierta no se vuelve a enviar a ciegas.
export function sendOutcome(httpStatus, body) {
  if (httpStatus >= 200 && httpStatus < 300 && typeof body?.id === 'string' && body.id.length > 0) {
    return { state: body.status === 'failed' ? 'failed' : 'accepted', providerId: body.id, errorCode: body.errorCode || '' };
  }
  if (httpStatus === 429) return { state: 'pending', errorCode: 'RATE_LIMIT' };
  if (httpStatus >= 400 && httpStatus < 500) return { state: 'failed', errorCode: `HTTP_${httpStatus}` };
  return { state: 'unknown', errorCode: 'UNCERTAIN_DELIVERY' };
}
