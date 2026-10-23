// Operaciones del panel que antes eran transacciones de Firestore. Se ejecutan en el servidor,
// dentro de una transacción de Postgres con bloqueo de filas (`for update`) y un bloqueo por
// operación (advisory lock) para serializar las que tocan lo mismo: misma semántica que
// runTransaction, con la lógica de negocio de siempre (validateSale, orderToSale, etc.).
import type { PoolClient } from 'pg';
import type { Order } from '../../types';
import { giftCardEntries, isGiftCard, newGiftCard, orderAmounts, validateGiftCardUse } from '../giftCards';
import { INITIAL_COSTS, enforceSaleCosts, orderToSale, saleTotals, validateSale, type Sale, type SaleSize } from '../sales';
import { recipeCost, recipeSizes, validateExpense, validateRecipe, type CostRecipe, type Expense } from '../erp';
import type { ImportRow } from '../erpImport';
import { giftCardFromRow, orderFromRow, saleFromRow, snakeifyObject, type Row } from '../supabaseMap';

const JSON_COLUMNS = new Set(['items', 'costs', 'recipe', 'invoice', 'pagopar_payment']);
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

function dbValue(column: string, value: unknown) {
  if (value === undefined) return null;
  return JSON_COLUMNS.has(column) && value !== null ? JSON.stringify(value) : value;
}

/** insert con las columnas dadas (los nombres de tabla y columna son constantes del código, no de la entrada). */
async function insertRow(client: PoolClient, table: string, row: Row, suffix = ''): Promise<number> {
  const cols = Object.keys(row);
  const text = `insert into public.${table} (${cols.map((c) => `"${c}"`).join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')}) ${suffix}`;
  const result = await client.query(text, cols.map((c) => dbValue(c, row[c])));
  return result.rowCount ?? 0;
}

async function updateRow(client: PoolClient, table: string, keyColumn: string, key: string, fields: Row, touch = false): Promise<void> {
  const cols = Object.keys(fields);
  const sets = cols.map((c, i) => `"${c}" = $${i + 1}`);
  if (touch) sets.push('updated_at = now()');
  if (!sets.length) return;
  await client.query(`update public.${table} set ${sets.join(', ')} where "${keyColumn}" = $${cols.length + 1}`, [...cols.map((c) => dbValue(c, fields[c])), key]);
}

async function lock(client: PoolClient, name: string) {
  await client.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [name]);
}

async function costsFor(client: PoolClient): Promise<Record<SaleSize, number>> {
  const { rows } = await client.query('select costs from public.sales_config where id = $1', ['costs']);
  return { ...INITIAL_COSTS, ...((rows[0]?.costs as Partial<Record<SaleSize, number>>) || {}) };
}

function saleToRow(sale: Sale): Row {
  return {
    date: sale.date, customer: sale.customer, phone: sale.phone, channel: sale.channel, payment_method: sale.paymentMethod,
    status: sale.status, items: sale.items, discount: sale.discount, delivery_charged: sale.deliveryCharged,
    delivery_actual: sale.deliveryActual, other_costs: sale.otherCosts, collected: sale.collected, notes: sale.notes,
    source_order_id: sale.sourceOrderId ?? null, source_order_code: sale.sourceOrderCode ?? null,
  };
}

function expenseToRow(e: Expense): Row {
  return {
    date: e.date, type: e.type, category: e.category, description: e.description, payee: e.payee, amount: e.amount,
    payment_method: e.paymentMethod, status: e.status, notes: e.notes,
  };
}

/** Solo estos datos de cobro puede cambiar el panel al confirmar un pedido. */
function paymentColumns(fields: Partial<Order> = {}): Row {
  const out: Row = {};
  if (fields.pagoparStatus !== undefined) out.pagoparStatus = fields.pagoparStatus;
  if (fields.pagoparPayment !== undefined) out.pagoparPayment = fields.pagoparPayment;
  if (fields.paidAt !== undefined) out.paidAt = fields.paidAt;
  if (fields.receiptUrl !== undefined) out.receiptUrl = fields.receiptUrl;
  return snakeifyObject(out);
}

/** Confirma y registra en una sola transacción. El ID del pedido evita duplicados. */
export async function confirmOrderAndRecordSale(client: PoolClient, input: { orderId: string; paymentFields?: Partial<Order>; requireConfirmed?: boolean }) {
  const { orderId, paymentFields = {}, requireConfirmed = false } = input;
  if (!SAFE_ID.test(orderId)) throw new Error('Pedido inválido.');
  await lock(client, `order:${orderId}`);
  const orderRow = (await client.query('select * from public.orders where id = $1 for update', [orderId])).rows[0];
  if (!orderRow) throw new Error('El pedido ya no existe.');
  const merged = { ...orderFromRow(orderRow), ...paymentFields, id: orderId } as Order;
  if (paymentFields.status !== undefined && paymentFields.status !== 'confirmado') throw new Error('Estado inválido.');
  if (requireConfirmed && merged.status !== 'confirmado') throw new Error('El pedido debe estar confirmado antes de registrarlo.');
  if (merged.status === 'cancelado' && !requireConfirmed) throw new Error('Reabrí el pedido antes de confirmar la venta.');

  const saleId = `web_${orderId}`;
  const saleRow = (await client.query('select * from public.sales where id = $1 for update', [saleId])).rows[0];
  const costs = await costsFor(client);
  const entries = giftCardEntries(merged);
  const cards: (Row | undefined)[] = [];
  for (const entry of entries) cards.push((await client.query('select * from public.gift_cards where id = $1 for update', [entry.id])).rows[0]);
  const claim = entries.length
    ? (await client.query('select * from public.gift_card_payments where order_code = $1 for update', [merged.orderId])).rows[0]
    : undefined;
  if (claim && claim.order_id !== orderId) throw new Error('Este pago ya tiene Gift Cards emitidas en otro registro.');
  if (entries.length) {
    const amounts = orderAmounts(merged.items, merged.discountPercent || 0);
    if (amounts.total !== merged.total || amounts.discountAmount !== merged.discountAmount || amounts.subtotal !== merged.subtotal) {
      throw new Error('El importe del pedido no coincide. Revisalo antes de emitir la Gift Card.');
    }
  }

  const hasMerchandise = merged.items.some((item) => !isGiftCard(item));
  if (hasMerchandise && !saleRow) {
    const sale = orderToSale(merged, costs);
    const error = validateSale(sale);
    if (error) throw new Error(error);
    await insertRow(client, 'sales', { id: saleId, ...saleToRow(sale) });
  }
  if (saleRow && saleRow.status === 'anulada') {
    if (requireConfirmed) throw new Error('La venta de este pedido está anulada. Revisala en Caja antes de volver a registrarla.');
    const existing = saleFromRow(saleRow);
    await updateRow(client, 'sales', 'id', saleId, { status: 'pagada', collected: saleTotals(existing).total }, true);
  }

  const activatedAt = Date.now();
  if (entries.length && !claim) {
    await insertRow(client, 'gift_card_payments', { order_code: merged.orderId, order_id: orderId, amount: merged.total, activated_at: activatedAt });
  }
  for (let index = 0; index < entries.length; index++) {
    if (!cards[index]) {
      await insertRow(client, 'gift_cards', { id: entries[index].id, ...snakeifyObject(newGiftCard(merged, entries[index], activatedAt) as unknown as Row) });
    } else if (cards[index]!.status === 'anulada') {
      throw new Error('Este pedido tiene una Gift Card anulada. No se puede reactivar desde Pedidos.');
    }
  }
  if (!requireConfirmed) await updateRow(client, 'orders', 'id', orderId, { ...paymentColumns(paymentFields), status: 'confirmado' });
  return hasMerchandise ? !saleRow : entries.some((_, i) => !cards[i]);
}

/** Conserva la venta en el historial cuando se cancela el pedido. */
export async function cancelOrderAndSale(client: PoolClient, input: { orderId: string }) {
  const { orderId } = input;
  if (!SAFE_ID.test(orderId)) throw new Error('Pedido inválido.');
  await lock(client, `order:${orderId}`);
  const orderRow = (await client.query('select * from public.orders where id = $1 for update', [orderId])).rows[0];
  if (!orderRow) throw new Error('El pedido no existe.');
  const saleId = `web_${orderId}`;
  const sale = (await client.query('select id from public.sales where id = $1 for update', [saleId])).rows[0];
  const entries = giftCardEntries(orderFromRow(orderRow));
  const cards: (Row | undefined)[] = [];
  for (const entry of entries) cards.push((await client.query('select * from public.gift_cards where id = $1 for update', [entry.id])).rows[0]);
  if (cards.some((card) => card && Number(card.balance) !== Number(card.amount))) {
    throw new Error('Una Gift Card ya fue utilizada. Revisá el canje antes de anular el pedido.');
  }
  for (let i = 0; i < entries.length; i++) if (cards[i]) await updateRow(client, 'gift_cards', 'id', entries[i].id, { status: 'anulada' });
  await updateRow(client, 'orders', 'id', orderId, { status: 'cancelado' });
  if (sale) await updateRow(client, 'sales', 'id', saleId, { status: 'anulada' }, true);
}

/** Canje atómico y trazable; reintentar la misma operación no vuelve a descontar. */
export async function redeemGiftCard(client: PoolClient, input: { id: string; amount: number; reference: string; operationId: string }) {
  const { id, amount, operationId } = input;
  const reference = String(input.reference ?? '').trim();
  if (!reference || String(input.reference).length > 200) throw new Error('Indicá la venta o pedido al que corresponde el canje.');
  if (!SAFE_ID.test(id) || !/^[A-Za-z0-9_-]{8,100}$/.test(operationId)) throw new Error('Canje inválido.');
  await lock(client, `gift:${id}`);
  const previous = (await client.query('select * from public.gift_card_redemptions where id = $1 for update', [operationId])).rows[0];
  if (previous) {
    const same = previous.gift_card_id === id && Number(previous.amount) === amount && previous.reference === reference;
    if (!same) throw new Error('Ese identificador de canje ya fue utilizado.');
    return;
  }
  const cardRow = (await client.query('select * from public.gift_cards where id = $1 for update', [id])).rows[0];
  if (!cardRow) throw new Error('No encontramos la Gift Card.');
  const card = giftCardFromRow(cardRow);
  const error = validateGiftCardUse(card, amount);
  if (error) throw new Error(error);
  const balance = card.balance - amount;
  await insertRow(client, 'gift_card_redemptions', { id: operationId, gift_card_id: id, amount, balance_before: card.balance, balance_after: balance, reference });
  await updateRow(client, 'gift_cards', 'id', id, { balance, status: balance === 0 ? 'agotada' : 'activa', last_redemption_id: operationId });
}

/** `updatedAt` llega como el texto que devolvió la base; se compara en SQL para no perder microsegundos. */
async function sameVersion(client: PoolClient, table: 'sales' | 'expenses', id: string, updatedAt: unknown): Promise<{ exists: boolean; same: boolean; row?: Row }> {
  const stamp = typeof updatedAt === 'string' && updatedAt ? updatedAt : null;
  const result = await client.query(`select *, (updated_at = $2::timestamptz) as __same from public.${table} where id = $1 for update`, [id, stamp]);
  const row = result.rows[0] as (Row & { __same?: boolean }) | undefined;
  return { exists: Boolean(row), same: Boolean(row?.__same), row };
}

export async function saveSale(client: PoolClient, input: { sale: Sale }) {
  const { sale } = input;
  if (!sale || !SAFE_ID.test(String(sale.id))) throw new Error('Venta inválida.');
  const error = validateSale(sale);
  if (error) throw new Error(error);
  await lock(client, `sale:${sale.id}`);
  const previous = await sameVersion(client, 'sales', sale.id, sale.updatedAt);
  if (previous.exists && !previous.same) throw new Error('Esta venta cambió en otra ventana. Cerrá el formulario y volvé a abrirla para editar.');
  if (!previous.exists && sale.sourceOrderId) throw new Error('Registrá el pedido web desde la bandeja de pedidos confirmados.');
  const prevSale = previous.row ? saleFromRow(previous.row) : null;
  const protectedSale = enforceSaleCosts(sale, prevSale, await costsFor(client));
  if (prevSale && (prevSale.sourceOrderId ?? undefined) !== (sale.sourceOrderId ?? undefined)) throw new Error('No se puede cambiar el pedido vinculado.');
  const row = saleToRow(protectedSale);
  if (previous.exists) await updateRow(client, 'sales', 'id', sale.id, row, true);
  else await insertRow(client, 'sales', { id: sale.id, ...row });
}

export async function saveExpense(client: PoolClient, input: { expense: Expense }) {
  const { expense } = input;
  if (!expense || !SAFE_ID.test(String(expense.id))) throw new Error('Gasto inválido.');
  const error = validateExpense(expense);
  if (error) throw new Error(error);
  await lock(client, `expense:${expense.id}`);
  const previous = await sameVersion(client, 'expenses', expense.id, expense.updatedAt);
  if (previous.exists && !previous.same) throw new Error('El gasto cambió en otra ventana. Volvé a abrirlo para editar.');
  const row = expenseToRow(expense);
  if (previous.exists) await updateRow(client, 'expenses', 'id', expense.id, row, true);
  else await insertRow(client, 'expenses', { id: expense.id, ...row });
}

export async function saveCostRecipe(client: PoolClient, input: { recipe: CostRecipe }) {
  const { recipe } = input;
  const error = validateRecipe(recipe);
  if (error) throw new Error(error);
  const costs = Object.fromEntries(recipeSizes(recipe).map((size) => [size, recipeCost(recipe, size).total]));
  await insertRow(client, 'sales_config', { id: 'costs', costs, recipe },
    'on conflict (id) do update set costs = excluded.costs, recipe = excluded.recipe, updated_at = now()');
}

/** Importación reanudable: crea solamente IDs de origen nuevos y nunca pisa una venta editada. */
export async function importLedger(client: PoolClient, input: { rows: ImportRow[] }) {
  const { rows } = input;
  if (!Array.isArray(rows) || !rows.length || rows.length > 200) throw new Error('Seleccioná entre 1 y 200 registros por tanda.');
  const keys = new Set<string>();
  for (const row of rows) {
    if (!row.record || row.errors?.length || row.record.id !== row.key || !/^sheet_[\w-]+_\d+_\d+_(sale|0|5|10)$/.test(row.key) || keys.has(row.key) || !['sale', 'expense'].includes(row.kind)) {
      throw new Error('Hay filas sin resolver o repetidas.');
    }
    keys.add(row.key);
    const error = row.kind === 'sale' ? validateSale(row.record as Sale) : validateExpense(row.record as Expense);
    if (error) throw new Error(error);
  }
  let created = 0;
  for (const row of rows) {
    const record = row.record as Sale & Expense;
    const fields = row.kind === 'sale' ? saleToRow(record) : expenseToRow(record);
    created += await insertRow(client, row.kind === 'sale' ? 'sales' : 'expenses', { id: row.key, ...fields }, 'on conflict (id) do nothing');
  }
  return { created, skipped: rows.length - created };
}

export const ADMIN_OPERATIONS = {
  'confirm-order': confirmOrderAndRecordSale,
  'cancel-order': cancelOrderAndSale,
  'redeem-gift-card': redeemGiftCard,
  'save-sale': saveSale,
  'save-expense': saveExpense,
  'cost-recipe': saveCostRecipe,
  'import-ledger': importLedger,
} as const;

export type AdminOperation = keyof typeof ADMIN_OPERATIONS;
