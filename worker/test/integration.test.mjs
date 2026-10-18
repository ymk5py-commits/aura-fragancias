// Prueba de integración contra el Postgres REAL del Supabase de Aura, pero dentro de un esquema temporal
// (aura_test_xxxxxxxx) con la misma estructura que `public`: no toca pedidos ni avisos reales y se borra al terminar.
// YCloud y Pagopar están simulados; no sale ningún WhatsApp. Requiere TEST_DATABASE_URL (rol con permiso de crear esquemas).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test, { after, before } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createPool } from '../src/db.js';
import { createWorker } from '../src/worker.js';
import { alertKey, baseConfig, createFakeNetwork, createScratchSchema, insertOrder, RECIPIENT } from './helpers.mjs';

const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl) throw new Error('Falta TEST_DATABASE_URL (ver LEEME.md, sección Pruebas).');

let scratch, pool, db;
const net = createFakeNetwork();
const config = baseConfig();
let worker;
const alert = async (code, event = 'pedido') => (await db.query('SELECT * FROM whatsapp_alerts WHERE id = $1', [alertKey(code, event)])).rows[0];
const state = async (code, event = 'pedido') => (await alert(code, event))?.state;
const run = (...args) => Promise.all(args);
// Procesa todos los eventos pendientes (cada ciclo toma como máximo 50).
const drain = async () => { while ((await worker.processEvents({ dispatchNew: false })).processed) { /* hasta vaciar */ } };

before(async () => {
  scratch = await createScratchSchema(adminUrl);
  pool = createPool(adminUrl, { options: `-c search_path=${scratch.schema} -c statement_timeout=30000` });
  db = pool;
  worker = createWorker({ pool, config, fetchImpl: net.fetch.bind(net) });
});
after(async () => {
  await pool?.end();
  await scratch?.drop();
});

test('el disparador de la base registra creación, cambio de estado y cambio de hash de Pagopar', async () => {
  const id = await insertOrder(db, 'AURA-TRIG0001', { pagopar_hash: null });
  await db.query('UPDATE orders SET status = $2 WHERE id = $1', [id, 'confirmado']);
  await db.query('UPDATE orders SET pagopar_hash = $2 WHERE id = $1', [id, 'hash-nuevo-123']);
  await db.query('UPDATE orders SET name = $2 WHERE id = $1', [id, 'otro nombre']);
  const { rows } = await db.query('SELECT kind, old_status, new_status, pagopar_hash FROM order_events WHERE order_pk = $1 ORDER BY id', [id]);
  assert.deepEqual(rows.map(r => r.kind), ['created', 'status', 'pagopar']);
  assert.deepEqual([rows[1].old_status, rows[1].new_status], ['pendiente', 'confirmado']);
  await worker.processEvents({ dispatchNew: false });
  assert.equal((await db.query('SELECT count(*)::int AS n FROM order_events WHERE processed_at IS NULL')).rows[0].n, 0);
});

test('transacciones de Postgres evitan duplicados con entrega concurrente de eventos; la aceptación se concilia después', async () => {
  const id = await insertOrder(db, 'AURA-LOCAL001');
  const results = await Promise.all(Array.from({ length: 8 }, () => worker.processEvents({ dispatchNew: false })));
  assert.equal(results.reduce((sum, r) => sum + r.created.length, 0), 1, 'un solo ejecutor crea el aviso');
  assert.equal(await state('AURA-LOCAL001'), 'pending');
  const key = alertKey('AURA-LOCAL001', 'pedido');
  await Promise.all(Array.from({ length: 8 }, () => worker.dispatch(key)));
  const sentToOrder = net.sent.filter(m => m.externalId === `aura-${key}`);
  assert.equal(sentToOrder.length, 1, 'ocho envíos simultáneos producen un único WhatsApp');
  assert.equal(sentToOrder[0].to, RECIPIENT);
  assert.equal(await state('AURA-LOCAL001'), 'accepted');
  assert.equal((await alert('AURA-LOCAL001')).attempts, 1);
  await worker.reconcileAlerts();
  assert.equal(await state('AURA-LOCAL001'), 'delivered');
  assert.ok(id);
});

test('pedidos cancelados y avisos de pedido tardíos tras el pago no envían avisos obsoletos', async () => {
  const cancelled = await insertOrder(db, 'AURA-LOCAL002');
  await worker.processEvents({ dispatchNew: false });
  await db.query("UPDATE orders SET status = 'cancelado' WHERE id = $1", [cancelled]);
  const count = net.sent.length;
  await worker.dispatch(alertKey('AURA-LOCAL002', 'pedido'));
  assert.equal(net.sent.length, count);
  assert.equal(await state('AURA-LOCAL002'), 'cancelled');

  const confirmed = await insertOrder(db, 'AURA-LOCAL003');
  await worker.processEvents({ dispatchNew: false });
  await db.query("UPDATE orders SET status = 'confirmado' WHERE id = $1", [confirmed]);
  await worker.processEvents({ dispatchNew: false });
  await worker.dispatch(alertKey('AURA-LOCAL003', 'pedido'));
  assert.equal(net.sent.length, count);
  assert.equal(await state('AURA-LOCAL003'), 'superseded');
  await worker.dispatch(alertKey('AURA-LOCAL003', 'pago'));
  assert.equal(net.sent.length, count + 1);
  assert.equal(net.sent.at(-1).template.name, 'aura_pago_confirmado_web');
});

test('un pedido que nace confirmado genera directamente el aviso de pago', async () => {
  await insertOrder(db, 'AURA-LOCAL010', { status: 'confirmado', payment_method: 'Transferencia', pagopar_hash: null });
  await worker.processEvents({ dispatchNew: false });
  assert.equal(await alert('AURA-LOCAL010', 'pedido'), undefined);
  const pago = await alert('AURA-LOCAL010', 'pago');
  assert.equal(pago.method, 'Transferencia');
  assert.equal(pago.amount, 120000);
});

test('429 se reintenta sin riesgo; los resultados ambiguos quedan en revisión sin enviar dos veces', async () => {
  await insertOrder(db, 'AURA-LOCAL004');
  await worker.processEvents({ dispatchNew: false });
  net.mode = 'rate-limit';
  await worker.dispatch(alertKey('AURA-LOCAL004', 'pedido'));
  assert.equal(await state('AURA-LOCAL004'), 'pending');
  await db.query('UPDATE whatsapp_alerts SET next_attempt_at_ms = 0 WHERE id = $1', [alertKey('AURA-LOCAL004', 'pedido')]);
  net.mode = 'accepted';
  await worker.reconcileAlerts();
  assert.equal(await state('AURA-LOCAL004'), 'accepted');

  await insertOrder(db, 'AURA-LOCAL005');
  await worker.processEvents({ dispatchNew: false });
  net.mode = 'timeout';
  await worker.dispatch(alertKey('AURA-LOCAL005', 'pedido'));
  const count = net.sent.length;
  assert.equal(await state('AURA-LOCAL005'), 'unknown');
  await worker.dispatch(alertKey('AURA-LOCAL005', 'pedido'));
  await worker.reconcileAlerts();
  assert.equal(net.sent.length, count);
  net.mode = 'accepted';
});

test('un envío interrumpido (lease vencido) queda en unknown y NO se reenvía', async () => {
  await insertOrder(db, 'AURA-LOCAL011');
  await worker.processEvents({ dispatchNew: false });
  const key = alertKey('AURA-LOCAL011', 'pedido');
  await db.query("UPDATE whatsapp_alerts SET state = 'dispatching', attempts = 1, lease_until_ms = $2 WHERE id = $1", [key, Date.now() - 1000]);
  const count = net.sent.length;
  await worker.reconcileAlerts();
  assert.equal(await state('AURA-LOCAL011'), 'unknown');
  assert.equal((await alert('AURA-LOCAL011')).error_code, 'INTERRUPTED_SEND');
  await worker.dispatch(key);
  assert.equal(net.sent.length, count);
});

test('la verificación de pagos con panel cerrado y la confirmación posterior del admin producen un único aviso de pago', async () => {
  const id = await insertOrder(db, 'AURA-LOCAL006');
  await worker.processEvents({ dispatchNew: false });
  const check = alertKey('AURA-LOCAL006', 'pago');
  assert.equal((await db.query('SELECT state FROM whatsapp_payment_checks WHERE id = $1', [check])).rows[0].state, 'pending');
  // Aislar de las comprobaciones de pruebas anteriores (con "pagado" simulado todas confirmarían).
  await db.query('DELETE FROM whatsapp_payment_checks WHERE id <> $1', [check]);
  net.paymentMode = 'paid';
  const paymentMessages = () => net.sent.filter(m => m.externalId === `aura-${check}`).length;
  await worker.verifyCardPayments();
  assert.equal((await db.query('SELECT status FROM orders WHERE id = $1', [id])).rows[0].status, 'pendiente', 'verificar no confirma el pedido');
  const created = (await alert('AURA-LOCAL006', 'pago')).created_at_ms;
  assert.equal(paymentMessages(), 1, 'el aviso de pago salió una vez');
  await db.query("UPDATE orders SET status = 'confirmado' WHERE id = $1", [id]);
  await worker.processEvents({ dispatchNew: false });
  assert.equal((await alert('AURA-LOCAL006', 'pago')).created_at_ms, created);
  await run(worker.dispatch(check), worker.dispatch(check));
  assert.equal(paymentMessages(), 1, 'la confirmación del admin no duplica el aviso');
  net.paymentMode = 'pending';
});

test('el cursor circular de pagos recorre más de un lote de pedidos pendientes', async () => {
  await db.query('DELETE FROM whatsapp_payment_checks');
  await db.query("DELETE FROM worker_cursors WHERE name = 'payment'");
  net.estado.length = 0;
  for (let i = 0; i < 55; i++) await insertOrder(db, `AURA-BATCH${String(i).padStart(3, '0')}`);
  await drain();
  await worker.verifyCardPayments();
  assert.equal(new Set(net.estado).size, 50);
  await worker.verifyCardPayments();
  assert.equal(new Set(net.estado).size, 55);
});

test('la ruta privada de diagnóstico usa el mismo envío sin crear pedidos ni ventas', async () => {
  const row = { id: 'diagnostic-test', order_id: 'AURA-PRUEBAPRIVADA', status: 'pendiente', total: 100000, items: [{ code: 'PRUEBA', quantity: 1 }], payment_method: 'Transferencia' };
  await db.query('INSERT INTO whatsapp_alert_tests (id, order_id, items, payment_method, status, total) VALUES ($1, $2, $3::jsonb, $4, $5, $6)',
    [row.id, row.order_id, JSON.stringify(row.items), row.payment_method, row.status, row.total]);
  await worker.handleTestRow(null, row);
  const pedido = await alert('AURA-PRUEBAPRIVADA');
  assert.equal(pedido.test, true);
  const count = net.sent.length;
  await worker.dispatch(pedido.id);
  assert.equal(net.sent.length, count + 1);
  assert.equal(net.sent.at(-1).template.components[0].parameters[0].text, 'AURA-PRUEBAPRIVADA');
  await db.query("UPDATE whatsapp_alert_tests SET status = 'confirmado' WHERE id = $1", [row.id]);
  await worker.handleTestRow(row, { ...row, status: 'confirmado' });
  await worker.dispatch(alertKey('AURA-PRUEBAPRIVADA', 'pago'));
  assert.equal(net.sent.length, count + 2);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM orders WHERE order_id = 'AURA-PRUEBAPRIVADA'")).rows[0].n, 0);
  // Otro código en la ruta de diagnóstico se ignora.
  assert.equal(await worker.handleTestRow(null, { ...row, id: 'x', order_id: 'AURA-PEDIDOREAL1' }), null);
});

test('la conciliación de entrega avanza por más de 100 mensajes aceptados', async () => {
  await db.query('DELETE FROM whatsapp_alerts');
  await db.query("DELETE FROM worker_cursors WHERE name = 'delivery'");
  await db.query(
    `INSERT INTO whatsapp_alerts (id, event, order_code, order_document_id, amount, method, state, provider_id, created_at_ms, next_attempt_at_ms, expires_at_ms)
     SELECT 'delivery' || lpad(i::text, 3, '0'), 'pedido', 'AURA-DELIV' || i, 'doc' || i, 1000, 'Transferencia', 'accepted',
            'local-provider-' || i, 0, 0, $1 FROM generate_series(0, 149) AS i`, [Date.now() + 24 * 60 * 60_000]);
  await worker.reconcileAlerts();
  assert.equal((await db.query("SELECT count(*)::int AS n FROM whatsapp_alerts WHERE state = 'delivered'")).rows[0].n, 100);
  await worker.reconcileAlerts();
  assert.equal((await db.query("SELECT count(*)::int AS n FROM whatsapp_alerts WHERE state = 'delivered'")).rows[0].n, 150);
});

test('el tope diario deja los excedentes pendientes y los envía cuando se libera cupo', async () => {
  await db.query('DELETE FROM whatsapp_alerts');
  await db.query('DELETE FROM whatsapp_alert_budget');
  config.dailyLimit = 2;
  for (const code of ['AURA-TOPE0001', 'AURA-TOPE0002', 'AURA-TOPE0003']) await insertOrder(db, code, { payment_method: 'Transferencia', pagopar_hash: null });
  const count = net.sent.length;
  await worker.processEvents();
  assert.equal(net.sent.length, count + 2);
  assert.equal(await state('AURA-TOPE0003'), 'pending');
  const day = new Date().toISOString().slice(0, 10);
  assert.equal((await db.query('SELECT count FROM whatsapp_alert_budget WHERE day = $1', [day])).rows[0].count, 2);
  config.dailyLimit = 3;
  await worker.dispatch(alertKey('AURA-TOPE0003', 'pedido'));
  assert.equal(await state('AURA-TOPE0003'), 'accepted');
  config.dailyLimit = 0;
  await insertOrder(db, 'AURA-TOPE0004', { payment_method: 'Transferencia', pagopar_hash: null });
  await worker.processEvents();
  assert.equal(await state('AURA-TOPE0004'), 'pending', 'con tope 0 no sale nada');
  config.dailyLimit = 100;
});

test('el historial anterior a la activación, los eventos viejos y los pedidos sin datos válidos no generan avisos', async () => {
  // Pedido migrado: fecha antigua y SIN evento 'created' (la migración apaga los disparadores).
  const old = await insertOrder(db, 'AURA-HISTO001', { created_at: new Date(Date.now() - 3 * 24 * 60 * 60_000).toISOString(), noEvents: true });
  await insertOrder(db, 'AURA-HISTO002', { total: 0 });
  await insertOrder(db, 'AURA-HISTO003', { status: 'cancelado' });
  const viejo = await insertOrder(db, 'AURA-HISTO004');
  await db.query('UPDATE order_events SET created_at = now() - interval \'25 hours\' WHERE order_pk = $1', [viejo]);
  await worker.processEvents();
  for (const code of ['AURA-HISTO001', 'AURA-HISTO002', 'AURA-HISTO003', 'AURA-HISTO004']) assert.equal(await alert(code), undefined, code);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM order_events WHERE processed_at IS NULL')).rows[0].n, 0, 'los eventos quedan procesados');
  // Un pedido histórico que se confirma después de la activación tampoco avisa (vale su orders.created_at).
  await db.query("UPDATE orders SET status = 'confirmado' WHERE id = $1", [old]);
  await worker.processEvents();
  assert.equal(await alert('AURA-HISTO001', 'pago'), undefined);
});

test('la fecha de creación que manda el visitante no puede silenciar ni forzar avisos: manda el evento que registra la base', async () => {
  // Reloj del comprador atrasado (antes de la activación) o adelantado: el pedido es de ahora y debe avisar.
  await insertOrder(db, 'AURA-RELOJ0001', { created_at: new Date(Date.now() - 10 * 24 * 60 * 60_000).toISOString(), payment_method: 'Transferencia', pagopar_hash: null });
  await insertOrder(db, 'AURA-RELOJ0002', { created_at: new Date(Date.now() + 10 * 24 * 60 * 60_000).toISOString(), payment_method: 'Transferencia', pagopar_hash: null });
  await worker.processEvents({ dispatchNew: false });
  assert.equal(await state('AURA-RELOJ0001'), 'pending');
  assert.equal(await state('AURA-RELOJ0002'), 'pending');
});

test('un total absurdo enviado por un visitante no rompe el procesamiento ni frena a los pedidos reales', async () => {
  await insertOrder(db, 'AURA-GIGANTE01', { total: '9000000000000000000', shipping_cost: null, payment_method: 'Transferencia', pagopar_hash: null });
  await insertOrder(db, 'AURA-NORMAL001', { payment_method: 'Transferencia', pagopar_hash: null });
  const result = await worker.processEvents({ dispatchNew: false });
  assert.ok(result.processed >= 2);
  assert.equal(await alert('AURA-GIGANTE01'), undefined);
  assert.equal(await state('AURA-NORMAL001'), 'pending');
});

test('el aviso vence 24 h después del evento que lo originó, no 24 h después de procesarlo', async () => {
  const id = await insertOrder(db, 'AURA-TARDE0001');
  await db.query('UPDATE order_events SET created_at = now() - interval \'30 minutes\' WHERE order_pk = $1', [id]);
  await worker.processEvents({ dispatchNew: false });
  const row = await alert('AURA-TARDE0001');
  const eventMs = (await db.query('SELECT created_at FROM order_events WHERE order_pk = $1', [id])).rows[0].created_at.getTime();
  assert.equal(row.created_at_ms, eventMs);
  assert.equal(row.expires_at_ms, eventMs + 24 * 60 * 60_000);
  const check = (await db.query('SELECT expires_at_ms FROM whatsapp_payment_checks WHERE id = $1', [alertKey('AURA-TARDE0001', 'pago')])).rows[0];
  assert.equal(check.expires_at_ms, eventMs + 7 * 24 * 60 * 60_000);
});

test('apagado: no consume eventos, no envía y no escribe nada', async () => {
  const off = createWorker({ pool, config: { ...config, enabled: false }, fetchImpl: net.fetch.bind(net) });
  await insertOrder(db, 'AURA-OFF00001');
  const count = net.sent.length;
  assert.deepEqual(await off.processEvents(), { skipped: 'disabled' });
  assert.equal(await off.dispatch(alertKey('AURA-OFF00001', 'pedido')), null);
  assert.deepEqual(await off.verifyCardPayments(), { skipped: 'disabled' });
  assert.deepEqual(await off.reconcileAlerts(), { skipped: 'disabled' });
  assert.equal((await db.query("SELECT count(*)::int AS n FROM order_events WHERE processed_at IS NULL AND order_code = 'AURA-OFF00001'")).rows[0].n, 1);
  assert.equal(await alert('AURA-OFF00001'), undefined);
  assert.equal(net.sent.length, count);
  // Al encender, el pedido pendiente se procesa.
  await worker.processEvents({ dispatchNew: false });
  assert.equal(await state('AURA-OFF00001'), 'pending');
});

test('un evento que falla espera con retroceso sin frenar a los demás; si era pasajero se recupera y si no, se descarta a las 24 h', async () => {
  let t = Date.now();
  const errors = [];
  await insertOrder(db, 'AURA-VENENO01', { payment_method: 'Transferencia', pagopar_hash: null });
  await insertOrder(db, 'AURA-PASAJERO1', { payment_method: 'Transferencia', pagopar_hash: null });
  await insertOrder(db, 'AURA-SANO0001', { payment_method: 'Transferencia', pagopar_hash: null });
  let transientFailures = 2;
  // Envoltorio sin tocar el cliente real (el pool reutiliza esos objetos): fallan solo las inserciones de avisos indicadas.
  const flaky = {
    query: pool.query.bind(pool),
    async connect() {
      const client = await pool.connect();
      return {
        release: () => client.release(),
        query(text, params) {
          if (/INSERT INTO whatsapp_alerts/.test(text) && params?.[2] === 'AURA-VENENO01') return Promise.reject(Object.assign(new Error('falla simulada'), { code: 'XX000' }));
          if (/INSERT INTO whatsapp_alerts/.test(text) && params?.[2] === 'AURA-PASAJERO1' && transientFailures-- > 0) return Promise.reject(Object.assign(new Error('bloqueo simulado'), { code: '40P01' }));
          return client.query(text, params);
        },
      };
    },
  };
  const w = createWorker({ pool: flaky, config, fetchImpl: net.fetch.bind(net), now: () => t, log: { info() {}, warn() {}, error: (message, fields) => errors.push(fields) } });
  const unprocessed = async code => (await db.query('SELECT count(*)::int AS n FROM order_events WHERE processed_at IS NULL AND order_code = $1', [code])).rows[0].n;

  await w.processEvents({ dispatchNew: false });
  assert.equal(await state('AURA-SANO0001'), 'pending', 'el evento sano se procesa en el primer ciclo');
  assert.equal(await unprocessed('AURA-VENENO01'), 1);
  assert.equal(await unprocessed('AURA-PASAJERO1'), 1);
  assert.equal(errors.length, 2);
  await w.processEvents({ dispatchNew: false });
  assert.equal(errors.length, 2, 'en retroceso no se reintenta de inmediato');

  t += 31_000;
  await w.processEvents({ dispatchNew: false });
  assert.equal(errors.length, 4, 'a los 30 s se reintentan ambos');
  t += 61_000;
  await w.processEvents({ dispatchNew: false });
  assert.equal(await state('AURA-PASAJERO1'), 'pending', 'el error pasajero se recupera: el aviso NO se pierde');
  assert.equal(await unprocessed('AURA-PASAJERO1'), 0);
  assert.equal(await unprocessed('AURA-VENENO01'), 1, 'el que falla siempre sigue esperando');

  t += 25 * 60 * 60_000;
  await w.processEvents({ dispatchNew: false });
  assert.equal(await unprocessed('AURA-VENENO01'), 0, 'a las 24 h se descarta por antiguo');
  assert.equal(await alert('AURA-VENENO01'), undefined);
});

test('patch no pisa un estado más nuevo, y con la señal de apagado no se toma ni se envía nada', async () => {
  const key = alertKey('AURA-GUARDA01', 'pedido');
  await db.query(`INSERT INTO whatsapp_alerts (id, event, order_code, order_document_id, amount, method, state, provider_id, created_at_ms, next_attempt_at_ms, expires_at_ms, lease_until_ms)
    VALUES ($1, 'pedido', 'AURA-GUARDA01', 'doc', 1000, 'Transferencia', 'accepted', 'prov-1', 0, 0, $2, 0)`, [key, Date.now() + 60_000]);
  assert.equal(await worker.patch(key, { state: 'unknown' }, { states: ['dispatching'], leaseBefore: Date.now() }), 0);
  assert.equal(await state('AURA-GUARDA01'), 'accepted');
  assert.equal(await worker.patch(key, { state: 'sent' }, { states: ['accepted', 'sent'] }), 1);
  assert.equal(await state('AURA-GUARDA01'), 'sent');

  const controller = new AbortController();
  const stoppable = createWorker({ pool, config, fetchImpl: net.fetch.bind(net), signal: controller.signal });
  await insertOrder(db, 'AURA-PARADA001', { payment_method: 'Transferencia', pagopar_hash: null });
  controller.abort();
  const count = net.sent.length;
  assert.deepEqual(await stoppable.processEvents(), { skipped: 'stopping' });
  assert.equal(await stoppable.dispatch(alertKey('AURA-PARADA001', 'pedido')), null);
  assert.equal(net.sent.length, count);
  await worker.processEvents({ dispatchNew: false });
});

test('herramienta de operación: estado, descartar eventos y resolver avisos en unknown', async () => {
  const cli = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'cli.js');
  const env = { ...process.env, DATABASE_URL: scratch.urlFor(adminUrl), WHATSAPP_ALERTS_ENABLED: 'false' };
  const exec = (...args) => spawnSync(process.execPath, [cli, ...args], { env, encoding: 'utf8' });
  assert.match(exec('estado').stdout, /A revisar/);
  assert.notEqual(exec('descartar-eventos').status, 0, 'sin --si no hace nada');
  await insertOrder(db, 'AURA-CLI00001', { payment_method: 'Transferencia', pagopar_hash: null });
  assert.match(exec('descartar-eventos', '--si').stdout, /Eventos descartados: [1-9]/);
  assert.equal(exec('probar-aviso', 'pedido', '--enviar').status, 1, 'con WHATSAPP_ALERTS_ENABLED=false no envía');
  assert.match(exec('probar-aviso', 'pedido').stdout, /SIMULACIÓN/);

  const code = 'AURA-CLI00002';
  const key = alertKey(code, 'pedido');
  await db.query(`INSERT INTO whatsapp_alerts (id, event, order_code, order_document_id, amount, method, state, error_code, created_at_ms, next_attempt_at_ms, expires_at_ms)
    VALUES ($1, 'pedido', $2, 'doc', 1000, 'Transferencia', 'unknown', 'UNCERTAIN_DELIVERY', 0, 0, 0)`, [key, code]);
  assert.notEqual(exec('resolver', `${code}/pedido`, 'reintentar').status, 0, 'reintentar exige confirmación explícita');
  assert.equal(await state(code), 'unknown');
  assert.equal(exec('resolver', `${code}/pedido`, 'enviado', 'ycloud-id-1234').status, 0);
  assert.equal(await state(code), 'accepted');
  assert.notEqual(exec('resolver', `${code}/pedido`, 'enviado', 'otro-id-12345').status, 0, 'ya no está en unknown');
  await db.query("UPDATE whatsapp_alerts SET state = 'unknown' WHERE id = $1", [key]);
  assert.equal(exec('resolver', key, 'reintentar', '--confirmo-que-no-se-envio').status, 0);
  const row = await alert(code);
  assert.equal(row.state, 'pending');
  assert.ok(row.expires_at_ms > Date.now());
});
