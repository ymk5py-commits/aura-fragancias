// Verifica, contra las tablas REALES de `public` y con el rol real `aura_worker`, que:
//  - el rol tiene los permisos que necesita el trabajador y ninguno más;
//  - todo el código del trabajador corre sobre el esquema real (mismas consultas, mismas columnas).
// Todo ocurre dentro de UNA transacción que se revierte al final (ROLLBACK): no queda ninguna fila,
// no se consume ningún número de secuencia y no sale ningún WhatsApp (YCloud simulado).
// Requiere DATABASE_URL = la del rol aura_worker.
import assert from 'node:assert/strict';
import pg from 'pg';
import test, { after, before } from 'node:test';
import { createPool } from '../src/db.js';
import { createWorker } from '../src/worker.js';
import { alertKey, baseConfig, createFakeNetwork } from './helpers.mjs';

if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL (la del rol aura_worker).');

let client, pool;
let pruebaCode; // código AURA-PRUEBA… que usa esta prueba (en las tablas reales ya hay avisos AURA-PRUEBA… migrados del 13-oct)
const net = createFakeNetwork();

/** "Pool" de una sola conexión: BEGIN/COMMIT/ROLLBACK del trabajador pasan a ser savepoints; nada se confirma. */
function rolledBackPool(c) {
  let depth = 0;
  const wrapped = {
    async query(text, params) {
      if (typeof text === 'string') {
        if (/^BEGIN$/i.test(text)) return c.query(`SAVEPOINT s${++depth}`);
        if (/^COMMIT$/i.test(text)) return c.query(`RELEASE SAVEPOINT s${depth--}`);
        if (/^ROLLBACK$/i.test(text)) { const level = depth--; return c.query(`ROLLBACK TO SAVEPOINT s${level}`).then(() => c.query(`RELEASE SAVEPOINT s${level}`)); }
        if (/^ROLLBACK TO SAVEPOINT|^RELEASE SAVEPOINT|^SAVEPOINT/i.test(text)) return c.query(text);
      }
      return c.query(text, params);
    },
    async connect() { return { query: wrapped.query, release() {} }; },
  };
  return wrapped;
}

before(async () => {
  pool = createPool(process.env.DATABASE_URL, { max: 1 });
  client = await pool.connect();
  await client.query('BEGIN');
});
after(async () => {
  await client?.query('ROLLBACK').catch(() => {});
  client?.release();
  await pool?.end();
});

const denied = async (sql, params) => {
  await client.query('SAVEPOINT prueba');
  try {
    await client.query(sql, params);
  } catch (error) {
    await client.query('ROLLBACK TO SAVEPOINT prueba');
    assert.equal(error.code, '42501', `se esperaba permiso denegado y fue: ${error.message}`);
    return;
  }
  await client.query('ROLLBACK TO SAVEPOINT prueba');
  assert.fail(`se esperaba permiso denegado: ${sql}`);
};

test('el rol es aura_worker, sin superusuario, y lee solo las columnas permitidas de orders', async () => {
  assert.equal((await client.query('SELECT current_user AS u')).rows[0].u, 'aura_worker');
  const role = (await client.query("SELECT rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = 'aura_worker'")).rows[0];
  assert.deepEqual(role, { rolsuper: false, rolcreatedb: false, rolcreaterole: false });
  await client.query('SELECT id, order_id, status, total, shipping_cost, items, payment_method, pagopar_hash, created_at FROM orders LIMIT 1');
  for (const column of ['name', 'phone', 'address', 'email', 'document', 'invoice', 'receipt_url']) await denied(`SELECT ${column} FROM orders LIMIT 1`);
  await denied('SELECT * FROM orders LIMIT 1');
});

test('no puede leer ni escribir tablas de caja, gift cards, reseñas ni modificar pedidos', async () => {
  for (const table of ['sales', 'expenses', 'gift_cards', 'gift_card_redemptions', 'sales_config', 'erp_imports', 'incidents', 'reviews', 'products', 'settings']) {
    await denied(`SELECT 1 FROM ${table} LIMIT 1`);
  }
  await denied("UPDATE orders SET status = 'cancelado' WHERE false");
  await denied('DELETE FROM orders WHERE false');
  await denied("INSERT INTO orders (order_id, name, phone, address, total, items) VALUES ('AURA-NOPE1','x','x','x',1,'[{}]')");
  await denied('DELETE FROM whatsapp_alert_tests WHERE false');
  await denied('UPDATE order_events SET kind = kind WHERE false');
  await denied('DELETE FROM order_events WHERE false');
});

test('el código completo del trabajador corre con el rol real sobre las tablas reales (sin dejar rastro)', async () => {
  const config = { ...baseConfig(), dailyLimit: 3 };
  const worker = createWorker({ pool: rolledBackPool(client), config, fetchImpl: net.fetch.bind(net) });
  // Eventos reales pendientes (si los hubiera) y conciliación/verificación sobre las tablas reales: no deben fallar.
  await worker.processEvents();
  await worker.verifyCardPayments();
  await worker.reconcileAlerts();

  // Ruta privada de diagnóstico con las tablas reales.
  const stamp = `${Date.now()}`.slice(-10);
  pruebaCode = `AURA-PRUEBA${stamp}`;
  const row = { id: `rollback-${stamp}`, order_id: pruebaCode, status: 'pendiente', total: 100000, items: [{ code: 'PRUEBA', quantity: 1 }], payment_method: 'Transferencia' };
  await client.query('INSERT INTO whatsapp_alert_tests (id, order_id, items, payment_method, status, total) VALUES ($1, $2, $3::jsonb, $4, $5, $6)',
    [row.id, row.order_id, JSON.stringify(row.items), row.payment_method, row.status, row.total]);
  const id = await worker.handleTestRow(null, row);
  assert.equal(id, alertKey(row.order_id, 'pedido'));
  const sentBefore = net.sent.length;
  const outcome = await worker.dispatch(id);
  assert.equal(outcome.state, 'accepted');
  assert.equal(net.sent.length, sentBefore + 1);
  assert.equal(net.sent.at(-1).externalId, `aura-${id}`);
  await worker.reconcileAlerts();
  assert.equal((await client.query('SELECT state FROM whatsapp_alerts WHERE id = $1', [id])).rows[0].state, 'delivered');
  assert.ok((await client.query('SELECT count FROM whatsapp_alert_budget WHERE day = $1', [new Date().toISOString().slice(0, 10)])).rows[0].count >= 1);
});

test('tras el ROLLBACK no queda nada de la prueba en las tablas reales', async () => {
  await client.query('ROLLBACK');
  const check = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await check.connect();
  try {
    assert.ok(pruebaCode, 'la prueba anterior debe haber corrido');
    for (const [table, column] of [['whatsapp_alerts', 'order_code'], ['whatsapp_alert_tests', 'order_id']]) {
      const { rows } = await check.query(`SELECT count(*)::int AS n FROM ${table} WHERE ${column} = $1`, [pruebaCode]);
      assert.equal(rows[0].n, 0, `${table} no debe conservar filas de esta prueba`);
    }
    const { rows: budget } = await check.query('SELECT count(*)::int AS n FROM whatsapp_alert_budget WHERE updated_at > now() - interval \'1 minute\'');
    assert.equal(budget[0].n, 0, 'el tope diario real no debe haberse tocado');
  } finally {
    await check.end();
  }
  await client.query('BEGIN');
});
