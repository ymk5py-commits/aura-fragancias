import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import sharp from 'sharp';
import { loadArtworkModule } from './artwork-runtime.mjs';

function load(file, imports = {}) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  vm.runInNewContext(outputText, { exports, URLSearchParams, URL, Response, Uint8Array, process: { cwd: () => '' }, console, require: name => { assert.ok(name in imports, name); return imports[name]; } });
  return exports;
}
const catalogNotes = load('../src/lib/catalogNotes.ts');
const art = load('../src/lib/productArtwork.ts', { './catalogNotes': catalogNotes });
const products = [
  { code: 'DD161', notes: ['VAINILLA', 'PEONÍA', 'BERGAMOTA'], imageUrl: 'original.jpg' },
  { code: 'CC165', notes: ['PIMIENTA ROSA', 'PIMIENTA NEGRA', 'TABACO'], imageUrl: 'original.jpg' },
];

test('Google puede rastrear las imágenes públicas; administración y pagos siguen excluidos', () => {
  const robots = load('../src/app/robots.ts', { '../lib/site': { SITE: 'https://www.aurafragancias.store' } }).default();
  assert.ok(robots.rules.allow.includes('/api/perfume-art/'));
  assert.ok(robots.rules.disallow.includes('/admin'));
  assert.ok(robots.rules.disallow.includes('/pago'));
  assert.ok(robots.rules.disallow.includes('/api'));
});

test('las notas controlan la ambientación, incluidas tildes y errores conocidos; pimienta rosa no produce rosas', () => {
  assert.deepEqual(Array.from(art.productBotanicals(products[0].notes)), ['peonia', 'vainilla', 'bergamota']);
  assert.deepEqual(Array.from(art.productBotanicals(products[1].notes)), ['pimienta-rosa', 'pimienta-negra', 'tabaco']);
  assert.deepEqual(Array.from(art.productBotanicals(['BERGAMONTA', 'CARDOMOMO'])), ['bergamota', 'cardamomo']);
  assert.deepEqual(Array.from(art.productBotanicals(['NOTAS MARINAS'])), ['acuatico']);
  assert.ok(art.productBotanicals(['ROSA', 'JAZMÍN', 'LAVANDA', 'VAINILLA']).length <= 3);
});

test('nuevos códigos generan imagen sin alterar la foto de administración; la Gift Card conserva su arte', () => {
  const newProduct = { code: 'UU9999', notes: ['COCO'], imageUrl: '' };
  assert.match(art.productArtworkUrl(newProduct), /\/api\/perfume-art\/UU9999\?v=4&notes=coco$/);
  assert.equal(newProduct.imageUrl, '');
  assert.equal(products[0].imageUrl, 'original.jpg');
  assert.equal(art.productArtworkUrl({ code: 'GIFT-CARD', notes: [], imageUrl: '/gift.jpg' }), '/gift.jpg');
  assert.notEqual(art.productArtworkUrl(products[0]), art.productArtworkUrl({ ...products[0], notes: ['LIMÓN'] }));
});

test('la vista rápida pide transparencia en una URL independiente de las fichas del catálogo', () => {
  const original = art.productArtworkUrl(products[0]);
  const cutout = new URL(art.productArtworkUrl(products[0], 'cutout'), 'https://example.com');
  assert.equal(cutout.searchParams.get('view'), 'cutout');
  assert.equal(cutout.searchParams.get('notes'), new URL(original, 'https://example.com').searchParams.get('notes'));
  assert.equal(art.productArtworkUrl(products[0]), original);
  assert.equal(art.productArtworkUrl({ code: 'GIFT-CARD', notes: [], imageUrl: '/gift.jpg' }, 'cutout'), '/gift.jpg');
});

test('los perfiles que quedaban con un detalle ahora ofrecen tres notas distintas', () => {
  const cases = [
    { code: 'DD094', notes: ['VAINILLA', 'PACHULÍ', 'GROSELLAS NEGRAS'] },
    { code: 'CC180', notes: ['CARDAMOMO', 'TÓFE', 'AMBARWOOD'] },
    { code: 'DD159', notes: ['CREMA BATIDA', 'PRALINE', 'COCO'] },
    { code: 'CC251', notes: ['BERGAMOTA', 'FLOR DEL NARANJO'] },
    { code: 'DD185', notes: ['ORIENTAL  VAINILLA'] },
  ];
  for (const product of cases) {
    const original = JSON.stringify(product);
    const selection = art.productBotanicalSelections(catalogNotes.catalogOlfactoryNotes(product));
    assert.equal(selection.length, 3, product.code);
    assert.equal(new Set(selection.map(item => item.key)).size, 3);
    assert.equal(JSON.stringify(product), original);
  }
  const custom = { code: 'DD185', notes: ['LIMÓN', 'BERGAMOTA', 'MENTA'] };
  assert.equal(catalogNotes.catalogOlfactoryNotes(custom), custom.notes);
});

test('el endpoint rechaza inyección, claves ajenas y composiciones ilimitadas antes de renderizar', async () => {
  const actual = load('../src/lib/server/productArtwork.ts', {
    'node:fs/promises': {}, 'node:path': { default: { join: () => '' } }, sharp: {}, '../productArtwork': art, './labelGlyphs': {},
  });
  const calls = [];
  const route = load('../src/app/api/perfume-art/[code]/route.ts', {
    '../../../../lib/server/productArtwork': {
      parseArtworkNotes: actual.parseArtworkNotes,
      renderProductArtwork: async (code, keys, style) => { calls.push({ code, keys, style }); return new Uint8Array([255, 216, 255]); },
      renderProductCutout: async (code, keys, style) => { calls.push({ code, keys, style, cutout: true }); return new Uint8Array([137, 80, 78, 71]); },
    },
  });
  const request = (code, notes, version = '4', view = '') => route.GET(new Request(`https://example.com/api/perfume-art/x?v=${version}&notes=${encodeURIComponent(notes)}&view=${encodeURIComponent(view)}`), { params: Promise.resolve({ code }) });
  for (const [code, notes, version] of [['<script>', 'rosa', '1'], ['DD161', '../../private', '1'], ['DD161', 'rosa,rosa', '1'], ['DD161', 'rosa,limon,pera,coco', '1'], ['DD161', 'rosa', '99']]) {
    assert.equal((await request(code, notes, version)).status, 400);
  }
  assert.equal(calls.length, 0);
  assert.equal((await request('DD161', 'rosa', '3', '../../private')).status, 400);
  assert.equal(calls.length, 0);
  const response = await request('DD161', 'peonia,vainilla,bergamota');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'image/jpeg');
  assert.match(response.headers.get('Cache-Control'), /immutable/);
  assert.equal(calls[0].code, 'DD161');
  assert.equal(calls[0].style, 'expressive');
  const transparent = await request('DD161', 'peonia,vainilla,bergamota', '4', 'cutout');
  assert.equal(transparent.status, 200);
  assert.equal(transparent.headers.get('Content-Type'), 'image/png');
  assert.equal(calls[1].cutout, true);
  assert.equal(calls[1].style, 'expressive');
  assert.equal((await request('DD161', 'peonia,vainilla,bergamota', '3')).status, 200);
  assert.equal(calls[2].style, 'classic');
});

test('la nueva escena se puede renderizar con todos sus recursos y la vista rápida conserva transparencia', async () => {
  const renderer = loadArtworkModule('src/lib/server/productArtwork.ts');
  const keys = ['peonia', 'vainilla', 'bergamota'];
  const catalog = await renderer.renderProductArtwork('DD161', keys);
  const classic = await renderer.renderProductArtwork('DD161', keys, 'classic');
  assert.notDeepEqual(catalog, classic);
  const jpg = await sharp(catalog).metadata();
  assert.equal(jpg.format, 'jpeg');
  assert.equal(jpg.width, 960);
  assert.equal(jpg.height, 1200);
  const cutout = await renderer.renderProductCutout('DD161', keys);
  const png = await sharp(cutout).metadata();
  assert.equal(png.width, 1000);
  assert.equal(png.height, 820);
  assert.equal(png.hasAlpha, true);
  const { data, info } = await sharp(cutout).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (const [x, y] of [[0, 0], [info.width - 1, 0], [0, info.height - 1], [info.width - 1, info.height - 1]]) {
    assert.equal(data[(y * info.width + x) * info.channels + 3], 0);
  }
});
