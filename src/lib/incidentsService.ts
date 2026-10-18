import { getSupabase, isSupabaseConfigured, toError, watch } from './supabase';
import { camelizeRow, type Row } from './supabaseMap';
import type { Incident, IncidentSource } from '../types';

/* ============================================================
   Alertas: compras que no se pudieron completar.

   Hasta ahora, cuando fallaba guardar el pedido, abrir el pago con
   tarjeta o subir el comprobante, el error quedaba en la consola del
   navegador del cliente y nadie se enteraba. Cada falla se guarda
   ahora en la tabla `incidents` y aparece en /admin → Alertas.

   Äura no tiene usuario de servicio en el navegador, así que escribe
   el visitante: la política de la tabla permite crear (validado) y
   nada más. Avisar nunca puede romper nada: reportIncident no lanza
   ni espera.
   ============================================================ */

const TABLE = 'incidents';
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

/** Nombre y código del error (los de base de datos traen `code`, p. ej. 42501 = permiso denegado). */
export function errorDetail(err: unknown): string | undefined {
  if (!(err instanceof Error) || err.name === 'Error') return undefined;
  const code = (err as { code?: string }).code;
  return [err.name, code].filter(Boolean).join(' ');
}

/** Guarda la alerta sin bloquear la interfaz. Nunca lanza. */
export function reportIncident(report: IncidentReport): void {
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      const sb = await getSupabase();
      const row: Record<string, unknown> = {
        source: clip(report.source, 40),
        message: clip(report.message, MAX.message) || 'Error sin mensaje',
        created_at: Date.now(),
        seen: false,
      };
      const detail = clip(report.detail, MAX.detail);
      if (detail) row.detail = detail;
      const orderId = clip(report.orderId, MAX.short);
      if (orderId) row.order_id = orderId;
      const paymentMethod = clip(report.paymentMethod, 40);
      if (paymentMethod) row.payment_method = paymentMethod;
      const customerName = clip(report.customerName, MAX.short);
      if (customerName) row.customer_name = customerName;
      const customerPhone = clip(report.customerPhone, MAX.phone);
      if (customerPhone) row.customer_phone = customerPhone;
      const total = Math.round(Number(report.total));
      if (Number.isFinite(total) && total >= 0) row.total = total;
      if (typeof location !== 'undefined') row.page = clip(location.pathname, MAX.page);
      if (typeof navigator !== 'undefined') row.user_agent = clip(navigator.userAgent, MAX.userAgent);
      const { error } = await sb.from(TABLE).insert(row);
      if (error) throw toError(error);
    } catch (err) {
      console.warn('[Äura] No se pudo registrar la alerta:', err);
    }
  })();
}

/* ---------- panel ---------- */

function fromRow(row: Row): Incident {
  const data = camelizeRow(row);
  const str = (key: string) => (data[key] ? String(data[key]) : undefined);
  return {
    id: String(row.id),
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
  if (!isSupabaseConfigured) return () => {};
  return watch<Row[]>(
    [TABLE],
    (sb) => sb.from(TABLE).select('*').order('created_at', { ascending: false }).limit(300),
    (rows) => cb(rows.map(fromRow)),
    (err) => {
      console.warn('[Äura] No se pudieron leer las alertas:', err);
      cb([]);
    },
  );
}

export async function setIncidentSeen(id: string, seen: boolean): Promise<void> {
  const sb = await getSupabase();
  const { error } = await sb.from(TABLE).update(seen ? { seen: true, seen_at: Date.now() } : { seen: false, seen_at: null }).eq('id', id);
  if (error) throw toError(error);
}

/** Marca varias de una vez. */
export async function markIncidentsSeen(ids: string[]): Promise<void> {
  const sb = await getSupabase();
  const now = Date.now();
  for (let i = 0; i < ids.length; i += 400) {
    const { error } = await sb.from(TABLE).update({ seen: true, seen_at: now }).in('id', ids.slice(i, i + 400));
    if (error) throw toError(error);
  }
}

export async function deleteIncident(id: string): Promise<void> {
  const sb = await getSupabase();
  const { error } = await sb.from(TABLE).delete().eq('id', id);
  if (error) throw toError(error);
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
