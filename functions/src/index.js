import { initializeApp } from 'firebase-admin/app';
import { FieldPath, FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineBoolean, defineInt, defineSecret, defineString } from 'firebase-functions/params';
import * as logger from 'firebase-functions/logger';
import { alertKey, eligibleOrder, makeAlert, messagePayload, sendOutcome, verifiedPayment } from './alerts.js';

initializeApp();
const db = getFirestore();
const region = 'southamerica-east1';
const options = { region, maxInstances: 1, memory: '256MiB', timeoutSeconds: 60 };
const enabled = defineBoolean('WHATSAPP_ALERTS_ENABLED', { default: false });
// Se fija al activar para no enviar avisos por el historial importado o editado.
const startedAt = defineString('WHATSAPP_ALERTS_STARTED_AT', { default: '' });
const dailyLimit = defineInt('WHATSAPP_ALERTS_DAILY_LIMIT', { default: 100 });
const apiKey = defineSecret('YCLOUD_API_KEY');
const outbox = db.collection('whatsappAlerts');
const paymentChecks = db.collection('whatsappPaymentChecks');
const API = 'https://api.ycloud.com/v2/whatsapp/messages';

async function enqueue(order, documentId, event, verifiedMethod, testing = false) {
  const ref = outbox.doc(alertKey(order.orderId, event));
  await db.runTransaction(async tx => {
    if ((await tx.get(ref)).exists) return;
    tx.create(ref, { ...makeAlert(order, documentId, event, Date.now(), verifiedMethod), ...(testing ? { test: true } : {}), updatedAt: FieldValue.serverTimestamp() });
  });
}

async function handleOrder(event, testing = false) {
  if (!enabled.value()) return;
  const after = event.data?.after.data();
  // createTime lo fija Firestore; no confiar en la fecha enviada por el comprador.
  if (!eligibleOrder({ ...after, createdAt: event.data?.after.createTime }, startedAt.value())) return;
  if (testing && !/^AURA-PRUEBA[A-Z0-9]+$/.test(after.orderId)) return;
  const before = event.data.before.data();
  if (!testing && /pagopar|tarjeta/i.test(after.paymentMethod || '') && /^[A-Za-z0-9_-]{6,128}$/.test(after.pagoparHash || '')) {
    // Una comprobación por pedido: el trabajador lee siempre el hash actual.
    const ref = paymentChecks.doc(alertKey(after.orderId, 'pago'));
    await db.runTransaction(async tx => {
      if ((await tx.get(ref)).exists) return;
      tx.create(ref, { orderDocumentId: event.params.orderId, state: 'pending', nextCheckAtMs: 0,
        expiresAtMs: Date.now() + 7 * 24 * 60 * 60_000 });
    });
  }
  if (!before) await enqueue(after, event.params.orderId, after.status === 'confirmado' ? 'pago' : 'pedido', undefined, testing);
  else if (before.status !== 'confirmado' && after.status === 'confirmado') await enqueue(after, event.params.orderId, 'pago', undefined, testing);
}

export const auraOrderAlerts = onDocumentWritten({ ...options, document: 'orders/{orderId}', retry: true }, event => handleOrder(event));

// Colección privada sin acceso del checkout ni del panel. Permite comprobar la
// entrega completa sin crear pedidos, ventas, Gift Cards ni conversiones falsas.
export const auraOrderAlertTests = onDocumentWritten({ ...options, document: 'whatsappAlertTests/{orderId}', retry: true }, event => handleOrder(event, true));

async function patch(ref, fields) {
  await ref.update({ ...fields, updatedAt: FieldValue.serverTimestamp() });
}

async function dispatch(ref) {
  if (!enabled.value()) return;
  const now = Date.now();
  const claimed = await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const alert = snap.data();
    if (alert.state !== 'pending' || alert.nextAttemptAtMs > now) return null;
    if (alert.expiresAtMs <= now || alert.attempts >= 5) {
      tx.update(ref, { state: 'expired', updatedAt: FieldValue.serverTimestamp() });
      return null;
    }
    const order = await tx.get(db.collection(alert.test === true ? 'whatsappAlertTests' : 'orders').doc(alert.orderDocumentId));
    if (!order.exists || order.data().status === 'cancelado') {
      tx.update(ref, { state: 'cancelled', updatedAt: FieldValue.serverTimestamp() });
      return null;
    }
    if (alert.event === 'pedido' && (order.data().status === 'confirmado' || (await tx.get(outbox.doc(alertKey(alert.orderCode, 'pago')))).exists)) {
      tx.update(ref, { state: 'superseded', updatedAt: FieldValue.serverTimestamp() });
      return null;
    }
    // Tope de gasto y abuso; los excedentes permanecen pendientes, no se descartan.
    const budgetRef = db.collection('whatsappAlertBudget').doc(new Date(now).toISOString().slice(0, 10));
    const budget = await tx.get(budgetRef);
    const count = budget.data()?.count || 0;
    if (count >= Math.max(0, dailyLimit.value())) return null;
    tx.set(budgetRef, { count: count + 1, updatedAt: FieldValue.serverTimestamp() });
    tx.update(ref, { state: 'dispatching', attempts: alert.attempts + 1, leaseUntilMs: now + 120_000, updatedAt: FieldValue.serverTimestamp() });
    return alert;
  });
  if (!claimed) return;
  let outcome;
  try {
    const response = await fetch(API, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey.value() },
      body: JSON.stringify(messagePayload(claimed)), signal: AbortSignal.timeout(20_000),
    });
    const body = await response.json().catch(() => null);
    outcome = sendOutcome(response.status, body);
  } catch {
    outcome = { state: 'unknown', errorCode: 'UNCERTAIN_DELIVERY' };
  }
  await patch(ref, { ...outcome, nextAttemptAtMs: now + 5 * 60_000 });
  if (['unknown', 'failed'].includes(outcome.state)) logger.error('WhatsApp alert needs review', { alertId: ref.id, code: outcome.errorCode });
}

export const auraSendOrderAlert = onDocumentCreated({ ...options, document: 'whatsappAlerts/{alertId}', secrets: [apiKey], retry: true }, async event => {
  if (event.data) await dispatch(event.data.ref);
});

// Consulta la API existente de Äura/Pagopar; no necesita copiar tokens de ALBA.
export const auraVerifyCardPayments = onSchedule({ ...options, schedule: 'every 5 minutes', timeoutSeconds: 300 }, async () => {
  if (!enabled.value()) return;
  const deadline = Date.now() + 240_000;
  // Cursor circular para que una cola grande de pendientes no bloquee los nuevos.
  const cursorRef = db.doc('whatsappPaymentState/cursor');
  const cursor = (await cursorRef.get()).data()?.lastId;
  const query = paymentChecks.where('state', '==', 'pending').orderBy(FieldPath.documentId());
  let checks = await (cursor ? query.startAfter(cursor) : query).limit(50).get();
  if (checks.empty && cursor) checks = await query.limit(50).get();
  let lastId;
  for (const check of checks.docs) {
    if (Date.now() > deadline) break;
    lastId = check.id;
    const data = check.data();
    if (data.nextCheckAtMs > Date.now()) continue;
    if (data.expiresAtMs < Date.now()) { await check.ref.update({ state: 'expired' }); continue; }
    const snap = await db.collection('orders').doc(data.orderDocumentId).get();
    const order = snap.data();
    if (!order || order.status === 'cancelado' || !/pagopar|tarjeta/i.test(order.paymentMethod || '')) { await check.ref.update({ state: 'cancelled' }); continue; }
    try {
      if (order.status === 'confirmado' || await verifiedPayment(order)) {
        await enqueue(order, snap.id, 'pago', 'Pagopar');
        await check.ref.update({ state: 'confirmed' });
      } else await check.ref.update({ nextCheckAtMs: Date.now() + 5 * 60_000 });
    } catch {
      await check.ref.update({ nextCheckAtMs: Date.now() + 5 * 60_000 });
      logger.warn('Could not verify Pagopar payment; will retry', { checkId: check.id });
    }
  }
  if (lastId) await cursorRef.set({ lastId });
});
// Recupera 429 y verifica la entrega: "accepted" no significa "delivered".
export const auraReconcileOrderAlerts = onSchedule({ ...options, schedule: 'every 5 minutes', secrets: [apiKey], timeoutSeconds: 300 }, async () => {
  if (!enabled.value()) return;
  const deadline = Date.now() + 240_000;
  const cursorRef = db.doc('whatsappDeliveryState/cursor');
  const cursor = (await cursorRef.get()).data()?.lastId;
  const query = outbox.where('state', 'in', ['pending', 'dispatching', 'accepted', 'sent']).orderBy(FieldPath.documentId());
  let snapshots = await (cursor ? query.startAfter(cursor) : query).limit(100).get();
  if (snapshots.empty && cursor) snapshots = await query.limit(100).get();
  let lastId;
  for (const doc of snapshots.docs) {
    if (Date.now() > deadline) break;
    lastId = doc.id;
    const alert = doc.data();
    if (alert.state === 'pending') { await dispatch(doc.ref); continue; }
    if (alert.state === 'dispatching') {
      if (alert.leaseUntilMs < Date.now()) {
        await patch(doc.ref, { state: 'unknown', errorCode: 'INTERRUPTED_SEND' });
        logger.error('WhatsApp send interrupted; check YCloud before retrying', { alertId: doc.id });
      }
      continue;
    }
    if (!alert.providerId) continue;
    if (alert.expiresAtMs + 24 * 60 * 60_000 < Date.now()) {
      await patch(doc.ref, { state: 'unknown', errorCode: 'DELIVERY_NOT_CONFIRMED' });
      logger.error('WhatsApp delivery not confirmed after 48 hours', { alertId: doc.id });
      continue;
    }
    try {
      const response = await fetch(`${API}/${encodeURIComponent(alert.providerId)}`, {
        headers: { 'X-API-Key': apiKey.value() }, signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) continue;
      const body = await response.json();
      if (['accepted', 'sent', 'delivered', 'read', 'failed'].includes(body.status)) {
        await patch(doc.ref, { state: body.status, errorCode: String(body.errorCode || '').slice(0, 100), checkedAtMs: Date.now() });
        if (body.status === 'failed') logger.error('WhatsApp delivery failed', { alertId: doc.id, code: body.errorCode || '' });
      }
    } catch { /* Se conserva el ID para consultar nuevamente, sin reenviar. */ }
  }
  if (lastId) await cursorRef.set({ lastId });
});
