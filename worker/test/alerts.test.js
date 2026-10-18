import assert from 'node:assert/strict';
import test from 'node:test';
import { alertKey, eligibleOrder, makeAlert, messagePayload, orderAmount, paymentMatches, RECIPIENT, sendOutcome, SENDER, verifiedPayment } from '../src/alerts.js';

const start = '2026-10-13T22:00:00Z';
const order = {
  orderId: 'AURA-MU12345', status: 'pendiente', total: 100000, shippingCost: 20000,
  createdAt: { toMillis: () => Date.parse(start) + 1000 },
  paymentMethod: 'Tarjeta de crédito o débito (Pagopar)', pagoparHash: 'hash-123456',
  items: [{ code: 'DD161', name: 'Good Girl Blush', quantity: 1 }],
  name: 'PRIVATE NAME', phone: 'PRIVATE PHONE', address: 'PRIVATE ADDRESS', invoice: { ruc: 'PRIVATE RUC' },
};

test('only orders from activation onwards are eligible; cancellation and incomplete data are excluded', () => {
  assert.equal(eligibleOrder(order, start), true);
  for (const patch of [{ status: 'cancelado' }, { total: -1 }, { total: 1.5 }, { shippingCost: -100 }, { items: [] }, { orderId: '../other' }, { createdAt: null }, { createdAt: { toMillis: () => Date.parse(start) - 1 } }]) {
    assert.equal(eligibleOrder({ ...order, ...patch }, start), false);
  }
  assert.equal(eligibleOrder(order, ''), false);
});

test('amount includes coordinated delivery once, with bounded whole guaraní amounts', () => {
  assert.equal(orderAmount(order), 120000);
  assert.equal(orderAmount({ total: 100000 }), 100000);
  assert.equal(orderAmount({ total: 100_000_001 }), null);
  assert.equal(orderAmount({ total: '100000' }), null);
});

test('stable order/event identity deduplicates automatic checks and admin confirmation, even across document IDs', () => {
  const a = makeAlert(order, 'firestore-A', 'pago', 1);
  const b = makeAlert(order, 'firestore-B', 'pago', 2);
  assert.equal(alertKey(a.orderCode, a.event), alertKey(b.orderCode, b.event));
  assert.notEqual(alertKey(order.orderId, 'pedido'), alertKey(order.orderId, 'pago'));
});

test('template recipients and sender cannot be overridden by checkout or stored data', () => {
  const alert = makeAlert(order, 'doc', 'pedido');
  const body = messagePayload({ ...alert, to: '+1234567890', from: '+1098765432', template: 'other' });
  assert.equal(body.from, SENDER); assert.equal(body.to, RECIPIENT);
  assert.equal(body.template.name, 'aura_pedido_web');
  assert.equal(body.template.language.code, 'es');
  assert.equal(body.template.components[0].parameters.length, 2);
  assert.equal(body.template.components[0].parameters[1].text, '120.000');
  assert.ok(!JSON.stringify(body).includes('PRIVATE'));
});

test('payment template has exactly three parameters and no private customer details', () => {
  const body = messagePayload(makeAlert(order, 'doc', 'pago'));
  assert.equal(body.template.name, 'aura_pago_confirmado_web');
  assert.deepEqual(body.template.components[0].parameters.map(p => p.text), ['AURA-MU12345', '120.000', 'Pagopar']);
  assert.ok(!JSON.stringify(body).includes('PRIVATE'));
  assert.equal(messagePayload(makeAlert({ ...order, paymentMethod: 'Transferencia Bancaria / QR' }, 'doc', 'pago')).template.components[0].parameters[2].text, 'Transferencia');
});

test('verified payment must match order code, hash, amount, method and non-cancelled status', () => {
  const payment = { hash: order.pagoparHash, orderCode: order.orderId, amount: 120000 };
  assert.equal(paymentMatches(order, payment), true);
  for (const patch of [{ hash: 'another' }, { orderCode: 'AURA-ANOTHER' }, { amount: 100000 }, { amount: '120000' }]) assert.equal(paymentMatches(order, { ...payment, ...patch }), false);
  assert.equal(paymentMatches({ ...order, status: 'cancelado' }, payment), false);
  assert.equal(paymentMatches({ ...order, paymentMethod: 'Transferencia' }, payment), false);
});

test('accepted is not delivered; ambiguous failures cannot be automatically resent', () => {
  assert.equal(sendOutcome(200, { id: 'provider-123', status: 'accepted' }).state, 'accepted');
  assert.equal(sendOutcome(429, {}).state, 'pending');
  assert.equal(sendOutcome(401, {}).state, 'failed');
  assert.equal(sendOutcome(500, {}).state, 'unknown');
  assert.equal(sendOutcome(200, {}).state, 'unknown');
  assert.equal(sendOutcome(200, { id: 'provider-123', status: 'failed' }).state, 'failed');
});

test('card verification uses only the existing store API with the stored payment hash', async () => {
  let calls = 0;
  const payment = await verifiedPayment({ ...order, verificationUrl: 'https://attacker.example/' }, async (url, init) => {
    calls++;
    assert.equal(url, 'https://www.aurafragancias.store/api/pagopar/estado?hash=hash-123456');
    assert.equal(init.redirect, 'error');
    return Response.json({ pagado: true, cancelado: false, hash: order.pagoparHash, orderId: order.orderId, monto: '120000' });
  });
  assert.equal(payment.amount, 120000); assert.equal(calls, 1);
});

test('unpaid, reversed, wrong amount, wrong order and wrong hash never produce a payment alert', async () => {
  const status = { pagado: true, cancelado: false, hash: order.pagoparHash, orderId: order.orderId, monto: '120000' };
  for (const patch of [{ pagado: false }, { cancelado: true }, { hash: 'other-hash' }, { orderId: 'ALBA-OTHER' }, { monto: '1' }, { monto: '1.5' }]) {
    assert.equal(await verifiedPayment(order, async () => Response.json({ ...status, ...patch })), null);
  }
  await assert.rejects(verifiedPayment(order, async () => new Response('{}', { status: 503 })));
  assert.equal(await verifiedPayment({ ...order, paymentMethod: 'Transferencia' }, async () => { throw new Error('Unexpected call'); }), null);
});
