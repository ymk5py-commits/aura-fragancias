import { getFirebaseDb, getFirebaseStorage, isFirebaseConfigured } from './firebase';
import { Order, OrderStatus } from '../types';

const COLLECTION = 'orders';

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

/** Sube el comprobante a Storage y devuelve su URL de descarga. */
export async function uploadReceipt(file: File, orderId: string): Promise<string> {
  const [storage, { ref, uploadBytes, getDownloadURL }] = await Promise.all([
    getFirebaseStorage(),
    import('firebase/storage'),
  ]);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60);
  const path = `comprobantes/${orderId}-${Date.now()}-${safeName}`;
  await uploadBytes(ref(storage, path), file, { contentType: file.type });
  return getDownloadURL(ref(storage, path));
}

/** Guarda el pedido en Firestore. Devuelve el id del documento. */
export async function saveOrder(order: Order): Promise<string> {
  const [db, { collection, addDoc, serverTimestamp }] = await Promise.all([
    getFirebaseDb(),
    import('firebase/firestore'),
  ]);
  const ref = await addDoc(collection(db, COLLECTION), {
    ...order,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Escucha los pedidos en tiempo real (solo /admin). */
export async function subscribeOrders(cb: (orders: Order[]) => void): Promise<() => void> {
  if (!isFirebaseConfigured) return () => {};
  const [db, { collection, onSnapshot, orderBy, query, limit }] = await Promise.all([
    getFirebaseDb(),
    import('firebase/firestore'),
  ]);
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), limit(200));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, 'id'>) }))),
    (err) => {
      console.warn('[Äura] No se pudieron leer los pedidos:', err);
      cb([]);
    }
  );
}

export async function setOrderStatus(id: string, status: OrderStatus): Promise<void> {
  const [db, { doc, updateDoc }] = await Promise.all([getFirebaseDb(), import('firebase/firestore')]);
  await updateDoc(doc(db, COLLECTION, id), { status });
}
