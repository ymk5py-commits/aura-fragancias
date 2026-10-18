// Arranca el proceso real (src/main.js) contra un esquema temporal del Postgres de Supabase, con YCloud/Pagopar simulados.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import pg from 'pg';
import test, { after, before } from 'node:test';
import { fileURLToPath } from 'node:url';
import { alertKey, createScratchSchema, insertOrder } from './helpers.mjs';

const adminUrl = process.env.TEST_DATABASE_URL;
if (!adminUrl) throw new Error('Falta TEST_DATABASE_URL (ver LEEME.md, sección Pruebas).');
const here = path.dirname(fileURLToPath(import.meta.url));
const main = path.join(here, '..', 'src', 'main.js');
const healthcheck = path.join(here, '..', 'src', 'healthcheck.js');
let scratch, dir, db;

before(async () => {
  scratch = await createScratchSchema(adminUrl);
  dir = mkdtempSync(path.join(tmpdir(), 'aura-main-'));
  // Conexión con search_path del esquema temporal: nunca escribe en `public`.
  db = new pg.Pool({ connectionString: adminUrl, max: 2, options: `-c search_path=${scratch.schema}` });
});
after(async () => { await db?.end(); await scratch?.drop(); rmSync(dir, { recursive: true, force: true }); });

function start(env) {
  const child = spawn(process.execPath, ['--import', path.join(here, 'fake-network.mjs'), main], {
    env: { ...process.env, DATABASE_URL: scratch.urlFor(adminUrl), WORKER_HEARTBEAT_FILE: path.join(dir, 'beat'), WORKER_POLL_MS: '1000', ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  child.stdout.on('data', d => { out += d; });
  child.stderr.on('data', d => { out += d; });
  const exited = new Promise(resolve => child.on('exit', (code, signal) => resolve({ code, signal })));
  return { child, exited, output: () => out };
}
const until = async (check, ms = 15000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await check()) return true; await new Promise(r => setTimeout(r, 200)); } return false; };
const alertState = async code => (await scratch.admin.query(`SELECT state FROM ${scratch.schema}.whatsapp_alerts WHERE id = $1`, [alertKey(code, 'pedido')])).rows[0]?.state;

test('configuración inválida: el proceso no arranca y explica por qué', async () => {
  const p = start({ WHATSAPP_ALERTS_ENABLED: 'true', WHATSAPP_ALERTS_STARTED_AT: '', YCLOUD_API_KEY: '' });
  const { code } = await p.exited;
  assert.equal(code, 1);
  assert.match(p.output(), /configuración inválida/);
  assert.ok(!p.output().includes('clave-falsa'));
});

test('apagado (por defecto): vive, comprueba la base y NO consume eventos ni envía', async () => {
  await insertOrder(db, 'AURA-MAIN0001', { payment_method: 'Transferencia', pagopar_hash: null });
  const p = start({ WHATSAPP_ALERTS_ENABLED: 'false', WHATSAPP_ALERTS_STARTED_AT: '2026-10-13T23:21:51Z' });
  assert.ok(await until(() => existsSync(path.join(dir, 'beat'))), 'el carril de eventos da señales de vida');
  await new Promise(r => setTimeout(r, 2500));
  p.child.kill('SIGTERM');
  assert.deepEqual(await p.exited, { code: 0, signal: null });
  assert.match(p.output(), /avisos APAGADOS/);
  assert.equal(await alertState('AURA-MAIN0001'), undefined);
  const { rows } = await scratch.admin.query(`SELECT count(*)::int AS n FROM ${scratch.schema}.order_events WHERE order_code = 'AURA-MAIN0001' AND processed_at IS NULL`);
  assert.equal(rows[0].n, 1, 'el evento sigue esperando: apagado no consume nada');
});

test('encendido: procesa el pedido, envía y se apaga limpiamente con SIGTERM; el healthcheck responde', async () => {
  const p = start({ WHATSAPP_ALERTS_ENABLED: 'true', WHATSAPP_ALERTS_STARTED_AT: new Date(Date.now() - 3600_000).toISOString(), YCLOUD_API_KEY: 'clave-falsa' });
  await insertOrder(db, 'AURA-MAIN0002', { payment_method: 'Transferencia', pagopar_hash: null });
  assert.ok(await until(async () => (await alertState('AURA-MAIN0002')) === 'accepted'), `el aviso debe quedar accepted; salida:\n${p.output()}`);
  const env = { ...process.env, WORKER_HEARTBEAT_FILE: path.join(dir, 'beat') };
  assert.equal(spawnSync(process.execPath, [healthcheck], { env }).status, 0, 'sano mientras hay señales de vida');
  p.child.kill('SIGTERM');
  assert.deepEqual(await p.exited, { code: 0, signal: null });
  assert.ok(!p.output().includes('clave-falsa'), 'el registro no contiene la clave');
  // Sin señales de vida recientes el healthcheck falla.
  const old = new Date(Date.now() - 10 * 60_000);
  utimesSync(path.join(dir, 'beat'), old, old);
  assert.equal(spawnSync(process.execPath, [healthcheck], { env }).status, 1);
  writeFileSync(path.join(dir, 'beat'), '');
  rmSync(path.join(dir, 'beat'));
  assert.equal(spawnSync(process.execPath, [healthcheck], { env }).status, 1, 'sin archivo también falla');
});
