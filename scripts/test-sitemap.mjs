import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { resolveSitemap } from 'next/dist/build/webpack/loaders/metadata/resolve-route-data.js';

function load(file, imports, globals = {}) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, URL, URLSearchParams,
    require: (name) => {
      assert.ok(name in imports, `Unexpected import: ${name}`);
      return imports[name];
    },
    ...globals,
  });
  return exports;
}

const catalogNotes = load('../src/lib/catalogNotes.ts', {});
const artwork = load('../src/lib/productArtwork.ts', { './catalogNotes': catalogNotes });
const seo = load('../src/lib/catalogSeo.ts', { './site': { SITE: 'https://www.aurafragancias.store' }, './img': { cldn: (url) => url }, './productArtwork': artwork, './catalogNotes': catalogNotes });
const supabaseMap = load('../src/lib/supabaseMap.ts', {});
function serverData(fetch) {
  return load('../src/lib/serverData.ts', {
    './catalogSeo': seo,
    './supabaseMap': supabaseMap,
    '../constants': { PERFUMES: [{ code: 'FALLBACK' }], DEFAULT_SETTINGS: {} },
  }, {
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://db.example.test', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key' } },
    fetch,
  });
}

function row(code, gender) {
  return { id: code, code, gender, notes: [], image_url: '', visible: true };
}

test('reads the catalog from PostgREST with the public key and a 2 minute cache', async () => {
  const calls = [];
  const api = serverData(async (url, options) => {
    calls.push({ url: String(url), options });
    return { ok: true, json: async () => [row('CC001', 'Man'), row('DD001', 'Woman'), row('UU001', 'Unisex')] };
  });
  const result = await api.getProducts();
  assert.equal(result.source, 'remote');
  assert.deepEqual(Array.from(result.products, (p) => p.code), ['CC001', 'DD001', 'UU001']);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].url.startsWith('https://db.example.test/rest/v1/products?'));
  assert.equal(calls[0].options.next.revalidate, 120);
  assert.equal(calls[0].options.headers.apikey, 'anon-key');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer anon-key');
});

test('maps snake_case columns to the product fields the storefront uses', async () => {
  const api = serverData(async () => ({ ok: true, json: async () => [{ ...row('CC001', 'Man'), image_url: '/products/CC001.png', sales_score: 7, updated_at: '2026-09-20T12:00:00+00:00' }] }));
  const [product] = (await api.getProducts()).products;
  assert.equal(product.imageUrl, '/products/CC001.png');
  assert.equal(product.salesScore, 7);
  assert.equal(product.updatedAt, '2026-09-20T12:00:00+00:00');
});

test('falls back to the bundled catalog when the request fails or the table is empty', async () => {
  const failing = serverData(async () => ({ ok: false }));
  const failed = await failing.getProducts();
  assert.equal(failed.source, 'local');
  assert.equal(failed.products[0].code, 'FALLBACK');
  const empty = serverData(async () => ({ ok: true, json: async () => [] }));
  assert.equal((await empty.getProducts()).source, 'local');
});

test('sitemap refreshes all genders and removes hidden or deleted products', async () => {
  let products = [
    { code: 'CC001', gender: 'Man' },
    { code: 'DD001', gender: 'Woman' },
    { code: 'UU001', gender: 'Unisex' },
    { code: 'HIDDEN', visible: false },
  ];
  const sitemap = load('../src/app/sitemap.ts', {
    '../lib/serverData': { getProducts: async () => ({ products }), getSettings: async () => ({}) },
    '../lib/catalogSeo': seo,
    '../lib/productArtwork': artwork,
    '../lib/guides': { GUIDES: [] },
    '../lib/img': { cldn: (url) => url },
    '../lib/site': { SITE: 'https://www.aurafragancias.store' },
  });
  assert.equal(sitemap.revalidate, 120);
  const codes = async () => Array.from(await sitemap.default(), (entry) => entry.url)
    .filter((url) => url.includes('/producto/')).map((url) => url.split('/').pop());
  assert.deepEqual(await codes(), ['CC001', 'DD001', 'UU001']);
  products = [products[0], { ...products[1], visible: false }, { code: 'DD002', gender: 'Woman' }];
  assert.deepEqual(await codes(), ['CC001', 'DD002']);
});

test('sitemap keeps real modification dates stable and omits unknown dates', async () => {
  let settings = {};
  const products = [
    { code: 'CC001', updatedAt: '2026-09-20T12:00:00Z', imageUrl: '/products/CC001.png' },
    { code: 'DD001', imageUrl: 'https://db.aurafragancias.store/storage/v1/object/public/products/example.png?a=1&b=2' },
  ];
  const sitemap = load('../src/app/sitemap.ts', {
    '../lib/serverData': { getProducts: async () => ({ products }), getSettings: async () => settings },
    '../lib/catalogSeo': seo,
    '../lib/productArtwork': artwork,
    '../lib/guides': { GUIDES: [{ slug: 'guia', date: '2026-10-04' }] },
    '../lib/img': { cldn: (url) => url },
    '../lib/site': { SITE: 'https://www.aurafragancias.store' },
  });
  const first = await sitemap.default();
  assert.deepEqual(await sitemap.default(), first);
  assert.equal(first.find((p) => p.url.endsWith('/CC001')).lastModified, products[0].updatedAt);
  assert.equal(first.find((p) => p.url.endsWith('/DD001')).lastModified, undefined);
  assert.equal(first.find((p) => p.url.endsWith('/CC001')).images[0], 'https://www.aurafragancias.store/api/perfume-art/CC001?v=4&amp;notes=');
  const xml = resolveSitemap(first);
  assert.ok(xml.includes('<image:loc>https://www.aurafragancias.store/api/perfume-art/DD001?v=4&amp;notes=</image:loc>'));
  assert.equal(xml.includes('alt=media&token='), false);
  assert.equal(xml.includes('&amp;amp;'), false);
  assert.equal(first.find((p) => p.url.endsWith('/terminos-y-condiciones')).lastModified, undefined);
  settings = { updatedAt: '2026-10-03T12:00:00Z' };
  const changed = await sitemap.default();
  assert.equal(changed.find((p) => p.url.endsWith('/CC001')).lastModified, settings.updatedAt);
  assert.equal(changed.find((p) => p.url.endsWith('/DD001')).lastModified, settings.updatedAt);
});
