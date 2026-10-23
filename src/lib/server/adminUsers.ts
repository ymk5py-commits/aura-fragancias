// Gestión de las cuentas del panel (crear, contraseña nueva, quitar acceso) con la API de administración de GoTrue.
// Solo corre en el servidor: la clave de servicio (SUPABASE_SERVICE_ROLE_KEY) nunca llega al navegador.
// Una cuenta es del panel cuando su app_metadata tiene aura_role = 'admin' (el usuario no puede editarlo).
import { randomInt } from 'node:crypto';
import { transaction } from './db';

export class AdminUsersError extends Error {
  constructor(message: string, readonly status = 409) {
    super(message);
  }
}

export interface PanelUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastSignInAt: string | null;
  /** Tiene una contraseña temporal: tiene que elegir otra al entrar. */
  mustChangePassword: boolean;
}

interface GoTrueUser {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string | null;
  banned_until?: string | null;
  app_metadata?: { aura_role?: string };
  user_metadata?: { name?: unknown; must_change_password?: unknown } & Record<string, unknown>;
}

export interface UsersDeps {
  /** Cierra las sesiones abiertas de la cuenta; devuelve cuántas cerró. */
  revokeSessions(userId: string): Promise<number>;
}

const defaultDeps: UsersDeps = {
  revokeSessions: (id) => transaction(async (client) => Number((await client.query('select public.aura_revoke_sessions($1::uuid) as closed', [id])).rows[0].closed)),
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mapError(status: number, data: unknown): AdminUsersError {
  const code = (data as { error_code?: string } | null)?.error_code;
  if (code === 'email_exists' || code === 'user_already_exists') return new AdminUsersError('Ya existe una cuenta con ese correo.', 409);
  if (code === 'user_not_found' || status === 404) return new AdminUsersError('La cuenta ya no existe.', 404);
  console.error('[adminUsers] GoTrue respondió', status, data);
  return new AdminUsersError('No se pudo completar la operación con el servicio de cuentas.', 502);
}

async function gotrue<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const base = (process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new AdminUsersError('La gestión de usuarios no está configurada en el servidor.', 503);
  let res: Response;
  try {
    res = await fetch(`${base}/auth/v1${path}`, {
      method,
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });
  } catch (error) {
    console.error('[adminUsers] sin respuesta del servicio de cuentas', error);
    throw new AdminUsersError('No pudimos comunicarnos con el servicio de cuentas. Probá de nuevo.', 502);
  }
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* respuesta sin JSON */ }
  if (!res.ok) throw mapError(res.status, data);
  return data as T;
}

const isPanelUser = (user: GoTrueUser) => user.app_metadata?.aura_role === 'admin';
const isBanned = (user: GoTrueUser) => Boolean(user.banned_until && Date.parse(user.banned_until) > Date.now());

function toPanelUser(user: GoTrueUser): PanelUser {
  const name = user.user_metadata?.name;
  return {
    id: user.id,
    email: user.email ?? '',
    name: typeof name === 'string' ? name : '',
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at ?? null,
    mustChangePassword: user.user_metadata?.must_change_password === true,
  };
}

async function findUser(id: string): Promise<GoTrueUser | null> {
  try {
    return await gotrue<GoTrueUser>(`/admin/users/${id}`);
  } catch (error) {
    if (error instanceof AdminUsersError && error.status === 404) return null;
    throw error;
  }
}

/** Todas las cuentas del panel, ordenadas por correo (hay unas pocas; la API entrega hasta 200). */
export async function listPanelUsers(): Promise<PanelUser[]> {
  const data = await gotrue<{ users: GoTrueUser[] }>('/admin/users?per_page=200');
  return data.users.filter(isPanelUser).map(toPanelUser).sort((a, b) => a.email.localeCompare(b.email));
}

/** Contraseña temporal legible para dictar o pegar: 4 bloques de 4 sin caracteres ambiguos (0/O, 1/l/I). */
export function generateTemporaryPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  for (;;) {
    const blocks = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join(''));
    const password = blocks.join('-');
    if (/[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password)) return password;
  }
}

function audit(actor: { id: string; email?: string }, action: string, target: string) {
  console.info('[admin/users]', JSON.stringify({ action, actor: actor.email ?? actor.id, target }));
}

async function createPanelUser(actor: { id: string; email?: string }, input: Record<string, unknown>) {
  const email = String(input.email ?? '').trim().toLowerCase();
  const name = String(input.name ?? '').trim();
  if (!EMAIL.test(email) || email.length > 254) throw new AdminUsersError('Escribí un correo válido.', 400);
  if (name.length > 80) throw new AdminUsersError('El nombre es demasiado largo (máximo 80 caracteres).', 400);
  const temporaryPassword = generateTemporaryPassword();
  const created = await gotrue<GoTrueUser>('/admin/users', 'POST', {
    email,
    password: temporaryPassword,
    email_confirm: true,
    app_metadata: { aura_role: 'admin' },
    user_metadata: { ...(name ? { name } : {}), must_change_password: true },
  });
  audit(actor, 'create', email);
  return { user: toPanelUser(created), temporaryPassword };
}

async function targetUser(actor: { id: string }, input: Record<string, unknown>, own: string): Promise<GoTrueUser> {
  const id = String(input.id ?? '');
  if (!UUID.test(id)) throw new AdminUsersError('Cuenta inválida.', 400);
  if (id === actor.id) throw new AdminUsersError(own, 400);
  const user = await findUser(id);
  if (!user || !isPanelUser(user)) throw new AdminUsersError('La cuenta ya no existe.', 404);
  return user;
}

async function resetPanelUserPassword(actor: { id: string; email?: string }, input: Record<string, unknown>, deps: UsersDeps) {
  const user = await targetUser(actor, input, 'Para cambiar tu propia contraseña usá «Mi cuenta».');
  const temporaryPassword = generateTemporaryPassword();
  const updated = await gotrue<GoTrueUser>(`/admin/users/${user.id}`, 'PUT', {
    password: temporaryPassword,
    user_metadata: { ...user.user_metadata, must_change_password: true },
  });
  let sessionsClosed = true;
  try {
    await deps.revokeSessions(user.id);
  } catch (error) {
    sessionsClosed = false;
    console.error('[adminUsers] no se pudieron cerrar las sesiones abiertas', error);
  }
  audit(actor, 'reset-password', user.email ?? user.id);
  return { user: toPanelUser(updated), temporaryPassword, sessionsClosed };
}

// La web corre en un solo proceso: una cola en memoria alcanza para que dos «quitar» simultáneos (A borra a B mientras
// B borra a A) no dejen el panel sin ninguna cuenta con acceso.
let deletions: Promise<unknown> = Promise.resolve();
function serialized<T>(task: () => Promise<T>): Promise<T> {
  const run = deletions.then(task, task);
  deletions = run.catch(() => undefined);
  return run;
}

async function deletePanelUser(actor: { id: string; email?: string }, input: Record<string, unknown>) {
  return serialized(async () => {
    const user = await targetUser(actor, input, 'No podés quitar tu propia cuenta.');
    const remaining = (await listPanelUsers()).filter((u) => u.id !== user.id);
    if (!remaining.some((u) => u.id === actor.id)) throw new AdminUsersError('Tu cuenta ya no tiene acceso al panel.', 403);
    await gotrue(`/admin/users/${user.id}`, 'DELETE');
    audit(actor, 'delete', user.email ?? user.id);
    return { deleted: true };
  });
}

/** Punto de entrada de POST /api/admin/users. `actor` es el admin que llama (ya verificado por requireAdmin). */
export async function runUsersAction(actor: { id: string; email?: string }, input: Record<string, unknown>, deps: UsersDeps = defaultDeps) {
  // El token del admin vale hasta que vence: acá se confirma que la cuenta sigue existiendo y activa.
  if (!UUID.test(actor.id)) throw new AdminUsersError('Tu cuenta ya no tiene acceso al panel.', 403);
  const caller = await findUser(actor.id);
  if (!caller || !isPanelUser(caller) || isBanned(caller)) throw new AdminUsersError('Tu cuenta ya no tiene acceso al panel.', 403);
  switch (input.action) {
    case 'list': return { users: await listPanelUsers() };
    case 'create': return createPanelUser(actor, input);
    case 'reset-password': return resetPanelUserPassword(actor, input, deps);
    case 'delete': return deletePanelUser(actor, input);
    default: throw new AdminUsersError('Acción desconocida.', 404);
  }
}
