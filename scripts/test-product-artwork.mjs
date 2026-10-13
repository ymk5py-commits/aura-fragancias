import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, imports = {}) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  vm.runInNewContext(outputText, { exports, URLSearchParams, URL, Response, Uint8Array, process: { cwd: () => '' }, console, require: name => { assert.ok(name in imports, name); return imports[name]; } });
  return exports;
}
const art = load('../src/lib/productArtwork.ts');
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
  assert.deepEqual(Array.from(art.productBotanicals(products[1].notes)), ['pimienta-rosa']);
  assert.deepEqual(Array.from(art.productBotanicals(['BERGAMONTA', 'CARDOMOMO'])), ['bergamota', 'cardamomo']);
  assert.deepEqual(Array.from(art.productBotanicals(['NOTAS MARINAS'])), []);
  assert.ok(art.productBotanicals(['ROSA', 'JAZMÍN', 'LAVANDA', 'VAINILLA']).length <= 3);
});

test('nuevos códigos generan imagen sin alterar la foto de administración; la Gift Card conserva su arte', () => {
  const newProduct = { code: 'UU9999', notes: ['COCO'], imageUrl: '' };
  assert.match(art.productArtworkUrl(newProduct), /\/api\/perfume-art\/UU9999\?v=2&notes=coco$/);
  assert.equal(newProduct.imageUrl, '');
  assert.equal(products[0].imageUrl, 'original.jpg');
  assert.equal(art.productArtworkUrl({ code: 'GIFT-CARD', notes: [], imageUrl: '/gift.jpg' }), '/gift.jpg');
  assert.notEqual(art.productArtworkUrl(products[0]), art.productArtworkUrl({ ...products[0], notes: ['LIMÓN'] }));
});

test('el endpoint rechaza inyección, claves ajenas y composiciones ilimitadas antes de renderizar', async () => {
  const actual = load('../src/lib/server/productArtwork.ts', {
    'node:fs/promises': {}, 'node:path': { default: { join: () => '' } }, sharp: {}, '../productArtwork': art, './labelGlyphs': {},
  });
  const calls = [];
  const route = load('../src/app/api/perfume-art/[code]/route.ts', {
    '../../../../lib/server/productArtwork': {
      parseArtworkNotes: actual.parseArtworkNotes,
      renderProductArtwork: async (code, keys) => { calls.push({ code, keys }); return new Uint8Array([255, 216, 255]); },
    },
  });
  const request = (code, notes, version = '2') => route.GET(new Request(`https://example.com/api/perfume-art/x?v=${version}&notes=${encodeURIComponent(notes)}`), { params: Promise.resolve({ code }) });
  for (const [code, notes, version] of [['<script>', 'rosa', '1'], ['DD161', '../../private', '1'], ['DD161', 'rosa,rosa', '1'], ['DD161', 'rosa,limon,pera,coco', '1'], ['DD161', 'rosa', '99']]) {
    assert.equal((await request(code, notes, version)).status, 400);
  }
  assert.equal(calls.length, 0);
  const response = await request('DD161', 'peonia,vainilla,bergamota');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'image/jpeg');
  assert.match(response.headers.get('Cache-Control'), /immutable/);
  assert.equal(calls[0].code, 'DD161');
});
