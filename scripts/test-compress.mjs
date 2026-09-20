/**
 * Tests de la compresión de fotos del panel (src/lib/imageCompress.ts).
 *
 * Corre con:
 *   npm run test:compress
 *
 * La parte que usa canvas solo corre en el navegador; acá se prueba la parte
 * pura: a qué tamaño se lleva cada foto y con qué nombre se sube.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fitWithin, jpegName } from '../src/lib/imageCompress.ts';

test('foto del panel (1080x1350) no se agranda ni se achica', () => {
  assert.deepEqual(fitWithin(1080, 1350, 2000), { width: 1080, height: 1350 });
});

test('foto grande se achica por el lado mayor manteniendo proporción', () => {
  assert.deepEqual(fitWithin(4000, 3000, 2000), { width: 2000, height: 1500 });
  assert.deepEqual(fitWithin(3000, 4000, 2000), { width: 1500, height: 2000 });
});

test('foto exactamente en el límite queda igual', () => {
  assert.deepEqual(fitWithin(2000, 1000, 2000), { width: 2000, height: 1000 });
});

test('las medidas salen enteras', () => {
  const { width, height } = fitWithin(3333, 2222, 2000);
  assert.equal(Number.isInteger(width) && Number.isInteger(height), true);
  assert.equal(width, 2000);
  assert.equal(height, 1333);
});

test('el nombre del archivo pasa a .jpg conservando el nombre base', () => {
  assert.equal(jpegName('FOTO_AURA_WEB_(58).png'), 'FOTO_AURA_WEB_(58).jpg');
  assert.equal(jpegName('banner.jpeg'), 'banner.jpg');
  assert.equal(jpegName('sin-extension'), 'sin-extension.jpg');
});
