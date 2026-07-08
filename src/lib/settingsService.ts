// Guardado de configuración (solo lo usa /admin). Firestore se importa
// dinámicamente para no entrar en el bundle de la tienda.
import { getFirebaseDb } from './firebase';
import { SiteSettings } from '../types';

const SETTINGS_DOC = { collection: 'settings', id: 'site' };

export async function saveSettings(settings: SiteSettings): Promise<void> {
  const [db, { doc, setDoc, serverTimestamp }] = await Promise.all([
    getFirebaseDb(),
    import('firebase/firestore'),
  ]);
  await setDoc(
    doc(db, SETTINGS_DOC.collection, SETTINGS_DOC.id),
    { ...settings, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
