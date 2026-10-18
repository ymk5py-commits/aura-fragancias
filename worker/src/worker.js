import { alertKey, eligibleOrder, makeAlert, MAX_AGE_MS, messagePayload, sendOutcome, verifiedPayment } from './alerts.js';
import { silentLog } from './log.js';
import { ORDER_COLUMNS, rowToAlert, rowToOrder, testRowToOrder } from './rows.js';

export const API = 'https://api.ycloud.com/v2/whatsapp/messages';
const CARD = /pagopar|tarjeta/i;
const HASH = /^[A-Za-z0-9_-]{6,128}$/;
const MINUTE = 60_000;
// Un evento que el trabajador procesa con más de 24 h de atraso ya no es un aviso útil
// (los avisos pendientes también vencen a las 24 h): se descarta en vez de avisar tarde.
const MAX_EVENT_AGE_MS = MAX_AGE_MS;
const STATES_TO_RECONCILE = ['pending', 'dispatching', 'accepted', 'sent'];
// Reintento de un evento que falla: 30 s, 1 min, 2 min… hasta 30 min. Mientras espera no ocupa lugar en el lote.
const retryDelay = attempts => Math.min(30 * MINUTE, 30_000 * 2 ** Math.min(attempts - 1, 10));

/**
 * Núcleo del trabajador: el equivalente de functions/src/index.js sobre Postgres.
 *  - cada transacción de Firestore pasó a ser una transacción de Postgres con `FOR UPDATE SKIP LOCKED`;
 *  - los disparadores de Firestore pasaron a ser el sondeo de `order_events`.
 * `pool`, `fetchImpl`, `now`, `log` y `signal` se inyectan para poder probarlo sin red ni reloj real.
 * `signal` (AbortSignal) avisa que el proceso se está apagando: no se reclaman ni se envían avisos nuevos.
 */
export function createWorker({ pool, config, fetchImpl = globalThis.fetch, now = Date.now, log = silentLog, signal }) {
  const retries = new Map(); // id del evento -> { attempts, retryAt }
  const stopping = () => signal?.aborted === true;

  // El hub de Äura/Pagopar está detrás de Cloudflare: se identifica el cliente para no parecer un bot anónimo.
  // `redirect: 'error'` evita que X-API-Key viaje a otro host si alguna respuesta redirige.
  const request = (url, init = {}) => fetchImpl(url, { redirect: 'error', ...init, headers: { 'User-Agent': 'aura-whatsapp-worker/1.0', ...init.headers } });

  async function withTx(fn) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  async function getCursor(name) {
    const { rows } = await pool.query('SELECT last_id FROM worker_cursors WHERE name = $1', [name]);
    return rows[0]?.last_id ?? null;
  }

  async function setCursor(name, lastId) {
    await pool.query('INSERT INTO worker_cursors (name, last_id) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET last_id = EXCLUDED.last_id', [name, lastId]);
  }

  // Un aviso por pedido y evento: la identidad es el hash de (código, evento), igual que en Firestore.
  // `at` es el instante del que cuentan las 24 h de vigencia (el del evento que lo originó).
  async function enqueue(db, order, documentId, event, verifiedMethod, testing = false, at = now()) {
    const alert = makeAlert(order, documentId, event, at, verifiedMethod);
    const { rowCount } = await db.query(
      `INSERT INTO whatsapp_alerts (id, event, order_code, order_document_id, amount, method, state, attempts,
         created_at_ms, next_attempt_at_ms, expires_at_ms, test)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO NOTHING`,
      [alertKey(order.orderId, event), alert.event, alert.orderCode, alert.orderDocumentId, alert.amount, alert.method,
        alert.state, alert.attempts, alert.createdAtMs, alert.nextAttemptAtMs, alert.expiresAtMs, testing]);
    return rowCount === 1 ? alertKey(order.orderId, event) : null;
  }

  /** Equivalente de handleOrder(). Devuelve el id del aviso creado, o null. */
  async function handleOrderChange(db, { before, after, documentId, testing = false, at = now() }) {
    if (!after || !eligibleOrder(after, config.startedAt)) return null;
    if (testing && !/^AURA-PRUEBA[A-Z0-9]+$/.test(after.orderId)) return null;
    if (!testing && CARD.test(after.paymentMethod || '') && HASH.test(after.pagoparHash || '')) {
      // Una comprobación por pedido: el trabajador lee siempre el hash actual.
      await db.query(
        `INSERT INTO whatsapp_payment_checks (id, order_document_id, state, next_check_at_ms, expires_at_ms)
         VALUES ($1, $2, 'pending', 0, $3) ON CONFLICT (id) DO NOTHING`,
        [alertKey(after.orderId, 'pago'), documentId, at + 7 * 24 * 60 * MINUTE]);
    }
    if (!before) return enqueue(db, after, documentId, after.status === 'confirmado' ? 'pago' : 'pedido', undefined, testing, at);
    if (before.status !== 'confirmado' && after.status === 'confirmado') return enqueue(db, after, documentId, 'pago', undefined, testing, at);
    return null;
  }

  /** Traduce un evento de `order_events` a la forma antes/después que usa handleOrderChange. */
  async function handleEvent(db, event) {
    const at = event.created_at.getTime();
    if (now() - at > MAX_EVENT_AGE_MS) {
      log.warn('evento descartado por antiguo', { eventId: event.id });
      return null;
    }
    const { rows } = await db.query(`SELECT ${ORDER_COLUMNS} FROM orders WHERE id = $1`, [event.order_pk]);
    if (!rows[0]) {
      log.warn('pedido inexistente para el evento', { eventId: event.id });
      return null;
    }
    const base = rowToOrder(rows[0]);
    // Fecha de creación confiable (como `createTime` de Firestore): la del primer evento 'created', que la marca la base
    // y no el visitante. Los pedidos migrados no tienen evento; para ellos vale `orders.created_at`.
    const first = (await db.query(`SELECT min(created_at) AS t FROM order_events WHERE order_pk = $1 AND kind = 'created'`, [event.order_pk])).rows[0]?.t;
    if (first) base.createdAt = { toMillis: () => first.getTime() };
    return handleOrderChange(db, {
      before: event.kind === 'created' ? null : { ...base, status: event.old_status },
      after: { ...base, status: event.new_status },
      documentId: event.order_pk,
      at,
    });
  }

  /** Reemplaza al disparador `auraOrderAlerts`: consume `order_events` pendientes. */
  async function processEvents({ dispatchNew = true } = {}) {
    if (!config.enabled) return { skipped: 'disabled' };
    if (stopping()) return { skipped: 'stopping' };
    const created = [];
    let processed = 0;
    // Los eventos que fallaron esperan su turno de reintento sin quitarle lugar a los demás.
    const waiting = [...retries].filter(([, state]) => state.retryAt > now()).map(([id]) => id);
    await withTx(async client => {
      const { rows } = await client.query(
        `SELECT id, order_pk, order_code, kind, old_status, new_status, created_at
           FROM order_events WHERE processed_at IS NULL AND NOT (id = ANY($1::bigint[]))
          ORDER BY id LIMIT 50 FOR UPDATE SKIP LOCKED`, [waiting]);
      const done = [];
      for (const event of rows) {
        try {
          await client.query('SAVEPOINT evento');
          const alertId = await handleEvent(client, event);
          await client.query('RELEASE SAVEPOINT evento');
          if (alertId) created.push(alertId);
          retries.delete(event.id);
          done.push(event.id);
        } catch (error) {
          await client.query('ROLLBACK TO SAVEPOINT evento');
          // Un error pasajero (bloqueo, tiempo agotado) se reintenta hasta que el evento cumpla 24 h; un evento que falla siempre no frena a los demás.
          const attempts = (retries.get(event.id)?.attempts || 0) + 1;
          retries.set(event.id, { attempts, retryAt: now() + retryDelay(attempts) });
          log.error('no se pudo procesar el evento', { eventId: event.id, attempt: attempts, code: error.code || error.message });
        }
      }
      if (done.length) await client.query('UPDATE order_events SET processed_at = now() WHERE id = ANY($1::bigint[])', [done]);
      processed = done.length;
    });
    // El equivalente de `auraSendOrderAlert` (onCreate): enviar apenas se crea. Fuera de la transacción.
    if (dispatchNew) for (const id of created) { if (stopping()) break; await dispatch(id); }
    return { processed, created };
  }

  /** Actualiza un aviso. `states` / `leaseBefore` evitan pisar un estado más nuevo escrito por otro carril. Devuelve las filas tocadas. */
  async function patch(id, fields, { states, leaseBefore } = {}) {
    const columns = { state: 'state', providerId: 'provider_id', errorCode: 'error_code', nextAttemptAtMs: 'next_attempt_at_ms',
      checkedAtMs: 'checked_at_ms', leaseUntilMs: 'lease_until_ms', attempts: 'attempts' };
    const names = Object.keys(fields).filter(name => Object.hasOwn(columns, name));
    const params = [id, ...names.map(name => fields[name])];
    let where = 'id = $1';
    if (states) { params.push(states); where += ` AND state = ANY($${params.length}::text[])`; }
    if (leaseBefore !== undefined) { params.push(leaseBefore); where += ` AND lease_until_ms < $${params.length}`; }
    const sets = [...names.map((name, i) => `${columns[name]} = $${i + 2}`), 'updated_at = now()'];
    const { rowCount } = await pool.query(`UPDATE whatsapp_alerts SET ${sets.join(', ')} WHERE ${where}`, params);
    return rowCount;
  }

  /** Reclamo atómico (equivalente de la transacción de dispatch): devuelve el aviso reservado o null. */
  function claim(id, at) {
    return withTx(async client => {
      // SKIP LOCKED: si otra ejecución ya reservó este aviso, esta pasa de largo en vez de esperar o duplicar.
      const { rows } = await client.query('SELECT * FROM whatsapp_alerts WHERE id = $1 FOR UPDATE SKIP LOCKED', [id]);
      if (!rows[0]) return null;
      const alert = rowToAlert(rows[0]);
      const setState = state => client.query('UPDATE whatsapp_alerts SET state = $2, updated_at = now() WHERE id = $1', [id, state]);
      if (alert.state !== 'pending' || alert.nextAttemptAtMs > at) return null;
      if (alert.expiresAtMs <= at || alert.attempts >= 5) { await setState('expired'); return null; }
      const orderQuery = alert.test
        ? client.query('SELECT status FROM whatsapp_alert_tests WHERE id = $1', [alert.orderDocumentId])
        : client.query('SELECT status FROM orders WHERE id = $1', [alert.orderDocumentId]);
      const order = (await orderQuery).rows[0];
      if (!order || order.status === 'cancelado') { await setState('cancelled'); return null; }
      if (alert.event === 'pedido') {
        const paid = order.status === 'confirmado'
          || (await client.query('SELECT 1 FROM whatsapp_alerts WHERE id = $1', [alertKey(alert.orderCode, 'pago')])).rowCount > 0;
        if (paid) { await setState('superseded'); return null; }
      }
      // Tope de gasto y abuso; los excedentes permanecen pendientes, no se descartan.
      const limit = Math.max(0, config.dailyLimit);
      if (limit === 0) return null;
      const budget = await client.query(
        `INSERT INTO whatsapp_alert_budget (day, count) VALUES ($1, 1)
         ON CONFLICT (day) DO UPDATE SET count = whatsapp_alert_budget.count + 1, updated_at = now()
         WHERE whatsapp_alert_budget.count < $2`,
        [new Date(at).toISOString().slice(0, 10), limit]);
      if (budget.rowCount === 0) return null;
      await client.query(
        `UPDATE whatsapp_alerts SET state = 'dispatching', attempts = attempts + 1, lease_until_ms = $2, updated_at = now() WHERE id = $1`,
        [id, at + 120_000]);
      return { ...alert, attempts: alert.attempts + 1 };
    });
  }

  /** Equivalente de dispatch(): reservar y enviar a YCloud. Nunca reenvía a ciegas. */
  async function dispatch(id) {
    if (!config.enabled || stopping()) return null;
    const at = now();
    const claimed = await claim(id, at);
    if (!claimed) return null;
    let outcome;
    try {
      const response = await request(API, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': config.apiKey },
        body: JSON.stringify(messagePayload(claimed)), signal: AbortSignal.timeout(20_000),
      });
      const body = await response.json().catch(() => null);
      outcome = sendOutcome(response.status, body);
    } catch {
      outcome = { state: 'unknown', errorCode: 'UNCERTAIN_DELIVERY' };
    }
    await patch(id, { ...outcome, nextAttemptAtMs: at + 5 * MINUTE });
    if (['unknown', 'failed'].includes(outcome.state)) log.error('WhatsApp alert needs review', { alertId: id, code: outcome.errorCode });
    return outcome;
  }

  async function loadOrder(documentId) {
    const { rows } = await pool.query(`SELECT ${ORDER_COLUMNS} FROM orders WHERE id = $1`, [documentId]);
    return rows[0] ? rowToOrder(rows[0]) : null;
  }

  /** Reemplaza a `auraVerifyCardPayments`: confirma con Pagopar los pedidos con tarjeta. */
  async function verifyCardPayments() {
    if (!config.enabled) return { skipped: 'disabled' };
    const deadline = now() + 240_000;
    // Cursor circular para que una cola grande de pendientes no bloquee los nuevos.
    const cursor = await getCursor('payment');
    const page = async after => (await pool.query(
      `SELECT id, order_document_id, next_check_at_ms, expires_at_ms FROM whatsapp_payment_checks
        WHERE state = 'pending' AND ($1::text IS NULL OR id COLLATE "C" > $1::text COLLATE "C")
        ORDER BY id COLLATE "C" LIMIT 50`, [after])).rows;
    let checks = await page(cursor);
    if (!checks.length && cursor) checks = await page(null);
    const setCheck = (id, state, nextCheckAtMs) => pool.query(
      'UPDATE whatsapp_payment_checks SET state = $2, next_check_at_ms = COALESCE($3, next_check_at_ms) WHERE id = $1', [id, state, nextCheckAtMs ?? null]);
    const created = [];
    let lastId;
    for (const check of checks) {
      if (now() > deadline || stopping()) break;
      lastId = check.id;
      try {
        if (check.next_check_at_ms > now()) continue;
        if (check.expires_at_ms < now()) { await setCheck(check.id, 'expired'); continue; }
        const order = await loadOrder(check.order_document_id);
        if (!order || order.status === 'cancelado' || !CARD.test(order.paymentMethod || '')) { await setCheck(check.id, 'cancelled'); continue; }
        try {
          if (order.status === 'confirmado' || await verifiedPayment(order, request)) {
            const alertId = await enqueue(pool, order, check.order_document_id, 'pago', 'Pagopar');
            if (alertId) created.push(alertId);
            await setCheck(check.id, 'confirmed');
          } else await setCheck(check.id, 'pending', now() + 5 * MINUTE);
        } catch {
          await setCheck(check.id, 'pending', now() + 5 * MINUTE);
          log.warn('Could not verify Pagopar payment; will retry', { checkId: check.id });
        }
      } catch (error) {
        // Un fallo de base con este pedido no debe frenar a los demás: el cursor avanza y se lo retoma en la próxima vuelta.
        log.error('no se pudo revisar la comprobación de pago', { checkId: check.id, code: error.code || error.message });
      }
    }
    if (lastId) await setCursor('payment', lastId);
    for (const id of created) { if (stopping()) break; await dispatch(id); }
    return { checked: checks.length, created };
  }

  /** Consulta a YCloud el estado de un aviso ya aceptado. Nunca reenvía: solo actualiza el estado. */
  async function checkDelivery(alert) {
    const open = { states: ['accepted', 'sent'] };
    if (alert.expiresAtMs + 24 * 60 * MINUTE < now()) {
      if (await patch(alert.id, { state: 'unknown', errorCode: 'DELIVERY_NOT_CONFIRMED' }, open)) log.error('WhatsApp delivery not confirmed after 48 hours', { alertId: alert.id });
      return null;
    }
    try {
      const response = await request(`${API}/${encodeURIComponent(alert.providerId)}`, {
        headers: { 'X-API-Key': config.apiKey }, signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) return null;
      const body = await response.json();
      if (['accepted', 'sent', 'delivered', 'read', 'failed'].includes(body.status)) {
        await patch(alert.id, { state: body.status, errorCode: String(body.errorCode || '').slice(0, 100), checkedAtMs: now() }, open);
        if (body.status === 'failed') log.error('WhatsApp delivery failed', { alertId: alert.id, code: body.errorCode || '' });
        return body.status;
      }
    } catch { /* Se conserva el ID para consultar nuevamente, sin reenviar. */ }
    return null;
  }

  /** Reemplaza a `auraReconcileOrderAlerts`: recupera 429 y verifica la entrega ("accepted" no es "delivered"). */
  async function reconcileAlerts() {
    if (!config.enabled) return { skipped: 'disabled' };
    const deadline = now() + 240_000;
    const cursor = await getCursor('delivery');
    const page = async after => (await pool.query(
      `SELECT * FROM whatsapp_alerts WHERE state = ANY($2::text[]) AND ($1::text IS NULL OR id COLLATE "C" > $1::text COLLATE "C")
        ORDER BY id COLLATE "C" LIMIT 100`, [after, STATES_TO_RECONCILE])).rows;
    let rows = await page(cursor);
    if (!rows.length && cursor) rows = await page(null);
    let lastId;
    for (const row of rows) {
      if (now() > deadline || stopping()) break;
      lastId = row.id;
      const alert = rowToAlert(row);
      try {
        if (alert.state === 'pending') { await dispatch(alert.id); continue; }
        if (alert.state === 'dispatching') {
          // Solo si sigue en `dispatching` con la reserva vencida: si el envío terminó mientras tanto, no se pisa su resultado.
          if (alert.leaseUntilMs < now()
            && await patch(alert.id, { state: 'unknown', errorCode: 'INTERRUPTED_SEND' }, { states: ['dispatching'], leaseBefore: now() })) {
            log.error('WhatsApp send interrupted; check YCloud before retrying', { alertId: alert.id });
          }
          continue;
        }
        if (!alert.providerId) continue;
        await checkDelivery(alert);
      } catch (error) {
        log.error('no se pudo conciliar el aviso', { alertId: alert.id, code: error.code || error.message });
      }
    }
    if (lastId) await setCursor('delivery', lastId);
    return { reviewed: rows.length };
  }

  /**
   * Ruta privada de diagnóstico (equivalente de `auraOrderAlertTests`): trabaja sobre una fila de
   * `whatsapp_alert_tests`, sin crear pedidos, ventas ni conversiones. Solo acepta códigos AURA-PRUEBA….
   */
  async function handleTestRow(before, after) {
    if (!config.enabled) return null;
    return handleOrderChange(pool, {
      before: before ? testRowToOrder(before, now()) : null,
      after: testRowToOrder(after, now()),
      documentId: after.id,
      testing: true,
    });
  }

  return { processEvents, dispatch, verifyCardPayments, reconcileAlerts, checkDelivery, handleOrderChange, handleTestRow, enqueue, patch };
}
