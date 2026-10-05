import type { Order } from '../types';

export const SALE_SIZES = ['10 ML', '30 ML', '50 ML'] as const;
export type SaleSize = typeof SALE_SIZES[number];
export type SaleStatus = 'pagada' | 'pendiente' | 'anulada';
export type SaleChannel = 'Mostrador' | 'WhatsApp' | 'Instagram' | 'Web' | 'Mayorista' | 'Otro';
export const SALE_CHANNELS: SaleChannel[] = ['Mostrador', 'WhatsApp', 'Instagram', 'Web', 'Mayorista', 'Otro'];
export const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'QR', 'Tarjeta', 'Otro'];
// Valores actuales leídos en COSTOS de AURA CAJA (no los costos históricos).
export const INITIAL_COSTS: Record<SaleSize, number> = { '10 ML': 8766, '30 ML': 17398, '50 ML': 23987 };

export interface SaleItem {
  lineId?: string;
  code: string;
  name: string;
  size: SaleSize;
  quantity: number;
  unitPrice: number;
  unitCost: number | null;
}

/** Identidad estable de cada renglón, incluso al quitar otra fragancia de la venta. */
export function saleLineId(item: SaleItem, index: number) { return item.lineId || `legacy_${index}`; }

export function changeSaleSize(item: SaleItem, size: SaleSize, costs: Record<SaleSize, number>, prices: Record<SaleSize, number>, original?: SaleItem): SaleItem {
  if (size === item.size) return item;
  if (original?.size === size) return { ...item, size, unitPrice: original.unitPrice, unitCost: original.unitCost };
  return { ...item, size, unitPrice: prices[size], unitCost: costs[size] };
}

/** Comprueba el costo en el guardado, además del bloqueo visible del formulario. */
export function enforceSaleCosts(sale: Sale, previous: Sale | null, costs: Record<SaleSize, number>): Sale {
  const originals = new Map(previous?.items.map((item, i) => [saleLineId(item, i), item]) || []);
  const used = new Set<string>();
  const items = sale.items.map((item, i) => {
    const lineId = saleLineId(item, i);
    if (used.has(lineId) || lineId.length > 100) throw new Error('Revisá las fragancias repetidas del formulario.');
    used.add(lineId);
    const original = originals.get(lineId);
    const expected = original && original.size === item.size ? original.unitCost : costs[item.size];
    if (item.unitCost !== expected) throw new Error(original && original.size === item.size
      ? 'El costo histórico de esta fragancia está protegido. Volvé a abrir la venta; para cambiar costos futuros usá Costos.'
      : 'El costo parametrizado cambió. Volvé a abrir la venta para revisar el costo y el margen actualizados.');
    return { ...item, lineId, unitCost: expected };
  });
  return { ...sale, items };
}

export interface Sale {
  id: string;
  date: string;
  customer: string;
  phone: string;
  channel: SaleChannel;
  paymentMethod: string;
  status: SaleStatus;
  items: SaleItem[];
  discount: number;
  deliveryCharged: number;
  deliveryActual: number;
  otherCosts: number;
  collected: number;
  notes: string;
  sourceOrderId?: string;
  sourceOrderCode?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export function paraguayDate(timestamp = Date.now()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Asuncion', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(timestamp);
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function saleTotals(sale: Pick<Sale, 'items' | 'discount' | 'deliveryCharged' | 'deliveryActual' | 'otherCosts' | 'collected'>) {
  const subtotal = sale.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const revenue = subtotal - sale.discount;
  const productCost = sale.items.reduce((sum, item) => sum + item.quantity * (item.unitCost ?? 0), 0);
  const costsComplete = sale.items.every((item) => item.unitCost != null);
  const deliveryDifference = sale.deliveryCharged - sale.deliveryActual;
  const total = revenue + sale.deliveryCharged;
  return {
    subtotal, revenue, total, productCost, costsComplete, deliveryDifference,
    units: sale.items.reduce((sum, item) => sum + item.quantity, 0),
    totalCost: productCost + sale.deliveryActual + sale.otherCosts,
    profit: costsComplete ? revenue - productCost + deliveryDifference - sale.otherCosts : null,
    balance: Math.max(0, total - sale.collected),
  };
}

export function validateSale(sale: Sale): string | null {
  if (!sale.id || sale.id.includes('/')) return 'La venta necesita un identificador válido.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sale.date) || !Number.isFinite(Date.parse(`${sale.date}T12:00:00Z`)) || new Date(`${sale.date}T12:00:00Z`).toISOString().slice(0, 10) !== sale.date) return 'Revisá la fecha de la venta.';
  if (!['pagada', 'pendiente', 'anulada'].includes(sale.status) || !SALE_CHANNELS.includes(sale.channel)) return 'Revisá el estado y el canal de la venta.';
  if (sale.customer.length > 120 || sale.phone.length > 40 || sale.notes.length > 2000) return 'El cliente, teléfono o las notas son demasiado largos.';
  if (!PAYMENT_METHODS.includes(sale.paymentMethod)) return 'Elegí una forma de pago.';
  if (!sale.items.length || sale.items.length > 50) return 'Agregá entre 1 y 50 fragancias.';
  const money = (n: number) => Number.isSafeInteger(n) && n >= 0 && n <= 1e12;
  for (const item of sale.items) {
    if (item.lineId !== undefined && (typeof item.lineId !== 'string' || !item.lineId.trim() || item.lineId.length > 100)) return 'Revisá el identificador de la fragancia.';
    if (!item.code.trim() || !item.name.trim() || item.code.length > 60 || item.name.length > 200) return 'Cada fragancia necesita código y nombre.';
    if (!SALE_SIZES.includes(item.size)) return 'Elegí una presentación válida.';
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 10000) return 'La cantidad debe ser un entero entre 1 y 10.000.';
    if (!money(item.unitPrice) || (item.unitCost !== null && !money(item.unitCost))) return 'Los precios y costos deben ser guaraníes enteros, sin valores negativos.';
  }
  if (![sale.discount, sale.deliveryCharged, sale.deliveryActual, sale.otherCosts, sale.collected].every(money)) return 'Revisá los importes: usá guaraníes enteros, sin valores negativos.';
  const totals = saleTotals(sale);
  if (!Number.isSafeInteger(totals.total) || !Number.isSafeInteger(totals.totalCost)) return 'Los importes superan el máximo permitido.';
  if (sale.discount > totals.subtotal) return 'El descuento no puede superar el importe de las fragancias.';
  if (sale.collected > totals.total) return 'El cobro no puede superar el total de la venta.';
  if (sale.status === 'pagada' && sale.collected !== totals.total) return 'Una venta pagada debe tener el total cobrado.';
  return null;
}

export function orderToSale(order: Order, costs: Record<SaleSize, number>): Sale {
  if (!order.id) throw new Error('El pedido no tiene identificador.');
  const timestamp = order.paidAt || (order.createdAt as { seconds?: number })?.seconds * 1000 || Date.now();
  const items = order.items.map((item) => {
    const ml = Number(item.size.replace(/[^\d]/g, ''));
    const size = `${ml} ML` as SaleSize;
    if (!SALE_SIZES.includes(size)) throw new Error(`Presentación no reconocida: ${item.size}.`);
    return { code: item.code, name: item.name, size, quantity: item.quantity, unitPrice: item.price, unitCost: costs[size] ?? null };
  });
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  return {
    id: `web_${order.id}`, sourceOrderId: order.id, sourceOrderCode: order.orderId,
    date: paraguayDate(timestamp), customer: order.name, phone: order.phone, channel: 'Web',
    paymentMethod: /tarjeta|pagopar/i.test(order.paymentMethod) ? 'Tarjeta' : 'Transferencia',
    status: 'pagada', items, discount: subtotal - order.total,
    deliveryCharged: order.shippingCost || 0, deliveryActual: 0, otherCosts: 0,
    collected: order.total + (order.shippingCost || 0),
    notes: 'Pedido web confirmado. Revisar el costo real del delivery y las comisiones de cobro.',
  };
}

export function csvCell(value: string | number): string {
  let text = String(value);
  // Evitar que nombres y notas se ejecuten como fórmulas al abrir en Sheets/Excel.
  if (typeof value === 'string' && /^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function salesCsv(sales: Sale[]): string {
  const rows: (string | number)[][] = [[
    'Venta', 'Fecha', 'COD', 'Fragancia', 'Cliente', 'ML', 'Cantidad', 'PV', 'Total productos',
    'Descuento venta', 'Delivery cobrado', 'Delivery real', 'Dif delivery', 'Costo UN', 'Total costo producto',
    'Otros costos venta', 'Total venta', 'Cobrado', 'Saldo', 'Ganancia venta', 'Estado', 'Canal', 'Pago', 'Pedido web', 'Notas',
  ]];
  for (const sale of sales) {
    const t = saleTotals(sale);
    sale.items.forEach((item, index) => rows.push([
      sale.id, sale.date, item.code, item.name, sale.customer, item.size.replace(' ML', ''), item.quantity,
      item.unitPrice, item.unitPrice * item.quantity, index ? '' : sale.discount,
      index ? '' : sale.deliveryCharged, index ? '' : sale.deliveryActual, index ? '' : t.deliveryDifference,
      item.unitCost ?? '', item.unitCost == null ? '' : item.unitCost * item.quantity,
      index ? '' : sale.otherCosts, index ? '' : t.total, index ? '' : sale.collected, index ? '' : t.balance,
      index ? '' : (t.profit ?? ''), sale.status, sale.channel, sale.paymentMethod, sale.sourceOrderCode || '', sale.notes,
    ]));
  }
  return '\uFEFF' + rows.map((row) => row.map(csvCell).join(';')).join('\r\n');
}
