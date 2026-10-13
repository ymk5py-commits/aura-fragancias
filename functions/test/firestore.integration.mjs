import assert from 'node:assert/strict';
import test from 'node:test';

// Nunca ejecutar estas pruebas contra producción.
if (!process.env.FIRESTORE_EMULATOR_HOST || process.env.GCLOUD_PROJECT !== 'demo-aura-alerts') throw new Error('Local demo Firestore emulator required');
process.env.FIREBASE_CONFIG = JSON.stringify({ projectId: 'demo-aura-alerts' });
process.env.WHATSAPP_ALERTS_ENABLED = 'true';
process.env.WHATSAPP_ALERTS_STARTED_AT = new Date(Date.now() - 60 * 60_000).toISOString();
process.env.WHATSAPP_ALERTS_DAILY_LIMIT = '100';
process.env.YCLOUD_API_KEY = 'local-test-key-never-used-on-network';
const { auraOrderAlerts, auraSendOrderAlert, auraReconcileOrderAlerts, auraVerifyCardPayments } = await import('../src/index.js');
const { getFirestore } = await import('firebase-admin/firestore');
const { alertKey } = await import('../src/alerts.js');
const db = getFirestore();
const nativeFetch = global.fetch;
let sent = [];
let mode = 'accepted';
let paymentMode = 'pending';
const verifiedOrders = new Set();
global.fetch = async (url, init = {}) => {
  if (String(url).startsWith('https://www.aurafragancias.store/api/pagopar/estado?hash=')) {
    const hash = new URL(url).searchParams.get('hash');
    const orderId = hash.slice(5);
    verifiedOrders.add(orderId);
    return Response.json({ hash, orderId, monto: '120000', pagado: paymentMode === 'paid', cancelado: false });
  }
  if (!String(url).startsWith('https://api.ycloud.com/v2/whatsapp/messages')) throw new Error('Unexpected network request');
  if (init.method === 'POST') {
    sent.push(JSON.parse(init.body));
    if (mode === 'timeout') throw new Error('Simulated interrupted connection');
    if (mode === 'rate-limit') return new Response('{}', { status: 429 });
    return Response.json({ id: `ycloud-local-${sent.length}`, status: 'accepted' });
  }
  return Response.json({ status: 'delivered' });
};

async function create(code) {
  const ref = db.collection('orders').doc(code);
  const before = await ref.get();
  await ref.set({
    orderId: code, status: 'pendiente', total: 100000, shippingCost: 20000,
    paymentMethod: 'Tarjeta de crédito o débito (Pagopar)', pagoparHash: `hash-${code}`,
    // Intencionalmente no hay createdAt del cliente: se usa createTime confiable.
    items: [{ code: 'DD161', quantity: 1 }],
  });
  const after = await ref.get();
  return { ref, before, after, event: { data: { before, after }, params: { orderId: ref.id } } };
}
function alertRef(code, event = 'pedido') { return db.collection('whatsappAlerts').doc(alertKey(code, event)); }
async function send(ref) { await auraSendOrderAlert.run({ data: await ref.get() }); }

test('Firestore transactions prevent duplicates under concurrent event delivery; provider acceptance is later reconciled', async () => {
  const order = await create('AURA-LOCAL001');
  await Promise.all(Array.from({ length: 8 }, () => auraOrderAlerts.run(order.event)));
  const ref = alertRef('AURA-LOCAL001');
  assert.equal((await ref.get()).data().state, 'pending');
  await Promise.all(Array.from({ length: 8 }, () => send(ref)));
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, '+595984348058');
  assert.equal((await ref.get()).data().state, 'accepted');
  await auraReconcileOrderAlerts.run({});
  assert.equal((await ref.get()).data().state, 'delivered');
});

test('cancelled orders and delayed new-order events after payment do not send stale pending alerts', async () => {
  const cancelled = await create('AURA-LOCAL002');
  await auraOrderAlerts.run(cancelled.event);
  await cancelled.ref.update({ status: 'cancelado' });
  const count = sent.length;
  await send(alertRef('AURA-LOCAL002'));
  assert.equal(sent.length, count);
  assert.equal((await alertRef('AURA-LOCAL002').get()).data().state, 'cancelled');
  const confirmed = await create('AURA-LOCAL003');
  await auraOrderAlerts.run(confirmed.event);
  await confirmed.ref.update({ status: 'confirmado' });
  await auraOrderAlerts.run({ data: { before: confirmed.after, after: await confirmed.ref.get() }, params: { orderId: confirmed.ref.id } });
  await send(alertRef('AURA-LOCAL003'));
  assert.equal(sent.length, count);
  assert.equal((await alertRef('AURA-LOCAL003').get()).data().state, 'superseded');
  await send(alertRef('AURA-LOCAL003', 'pago'));
  assert.equal(sent.length, count + 1);
});

test('429 is retried safely, ambiguous network outcomes are held for review without duplicate messages', async () => {
  const rate = await create('AURA-LOCAL004');
  await auraOrderAlerts.run(rate.event);
  mode = 'rate-limit';
  await send(alertRef('AURA-LOCAL004'));
  assert.equal((await alertRef('AURA-LOCAL004').get()).data().state, 'pending');
  await alertRef('AURA-LOCAL004').update({ nextAttemptAtMs: 0 });
  mode = 'accepted';
  await auraReconcileOrderAlerts.run({});
  assert.equal((await alertRef('AURA-LOCAL004').get()).data().state, 'accepted');
  const timeout = await create('AURA-LOCAL005');
  await auraOrderAlerts.run(timeout.event);
  mode = 'timeout';
  await send(alertRef('AURA-LOCAL005'));
  const count = sent.length;
  assert.equal((await alertRef('AURA-LOCAL005').get()).data().state, 'unknown');
  await send(alertRef('AURA-LOCAL005'));
  await auraReconcileOrderAlerts.run({});
  assert.equal(sent.length, count);
  mode = 'accepted';
});

test('closed-panel payment verification and later admin confirmation produce one payment alert', async () => {
  const order = await create('AURA-LOCAL006');
  await auraOrderAlerts.run(order.event);
  paymentMode = 'paid';
  await auraVerifyCardPayments.run({});
  assert.equal((await order.ref.get()).data().status, 'pendiente');
  const ref = alertRef('AURA-LOCAL006', 'pago');
  const created = (await ref.get()).data().createdAtMs;
  await order.ref.update({ status: 'confirmado' });
  await auraOrderAlerts.run({ data: { before: order.after, after: await order.ref.get() }, params: { orderId: order.ref.id } });
  assert.equal((await ref.get()).data().createdAtMs, created);
  const count = sent.length;
  await Promise.all([send(ref), send(ref)]);
  assert.equal(sent.length, count + 1);
  paymentMode = 'pending';
});

test('circular payment cursor reaches more than one batch of pending orders', async () => {
  // Colección temporal del emulador: aislamos esta prueba de las anteriores.
  const old = await db.collection('whatsappPaymentChecks').get();
  const batch = db.batch(); old.docs.forEach(doc => batch.delete(doc.ref)); await batch.commit();
  await db.doc('whatsappPaymentState/cursor').delete();
  verifiedOrders.clear();
  for (let i = 0; i < 55; i++) {
    const order = await create(`AURA-BATCH${String(i).padStart(3, '0')}`);
    await auraOrderAlerts.run(order.event);
  }
  await auraVerifyCardPayments.run({});
  assert.equal(verifiedOrders.size, 50);
  await auraVerifyCardPayments.run({});
  assert.equal(verifiedOrders.size, 55);
});

test('delivery reconciliation progresses through more than 100 accepted messages', async () => {
  const old = await db.collection('whatsappAlerts').get();
  const batch = db.batch(); old.docs.forEach(doc => batch.delete(doc.ref)); await batch.commit();
  await db.doc('whatsappDeliveryState/cursor').delete();
  const seed = db.batch();
  for (let i = 0; i < 150; i++) seed.set(db.collection('whatsappAlerts').doc(`delivery${String(i).padStart(3, '0')}`), {
    state: 'accepted', providerId: `local-provider-${i}`, expiresAtMs: Date.now() + 24 * 60 * 60_000,
  });
  await seed.commit();
  await auraReconcileOrderAlerts.run({});
  assert.equal((await db.collection('whatsappAlerts').where('state', '==', 'delivered').get()).size, 100);
  await auraReconcileOrderAlerts.run({});
  assert.equal((await db.collection('whatsappAlerts').where('state', '==', 'delivered').get()).size, 150);
});

test.after(async () => { global.fetch = nativeFetch; await db.terminate(); });
