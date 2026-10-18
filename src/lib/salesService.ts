import { adminCall } from './adminApi';
import { getSupabase, toError, watch } from './supabase';
import { expenseFromRow, saleFromRow, type Row } from './supabaseMap';
import type { Order } from '../types';
import { INITIAL_COSTS, validateSale, type Sale, type SaleSize } from './sales';
import { INITIAL_RECIPE, validateRecipe, validateExpense, type CostRecipe, type Expense } from './erp';
import type { ImportRow } from './erpImport';

export async function loadImportSnapshot() {
  const [sb, { parseSnapshot }] = await Promise.all([getSupabase(), import('./erpImport')]);
  const { data, error } = await sb.from('erp_imports').select('contents').eq('id', 'aura-caja').maybeSingle();
  if (error) throw toError(error);
  return data ? parseSnapshot(String(data.contents)) : null;
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
  let created = 0;
  let skipped = 0;
  const CHUNK = 100;
  for (let start = 0; start < rows.length; start += CHUNK) {
    const chunk = rows.slice(start, start + CHUNK);
    const result = await adminCall<{ created: number; skipped: number }>('import-ledger', { rows: chunk });
    created += result.created;
    skipped += result.skipped;
    onProgress?.(Math.min(start + chunk.length, rows.length));
  }
  return { created, skipped };
}

export async function subscribeSales(from: string, to: string, callback: (sales: Sale[]) => void, onError: (error: Error) => void) {
  return watch<Row[]>(
    ['sales'],
    (sb) => sb.from('sales').select('*').gte('date', from).lte('date', to).order('date', { ascending: false }),
    (rows) => callback(rows.map(saleFromRow)),
    onError,
  );
}

/** Costos y receta viven en el mismo documento: una sola lectura y suscripción. */
export async function subscribeSaleConfiguration(
  callback: (config: { costs: Record<SaleSize, number>; recipe: CostRecipe }) => void,
  onError: (error: Error) => void,
) {
  return watch<Row | null>(
    ['sales_config'],
    (sb) => sb.from('sales_config').select('costs,recipe').eq('id', 'costs').maybeSingle(),
    (row) => callback({
      costs: { ...INITIAL_COSTS, ...((row?.costs as Partial<Record<SaleSize, number>>) || {}) },
      recipe: (row?.recipe as CostRecipe) || INITIAL_RECIPE,
    }),
    onError,
  );
}

export async function saveCostRecipe(recipe: CostRecipe) {
  const error = validateRecipe(recipe);
  if (error) throw new Error(error);
  await adminCall('cost-recipe', { recipe });
}

export async function subscribeExpenses(from: string, to: string, callback: (expenses: Expense[]) => void, onError: (error: Error) => void) {
  return watch<Row[]>(
    ['expenses'],
    (sb) => sb.from('expenses').select('*').gte('date', from).lte('date', to).order('date', { ascending: false }),
    (rows) => callback(rows.map(expenseFromRow)),
    onError,
  );
}

export async function saveExpense(expense: Expense) {
  const error = validateExpense(expense);
  if (error) throw new Error(error);
  await adminCall('save-expense', { expense });
}

export async function saveSale(sale: Sale) {
  const error = validateSale(sale);
  if (error) throw new Error(error);
  await adminCall('save-sale', { sale });
}

/** Confirma y registra en una sola transacción (en el servidor). El ID del pedido evita duplicados. */
export async function confirmOrderAndRecordSale(orderId: string, paymentFields: Partial<Order> = {}, requireConfirmed = false) {
  return adminCall<boolean>('confirm-order', { orderId, paymentFields, requireConfirmed });
}

/** Conserva la venta en el historial cuando se cancela el pedido. */
export async function cancelOrderAndSale(orderId: string) {
  await adminCall('cancel-order', { orderId });
}
