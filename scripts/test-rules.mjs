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
} from 'firebase/firestore';

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

await env.cleanup();

console.log(fallos ? `\n${fallos} caso(s) fallaron\n` : '\nTodo ok\n');
process.exit(fallos ? 1 : 0);
