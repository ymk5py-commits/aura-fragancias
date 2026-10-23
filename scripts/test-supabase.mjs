/**
 * Pruebas de la base de datos de Aura (Supabase/Postgres):
 *  1) Permisos (RLS): lo que puede y no puede hacer un visitante, un usuario común y un admin.
 *  2) Transacciones del panel (src/lib/server/adminOps.ts): caja, pedidos, importación y Gift Cards.
 * Reemplaza a scripts/test-rules.mjs (reglas de Firestore). Cubre los mismos casos.
 *
 * Corre contra un Postgres desechable:  npm run test:db   (usa Docker o, si no hay, el servidor por ssh)
 * o con tu propia base vacía:           TEST_DATABASE_URL=postgres://... node --test scripts/test-supabase.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test, { after, before } from 'node:test';
import pg from 'pg';
import { loadTs } from './lib/load-ts.mjs';

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  console.log('Sin TEST_DATABASE_URL: se omiten. Usá `npm run test:db`.');
  process.exit(0);
}
process.env.DATABASE_URL = url;

const db = new pg.Pool({ connectionString: url, max: 8 });
const ops = loadTs('src/lib/server/adminOps.ts');
const { transaction } = loadTs('src/lib/server/db.ts');
const { saleFromRow } = loadTs('src/lib/supabaseMap.ts');
const erpModel = loadTs('src/lib/erp.ts');
const run = (name, input) => transaction((client) => ops[name](client, input));

// ---------------------------------------------------------------- utilidades
const JSON_COLUMNS = new Set(['items', 'costs', 'recipe', 'invoice', 'pagopar_payment']);
async function insert(client, table, row, suffix = '') {
  const cols = Object.keys(row);
  const values = cols.map((c) => (JSON_COLUMNS.has(c) && row[c] !== null ? JSON.stringify(row[c]) : row[c]));
  return client.query(`insert into public.${table} (${cols.map((c) => `"${c}"`).join(',')}) values (${cols.map((_, i) => `$${i + 1}`).join(',')}) ${suffix}`, values);
}

async function as(role, claims, fn) {
  const client = await db.connect();
  try {
    await client.query('begin');
    await client.query(`set local role ${role}`);
    await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    return await fn(client);
  } finally {
    await client.query('rollback').catch(() => undefined);
    client.release();
  }
}
const anon = (fn) => as('anon', { role: 'anon' }, fn);
const admin = (fn) => as('authenticated', { role: 'authenticated', sub: '00000000-0000-0000-0000-0000000000aa', app_metadata: { aura_role: 'admin' } }, fn);
const user = (fn) => as('authenticated', { role: 'authenticated', sub: '00000000-0000-0000-0000-0000000000bb', app_metadata: {} }, fn);

/** Una fila tal como la devuelve PostgREST (fechas con microsegundos), lista para editar en el panel. */
async function saleAsClient(id) {
  const { rows } = await db.query('select to_jsonb(s) as j from public.sales s where id = $1', [id]);
  return saleFromRow(rows[0].j);
}
const one = async (sql, params) => (await db.query(sql, params)).rows[0];
const count = async (table, where = 'true', params = []) => Number((await one(`select count(*)::int as n from public.${table} where ${where}`, params)).n);

const pedido = {
  order_id: 'AURA-TEST01', status: 'pendiente', name: 'Cliente Prueba', phone: '0981123456', address: 'Calle 123',
  city_and_neighborhood: 'Asunción', subtotal: 250000, discount_percent: 0, discount_amount: 0, total: 250000, free_shipping: false,
  items: [{ code: 'A01', name: 'Perfume', size: '50ml', price: 250000, quantity: 1 }], payment_method: 'tarjeta',
};
const hex32 = (n) => String(n).padStart(32, '0').replace(/[^0-9]/g, '0');
const incidente = { source: 'pago-tarjeta', message: 'No pudimos generar el link de pago.', detail: 'HTTP 502', order_id: 'AURA-TEST01', payment_method: 'tarjeta', total: 250000, customer_name: 'Cliente Prueba', customer_phone: '0981123456', user_agent: 'Mozilla/5.0', page: '/', created_at: Date.now(), seen: false };
const venta = { id: 's1', date: '2026-10-04', customer: 'Prueba', phone: '', channel: 'WhatsApp', paymentMethod: 'Transferencia', status: 'pagada', items: [{ code: 'A01', name: 'Perfume', size: '30 ML', quantity: 1, unitPrice: 70000, unitCost: 17398 }], discount: 0, deliveryCharged: 0, deliveryActual: 0, otherCosts: 0, collected: 70000, notes: '' };
const gasto = { id: 'e1', date: '2026-10-04', type: 'Operativo', category: 'Internet', description: 'Plan del negocio', payee: '', amount: 214914, paymentMethod: 'Transferencia', status: 'pagado', notes: '' };

before(async () => {
  await db.query('drop schema if exists public cascade; create schema public;');
  await db.query(readFileSync('supabase/tests/stub-supabase.sql', 'utf8'));
  await db.query(readFileSync('supabase/migrations/001_esquema.sql', 'utf8'));
  // Usuario de la web (en producción lo crea 003_usuario_servidor.sql) y la función que cierra sesiones de GoTrue.
  await db.query("do $$ begin create role aura_server login bypassrls; exception when duplicate_object then null; end $$; grant usage on schema public to aura_server");
  await db.query(readFileSync('supabase/migrations/004_cerrar_sesiones.sql', 'utf8'));
  await db.query("insert into public.products (id, code, name, visible) values ('A01','A01','Visible',true), ('H01','H01','Oculto',false)");
  await db.query("insert into public.settings (id, data) values ('site', '{\"price30\":70000}')");
});
after(async () => { await db.end(); await transaction(async () => undefined).catch(() => undefined); process.exit(process.exitCode || 0); });

// ================================================================= tienda sin login
test('tienda: un visitante guarda un pedido válido', () => anon((c) => insert(c, 'orders', { id: hex32(1), ...pedido })));
test('tienda: rechaza un pedido con estado inventado', () => assert.rejects(anon((c) => insert(c, 'orders', { id: hex32(2), ...pedido, status: 'pagado' })), /row-level security/));
test('tienda: no puede mandar un pedido ya pagado ni con datos de cobro', async () => {
  await assert.rejects(anon((c) => insert(c, 'orders', { id: hex32(3), ...pedido, paid_at: 1 })), /row-level security/);
  await assert.rejects(anon((c) => insert(c, 'orders', { id: hex32(4), ...pedido, pagopar_payment: { monto: '1' } })), /row-level security/);
});
test('tienda: el id tiene que ser de 32 caracteres hex y los pedidos vacíos o gigantes se rechazan', async () => {
  await assert.rejects(anon((c) => insert(c, 'orders', { id: 'hack', ...pedido })), /row-level security/);
  await assert.rejects(anon((c) => insert(c, 'orders', { id: hex32(5), ...pedido, items: [] })), /check constraint/);
  await assert.rejects(anon((c) => insert(c, 'orders', { id: hex32(6), ...pedido, address: 'x'.repeat(400) })), /check constraint/);
});
test('tienda: no puede tocar el catálogo ni leer pedidos, y solo ve los productos visibles', async () => {
  await assert.rejects(anon((c) => c.query("update public.products set visible = false")), /permission denied/);
  await assert.rejects(anon((c) => c.query('delete from public.products')), /permission denied/);
  await assert.rejects(anon((c) => c.query('select * from public.orders')), /permission denied/);
  const names = await anon(async (c) => (await c.query('select name from public.products order by name')).rows.map((r) => r.name));
  assert.deepEqual(names, ['Visible']);
  assert.equal((await anon((c) => c.query('select data from public.settings'))).rows.length, 1);
});
test('catálogo: el admin ve todo, edita y no lo puede hacer un usuario común', async () => {
  assert.equal((await admin((c) => c.query('select * from public.products'))).rows.length, 2);
  assert.equal((await admin((c) => c.query("update public.products set name = 'Editado' where id = 'A01'"))).rowCount, 1);
  assert.equal((await user((c) => c.query("update public.products set name = 'Hack' where id = 'A01'"))).rowCount, 0);
  await assert.rejects(user((c) => insert(c, 'products', { id: 'X', code: 'X', name: 'X' })), /row-level security/);
  assert.equal((await user((c) => c.query('select * from public.products'))).rows.length, 1);
});

// ================================================================= alertas (incidents)
test('alertas: la tienda registra una compra fallida pero no puede nacer revisada ni con mensajes kilométricos', async () => {
  await anon((c) => insert(c, 'incidents', { id: 'i2', ...incidente }));
  await assert.rejects(anon((c) => insert(c, 'incidents', { id: 'i3', ...incidente, seen: true })), /row-level security/);
  await assert.rejects(anon((c) => insert(c, 'incidents', { id: 'i4', ...incidente, message: 'x'.repeat(501) })), /check constraint/);
});
test('alertas: sin login no se leen, no se marcan ni se borran; el admin sí, pero sin reescribir el mensaje', async () => {
  await insert(db, 'incidents', { id: 'i1', ...incidente });
  await assert.rejects(anon((c) => c.query('select * from public.incidents')), /permission denied/);
  await assert.rejects(anon((c) => c.query("update public.incidents set seen = true")), /permission denied/);
  assert.equal((await user((c) => c.query('select * from public.incidents'))).rows.length, 0);
  assert.equal((await admin((c) => c.query('select * from public.incidents order by created_at desc limit 50'))).rows.length, 1);
  assert.equal((await admin((c) => c.query("update public.incidents set seen = true, seen_at = 1 where id = 'i1'"))).rowCount, 1);
  await assert.rejects(admin((c) => c.query("update public.incidents set message = 'otra cosa' where id = 'i1'")), /permission denied/);
  assert.equal((await admin((c) => c.query("delete from public.incidents where id = 'i1'"))).rowCount, 1);
});

// ================================================================= reseñas
test('reseñas: el público crea pendientes y lee solo las aprobadas; el admin gestiona', async () => {
  const resena = { id: 'r1', product_id: 'A01', name: 'Ana', rating: 5, text: 'Muy buen perfume, dura todo el día', created_at: 1 };
  await anon((c) => insert(c, 'reviews', { ...resena, approved: false }));
  await assert.rejects(anon((c) => insert(c, 'reviews', { ...resena, id: 'r2', approved: true })), /row-level security/);
  await insert(db, 'reviews', { ...resena, id: 'r3', approved: true });
  await insert(db, 'reviews', { ...resena, id: 'r4', approved: false });
  assert.deepEqual((await anon((c) => c.query('select id from public.reviews'))).rows.map((r) => r.id), ['r3']);
  assert.equal((await admin((c) => c.query('select id from public.reviews'))).rows.length, 2);
  assert.equal((await admin((c) => c.query("update public.reviews set approved = true where id = 'r4'"))).rowCount, 1);
  await assert.rejects(anon((c) => c.query("update public.reviews set approved = true")), /permission denied/);
});

// ================================================================= caja: privada, solo lectura para el admin
test('caja: nadie sin rol de admin lee ventas, gastos, costos ni gift cards; el admin lee pero no escribe directo', async () => {
  await insert(db, 'sales', { id: 'privada', date: '2026-10-04', channel: 'Web', payment_method: 'Efectivo', status: 'pagada', items: [{ code: 'A' }] });
  for (const table of ['sales', 'expenses', 'sales_config', 'erp_imports', 'gift_cards', 'gift_card_redemptions', 'gift_card_payments']) {
    await assert.rejects(anon((c) => c.query(`select * from public.${table}`)), /permission denied/, `anon lee ${table}`);
    assert.equal((await user((c) => c.query(`select * from public.${table}`))).rows.length, 0, `usuario común lee ${table}`);
  }
  assert.equal((await admin((c) => c.query('select * from public.sales'))).rows.length, 1);
  await assert.rejects(admin((c) => insert(c, 'sales', { id: 'x', date: '2026-10-04', channel: 'Web', payment_method: 'Efectivo', status: 'pagada', items: [{ code: 'A' }] })), /permission denied/);
  await assert.rejects(admin((c) => c.query("update public.sales set notes = 'x'")), /permission denied/);
  await assert.rejects(admin((c) => c.query('delete from public.sales')), /permission denied/);
  await assert.rejects(anon((c) => insert(c, 'sales', { id: 'anonymous-sale', date: '2026-10-04', channel: 'Web', payment_method: 'Efectivo', status: 'pagada', items: [{ code: 'A' }] })), /permission denied/);
  await db.query("delete from public.sales where id = 'privada'");
});
test('tablas internas de WhatsApp y la cola de pedidos: invisibles para el navegador', async () => {
  for (const table of ['order_events', 'whatsapp_alerts', 'whatsapp_payment_checks', 'whatsapp_alert_budget', 'whatsapp_alert_tests', 'worker_cursors']) {
    await assert.rejects(anon((c) => c.query(`select * from public.${table}`)), /permission denied/);
    await assert.rejects(admin((c) => c.query(`select * from public.${table}`)), /permission denied/);
  }
});
test('cola de pedidos: se registra al crear, al cambiar de estado y al fijar el hash de Pagopar', async () => {
  const id = hex32(70);
  await db.query('truncate public.order_events');
  await insert(db, 'orders', { id, ...pedido, order_id: 'AURA-EVENTOS1' });
  await db.query("update public.orders set status = 'confirmado' where id = $1", [id]);
  await db.query("update public.orders set pagopar_hash = 'abcdef123456' where id = $1", [id]);
  await db.query("update public.orders set name = 'Otro nombre' where id = $1", [id]);
  const kinds = (await db.query('select kind, old_status, new_status from public.order_events order by id')).rows;
  assert.deepEqual(kinds.map((k) => k.kind), ['created', 'status', 'pagopar']);
  assert.deepEqual([kinds[1].old_status, kinds[1].new_status], ['pendiente', 'confirmado']);
  await db.query("delete from public.orders where id = $1", [id]);
  await db.query('truncate public.order_events');
});

// ================================================================= caja: transacciones del servidor
test('caja: guarda y lee una venta; otro admin también registra y actualiza', async () => {
  await run('saveSale', { sale: venta });
  assert.equal((await one("select collected from public.sales where id = 's1'")).collected, 70000);
  await run('saveSale', { sale: { ...venta, id: 'second-admin-sale' } });
  const saved = await saleAsClient('second-admin-sale');
  await run('saveSale', { sale: { ...saved, customer: 'Actualizado por otro administrador' } });
  assert.equal((await one("select customer from public.sales where id = 'second-admin-sale'")).customer, 'Actualizado por otro administrador');
  await run('saveExpense', { expense: { ...gasto, id: 'second-admin-expense' } });
  await run('saveCostRecipe', { recipe: erpModel.INITIAL_RECIPE });
  assert.equal((await one("select costs->>'10 ML' as c from public.sales_config where id = 'costs'")).c, '8766');
});
test('caja: valida importes y textos y no guarda ventas inválidas', async () => {
  await assert.rejects(run('saveSale', { sale: { ...venta, id: 'bad-1', collected: -1 } }));
  await assert.rejects(run('saveSale', { sale: { ...venta, id: 'bad-2', notes: 'x'.repeat(2001) } }));
  await assert.rejects(run('saveSale', { sale: { ...venta, id: 'bad id!' } }), /inválida/);
  assert.equal(await count('sales', "id like 'bad%'"), 0);
});
test('caja: evita sobrescribir una edición más reciente', async () => {
  const original = await saleAsClient('s1');
  await run('saveSale', { sale: { ...original, customer: 'Editado' } });
  await assert.rejects(run('saveSale', { sale: { ...original, customer: 'Edición vieja' } }), /otra ventana/);
  assert.equal((await one("select customer from public.sales where id = 's1'")).customer, 'Editado');
  const expense = await one("select to_jsonb(e) as j from public.expenses e where id = 'e1'").catch(() => undefined);
  assert.equal(expense, undefined);
  await run('saveExpense', { expense: gasto });
  const guardado = (await one("select to_jsonb(e) as j from public.expenses e where id = 'e1'")).j;
  const edit = { id: 'e1', date: guardado.date, type: guardado.type, category: guardado.category, description: guardado.description, payee: guardado.payee, amount: guardado.amount, paymentMethod: guardado.payment_method, status: guardado.status, notes: guardado.notes, updatedAt: guardado.updated_at };
  await run('saveExpense', { expense: { ...edit, notes: 'primera edición' } });
  await assert.rejects(run('saveExpense', { expense: { ...edit, notes: 'edición vieja' } }), /otra ventana/);
});
test('caja: una venta no se borra y conserva su fecha de creación', async () => {
  const before = (await one("select created_at from public.sales where id = 's1'")).created_at;
  await run('saveSale', { sale: { ...(await saleAsClient('s1')), notes: 'cambio' } });
  assert.deepEqual((await one("select created_at from public.sales where id = 's1'")).created_at, before);
  await assert.rejects(admin((c) => c.query("delete from public.sales where id = 's1'")), /permission denied/);
});
test('caja: rechaza cambios del costo histórico y parámetros obsoletos', async () => {
  const original = await saleAsClient('s1');
  await assert.rejects(run('saveSale', { sale: { ...original, items: original.items.map((i) => ({ ...i, unitCost: 1 })) } }), /histórico/);
  const historicalCost = original.items[0].unitCost;
  await run('saveSale', { sale: { ...original, customer: 'Cliente corregido', items: original.items.map((i) => ({ ...i, quantity: 2 })), collected: 140000 } });
  assert.equal((await one("select items->0->>'unitCost' as c from public.sales where id = 's1'")).c, String(historicalCost));
  await assert.rejects(run('saveSale', { sale: { ...venta, id: 'bad-new-cost', items: venta.items.map((i) => ({ ...i, unitCost: 1 })) } }), /parametrizado/);
  assert.equal(await count('sales', "id = 'bad-new-cost'"), 0);
});

test('caja: una presentación nueva (100 ML) guarda su costo, se vende con él y al quitarla las ventas viejas siguen editables', async () => {
  const recipe = { ...erpModel.INITIAL_RECIPE, packaging: { ...erpModel.INITIAL_RECIPE.packaging, '100 ML': { bottle: 9000, box: 2500, bag: 3500, label: 500, largeLabel: 900, other: 100 } }, prices: { '100 ML': 200000 } };
  await run('saveCostRecipe', { recipe });
  const costs = (await one("select costs from public.sales_config where id = 'costs'")).costs;
  assert.equal(costs['100 ML'], 35160); assert.equal(costs['30 ML'], 17398);
  const grande = { ...venta, id: 'big-100', items: [{ ...venta.items[0], size: '100 ML', unitCost: 35160, unitPrice: 200000 }], collected: 200000 };
  await run('saveSale', { sale: grande });
  await assert.rejects(run('saveSale', { sale: { ...grande, id: 'big-wrong-cost', items: [{ ...grande.items[0], unitCost: 17398 }] } }), /parametrizado/);
  // Se quita la presentación: lo vendido conserva su costo y se puede seguir corrigiendo; una venta nueva con ella se rechaza.
  await run('saveCostRecipe', { recipe: erpModel.INITIAL_RECIPE });
  assert.equal((await one("select costs ? '100 ML' as tiene from public.sales_config where id = 'costs'")).tiene, false);
  await run('saveSale', { sale: { ...(await saleAsClient('big-100')), customer: 'Corregida sin la presentación' } });
  assert.equal((await one("select items->0->>'unitCost' as c from public.sales where id = 'big-100'")).c, '35160');
  await assert.rejects(run('saveSale', { sale: { ...grande, id: 'big-new' } }), /ya no está disponible/);
  assert.equal(await count('sales', "id in ('big-wrong-cost','big-new')"), 0);
});
test('caja: la receta no puede quitar las presentaciones de la tienda ni traer nombres o precios inválidos', async () => {
  const base = erpModel.INITIAL_RECIPE;
  const { '30 ML': _quitada, ...sin30 } = base.packaging;
  await assert.rejects(run('saveCostRecipe', { recipe: { ...base, packaging: sin30 } }), /no se pueden quitar/);
  await assert.rejects(run('saveCostRecipe', { recipe: { ...base, packaging: { ...base.packaging, grande: base.packaging['50 ML'] } } }), /nombre inválido/);
  await assert.rejects(run('saveCostRecipe', { recipe: { ...base, prices: { '30 ML': -1 } } }), /precios/);
  assert.equal((await one("select costs->>'30 ML' as c from public.sales_config where id = 'costs'")).c, '17398');
});

// ================================================================= cuentas del panel
test('sesiones: aura_revoke_sessions cierra solo las sesiones de la cuenta y únicamente la ejecuta el usuario del servidor', async () => {
  const a = '00000000-0000-0000-0000-0000000000a1';
  const b = '00000000-0000-0000-0000-0000000000b1';
  await db.query('delete from auth.sessions');
  await db.query('insert into auth.sessions (user_id) values ($1), ($1), ($2)', [a, b]);
  // Sin `as()`: ese ayudante deshace la transacción y acá hay que ver el borrado confirmado.
  const server = await db.connect();
  let result;
  try {
    await server.query('set role aura_server');
    result = await server.query('select public.aura_revoke_sessions($1::uuid) as n', [a]);
  } finally {
    await server.query('reset role');
    server.release();
  }
  assert.equal(result.rows[0].n, 2);
  assert.equal(Number((await one('select count(*)::int as n from auth.sessions where user_id = $1', [a])).n), 0);
  assert.equal(Number((await one('select count(*)::int as n from auth.sessions where user_id = $1', [b])).n), 1);
  for (const quien of [anon, admin, (fn) => as('service_role', { role: 'service_role' }, fn)]) {
    await assert.rejects(quien((c) => c.query('select public.aura_revoke_sessions($1::uuid)', [b])), /permission denied/);
  }
  assert.equal(Number((await one('select count(*)::int as n from auth.sessions where user_id = $1', [b])).n), 1);
});

// ================================================================= pedidos web → ventas
test('pedidos: confirma y crea una única venta incluso con solicitudes simultáneas', async () => {
  await insert(db, 'orders', { id: 'web1', ...pedido });
  await Promise.all([run('confirmOrderAndRecordSale', { orderId: 'web1' }), run('confirmOrderAndRecordSale', { orderId: 'web1' })]);
  assert.equal((await one("select status from public.orders where id = 'web1'")).status, 'confirmado');
  const sale = await one("select * from public.sales where id = 'web_web1'");
  assert.equal(sale.source_order_code, pedido.order_id);
  assert.equal(sale.collected, pedido.total);
  assert.equal(await count('sales', "source_order_id = 'web1'"), 1);
  assert.equal(await run('confirmOrderAndRecordSale', { orderId: 'web1', requireConfirmed: true }), false);
});
test('pedidos: cancelar anula la venta y conserva el registro', async () => {
  await run('cancelOrderAndSale', { orderId: 'web1' });
  assert.equal((await one("select status from public.orders where id = 'web1'")).status, 'cancelado');
  assert.equal((await one("select status from public.sales where id = 'web_web1'")).status, 'anulada');
});
test('pedidos: reabrir y confirmar recupera la misma venta con sus costos históricos', async () => {
  const before = await one("select * from public.sales where id = 'web_web1'");
  await db.query("update public.orders set status = 'pendiente' where id = 'web1'");
  await run('confirmOrderAndRecordSale', { orderId: 'web1' });
  const after = await one("select * from public.sales where id = 'web_web1'");
  assert.equal(after.status, 'pagada');
  assert.deepEqual(after.items, before.items);
  assert.deepEqual(after.created_at, before.created_at);
});
test('pedidos: el importador no registra pendientes y el pago con tarjeta guarda los datos de cobro', async () => {
  await insert(db, 'orders', { id: 'pending1', ...pedido, order_id: 'AURA-PEND01' });
  await assert.rejects(run('confirmOrderAndRecordSale', { orderId: 'pending1', requireConfirmed: true }), /confirmado/);
  await insert(db, 'orders', { id: 'card1', ...pedido, order_id: 'AURA-CARD01', pagopar_hash: 'hash-1234' });
  await run('confirmOrderAndRecordSale', { orderId: 'card1', paymentFields: { status: 'confirmado', pagoparStatus: 'pagado', paidAt: 1700000000000, pagoparPayment: { formaPago: 'Tarjeta', monto: '250000' }, name: 'NO DEBE CAMBIAR' } });
  const order = await one("select * from public.orders where id = 'card1'");
  assert.equal(order.status, 'confirmado');
  assert.equal(order.pagopar_status, 'pagado');
  assert.equal(order.paid_at, 1700000000000);
  assert.deepEqual(order.pagopar_payment, { formaPago: 'Tarjeta', monto: '250000' });
  assert.equal(order.name, pedido.name);
  await assert.rejects(run('confirmOrderAndRecordSale', { orderId: 'card1', paymentFields: { status: 'cancelado' } }), /Estado inválido/);
  await assert.rejects(run('confirmOrderAndRecordSale', { orderId: 'no-existe' }), /ya no existe/);
});

// ================================================================= importación del historial
const filas = () => [
  { key: 'sheet_aura_history_1_2_sale', kind: 'sale', record: { ...venta, id: 'sheet_aura_history_1_2_sale' }, errors: [] },
  { key: 'sheet_aura_history_2_3_0', kind: 'expense', record: { ...gasto, id: 'sheet_aura_history_2_3_0' }, errors: [] },
];
test('importación: crea por origen, evita duplicados simultáneos y no pisa lo editado', async () => {
  const results = await Promise.all([run('importLedger', { rows: filas() }), run('importLedger', { rows: filas() })]);
  assert.equal(results.reduce((n, r) => n + r.created, 0), 2);
  assert.equal(results.reduce((n, r) => n + r.skipped, 0), 2);
  await db.query("update public.sales set customer = 'Corregido en ERP' where id = 'sheet_aura_history_1_2_sale'");
  const again = await run('importLedger', { rows: filas() });
  assert.equal(again.created, 0);
  assert.equal((await one("select customer from public.sales where id = 'sheet_aura_history_1_2_sale'")).customer, 'Corregido en ERP');
});
test('importación: rechaza filas pendientes y duplicadas antes de escribir', async () => {
  const row = { key: 'sheet_aura_history_1_4_sale', kind: 'sale', record: { ...venta, id: 'sheet_aura_history_1_4_sale' }, errors: [] };
  await assert.rejects(run('importLedger', { rows: [{ ...row, errors: ['Falta fecha'] }] }), /sin resolver/);
  await assert.rejects(run('importLedger', { rows: [row, row] }), /repetidas/);
  assert.equal(await count('sales', `id = '${row.key}'`), 0);
});
test('importación: reanuda una importación interrumpida sin duplicar lo ya cargado', async () => {
  const rows = Array.from({ length: 25 }, (_, i) => ({ key: `sheet_aura_resume_1_${i + 1}_sale`, kind: 'sale', record: { ...venta, id: `sheet_aura_resume_1_${i + 1}_sale` }, errors: [] }));
  await run('importLedger', { rows: rows.slice(0, 20) });
  const result = await run('importLedger', { rows });
  assert.equal(result.created, 5);
  assert.equal(result.skipped, 20);
});

// ================================================================= Gift Cards
const giftOrder = { ...pedido, order_id: 'AURA-GIFT01', subtotal: 200000, total: 200000, items: [{ code: 'GIFT-CARD', name: 'Gift Card Äura', size: 'Digital', price: 100000, quantity: 2, giftCard: { recipient: 'Ana', sender: 'Luis', message: 'Feliz cumpleaños' } }] };
test('gift cards: una compra pública queda pendiente y no emite ni lee tarjetas', async () => {
  await anon((c) => insert(c, 'orders', { id: hex32(80), ...giftOrder, order_id: 'AURA-GIFTPUB' }));
  await assert.rejects(anon((c) => insert(c, 'gift_cards', { id: 'forged', amount: 100000, balance: 100000 })), /permission denied/);
  await assert.rejects(anon((c) => c.query('select * from public.gift_cards')), /permission denied/);
  await assert.rejects(anon((c) => insert(c, 'gift_card_payments', { order_code: 'AURA-GIFT01', order_id: 'gift1', amount: 100000, activated_at: 1 })), /permission denied/);
});
test('gift cards: confirmar dos veces emite una tarjeta por unidad y no inventa ventas de perfumes', async () => {
  await insert(db, 'orders', { id: 'gift1', ...giftOrder });
  await Promise.all([run('confirmOrderAndRecordSale', { orderId: 'gift1' }), run('confirmOrderAndRecordSale', { orderId: 'gift1' })]);
  assert.equal(await count('gift_cards', "order_id = 'gift1'"), 2);
  const card = await one("select * from public.gift_cards where id = 'gift1_0_0'");
  assert.equal(card.balance, 100000);
  assert.equal(card.expires_at - card.activated_at, 60 * 86400000);
  assert.equal(await count('sales', "id = 'web_gift1'"), 0);
  await run('confirmOrderAndRecordSale', { orderId: 'gift1', requireConfirmed: true });
  assert.equal((await one("select activated_at from public.gift_cards where id = 'gift1_0_0'")).activated_at, card.activated_at);
});
test('gift cards: el mismo pago en otro registro y montos bajo el mínimo se rechazan', async () => {
  await insert(db, 'orders', { id: 'duplicateGift', ...giftOrder });
  await assert.rejects(run('confirmOrderAndRecordSale', { orderId: 'duplicateGift' }), /otro registro/);
  await insert(db, 'orders', { id: 'smallGift', ...giftOrder, order_id: 'AURA-SMALL01', items: [{ ...giftOrder.items[0], price: 99999 }] });
  await assert.rejects(run('confirmOrderAndRecordSale', { orderId: 'smallGift' }), /mínimo/);
});
test('gift cards: saldo, vigencia y borrado no se tocan sin un canje trazable', async () => {
  await assert.rejects(admin((c) => c.query("update public.gift_cards set balance = 1 where id = 'gift1_0_0'")), /permission denied/);
  await assert.rejects(admin((c) => c.query("update public.gift_cards set expires_at = 1 where id = 'gift1_0_0'")), /permission denied/);
  await assert.rejects(admin((c) => c.query("delete from public.gift_cards where id = 'gift1_0_0'")), /permission denied/);
  await assert.rejects(db.query("update public.gift_cards set balance = 100001 where id = 'gift1_0_0'"), /check constraint/);
  await assert.rejects(db.query("update public.gift_cards set expires_at = expires_at + 1 where id = 'gift1_0_0'"), /check constraint/);
});
test('gift cards: el canje es idempotente, conserva saldo parcial y bloquea sobregiros', async () => {
  const redeem = (amount, reference, operationId, id = 'gift1_0_0') => run('redeemGiftCard', { id, amount, reference, operationId });
  await Promise.all([redeem(30000, 'VENTA-01', 'redemption-one'), redeem(30000, 'VENTA-01', 'redemption-one')]);
  assert.equal((await one("select balance from public.gift_cards where id = 'gift1_0_0'")).balance, 70000);
  assert.equal(await count('gift_card_redemptions', "gift_card_id = 'gift1_0_0'"), 1);
  await assert.rejects(redeem(30000, 'OTRA-VENTA', 'redemption-one'), /ya fue utilizado/);
  await assert.rejects(redeem(70001, 'VENTA-02', 'redemption-over'), /saldo/);
  await assert.rejects(redeem(10, '', 'redemption-empty'), /Indicá/);
  await assert.rejects(run('cancelOrderAndSale', { orderId: 'gift1' }), /utilizada/);
  await redeem(70000, 'VENTA-02', 'redemption-full');
  assert.equal((await one("select status from public.gift_cards where id = 'gift1_0_0'")).status, 'agotada');
  await assert.rejects(db.query("update public.gift_card_redemptions set amount = 1 where id = 'redemption-one'"), /check constraint/);
  await assert.rejects(admin((c) => c.query("update public.gift_card_redemptions set amount = 1")), /permission denied/);
});
test('gift cards: una tarjeta vencida no admite canjes', async () => {
  const expiredAt = Date.now() - 61 * 86400000;
  await db.query('update public.gift_cards set activated_at = $1, expires_at = $2 where id = $3', [expiredAt, expiredAt + 60 * 86400000, 'gift1_0_1']);
  await assert.rejects(run('redeemGiftCard', { id: 'gift1_0_1', amount: 10000, reference: 'VENTA-03', operationId: 'redemption-expired' }), /vencida/);
});
test('gift cards: cancelar un pedido sin canjes anula sus tarjetas y conserva el historial', async () => {
  await insert(db, 'orders', { id: 'giftCancel', ...giftOrder, order_id: 'AURA-GIFTCANCEL' });
  await run('confirmOrderAndRecordSale', { orderId: 'giftCancel' });
  await run('cancelOrderAndSale', { orderId: 'giftCancel' });
  assert.equal((await one("select status from public.gift_cards where id = 'giftCancel_0_0'")).status, 'anulada');
  assert.equal((await one("select status from public.orders where id = 'giftCancel'")).status, 'cancelado');
});
test('gift cards: un pedido mixto emite la tarjeta y lleva a Caja solo los perfumes', async () => {
  const items = [giftOrder.items[0], { code: 'A01', name: 'Perfume', size: '30 ML', price: 70000, quantity: 1 }];
  await insert(db, 'orders', { id: 'giftMixed', ...giftOrder, order_id: 'AURA-GIFTMIXED', items, subtotal: 270000, total: 263000, discount_percent: 10, discount_amount: 7000 });
  await run('confirmOrderAndRecordSale', { orderId: 'giftMixed' });
  const sale = await one("select * from public.sales where id = 'web_giftMixed'");
  assert.equal(sale.items.length, 1);
  assert.equal(sale.items[0].code, 'A01');
  assert.equal(sale.discount, 7000);
  assert.equal(sale.collected, 63000);
  assert.equal(await count('gift_cards', "order_id = 'giftMixed'"), 2);
});
