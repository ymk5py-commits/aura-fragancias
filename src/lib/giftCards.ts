import type { GiftCardDetails, Perfume, OrderItem, Order } from '../types';

export const GIFT_CARD_CODE = 'GIFT-CARD';
export const GIFT_CARD_MIN = 100000;
// El límite coincide con el máximo admitido por la pasarela de pago.
export const GIFT_CARD_MAX = 50000000;
export const GIFT_CARD_DAYS = 60;
export const GIFT_CARD_IMAGE = '/editorial/gift-card-aura.webp';
export const GIFT_CARD_PRODUCT: Perfume = {
  code: GIFT_CARD_CODE, name: 'Gift Card Äura', inspiration: 'Un regalo para elegir',
  family: '', notes: [], intensity: 0, duration: '', gender: 'Unisex', category: 'Daily',
  imageUrl: GIFT_CARD_IMAGE,
};

export function isGiftCard(item: { code?: string; perfume?: { code: string } }): boolean {
  return (item.code ?? item.perfume?.code) === GIFT_CARD_CODE;
}

export function validateGiftCardAmount(amount: number): string | null {
  if (!Number.isSafeInteger(amount) || amount < GIFT_CARD_MIN) return 'El importe mínimo de la Gift Card es Gs. 100.000. Usá guaraníes enteros.';
  if (amount > GIFT_CARD_MAX) return 'El importe máximo por Gift Card es Gs. 50.000.000.';
  return null;
}

export function normalizeGiftCardDetails(value?: Partial<GiftCardDetails>): GiftCardDetails {
  return { recipient: String(value?.recipient ?? '').trim().slice(0, 80), sender: String(value?.sender ?? '').trim().slice(0, 80), message: String(value?.message ?? '').trim().slice(0, 300) };
}

export function giftCardExpiry(activatedAt: number): number {
  return activatedAt + GIFT_CARD_DAYS * 24 * 60 * 60 * 1000;
}

export interface GiftCard extends GiftCardDetails {
  id: string;
  code: string;
  orderId: string;
  orderCode: string;
  customer: string;
  phone: string;
  amount: number;
  balance: number;
  activatedAt: number;
  expiresAt: number;
  status: 'activa' | 'agotada' | 'anulada';
}

export function giftCardState(card: GiftCard, now = Date.now()): string {
  if (card.status === 'anulada') return 'Anulada';
  if (now >= card.expiresAt) return 'Vencida';
  return card.balance === 0 ? 'Agotada' : 'Activa';
}

export function validateGiftCardUse(card: GiftCard, amount: number, now = Date.now()): string | null {
  if (giftCardState(card, now) !== 'Activa') return 'La Gift Card está vencida, anulada o sin saldo.';
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > card.balance) return 'El canje debe ser mayor a cero y no puede superar el saldo disponible.';
  return null;
}

/** El mismo cálculo se utiliza al confirmar: una Gift Card nunca recibe descuentos. */
export function orderAmounts(items: OrderItem[], percent: number) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const merchandise = items.filter(item => !isGiftCard(item)).reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = Math.round(merchandise * percent / 100);
  return { subtotal, merchandise, discountAmount, total: subtotal - discountAmount };
}

/* ---------- emisión (lo usa la transacción del servidor al confirmar un pedido) ---------- */

export function giftCardEntries(order: Order) {
  const entries: { id: string; lineIndex: number; copyIndex: number; amount: number }[] = [];
  order.items.forEach((item, lineIndex) => {
    if (!isGiftCard(item)) return;
    const error = validateGiftCardAmount(item.price);
    if (error) throw new Error(error);
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) throw new Error('Cantidad de Gift Cards inválida.');
    for (let copyIndex = 0; copyIndex < item.quantity; copyIndex++) entries.push({ id: `${order.id}_${lineIndex}_${copyIndex}`, lineIndex, copyIndex, amount: item.price });
  });
  if (entries.length > 50) throw new Error('El máximo por pedido es de 50 Gift Cards.');
  return entries;
}

export function newGiftCard(order: Order, entry: ReturnType<typeof giftCardEntries>[number], activatedAt: number): Omit<GiftCard, 'id'> & { lineIndex: number; copyIndex: number } {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const code = `AURA-${Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  return { ...normalizeGiftCardDetails(order.items[entry.lineIndex].giftCard), code, orderId: order.id!, orderCode: order.orderId,
    customer: order.name, phone: order.phone, amount: entry.amount, balance: entry.amount,
    activatedAt, expiresAt: giftCardExpiry(activatedAt), status: 'activa', lineIndex: entry.lineIndex, copyIndex: entry.copyIndex };
}
