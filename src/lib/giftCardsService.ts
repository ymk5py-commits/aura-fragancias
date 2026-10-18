import { adminCall } from './adminApi';
import { watch } from './supabase';
import { giftCardFromRow, secondsOf, type Row } from './supabaseMap';
import type { GiftCard } from './giftCards';

// La lógica de emisión vive en giftCards.ts (la usa la transacción del servidor); se re-exporta
// aquí para no cambiar los imports existentes.
export { giftCardEntries, newGiftCard } from './giftCards';

export async function subscribeGiftCards(callback: (cards: GiftCard[]) => void, onError: (error: Error) => void) {
  return watch<Row[]>(
    ['gift_cards'],
    (sb) => sb.from('gift_cards').select('*').order('activated_at', { ascending: false }),
    (rows) => callback(rows.map(giftCardFromRow)),
    onError,
  );
}

/** Canje atómico y trazable; reintentar la misma operación no vuelve a descontar. */
export async function redeemGiftCard(id: string, amount: number, reference: string, operationId: string) {
  if (!reference.trim() || reference.length > 200) throw new Error('Indicá la venta o pedido al que corresponde el canje.');
  await adminCall('redeem-gift-card', { id, amount, reference, operationId });
}

export async function subscribeGiftCardUses(id: string, callback: (uses: { id: string; amount: number; reference: string; createdAt?: { seconds: number } }[]) => void, onError: (error: Error) => void) {
  return watch<Row[]>(
    ['gift_card_redemptions'],
    (sb) => sb.from('gift_card_redemptions').select('*').eq('gift_card_id', id),
    (rows) => callback(rows.map((r) => ({ id: String(r.id), amount: Number(r.amount), reference: String(r.reference), createdAt: secondsOf(r.created_at) }))),
    onError,
  );
}
