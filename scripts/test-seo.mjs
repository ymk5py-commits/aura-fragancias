import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, imports, globals = {}) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  vm.runInNewContext(outputText, { exports, URL, Response, Request, AbortSignal, process: { env: { NEXT_PUBLIC_FIREBASE_API_KEY: 'test' } }, console, require: (name) => { assert.ok(name in imports, name); return imports[name]; }, ...globals });
  return exports;
}
const SITE = 'https://www.aurafragancias.store';
const seo = load('../src/lib/catalogSeo.ts', { './site': { SITE }, './img': { cldn: (url) => url } });
const perfume = { code: 'DD192', name: 'La Bomba', inspiration: 'Carolina Herrera', family: 'Floral', notes: ['Jazmín'], gender: 'Woman' };

test('cada variante mantiene tamaño, precio, URL e identificador del catálogo; no promete delivery gratis universal', () => {
  const group = seo.productGroup({ ...perfume, imageUrl: '/products/DD192.png' }, { price10: 30000, price30: 70000, price50: 120000 }, 'Descripción');
  assert.equal(group['@type'], 'ProductGroup');
  assert.equal(group.image, `${SITE}/products/DD192.png`);
  for (const [i, size] of ['10', '30', '50'].entries()) {
    const variant = group.hasVariant[i];
    assert.equal(variant.sku, `DD192-${size}`);
    assert.equal(variant.size, `${size} ML`);
    assert.equal(variant.offers.url, `${SITE}/producto/DD192?size=${size}`);
    assert.equal(variant.offers.price, [30000, 70000, 120000][i]);
    assert.equal('shippingDetails' in variant.offers, false);
    assert.equal(seo.sizeKey(size), size);
  }
  assert.equal(seo.sizeKey('99'), '30');
  assert.equal(seo.sizeKey(['10', '50']), '30');
});
test('el buscador encuentra notas, códigos e inspiraciones sin depender de tildes y excluye ocultos', () => {
  const products = [perfume, { ...perfume, code: 'HIDDEN', visible: false }];
  assert.equal(seo.searchCatalog(products, 'jazmin').length, 1);
  assert.equal(seo.searchCatalog(products, 'carolina floral')[0].code, 'DD192');
  assert.equal(seo.searchCatalog(products, 'dd192')[0].name, 'La Bomba');
  assert.equal(seo.searchCatalog(products, '<script>').length, 0);
  assert.equal(seo.searchCatalog(products, ' ').length, 0);
});
test('fechas reales estables, sin inventar fechas para productos antiguos', () => {
  assert.equal(seo.latestUpdate(undefined, 'malformada'), undefined);
  assert.equal(seo.latestUpdate('2026-09-01', '2026-10-04T23:00:00Z'), '2026-10-04T23:00:00Z');
  const corrected = seo.cleanCatalogProduct({ ...perfume, inspiration: 'GIOGIO ARMANI', family: 'ORIENTAL ESPACIADO' });
  assert.equal(corrected.inspiration, 'GIORGIO ARMANI');
  assert.equal(corrected.family, 'ORIENTAL ESPECIADO');
  assert.equal(corrected.code, perfume.code);
});
test('el aviso automático solo usa URLs del dominio y sus variantes', () => {
  const mod = load('../src/lib/server/indexNow.ts', { '../site': { SITE }, '../catalogSeo': seo });
  const urls = mod.indexUrls(['DD192', 'DD192']);
  assert.equal(urls.filter((url) => url.includes('/producto/')).length, 4);
  assert.ok(urls.every((url) => new URL(url).origin === SITE));
});
test('el endpoint rechaza sesiones inválidas y códigos externos antes de avisar', async () => {
  const scheduled = []; const notified = []; const refreshed = [];
  const route = load('../src/app/api/search-index/route.ts', {
    'next/server': { after: (fn) => scheduled.push(fn) },
    'next/cache': { revalidateTag: (tag) => refreshed.push(tag), revalidatePath: () => {} },
    '../../../lib/serverData': { getProducts: async () => ({ products: [perfume] }) },
    '../../../lib/server/indexNow': { sendIndexNow: async (codes) => notified.push(Array.from(codes)) },
  }, { fetch: async (_, options) => JSON.parse(options.body).idToken === 'valid-admin' ? { ok: true, json: async () => ({ users: [{ localId: 'other-admin' }] }) } : { ok: false } });
  const request = (data, token) => new Request(`${SITE}/api/search-index`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: JSON.stringify(data) });
  assert.equal((await route.POST(request({ code: 'DD192' }))).status, 401);
  assert.equal((await route.POST(request({ code: 'DD192' }, 'forged'))).status, 401);
  assert.equal((await route.POST(request({ code: 'https://other.com' }, 'valid-admin'))).status, 400);
  assert.equal((await route.POST(request(null, 'valid-admin'))).status, 400);
  assert.equal((await route.POST(new Request(`${SITE}/api/search-index`, { method: 'POST', headers: { Authorization: 'Bearer valid-admin' }, body: '{' }))).status, 400);
  assert.equal(scheduled.length, 0);
  assert.equal((await route.POST(request({ code: 'DD192' }, 'valid-admin'))).status, 202);
  assert.ok(refreshed.includes('catalog'));
  await scheduled.pop()();
  assert.deepEqual(notified, [['DD192']]);
  assert.equal((await route.POST(request({ catalog: true }, 'valid-admin'))).status, 202);
  await scheduled.pop()();
  assert.deepEqual(notified[1], ['DD192']);
});
