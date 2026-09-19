import { getFirebaseDb, isFirebaseConfigured } from './firebase';
import type { Incident, IncidentSource } from '../types';

/* ============================================================
   Alertas: compras que no se pudieron completar.

   Hasta ahora, cuando fallaba guardar el pedido, abrir el pago con
   tarjeta o subir el comprobante, el error quedaba en la consola del
   navegador del cliente y nadie se enteraba. Cada falla se guarda
   ahora en la colección `incidents` y aparece en /admin → Alertas.

   Äura no tiene usuario de servicio en Firebase, así que escribe el
   navegador: las reglas permiten crear (validado) y nada más. Avisar
   nunca puede romper nada: reportIncident no lanza ni espera.
   ============================================================ */

const COLLECTION = 'incidents';
const MAX = { message: 500, detail: 2000, short: 120, phone: 40, page: 200, userAgent: 300 };

export interface IncidentReport {
  source: IncidentSource;
  message: string;
  detail?: string;
  orderId?: string;
  paymentMethod?: string;
  total?: number;
  customerName?: string;
  customerPhone?: string;
}

function clip(value: unknown, max: number): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Texto corto de cualquier error, para el mensaje de la alerta. */
export function errorText(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === 'string' && err) return err;
  return fallback;
}

/** Nombre y código del error (FirebaseError trae `code`, p. ej. permission-denied). */
export function errorDetail(err: unknown): string | undefined {
  if (!(err instanceof Error) || err.name === 'Error') return undefined;
  const code = (err as { code?: string }).code;
  return [err.name, code].filter(Boolean).join(' ');
}

/** Guarda la alerta sin bloquear la interfaz. Nunca lanza. */
export function reportIncident(report: IncidentReport): void {
  if (!isFirebaseConfigured) return;
  void (async () => {
    try {
      const [db, { collection, addDoc }] = await Promise.all([getFirebaseDb(), import('firebase/firestore')]);
      const doc: Record<string, unknown> = {
        source: clip(report.source, 40),
        message: clip(report.message, MAX.message) || 'Error sin mensaje',
        createdAt: Date.now(),
        seen: false,
      };
      const detail = clip(report.detail, MAX.detail);
      if (detail) doc.detail = detail;
      const orderId = clip(report.orderId, MAX.short);
      if (orderId) doc.orderId = orderId;
      const paymentMethod = clip(report.paymentMethod, 40);
      if (paymentMethod) doc.paymentMethod = paymentMethod;
      const customerName = clip(report.customerName, MAX.short);
      if (customerName) doc.customerName = customerName;
      const customerPhone = clip(report.customerPhone, MAX.phone);
      if (customerPhone) doc.customerPhone = customerPhone;
      const total = Math.round(Number(report.total));
      if (Number.isFinite(total) && total >= 0) doc.total = total;
      if (typeof location !== 'undefined') doc.page = clip(location.pathname, MAX.page);
      if (typeof navigator !== 'undefined') doc.userAgent = clip(navigator.userAgent, MAX.userAgent);
      await addDoc(collection(db, COLLECTION), doc);
    } catch (err) {
      console.warn('[Äura] No se pudo registrar la alerta:', err);
    }
  })();
}

/* ---------- panel ---------- */

function fromDoc(id: string, data: Record<string, unknown>): Incident {
  const str = (key: string) => (data[key] ? String(data[key]) : undefined);
  return {
    id,
    source: (String(data.source || 'pedido-no-guardado') as IncidentSource),
    message: String(data.message || ''),
    detail: str('detail'),
    orderId: str('orderId'),
    paymentMethod: str('paymentMethod'),
    total: typeof data.total === 'number' ? data.total : undefined,
    customerName: str('customerName'),
    customerPhone: str('customerPhone'),
    page: str('page'),
    userAgent: str('userAgent'),
    createdAt: Number(data.createdAt) || 0,
    seen: data.seen === true,
    seenAt: typeof data.seenAt === 'number' ? data.seenAt : undefined,
  };
}

/** Escucha las alertas en tiempo real (solo /admin), más recientes primero. */
export async function subscribeIncidents(cb: (incidents: Incident[]) => void): Promise<() => void> {
  if (!isFirebaseConfigured) return () => {};
  const [db, { collection, onSnapshot, orderBy, query, limit }] = await Promise.all([
    getFirebaseDb(),
    import('firebase/firestore'),
  ]);
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), limit(300));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => fromDoc(d.id, d.data() as Record<string, unknown>))),
    (err) => {
      console.warn('[Äura] No se pudieron leer las alertas:', err);
      cb([]);
    }
  );
}

export async function setIncidentSeen(id: string, seen: boolean): Promise<void> {
  const [db, { doc, updateDoc, deleteField }] = await Promise.all([getFirebaseDb(), import('firebase/firestore')]);
  await updateDoc(doc(db, COLLECTION, id), seen ? { seen: true, seenAt: Date.now() } : { seen: false, seenAt: deleteField() });
}

/** Marca varias de una vez (Firestore admite hasta 500 escrituras por lote). */
export async function markIncidentsSeen(ids: string[]): Promise<void> {
  const [db, { doc, writeBatch }] = await Promise.all([getFirebaseDb(), import('firebase/firestore')]);
  const now = Date.now();
  for (let i = 0; i < ids.length; i += 400) {
    const batch = writeBatch(db);
    ids.slice(i, i + 400).forEach((id) => batch.update(doc(db, COLLECTION, id), { seen: true, seenAt: now }));
    await batch.commit();
  }
}

export async function deleteIncident(id: string): Promise<void> {
  const [db, { doc, deleteDoc }] = await Promise.all([getFirebaseDb(), import('firebase/firestore')]);
  await deleteDoc(doc(db, COLLECTION, id));
}

/* ---------- etiquetas ---------- */

export const INCIDENT_LABELS: Record<IncidentSource, string> = {
  'pedido-no-guardado': 'No se guardó el pedido',
  'pago-tarjeta': 'No abrió el pago con tarjeta',
  comprobante: 'No se subió el comprobante',
  'verificacion-pago': 'No se pudo verificar el pago',
};

/** Resumen legible del navegador/dispositivo a partir del user agent. */
export function deviceLabel(userAgent?: string): string {
  if (!userAgent) return '';
  const ua = userAgent;
  const os = /iPhone|iPad/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : '';
  const browser = /Instagram/.test(ua) ? 'Instagram' : /FBAN|FBAV/.test(ua) ? 'Facebook' : /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : '';
  return [browser, os].filter(Boolean).join(' · ');
}
