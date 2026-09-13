/* ============================================================
   Firestore desde el servidor (rutas /api de Next). SOLO SERVIDOR.

   No usamos firebase-admin: la organización de Google puede bloquear
   las claves de cuenta de servicio, así que entramos con un usuario
   de Firebase Auth dedicado (pagos@…) que las reglas de Firestore
   tratan como usuario autenticado (orders: read/update).

   Flujo:
     1. signInWithPassword → idToken (dura 1 hora)
     2. Llamadas REST a Firestore con ese idToken
     3. Se renueva el token solo cuando vence

   Variables de entorno (Vercel):
     FIREBASE_SERVER_EMAIL, FIREBASE_SERVER_PASSWORD
     NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID
   ============================================================ */

import type { OrderDoc } from './types';

const IDENTITY = 'https://identitytoolkit.googleapis.com/v1';
const SECURE_TOKEN = 'https://securetoken.googleapis.com/v1';
const FIRESTORE = 'https://firestore.googleapis.com/v1';
const ORDERS = 'orders';

interface Session {
  idToken: string;
  refreshToken: string;
  /** Epoch ms en el que conviene renovar (margen de 5 minutos). */
  renewAt: number;
}

let session: Session | null = null;

function apiKey(): string {
  const key = process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
  if (!key) throw new Error('Falta NEXT_PUBLIC_FIREBASE_API_KEY en el entorno del servidor.');
  return key;
}

function projectId(): string {
  const project = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
  if (!project) throw new Error('Falta NEXT_PUBLIC_FIREBASE_PROJECT_ID en el entorno del servidor.');
  return project;
}

async function signIn(): Promise<Session> {
  const email = (process.env.FIREBASE_SERVER_EMAIL || '').trim();
  const password = process.env.FIREBASE_SERVER_PASSWORD || '';
  if (!email || !password) {
    throw new Error('Faltan FIREBASE_SERVER_EMAIL / FIREBASE_SERVER_PASSWORD en el servidor.');
  }

  const res = await fetch(`${IDENTITY}/accounts:signInWithPassword?key=${apiKey()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
    cache: 'no-store',
  });
  const json = (await res.json().catch(() => null)) as {
    idToken?: string;
    refreshToken?: string;
    expiresIn?: string;
    error?: { message?: string };
  } | null;

  if (!res.ok || !json?.idToken || !json?.refreshToken) {
    throw new Error(`No se pudo autenticar el usuario de servicio: ${json?.error?.message || res.status}`);
  }

  const expiresIn = Number(json.expiresIn) || 3600;
  return {
    idToken: json.idToken,
    refreshToken: json.refreshToken,
    renewAt: Date.now() + Math.max(60, expiresIn - 300) * 1000,
  };
}

async function renew(refreshToken: string): Promise<Session> {
  const res = await fetch(`${SECURE_TOKEN}/token?key=${apiKey()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
    cache: 'no-store',
  });
  const json = (await res.json().catch(() => null)) as {
    id_token?: string;
    refresh_token?: string;
    expires_in?: string;
  } | null;

  if (!res.ok || !json?.id_token) return signIn();

  const expiresIn = Number(json.expires_in) || 3600;
  return {
    idToken: json.id_token,
    refreshToken: json.refresh_token || refreshToken,
    renewAt: Date.now() + Math.max(60, expiresIn - 300) * 1000,
  };
}

async function idToken(): Promise<string> {
  if (!session) session = await signIn();
  else if (Date.now() >= session.renewAt) session = await renew(session.refreshToken);
  return session.idToken;
}

/* ---------- codificación de valores de Firestore ---------- */

type FsValue = Record<string, unknown>;

function decodeValue(value: FsValue | undefined | null): unknown {
  if (!value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return value.timestampValue;
  if ('mapValue' in value) {
    const map = value.mapValue as { fields?: Record<string, FsValue> } | undefined;
    return decodeFields(map?.fields || {});
  }
  if ('arrayValue' in value) {
    const arr = value.arrayValue as { values?: FsValue[] } | undefined;
    return (arr?.values || []).map((v) => decodeValue(v));
  }
  return null;
}

function decodeFields(fields: Record<string, FsValue>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) out[key] = decodeValue(value);
  return out;
}

function encodeValue(input: unknown): FsValue {
  if (input === null || input === undefined) return { nullValue: null };
  if (typeof input === 'string') return { stringValue: input };
  if (typeof input === 'boolean') return { booleanValue: input };
  if (typeof input === 'number') {
    return Number.isInteger(input) ? { integerValue: String(input) } : { doubleValue: input };
  }
  if (Array.isArray(input)) return { arrayValue: { values: input.map(encodeValue) } };
  if (typeof input === 'object') {
    return { mapValue: { fields: encodeFields(input as Record<string, unknown>) } };
  }
  return { nullValue: null };
}

function encodeFields(input: Record<string, unknown>): Record<string, FsValue> {
  const out: Record<string, FsValue> = {};
  for (const [key, value] of Object.entries(input)) out[key] = encodeValue(value);
  return out;
}

/* ---------- operaciones sobre pedidos ---------- */

function documentsUrl(path: string): string {
  return `${FIRESTORE}/projects/${projectId()}/databases/(default)/documents${path}`;
}

async function firestoreFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await idToken();
  return fetch(url, {
    ...init,
    cache: 'no-store',
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

interface RawDocument {
  name?: string;
  fields?: Record<string, FsValue>;
}

function toOrder(document: RawDocument): OrderDoc | null {
  if (!document?.name) return null;
  const id = document.name.split('/').pop() || '';
  const data = decodeFields(document.fields || {}) as unknown as OrderDoc;
  return { ...data, id };
}

/** Lee un pedido por el id del documento. Devuelve null si no existe. */
export async function getOrder(id: string): Promise<OrderDoc | null> {
  const res = await firestoreFetch(documentsUrl(`/${ORDERS}/${encodeURIComponent(id)}`));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore respondió ${res.status} al leer el pedido.`);
  return toOrder((await res.json()) as RawDocument);
}

/** Busca un pedido por el hash de Pagopar. Devuelve null si no existe. */
export async function findOrderByHash(hash: string): Promise<OrderDoc | null> {
  const res = await firestoreFetch(documentsUrl(':runQuery'), {
    method: 'POST',
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: ORDERS }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'pagoparHash' },
            op: 'EQUAL',
            value: { stringValue: hash },
          },
        },
        limit: 1,
      },
    }),
  });

  if (!res.ok) throw new Error(`Firestore respondió ${res.status} al buscar el pedido.`);

  const rows = (await res.json()) as Array<{ document?: RawDocument }>;
  const found = rows.find((row) => row.document)?.document;
  return found ? toOrder(found) : null;
}

/** Actualiza campos de un pedido (merge a nivel de campo). */
export async function updateOrder(id: string, patch: Record<string, unknown>): Promise<void> {
  const params = new URLSearchParams();
  for (const key of Object.keys(patch)) params.append('updateMask.fieldPaths', key);

  const res = await firestoreFetch(`${documentsUrl(`/${ORDERS}/${encodeURIComponent(id)}`)}?${params.toString()}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: encodeFields(patch) }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Firestore respondió ${res.status} al actualizar el pedido. ${detail.slice(0, 300)}`);
  }
}
