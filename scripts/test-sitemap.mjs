import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

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

const seo = load('../src/lib/catalogSeo.ts', { './site': { SITE: 'https://www.aurafragancias.store' }, './img': { cldn: (url) => url } });
function serverData(fetch) {
  return load('../src/lib/serverData.ts', {
    './catalogSeo': seo,
    '../constants': { PERFUMES: [{ code: 'FALLBACK' }], DEFAULT_SETTINGS: {} },
  }, {
    process: { env: { NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'test', NEXT_PUBLIC_FIREBASE_API_KEY: 'test' } },
    fetch,
  });
}

function document(code, gender) {
  return {
    name: `projects/test/databases/(default)/documents/products/${code}`,
    fields: { code: { stringValue: code }, gender: { stringValue: gender } },
  };
}

test('reads every Firestore page, including an empty page with a continuation token', async () => {
  const pages = [
    { documents: [document('CC001', 'Man')], nextPageToken: 'next/+=' },
    { documents: [], nextPageToken: 'last' },
    { documents: [document('DD001', 'Woman'), document('UU001', 'Unisex')] },
  ];
  const tokens = [];
  const api = serverData(async (url, options) => {
    tokens.push(new URL(url).searchParams.get('pageToken'));
    assert.equal(options.next.revalidate, 120);
    return { ok: true, json: async () => pages.shift() };
  });
  const result = await api.getProducts();
  assert.equal(result.source, 'firebase');
  assert.deepEqual(Array.from(result.products, (p) => p.code), ['CC001', 'DD001', 'UU001']);
  assert.deepEqual(tokens, [null, 'next/+=', 'last']);
});

test('does not return a partial catalog when a later page fails', async () => {
  let requests = 0;
  const api = serverData(async () => ++requests === 1
    ? { ok: true, json: async () => ({ documents: [document('CC001', 'Man')], nextPageToken: 'next' }) }
    : { ok: false });
  const result = await api.getProducts();
  assert.equal(result.source, 'local');
  assert.equal(result.products[0].code, 'FALLBACK');
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
    { code: 'DD001' },
  ];
  const sitemap = load('../src/app/sitemap.ts', {
    '../lib/serverData': { getProducts: async () => ({ products }), getSettings: async () => settings },
    '../lib/catalogSeo': seo,
    '../lib/guides': { GUIDES: [{ slug: 'guia', date: '2026-10-04' }] },
    '../lib/img': { cldn: (url) => url },
    '../lib/site': { SITE: 'https://www.aurafragancias.store' },
  });
  const first = await sitemap.default();
  assert.deepEqual(await sitemap.default(), first);
  assert.equal(first.find((p) => p.url.endsWith('/CC001')).lastModified, products[0].updatedAt);
  assert.equal(first.find((p) => p.url.endsWith('/DD001')).lastModified, undefined);
  assert.equal(first.find((p) => p.url.endsWith('/CC001')).images[0], 'https://www.aurafragancias.store/products/CC001.png');
  assert.equal(first.find((p) => p.url.endsWith('/terminos-y-condiciones')).lastModified, undefined);
  settings = { updatedAt: '2026-10-03T12:00:00Z' };
  const changed = await sitemap.default();
  assert.equal(changed.find((p) => p.url.endsWith('/CC001')).lastModified, settings.updatedAt);
  assert.equal(changed.find((p) => p.url.endsWith('/DD001')).lastModified, settings.updatedAt);
});
