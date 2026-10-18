// Conversión entre las filas de Postgres (snake_case) y los tipos de la app (camelCase).
// Sirve igual en el navegador (respuestas de PostgREST) y en el servidor (node-postgres).
import type { Order, Perfume } from '../types';
import type { GiftCard } from './giftCards';
import type { Sale } from './sales';
import type { Expense } from './erp';

export type Row = Record<string, unknown>;

const camel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
const snake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

/** Fecha de una fila: acepta Date (node-postgres) o texto ISO (PostgREST). */
export function isoDate(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return value.toISOString();
  const text = String(value);
  return text;
}

/** Marca de tiempo estilo Firestore ({ seconds }) que todavía usa el panel de pedidos. */
export function secondsOf(value: unknown): { seconds: number } | undefined {
  if (value == null) return undefined;
  const ms = value instanceof Date ? value.getTime() : Date.parse(String(value));
  return Number.isFinite(ms) ? { seconds: Math.floor(ms / 1000) } : undefined;
}

/** snake_case → camelCase, sin las columnas nulas (Firestore no guardaba campos ausentes). */
export function camelizeRow(row: Row): Row {
  const out: Row = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === null || value === undefined) continue;
    out[camel(key)] = value instanceof Date ? value.toISOString() : value;
  }
  return out;
}

/** camelCase → snake_case, sin los undefined. Conserva los null (para vaciar una columna). */
export function snakeifyObject(obj: Row, skip: string[] = []): Row {
  const out: Row = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || skip.includes(key)) continue;
    out[snake(key)] = value;
  }
  return out;
}

export function productFromRow(row: Row): Perfume {
  const r = camelizeRow(row);
  return { ...(r as unknown as Perfume), id: String(row.id), notes: Array.isArray(row.notes) ? (row.notes as string[]) : [] };
}

export function orderFromRow(row: Row): Order {
  const r = camelizeRow(row);
  return { ...(r as unknown as Order), id: String(row.id), createdAt: secondsOf(row.created_at) };
}

export function giftCardFromRow(row: Row): GiftCard {
  return { ...(camelizeRow(row) as unknown as GiftCard), id: String(row.id) };
}

export function saleFromRow(row: Row): Sale {
  return { ...(camelizeRow(row) as unknown as Sale), id: String(row.id) };
}

export function expenseFromRow(row: Row): Expense {
  return { ...(camelizeRow(row) as unknown as Expense), id: String(row.id) };
}

/** Columnas de pedidos que la app puede escribir (todo lo demás lo decide el servidor o la base). */
export const ORDER_WRITABLE = [
  'orderId', 'status', 'name', 'phone', 'cityAndNeighborhood', 'address', 'subtotal', 'discountPercent', 'discountAmount',
  'total', 'shippingCost', 'freeShipping', 'items', 'receiptUrl', 'paymentMethod', 'email', 'document', 'invoice',
  'pagoparHash', 'pagoparNumeroPedido', 'pagoparStatus', 'pagoparAttempts', 'pagoparPayment', 'paidAt',
];

export function orderToRow(order: Partial<Order>): Row {
  const picked: Row = {};
  for (const key of ORDER_WRITABLE) {
    const value = (order as Row)[key];
    if (value !== undefined) picked[key] = value;
  }
  return snakeifyObject(picked);
}
