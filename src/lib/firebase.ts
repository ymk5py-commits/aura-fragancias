// Firebase con carga 100% lazy: los SDKs (app/auth/firestore/storage) solo se
// descargan cuando alguien llama a un getter — en la práctica, solo en /admin.
// La tienda pública recibe todos sus datos por SSR/ISR y no paga este JS.
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

let appPromise: Promise<FirebaseApp> | null = null;

export function getFirebaseApp(): Promise<FirebaseApp> {
  if (!isFirebaseConfigured) {
    return Promise.reject(new Error('Firebase no está configurado.'));
  }
  if (!appPromise) {
    appPromise = import('firebase/app').then(({ initializeApp, getApps }) => {
      const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
      // Analytics opcional, solo en navegador compatible.
      if (firebaseConfig.measurementId && typeof window !== 'undefined') {
        import('firebase/analytics')
          .then(({ getAnalytics, isSupported }) =>
            isSupported().then((ok) => {
              if (ok) getAnalytics(app);
            })
          )
          .catch(() => {/* analytics no disponible */});
      }
      return app;
    });
  }
  return appPromise;
}

export async function getFirebaseAuth(): Promise<Auth> {
  const [app, { getAuth }] = await Promise.all([getFirebaseApp(), import('firebase/auth')]);
  return getAuth(app);
}

export async function getFirebaseDb(): Promise<Firestore> {
  const [app, { getFirestore }] = await Promise.all([getFirebaseApp(), import('firebase/firestore')]);
  return getFirestore(app);
}

export async function getFirebaseStorage(): Promise<FirebaseStorage> {
  const [app, { getStorage }] = await Promise.all([getFirebaseApp(), import('firebase/storage')]);
  return getStorage(app);
}
