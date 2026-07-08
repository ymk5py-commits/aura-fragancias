// CRUD de productos (solo lo usa /admin). Los SDKs de Firestore/Storage se
// importan dinámicamente para no entrar en el bundle de la tienda.
import { getFirebaseDb, getFirebaseStorage } from './firebase';
import { PERFUMES, SALES_BY_CODE } from '../constants';
import { Perfume } from '../types';

const COLLECTION = 'products';

/** Crea o reemplaza un producto. Usa el `code` como id del documento. */
export async function saveProduct(p: Perfume): Promise<void> {
  const [db, { doc, setDoc, serverTimestamp }] = await Promise.all([
    getFirebaseDb(),
    import('firebase/firestore'),
  ]);
  const id = (p.id || p.code).trim();
  const data: Record<string, unknown> = {
    code: p.code.trim(),
    name: p.name.trim(),
    inspiration: p.inspiration.trim(),
    family: p.family.trim(),
    notes: p.notes,
    intensity: Number(p.intensity) || 1,
    duration: p.duration.trim(),
    gender: p.gender,
    category: p.category,
    imageUrl: p.imageUrl || '',
    visible: p.visible !== false,
    salesScore: Number(p.salesScore) || 0,
    description: (p.description || '').trim(),
    updatedAt: serverTimestamp(),
  };
  if (p.badge) data.badge = p.badge;
  await setDoc(doc(db, COLLECTION, id), data, { merge: true });
}

export async function updateProductFields(id: string, fields: Partial<Perfume>): Promise<void> {
  const [db, { doc, updateDoc, serverTimestamp }] = await Promise.all([
    getFirebaseDb(),
    import('firebase/firestore'),
  ]);
  await updateDoc(doc(db, COLLECTION, id), { ...fields, updatedAt: serverTimestamp() });
}

export async function deleteProduct(id: string): Promise<void> {
  const [db, { doc, deleteDoc }] = await Promise.all([getFirebaseDb(), import('firebase/firestore')]);
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function toggleVisible(id: string, visible: boolean): Promise<void> {
  await updateProductFields(id, { visible });
}

/** Sube una imagen a Storage y devuelve su URL pública. */
export async function uploadProductImage(file: File, code: string): Promise<string> {
  const [storage, { ref, uploadBytes, getDownloadURL }] = await Promise.all([
    getFirebaseStorage(),
    import('firebase/storage'),
  ]);
  const safeCode = (code || 'producto').replace(/[^a-zA-Z0-9_-]/g, '');
  const path = `products/${safeCode}-${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

/** Importa el catálogo incluido a Firestore si está vacío. */
export async function seedCatalog(): Promise<number> {
  const [db, { collection, getDocs }] = await Promise.all([
    getFirebaseDb(),
    import('firebase/firestore'),
  ]);
  const existing = await getDocs(collection(db, COLLECTION));
  if (!existing.empty) {
    throw new Error('Ya hay productos cargados en Firebase. La importación solo corre cuando está vacío.');
  }
  let count = 0;
  for (const p of PERFUMES) {
    await saveProduct({ ...p, visible: true, salesScore: SALES_BY_CODE[p.code] || 0 });
    count++;
  }
  return count;
}
