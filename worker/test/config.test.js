import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadConfig, runtimeConfig, validateConfig } from '../src/config.js';

const base = { DATABASE_URL: 'postgres://u:p@host:5432/postgres' };

test('por defecto los avisos están APAGADOS y la configuración es válida sin clave ni fecha', () => {
  const config = loadConfig(base);
  assert.equal(config.enabled, false);
  assert.equal(config.dailyLimit, '100');
  assert.deepEqual(validateConfig(config), []);
  for (const value of ['', 'false', '0', 'no', 'apagado']) assert.equal(loadConfig({ ...base, WHATSAPP_ALERTS_ENABLED: value }).enabled, false);
  for (const value of ['true', 'TRUE', '1', 'si', 'on']) assert.equal(loadConfig({ ...base, WHATSAPP_ALERTS_ENABLED: value }).enabled, true);
});

test('encendido exige fecha de activación válida y clave de YCloud; si no, no arranca', () => {
  const on = { ...base, WHATSAPP_ALERTS_ENABLED: 'true' };
  assert.equal(validateConfig(loadConfig(on)).length, 2);
  assert.equal(validateConfig(loadConfig({ ...on, YCLOUD_API_KEY: 'k', WHATSAPP_ALERTS_STARTED_AT: 'no-es-fecha' })).length, 1);
  assert.deepEqual(validateConfig(loadConfig({ ...on, YCLOUD_API_KEY: 'k', WHATSAPP_ALERTS_STARTED_AT: '2026-10-13T23:21:51Z' })), []);
});

test('sin DATABASE_URL o con un tope diario inválido no arranca', () => {
  assert.ok(validateConfig(loadConfig({})).some(p => p.includes('DATABASE_URL')));
  for (const limit of ['abc', '-1', '1.5']) assert.ok(validateConfig(loadConfig({ ...base, WHATSAPP_ALERTS_DAILY_LIMIT: limit })).some(p => p.includes('DAILY_LIMIT')));
  assert.equal(runtimeConfig(loadConfig({ ...base, WHATSAPP_ALERTS_DAILY_LIMIT: '0' })).dailyLimit, 0);
  assert.equal(runtimeConfig(loadConfig({ ...base, WHATSAPP_ALERTS_DAILY_LIMIT: '100' })).dailyLimit, 100);
});

test('la clave puede venir de un archivo (secreto montado) sin quedar en el entorno', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'aura-key-'));
  const file = path.join(dir, 'ycloud');
  writeFileSync(file, 'clave-de-prueba\n');
  assert.equal(loadConfig({ ...base, YCLOUD_API_KEY_FILE: file }).apiKey, 'clave-de-prueba');
  assert.equal(loadConfig({ ...base, YCLOUD_API_KEY_FILE: path.join(dir, 'no-existe') }).apiKey, '');
  assert.equal(loadConfig({ ...base, YCLOUD_API_KEY: 'directa', YCLOUD_API_KEY_FILE: file }).apiKey, 'directa');
});
