/**
 * Cuentas del panel: src/lib/server/adminUsers.ts y POST /api/admin/users.
 * GoTrue se simula en memoria (no hace falta Supabase): se comprueba qué se le pide, qué se le oculta al navegador
 * y que ningún camino deje sin acceso al panel ni deje pasar a quien no es admin.
 */
import assert from 'node:assert/strict';
import test, { afterEach, beforeEach } from 'node:test';
import { SignJWT } from 'jose';
import { loadTs } from './lib/load-ts.mjs';

process.env.SUPABASE_INTERNAL_URL = 'http://gotrue.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key-de-prueba';
process.env.SUPABASE_JWT_SECRET = 'secreto-jwt-de-prueba-0123456789abcdef';
console.info = () => undefined; // el registro de auditoría no ensucia la salida

const users = loadTs('src/lib/server/adminUsers.ts');
const route = loadTs('src/app/api/admin/users/route.ts');

const ME = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const STRANGER = '33333333-3333-4333-8333-333333333333';
const admin = (id, email, extra = {}) => ({ id, email, created_at: '2026-01-01T00:00:00Z', last_sign_in_at: null, app_metadata: { aura_role: 'admin' }, user_metadata: {}, ...extra });

let accounts;
let calls;
let revoked;
const deps = { revokeSessions: async (id) => { revoked.push(id); return 1; } };
const realFetch = globalThis.fetch;

beforeEach(() => {
  calls = [];
  revoked = [];
  accounts = new Map([
    [ME, admin(ME, 'yo@aura.test', { user_metadata: { name: 'Yo' }, last_sign_in_at: '2026-10-20T10:00:00Z' })],
    [OTHER, admin(OTHER, 'otra@aura.test', { user_metadata: { name: 'Otra', must_change_password: true } })],
    [STRANGER, { id: STRANGER, email: 'cliente@aura.test', created_at: '2026-01-01T00:00:00Z', app_metadata: {}, user_metadata: {} }],
  ]);
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key-de-prueba';
  globalThis.fetch = async (url, init = {}) => {
    const u = new URL(url);
    const method = init.method || 'GET';
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ method, path: u.pathname + u.search, body });
    const reply = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
    assert.equal(init.headers.apikey, 'service-key-de-prueba');
    assert.equal(init.headers.Authorization, 'Bearer service-key-de-prueba');
    const match = u.pathname.match(/^\/auth\/v1\/admin\/users(?:\/([^/]+))?$/);
    if (!match) return reply(404, { msg: 'no existe' });
    const id = match[1];
    if (!id && method === 'GET') return reply(200, { users: [...accounts.values()], aud: 'authenticated' });
    if (!id && method === 'POST') {
      if ([...accounts.values()].some((a) => a.email === body.email)) return reply(422, { code: 422, error_code: 'email_exists', msg: 'A user with this email address has already been registered' });
      const created = { id: crypto.randomUUID(), email: body.email, created_at: '2026-10-23T12:00:00Z', last_sign_in_at: null, app_metadata: { ...body.app_metadata, provider: 'email' }, user_metadata: body.user_metadata, password: body.password, email_confirm: body.email_confirm };
      accounts.set(created.id, created);
      return reply(200, created);
    }
    const account = accounts.get(id);
    if (!account) return reply(404, { code: 404, error_code: 'user_not_found', msg: 'User not found' });
    if (method === 'GET') return reply(200, account);
    if (method === 'PUT') {
      if (body.password) account.password = body.password;
      if (body.user_metadata) account.user_metadata = { ...account.user_metadata, ...body.user_metadata };
      return reply(200, account);
    }
    if (method === 'DELETE') { accounts.delete(id); return reply(200, {}); }
    return reply(405, {});
  };
});
afterEach(() => { globalThis.fetch = realFetch; });

const act = (input, actor = { id: ME, email: 'yo@aura.test' }) => users.runUsersAction(actor, input, deps);
const failsWith = (promise, status, text) => assert.rejects(promise, (error) => {
  assert.equal(error.status, status);
  if (text) assert.match(error.message, text);
  return true;
});

// ----------------------------------------------------------------------------------- listar
test('listar: muestra solo las cuentas del panel, ordenadas, sin datos sensibles', async () => {
  const { users: list } = await act({ action: 'list' });
  assert.deepEqual(list.map((u) => u.email), ['otra@aura.test', 'yo@aura.test']);
  assert.deepEqual({ ...list[0] }, { id: OTHER, email: 'otra@aura.test', name: 'Otra', createdAt: '2026-01-01T00:00:00Z', lastSignInAt: null, mustChangePassword: true });
  assert.equal(list[1].mustChangePassword, false);
  assert.ok(!JSON.stringify(list).includes('password'));
});

// ----------------------------------------------------------------------------------- crear
test('crear: genera una contraseña temporal legible, la deja marcada para cambiar y crea la cuenta como admin confirmada', async () => {
  const { user, temporaryPassword } = await act({ action: 'create', email: '  Nueva@Aura.TEST ', name: ' Nueva ' });
  assert.match(temporaryPassword, /^[A-HJ-NP-Za-km-z2-9]{4}(-[A-HJ-NP-Za-km-z2-9]{4}){3}$/);
  assert.equal(user.email, 'nueva@aura.test'); assert.equal(user.name, 'Nueva'); assert.equal(user.mustChangePassword, true);
  const stored = accounts.get(user.id);
  assert.equal(stored.password, temporaryPassword); assert.equal(stored.email_confirm, true);
  assert.equal(stored.app_metadata.aura_role, 'admin'); assert.equal(stored.user_metadata.must_change_password, true);
  assert.ok(!JSON.stringify(user).includes(temporaryPassword));
  assert.ok((await act({ action: 'list' })).users.some((u) => u.id === user.id));
});
test('crear: rechaza correos inválidos o repetidos y nombres kilométricos sin tocar GoTrue', async () => {
  for (const email of ['', 'sin-arroba', 'a@b', ' @x.com', `${'a'.repeat(250)}@x.com`]) await failsWith(act({ action: 'create', email }), 400, /correo/);
  await failsWith(act({ action: 'create', email: 'ok@aura.test', name: 'x'.repeat(81) }), 400, /nombre/);
  assert.equal(calls.filter((c) => c.method === 'POST').length, 0);
  await failsWith(act({ action: 'create', email: 'OTRA@aura.test' }), 409, /Ya existe una cuenta/);
});
test('contraseñas temporales: distintas cada vez y con mayúscula, minúscula y número', () => {
  const seen = new Set(Array.from({ length: 200 }, () => users.generateTemporaryPassword()));
  assert.equal(seen.size, 200);
  for (const p of seen) assert.ok(/[A-Z]/.test(p) && /[a-z]/.test(p) && /\d/.test(p) && p.length === 19);
});

// ----------------------------------------------------------------------------------- contraseña nueva
test('contraseña nueva: cambia la clave, exige elegir otra al entrar y cierra las sesiones abiertas', async () => {
  accounts.get(OTHER).user_metadata = { name: 'Otra' };
  accounts.get(OTHER).password = 'clave-anterior';
  const result = await act({ action: 'reset-password', id: OTHER });
  assert.notEqual(accounts.get(OTHER).password, 'clave-anterior');
  assert.equal(accounts.get(OTHER).password, result.temporaryPassword);
  assert.equal(accounts.get(OTHER).user_metadata.must_change_password, true);
  assert.equal(accounts.get(OTHER).user_metadata.name, 'Otra');
  assert.equal(result.user.mustChangePassword, true); assert.equal(result.sessionsClosed, true);
  assert.deepEqual(revoked, [OTHER]);
});
test('contraseña nueva: si no se pueden cerrar las sesiones igual se cambia la clave y se avisa', async () => {
  const result = await users.runUsersAction({ id: ME }, { action: 'reset-password', id: OTHER }, { revokeSessions: async () => { throw new Error('función ausente'); } });
  assert.equal(result.sessionsClosed, false); assert.equal(accounts.get(OTHER).password, result.temporaryPassword);
});
test('contraseña nueva: no sirve para la propia cuenta, ni para cuentas ajenas al panel o inexistentes', async () => {
  await failsWith(act({ action: 'reset-password', id: ME }), 400, /Mi cuenta/);
  await failsWith(act({ action: 'reset-password', id: STRANGER }), 404);
  await failsWith(act({ action: 'reset-password', id: '44444444-4444-4444-8444-444444444444' }), 404);
  await failsWith(act({ action: 'reset-password', id: '../../x' }), 400);
  await failsWith(act({ action: 'reset-password' }), 400);
  assert.equal(calls.filter((c) => c.method === 'PUT').length, 0); assert.deepEqual(revoked, []);
});

// ----------------------------------------------------------------------------------- quitar acceso
test('quitar: borra la cuenta elegida y nunca la propia ni una que no es del panel', async () => {
  await failsWith(act({ action: 'delete', id: ME }), 400, /propia cuenta/);
  await failsWith(act({ action: 'delete', id: STRANGER }), 404);
  assert.ok(accounts.has(ME) && accounts.has(STRANGER));
  assert.deepEqual({ ...(await act({ action: 'delete', id: OTHER })) }, { deleted: true });
  assert.ok(!accounts.has(OTHER)); assert.ok(accounts.has(ME));
  await failsWith(act({ action: 'delete', id: OTHER }), 404);
});

test('quitar: dos administradores que se borran a la vez no dejan el panel sin acceso', async () => {
  const results = await Promise.allSettled([
    act({ action: 'delete', id: OTHER }, { id: ME }),
    users.runUsersAction({ id: OTHER }, { action: 'delete', id: ME }, deps),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal([...accounts.values()].filter((a) => a.app_metadata.aura_role === 'admin').length, 1);
});

// ----------------------------------------------------------------------------------- quién llama
test('quien llama tiene que seguir siendo admin activo: cuenta borrada, bloqueada o sin rol se rechazan', async () => {
  await failsWith(act({ action: 'list' }, { id: STRANGER }), 403, /ya no tiene acceso/);
  await failsWith(act({ action: 'list' }, { id: '55555555-5555-4555-8555-555555555555' }), 403);
  await failsWith(act({ action: 'list' }, { id: 'no-es-uuid' }), 403);
  accounts.get(ME).banned_until = new Date(Date.now() + 3600_000).toISOString();
  await failsWith(act({ action: 'list' }), 403);
  accounts.get(ME).banned_until = new Date(Date.now() - 3600_000).toISOString();
  assert.equal((await act({ action: 'list' })).users.length, 2);
  await failsWith(act({ action: 'inexistente' }), 404);
});

// ----------------------------------------------------------------------------------- fallas del servicio
test('sin clave de servicio o con GoTrue caído responde con un mensaje claro y sin filtrar detalles', async () => {
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  await failsWith(act({ action: 'list' }), 503, /no está configurada/);
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key-de-prueba';
  const error = console.error; console.error = () => undefined;
  try {
    globalThis.fetch = async () => { throw new Error('connect ECONNREFUSED 10.0.7.7:8000'); };
    await failsWith(act({ action: 'list' }), 502, /No pudimos comunicarnos/);
    globalThis.fetch = async () => new Response('boom', { status: 500 });
    await assert.rejects(act({ action: 'list' }), (e) => e.status === 502 && !/boom/.test(e.message));
  } finally { console.error = error; }
});

// ----------------------------------------------------------------------------------- la ruta
const token = (claims = {}, secret = process.env.SUPABASE_JWT_SECRET) => new SignJWT({ role: 'authenticated', app_metadata: { aura_role: 'admin' }, email: 'yo@aura.test', ...claims })
  .setProtectedHeader({ alg: 'HS256' }).setSubject(ME).setExpirationTime('1h').sign(new TextEncoder().encode(secret));
const post = async (body, bearer, raw) => route.POST(new Request('http://aura.test/api/admin/users', {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) }, body: raw ?? JSON.stringify(body),
}));

test('ruta: sin sesión 401, con sesión de otro rol 403, token falso 401', async () => {
  assert.equal((await post({ action: 'list' })).status, 401);
  assert.equal((await post({ action: 'list' }, await token({ app_metadata: {} }))).status, 403);
  assert.equal((await post({ action: 'list' }, await token({}, 'otro-secreto-distinto-0123456789abcdef'))).status, 401);
  assert.equal(calls.length, 0, 'ni siquiera consulta a GoTrue');
});
test('ruta: un admin lista y crea; las respuestas con contraseñas nunca se guardan en caché', async () => {
  const bearer = await token();
  const listed = await post({ action: 'list' }, bearer);
  assert.equal(listed.status, 200); assert.equal(listed.headers.get('cache-control'), 'no-store');
  assert.equal((await listed.json()).result.users.length, 2);
  const created = await post({ action: 'create', email: 'nuevo@aura.test' }, bearer);
  assert.equal(created.status, 200); assert.equal(created.headers.get('cache-control'), 'no-store');
  assert.match((await created.json()).result.temporaryPassword, /^\S{4}(-\S{4}){3}$/);
});
test('ruta: pide cuerpos válidos y devuelve los errores del servicio con su código', async () => {
  const bearer = await token();
  assert.equal((await post(undefined, bearer, '{no es json')).status, 400);
  assert.equal((await post(undefined, bearer, '[1,2]')).status, 400);
  assert.equal((await post(undefined, bearer, 'null')).status, 400);
  assert.equal((await post({ action: 'create', pad: 'x'.repeat(5000) }, bearer)).status, 413);
  const bad = await post({ action: 'create', email: 'no-es-correo' }, bearer);
  assert.equal(bad.status, 400); assert.match((await bad.json()).error, /correo/);
  assert.equal(bad.headers.get('cache-control'), 'no-store');
  const missing = await post({ action: 'delete', id: ME }, bearer);
  assert.equal(missing.status, 400);
  const error = console.error; console.error = () => undefined;
  try {
    globalThis.fetch = async () => { throw new TypeError('algo inesperado'); };
    const down = await post({ action: 'list' }, bearer);
    assert.equal(down.status, 502);
  } finally { console.error = error; }
});
