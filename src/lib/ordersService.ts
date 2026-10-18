import { getSupabase, isSupabaseConfigured, newRowId, randomHex, toError, watch } from './supabase';
import { orderFromRow, orderToRow, type Row } from './supabaseMap';
import { Order, OrderStatus } from '../types';

/** Genera un código de pedido legible: AURA-XXXXXX */
export function newOrderId(): string {
  return `AURA-${Date.now().toString(36).toUpperCase()}`;
}

export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024; // 5 MB
export const RECEIPT_ACCEPT = 'image/*,application/pdf';

/** Valida el comprobante antes de subirlo. Devuelve null si está OK. */
export function validateReceipt(file: File): string | null {
  const okType = file.type.startsWith('image/') || file.type === 'application/pdf';
  if (!okType) return 'El comprobante debe ser una imagen o un PDF.';
  if (file.size > MAX_RECEIPT_BYTES) return 'El archivo supera los 5 MB. Probá con una foto más liviana.';
  return null;
}

/**
 * Sube el comprobante y devuelve su URL pública. El nombre lleva 128 bits aleatorios: la URL no se
 * puede adivinar (hace el papel del token de las URLs de descarga de Firebase) y la política del
 * bucket exige un nombre de al menos 20 caracteres.
 */
export async function uploadReceipt(file: File, orderId: string): Promise<string> {
  const sb = await getSupabase();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60);
  const path = `${orderId}-${Date.now()}-${randomHex(16)}-${safeName}`;
  const { error } = await sb.storage.from('comprobantes').upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw toError(error, 'No se pudo subir el comprobante');
  return sb.storage.from('comprobantes').getPublicUrl(path).data.publicUrl;
}

/** Guarda el pedido. Devuelve el id de la fila (lo genera el navegador: el visitante no puede leer pedidos). */
export async function saveOrder(order: Order): Promise<string> {
  const sb = await getSupabase();
  const id = newRowId();
  const { error } = await sb.from('orders').insert({ id, ...orderToRow(order) });
  if (error) throw toError(error);
  return id;
}

/** Escucha los pedidos en tiempo real (solo /admin). */
export async function subscribeOrders(cb: (orders: Order[]) => void): Promise<() => void> {
  if (!isSupabaseConfigured) return () => {};
  return watch<Row[]>(
    ['orders'],
    (sb) => sb.from('orders').select('*').order('created_at', { ascending: false }).limit(200),
    (rows) => cb(rows.map(orderFromRow)),
    (err) => {
      console.warn('[Äura] No se pudieron leer los pedidos:', err);
      cb([]);
    },
  );
}

export async function setOrderStatus(id: string, status: OrderStatus): Promise<void> {
  const sb = await getSupabase();
  const { error } = await sb.from('orders').update({ status }).eq('id', id);
  if (error) throw toError(error);
}

/** Actualiza campos sueltos de un pedido (solo /admin). */
export async function updateOrderFields(id: string, fields: Partial<Order>): Promise<void> {
  const sb = await getSupabase();
  const { error } = await sb.from('orders').update(orderToRow(fields)).eq('id', id);
  if (error) throw toError(error);
}
