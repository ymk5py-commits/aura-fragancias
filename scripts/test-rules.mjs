/**
 * Tests de las reglas de Firestore (firestore.rules) contra el emulador.
 *
 * Corre con:
 *   npm run test:rules
 *
 * Reproduce lo que hace la tienda sin login (guardar un pedido, avisar una
 * compra fallida) y verifica que lo que NO debe poder hacer siga cerrado.
 */
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import * as firestoreSdk from 'firebase/firestore';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';

const PROJECT_ID = 'demo-aura-rules';

const pedido = {
  orderId: 'AURA-TEST01',
  status: 'pendiente',
  name: 'Cliente Prueba',
  phone: '0981123456',
  address: 'Calle 123',
  cityAndNeighborhood: 'Asunción',
  subtotal: 250000,
  discountPercent: 0,
  discountAmount: 0,
  total: 250000,
  freeShipping: false,
  items: [{ code: 'A01', name: 'Perfume', size: '50ml', price: 250000, quantity: 1 }],
  paymentMethod: 'tarjeta',
};

const incidente = {
  source: 'pago-tarjeta',
  message: 'No pudimos generar el link de pago.',
  detail: 'HTTP 502',
  orderId: 'AURA-TEST01',
  paymentMethod: 'tarjeta',
  total: 250000,
  customerName: 'Cliente Prueba',
  customerPhone: '0981123456',
  userAgent: 'Mozilla/5.0',
  page: '/',
  createdAt: Date.now(),
  seen: false,
};

let fallos = 0;
async function caso(nombre, fn) {
  try {
    await fn();
    console.log(`  ✔ ${nombre}`);
  } catch (err) {
    fallos += 1;
    console.log(`  ✘ ${nombre}\n      ${String(err.message || err).split('\n')[0]}`);
  }
}

const env = await initializeTestEnvironment({
  projectId: PROJECT_ID,
  firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
});

async function sembrar() {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'products', 'A01'), { code: 'A01', name: 'Perfume', visible: true });
    await setDoc(doc(db, 'incidents', 'i1'), incidente);
  });
}

const anon = () => env.unauthenticatedContext().firestore();
const admin = () => env.authenticatedContext('admin', { email: 'admin@aurafragancias.store' }).firestore();

console.log('\nReglas de Firestore — tienda sin login\n');

await sembrar();
await caso('guarda un pedido válido', () => assertSucceeds(setDoc(doc(anon(), 'orders', 'o1'), pedido)));
await caso('rechaza un pedido con estado inventado', () =>
  assertFails(setDoc(doc(anon(), 'orders', 'o2'), { ...pedido, status: 'pagado' }))
);
await caso('no puede tocar el catálogo', () =>
  assertFails(updateDoc(doc(anon(), 'products', 'A01'), { visible: false }))
);
await caso('no puede leer los pedidos', () => assertFails(getDoc(doc(anon(), 'orders', 'o1'))));

console.log('\nAlertas (colección incidents)\n');

await sembrar();
await caso('la tienda registra una compra fallida', () =>
  assertSucceeds(setDoc(doc(anon(), 'incidents', 'i2'), incidente))
);
await caso('no puede nacer ya revisada', () =>
  assertFails(setDoc(doc(anon(), 'incidents', 'i3'), { ...incidente, seen: true }))
);
await caso('no puede mandar un mensaje kilométrico', () =>
  assertFails(setDoc(doc(anon(), 'incidents', 'i4'), { ...incidente, message: 'x'.repeat(501) }))
);
await caso('sin login no se leen', () => assertFails(getDoc(doc(anon(), 'incidents', 'i1'))));
await caso('sin login no se marcan ni se borran', () =>
  assertFails(updateDoc(doc(anon(), 'incidents', 'i1'), { seen: true }))
);
await caso('el admin lista las alertas', () =>
  assertSucceeds(getDocs(query(collection(admin(), 'incidents'), orderBy('createdAt', 'desc'), limit(50))))
);
await caso('el admin la marca como revisada', () =>
  assertSucceeds(updateDoc(doc(admin(), 'incidents', 'i1'), { seen: true, seenAt: Date.now() }))
);
await caso('el admin no puede reescribir el mensaje', () =>
  assertFails(updateDoc(doc(admin(), 'incidents', 'i1'), { message: 'otra cosa' }))
);
await caso('el admin la borra', () => assertSucceeds(deleteDoc(doc(admin(), 'incidents', 'i1'))));

console.log('\nCaja / ERP — acceso privado y transacciones\n');
const cashAdmin = () => env.authenticatedContext('cash-admin', { email: 'ymk5py@gmail.com' }).firestore();
const outsider = () => env.authenticatedContext('other', { email: 'otro@example.com' }).firestore();
function loadModule(path, imports) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInThisContext(`(function(exports, require) { ${output}\n })`)(exports, (name) => {
    if (!(name in imports)) throw new Error(`Unexpected import ${name}`);
    return imports[name];
  });
  return exports;
}
const salesModel = loadModule('../src/lib/sales.ts', {});
const erpModel = loadModule('../src/lib/erp.ts', { './sales': salesModel });
const ledger = loadModule('../src/lib/salesService.ts', {
  './firebase': { getFirebaseDb: async () => cashAdmin() }, './sales': salesModel, './erp': erpModel, 'firebase/firestore': firestoreSdk,
});
const venta = {
  id: 's1', date: '2026-10-04', customer: 'Prueba', phone: '', channel: 'WhatsApp', paymentMethod: 'Transferencia', status: 'pagada',
  items: [{ code: 'A01', name: 'Perfume', size: '30 ML', quantity: 1, unitPrice: 70000, unitCost: 17398 }],
  discount: 0, deliveryCharged: 0, deliveryActual: 0, otherCosts: 0, collected: 70000, notes: '',
};
const gasto = { id: 'e1', date: '2026-10-04', type: 'Operativo', category: 'Internet', description: 'Plan del negocio', payee: '', amount: 214914, paymentMethod: 'Transferencia', status: 'pagado', notes: '' };
await sembrar();
await caso('guarda y lee una venta desde el servicio real', async () => {
  await ledger.saveSale(venta);
  const snapshot = await assertSucceeds(getDoc(doc(cashAdmin(), 'sales', 's1')));
  assert.equal(snapshot.data().collected, 70000);
});
await caso('anon no lee ventas ni costos privados', async () => {
  await assertFails(getDoc(doc(anon(), 'sales', 's1')));
  await assertFails(getDoc(doc(anon(), 'salesConfig', 'costs')));
});
await caso('otra cuenta autenticada no lee ni modifica la caja', async () => {
  await assertFails(getDoc(doc(outsider(), 'sales', 's1')));
  await assertFails(updateDoc(doc(outsider(), 'sales', 's1'), { notes: 'alterado', updatedAt: serverTimestamp() }));
  await assertFails(setDoc(doc(outsider(), 'expenses', 'x'), { ...gasto, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
});
await caso('lista completa por rango de fechas sin índice compuesto', () => assertSucceeds(getDocs(query(collection(cashAdmin(), 'sales'), firestoreSdk.where('date', '>=', '2026-10-01'), firestoreSdk.where('date', '<=', '2026-10-31'), orderBy('date', 'desc')))));
await caso('no se puede borrar una venta ni alterar su fecha de creación', async () => {
  await assertFails(deleteDoc(doc(cashAdmin(), 'sales', 's1')));
  await assertFails(updateDoc(doc(cashAdmin(), 'sales', 's1'), { createdAt: firestoreSdk.Timestamp.fromMillis(0), updatedAt: serverTimestamp() }));
});
await caso('valida también actualizaciones de importes y textos', async () => {
  await assertFails(updateDoc(doc(cashAdmin(), 'sales', 's1'), { collected: -1, updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(cashAdmin(), 'sales', 's1'), { notes: 'x'.repeat(2001), updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(cashAdmin(), 'sales', 's1'), { extra: true, updatedAt: serverTimestamp() }));
});
await caso('evita sobrescribir una edición más reciente', async () => {
  const original = { ...venta, ...(await getDoc(doc(cashAdmin(), 'sales', 's1'))).data() };
  await ledger.saveSale({ ...original, customer: 'Editado' });
  await assert.rejects(ledger.saveSale({ ...original, customer: 'Edición vieja' }), /otra ventana/);
});
await caso('guarda gastos privados y configuración de costos', async () => {
  await ledger.saveExpense(gasto);
  await ledger.saveCostRecipe(erpModel.INITIAL_RECIPE);
  assert.equal((await getDoc(doc(cashAdmin(), 'salesConfig', 'costs'))).data().costs['10 ML'], 8766);
  await assertFails(getDoc(doc(anon(), 'expenses', 'e1')));
  await assertFails(deleteDoc(doc(cashAdmin(), 'expenses', 'e1')));
});
await caso('confirma el pedido y crea una única venta incluso con solicitudes simultáneas', async () => {
  await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'orders', 'web1'), pedido));
  await Promise.all([ledger.confirmOrderAndRecordSale('web1'), ledger.confirmOrderAndRecordSale('web1')]);
  assert.equal((await getDoc(doc(cashAdmin(), 'orders', 'web1'))).data().status, 'confirmado');
  const sale = await getDoc(doc(cashAdmin(), 'sales', 'web_web1'));
  assert.equal(sale.data().sourceOrderCode, pedido.orderId);
  assert.equal(sale.data().collected, pedido.total);
  assert.equal(await ledger.confirmOrderAndRecordSale('web1', {}, true), false);
});
await caso('cancelar el pedido anula la venta y conserva el registro', async () => {
  await ledger.cancelOrderAndSale('web1');
  assert.equal((await getDoc(doc(cashAdmin(), 'orders', 'web1'))).data().status, 'cancelado');
  assert.equal((await getDoc(doc(cashAdmin(), 'sales', 'web_web1'))).data().status, 'anulada');
});
await caso('reabrir y confirmar recupera la misma venta con sus costos históricos', async () => {
  const before = (await getDoc(doc(cashAdmin(), 'sales', 'web_web1'))).data();
  await updateDoc(doc(cashAdmin(), 'orders', 'web1'), { status: 'pendiente' });
  await ledger.confirmOrderAndRecordSale('web1');
  const after = (await getDoc(doc(cashAdmin(), 'sales', 'web_web1'))).data();
  assert.equal(after.status, 'pagada');
  assert.deepEqual(after.items, before.items);
  assert.deepEqual(after.createdAt, before.createdAt);
});
await caso('el importador no registra pedidos pendientes ni cambia el vínculo de una venta', async () => {
  await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'orders', 'pending1'), pedido));
  await assert.rejects(ledger.confirmOrderAndRecordSale('pending1', {}, true), /confirmado/);
  await assertFails(updateDoc(doc(cashAdmin(), 'sales', 'web_web1'), { sourceOrderId: 'otro', updatedAt: serverTimestamp() }));
});

await env.cleanup();

console.log(fallos ? `\n${fallos} caso(s) fallaron\n` : '\nTodo ok\n');
process.exit(fallos ? 1 : 0);
