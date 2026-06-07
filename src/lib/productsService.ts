import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { PERFUMES, SALES_BY_CODE } from '../constants';
import { Perfume } from '../types';

const COLLECTION = 'products';

function assertDb() {
  if (!db) throw new Error('Firebase no está configurado.');
  return db;
}

/** Crea o reemplaza un producto. Usa el `code` como id del documento. */
export async function saveProduct(p: Perfume): Promise<void> {
  const database = assertDb();
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
    updatedAt: serverTimestamp(),
  };
  if (p.badge) data.badge = p.badge;
  await setDoc(doc(database, COLLECTION, id), data, { merge: true });
}

export async function updateProductFields(id: string, fields: Partial<Perfume>): Promise<void> {
  const database = assertDb();
  await updateDoc(doc(database, COLLECTION, id), { ...fields, updatedAt: serverTimestamp() });
}

export async function deleteProduct(id: string): Promise<void> {
  const database = assertDb();
  await deleteDoc(doc(database, COLLECTION, id));
}

export async function toggleVisible(id: string, visible: boolean): Promise<void> {
  await updateProductFields(id, { visible });
}

/** Sube una imagen a Storage y devuelve su URL pública. */
export async function uploadProductImage(file: File, code: string): Promise<string> {
  if (!storage) throw new Error('Firebase Storage no está configurado.');
  const safeCode = (code || 'producto').replace(/[^a-zA-Z0-9_-]/g, '');
  const path = `products/${safeCode}-${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

/** Importa el catálogo incluido (47 productos) a Firestore si está vacío. */
export async function seedCatalog(): Promise<number> {
  const database = assertDb();
  const existing = await getDocs(collection(database, COLLECTION));
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
