import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { SiteSettings } from '../types';

const SETTINGS_DOC = { collection: 'settings', id: 'site' };

export async function saveSettings(settings: SiteSettings): Promise<void> {
  if (!db) throw new Error('Firebase no está configurado.');
  await setDoc(
    doc(db, SETTINGS_DOC.collection, SETTINGS_DOC.id),
    { ...settings, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
