import { getFirebaseDb } from './firebase';
import { giftCardExpiry, isGiftCard, normalizeGiftCardDetails, validateGiftCardAmount, validateGiftCardUse, type GiftCard } from './giftCards';
import type { Order } from '../types';

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

export async function subscribeGiftCards(callback: (cards: GiftCard[]) => void, onError: (error: Error) => void) {
  const [db, sdk] = await Promise.all([getFirebaseDb(), import('firebase/firestore')]);
  return sdk.onSnapshot(sdk.query(sdk.collection(db, 'giftCards'), sdk.orderBy('activatedAt', 'desc')), snapshot => callback(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as GiftCard))), onError);
}

/** Canje atómico y trazable; reintentar la misma operación no vuelve a descontar. */
export async function redeemGiftCard(id: string, amount: number, reference: string, operationId: string) {
  if (!reference.trim() || reference.length > 200) throw new Error('Indicá la venta o pedido al que corresponde el canje.');
  const [db, sdk] = await Promise.all([getFirebaseDb(), import('firebase/firestore')]);
  const cardRef = sdk.doc(db, 'giftCards', id);
  const movementRef = sdk.doc(db, 'giftCardRedemptions', operationId);
  const sameOperation = (data: Record<string, unknown>) => data.giftCardId === id && data.amount === amount && data.reference === reference.trim();
  try {
    await sdk.runTransaction(db, async transaction => {
      const [snapshot, previous] = await Promise.all([transaction.get(cardRef), transaction.get(movementRef)]);
      if (previous.exists()) {
        if (!sameOperation(previous.data())) throw new Error('Ese identificador de canje ya fue utilizado.');
        return;
      }
      if (!snapshot.exists()) throw new Error('No encontramos la Gift Card.');
      const card = { ...snapshot.data(), id } as GiftCard;
      const error = validateGiftCardUse(card, amount);
      if (error) throw new Error(error);
      const balance = card.balance - amount;
      transaction.set(movementRef, { giftCardId: id, amount, balanceBefore: card.balance, balanceAfter: balance, reference: reference.trim(), createdAt: sdk.serverTimestamp() });
      transaction.update(cardRef, { balance, status: balance === 0 ? 'agotada' : 'activa', lastRedemptionId: operationId });
    });
  } catch (error) {
    // Dos ventanas pueden confirmar el mismo canje a la vez. Si la operación
    // ya quedó guardada con los mismos datos, devolver su resultado sin repetirla.
    const previous = await sdk.getDoc(movementRef);
    if (previous.exists() && sameOperation(previous.data())) return;
    throw error;
  }
}

export async function subscribeGiftCardUses(id: string, callback: (uses: { id: string; amount: number; reference: string; createdAt?: { seconds: number } }[]) => void, onError: (error: Error) => void) {
  const [db, sdk] = await Promise.all([getFirebaseDb(), import('firebase/firestore')]);
  return sdk.onSnapshot(sdk.query(sdk.collection(db, 'giftCardRedemptions'), sdk.where('giftCardId', '==', id)), snapshot => callback(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as { id: string; amount: number; reference: string }))), onError);
}
