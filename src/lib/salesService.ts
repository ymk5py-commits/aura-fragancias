import { getFirebaseDb } from './firebase';
import type { Order } from '../types';
import { INITIAL_COSTS, SALE_SIZES, saleTotals, orderToSale, validateSale, enforceSaleCosts, type Sale, type SaleSize } from './sales';
import { INITIAL_RECIPE, recipeCost, validateRecipe, validateExpense, type CostRecipe, type Expense } from './erp';
import type { ImportRow } from './erpImport';

export async function loadImportSnapshot() {
  const [db, sdk, { parseSnapshot }] = await Promise.all([getFirebaseDb(), import('firebase/firestore'), import('./erpImport')]);
  const snapshot = await sdk.getDoc(sdk.doc(db, 'erpImports', 'aura-caja'));
  return snapshot.exists() ? parseSnapshot(snapshot.data().contents) : null;
}

/** Importación reanudable: crea solamente IDs de origen nuevos y nunca pisa una venta editada. */
export async function importLedger(rows: ImportRow[], onProgress?: (done: number) => void) {
  if (!rows.length || rows.length > 10000) throw new Error('Seleccioná entre 1 y 10.000 registros.');
  const keys = new Set<string>();
  for (const row of rows) {
    if (!row.record || row.errors.length || row.record.id !== row.key || !/^sheet_[\w-]+_\d+_\d+_(sale|0|5|10)$/.test(row.key) || keys.has(row.key) || !['sale', 'expense'].includes(row.kind)) throw new Error('Hay filas sin resolver o repetidas.');
    keys.add(row.key);
    const error = row.kind === 'sale' ? validateSale(row.record as Sale) : validateExpense(row.record as Expense);
    if (error) throw new Error(error);
  }
  const [db, sdk] = await Promise.all([getFirebaseDb(), import('firebase/firestore')]);
  let created = 0; let skipped = 0;
  for (let start = 0; start < rows.length; start += 20) {
    const chunk = rows.slice(start, start + 20);
    const result = await sdk.runTransaction(db, async transaction => {
      const refs = chunk.map(row => sdk.doc(db, row.kind === 'sale' ? 'sales' : 'expenses', row.key));
      const snapshots = await Promise.all(refs.map(ref => transaction.get(ref)));
      let count = 0;
      chunk.forEach((row, i) => {
        if (snapshots[i].exists()) return;
        const { id, createdAt, updatedAt, ...fields } = row.record!;
        transaction.set(refs[i], { ...fields, createdAt: sdk.serverTimestamp(), updatedAt: sdk.serverTimestamp() });
        count++;
      });
      return count;
    });
    created += result; skipped += chunk.length - result;
    onProgress?.(Math.min(start + chunk.length, rows.length));
  }
  return { created, skipped };
}

export async function subscribeSales(from: string, to: string, callback: (sales: Sale[]) => void, onError: (error: Error) => void) {
  const [db, sdk] = await Promise.all([getFirebaseDb(), import('firebase/firestore')]);
  const q = sdk.query(sdk.collection(db, 'sales'), sdk.where('date', '>=', from), sdk.where('date', '<=', to), sdk.orderBy('date', 'desc'));
  return sdk.onSnapshot(q, (snapshot) => callback(snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as Sale))), onError);
}

export async function subscribeSaleCosts(callback: (costs: Record<SaleSize, number>) => void, onError: (error: Error) => void) {
  const [db, sdk] = await Promise.all([getFirebaseDb(), import('firebase/firestore')]);
  return sdk.onSnapshot(sdk.doc(db, 'salesConfig', 'costs'), (snapshot) => callback({ ...INITIAL_COSTS, ...snapshot.data()?.costs }), onError);
}

export async function subscribeCostRecipe(callback: (recipe: CostRecipe) => void, onError: (error: Error) => void) {
  const [db, sdk] = await Promise.all([getFirebaseDb(), import('firebase/firestore')]);
  return sdk.onSnapshot(sdk.doc(db, 'salesConfig', 'costs'), (snapshot) => callback(snapshot.data()?.recipe || INITIAL_RECIPE), onError);
}

export async function saveCostRecipe(recipe: CostRecipe) {
  const error = validateRecipe(recipe);
  if (error) throw new Error(error);
  const [db, sdk] = await Promise.all([getFirebaseDb(), import('firebase/firestore')]);
  const costs = Object.fromEntries(SALE_SIZES.map((size) => [size, recipeCost(recipe, size).total]));
  await sdk.setDoc(sdk.doc(db, 'salesConfig', 'costs'), { costs, recipe, updatedAt: sdk.serverTimestamp() });
}

export async function subscribeExpenses(from: string, to: string, callback: (expenses: Expense[]) => void, onError: (error: Error) => void) {
  const [db, sdk] = await Promise.all([getFirebaseDb(), import('firebase/firestore')]);
  const q = sdk.query(sdk.collection(db, 'expenses'), sdk.where('date', '>=', from), sdk.where('date', '<=', to), sdk.orderBy('date', 'desc'));
  return sdk.onSnapshot(q, (snapshot) => callback(snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as Expense))), onError);
}

export async function saveExpense(expense: Expense) {
  const error = validateExpense(expense);
  if (error) throw new Error(error);
  const [db, sdk] = await Promise.all([getFirebaseDb(), import('firebase/firestore')]);
  const ref = sdk.doc(db, 'expenses', expense.id);
  await sdk.runTransaction(db, async (transaction) => {
    const previous = await transaction.get(ref);
    if (previous.exists() && !sameTimestamp(previous.data().updatedAt, expense.updatedAt)) throw new Error('El gasto cambió en otra ventana. Volvé a abrirlo para editar.');
    const { id, createdAt, updatedAt, ...fields } = expense;
    transaction.set(ref, { ...fields, createdAt: previous.exists() ? previous.data().createdAt : sdk.serverTimestamp(), updatedAt: sdk.serverTimestamp() });
  });
}

function sameTimestamp(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function saveSale(sale: Sale) {
  const error = validateSale(sale);
  if (error) throw new Error(error);
  const [db, sdk] = await Promise.all([getFirebaseDb(), import('firebase/firestore')]);
  const ref = sdk.doc(db, 'sales', sale.id);
  await sdk.runTransaction(db, async (transaction) => {
    const [previous, config] = await Promise.all([transaction.get(ref), transaction.get(sdk.doc(db, 'salesConfig', 'costs'))]);
    if (previous.exists() && !sameTimestamp(previous.data().updatedAt, sale.updatedAt)) {
      throw new Error('Esta venta cambió en otra ventana. Cerrá el formulario y volvé a abrirla para editar.');
    }
    if (!previous.exists() && sale.sourceOrderId) throw new Error('Registrá el pedido web desde la bandeja de pedidos confirmados.');
    const protectedSale = enforceSaleCosts(sale, previous.exists() ? { ...previous.data(), id: previous.id } as Sale : null, { ...INITIAL_COSTS, ...config.data()?.costs });
    const { id, createdAt, updatedAt, ...fields } = protectedSale;
    if (previous.exists() && previous.data().sourceOrderId !== sale.sourceOrderId) throw new Error('No se puede cambiar el pedido vinculado.');
    transaction.set(ref, {
      ...fields,
      createdAt: previous.exists() ? previous.data().createdAt : sdk.serverTimestamp(),
      updatedAt: sdk.serverTimestamp(),
    });
  });
}

/** Confirma y registra en una sola transacción. El ID del pedido evita duplicados. */
export async function confirmOrderAndRecordSale(orderId: string, paymentFields: Partial<Order> = {}, requireConfirmed = false) {
  const [db, sdk] = await Promise.all([getFirebaseDb(), import('firebase/firestore')]);
  return sdk.runTransaction(db, async (transaction) => {
    const orderRef = sdk.doc(db, 'orders', orderId);
    const saleRef = sdk.doc(db, 'sales', `web_${orderId}`);
    const [orderSnapshot, saleSnapshot, config] = await Promise.all([
      transaction.get(orderRef), transaction.get(saleRef), transaction.get(sdk.doc(db, 'salesConfig', 'costs')),
    ]);
    if (!orderSnapshot.exists()) throw new Error('El pedido ya no existe.');
    const order = { ...orderSnapshot.data(), ...paymentFields, id: orderId } as Order;
    if (requireConfirmed && order.status !== 'confirmado') throw new Error('El pedido debe estar confirmado antes de registrarlo.');
    if (order.status === 'cancelado' && !requireConfirmed) throw new Error('Reabrí el pedido antes de confirmar la venta.');
    if (!saleSnapshot.exists()) {
      const sale = orderToSale(order, { ...INITIAL_COSTS, ...config.data()?.costs });
      const error = validateSale(sale);
      if (error) throw new Error(error);
      const { id, ...fields } = sale;
      transaction.set(saleRef, { ...fields, createdAt: sdk.serverTimestamp(), updatedAt: sdk.serverTimestamp() });
    }
    if (saleSnapshot.exists() && saleSnapshot.data().status === 'anulada') {
      if (requireConfirmed) throw new Error('La venta de este pedido está anulada. Revisala en Caja antes de volver a registrarla.');
      const existing = { ...saleSnapshot.data(), id: saleRef.id } as Sale;
      transaction.update(saleRef, { status: 'pagada', collected: saleTotals(existing).total, updatedAt: sdk.serverTimestamp() });
    }
    if (!requireConfirmed) transaction.update(orderRef, { ...paymentFields, status: 'confirmado' });
    return !saleSnapshot.exists();
  });
}

/** Conserva la venta en el historial cuando se cancela el pedido. */
export async function cancelOrderAndSale(orderId: string) {
  const [db, sdk] = await Promise.all([getFirebaseDb(), import('firebase/firestore')]);
  await sdk.runTransaction(db, async (transaction) => {
    const saleRef = sdk.doc(db, 'sales', `web_${orderId}`);
    const sale = await transaction.get(saleRef);
    transaction.update(sdk.doc(db, 'orders', orderId), { status: 'cancelado' });
    if (sale.exists()) transaction.update(saleRef, { status: 'anulada', updatedAt: sdk.serverTimestamp() });
  });
}
