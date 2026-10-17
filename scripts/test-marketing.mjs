import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, imports, globals = {}) {
  const compiled = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, ...globals, require: name => {
    assert.ok(name in imports, `unexpected import ${name}`); return imports[name];
  } });
  return exports;
}

function runtime(choice = null, options = {}) {
  const listeners = new Map();
  const storage = new Map(choice ? [['aura_consent_v1', choice]] : []);
  const scripts = [];
  const document = {
    title: 'Perfume Äura',
    getElementById: id => scripts.find(s => s.id === id),
    createElement: () => ({}),
    head: { appendChild: element => scripts.push(element) },
  };
  const window = {
    location: { pathname: '/producto/DD161', search: '?size=30', href: 'https://www.aurafragancias.store/producto/DD161?size=30' },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    addEventListener: (name, callback) => { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(callback); },
    removeEventListener: (name, callback) => listeners.get(name)?.delete(callback),
    dispatchEvent: event => { for (const callback of listeners.get(event.type) || []) callback(event); },
  };
  const globals = { window, document, Event: class { constructor(type) { this.type = type; } } };
  const consent = load('../src/lib/marketingConsent.ts', {}, globals);
  const config = { GA4_ID: 'G-TESTONLY', META_PIXEL_ID: 'TESTONLY', GOOGLE_ADS_ID: '', TIKTOK_PIXEL_ID: 'TESTONLY', ...options };
  const marketing = load('../src/lib/marketing.ts', { './marketingConfig': config, './marketingConsent': consent }, globals);
  const pixel = load('../src/lib/pixel.ts', { './marketingConfig': config, './marketing': marketing }, globals);
  const gtag = load('../src/lib/gtag.ts', { './marketing': marketing }, { process: { env: {} } });
  return { window, document, scripts, storage, listeners, consent, marketing, pixel, gtag, globals };
}

const product = { code: 'DD161', name: 'Good Girl Blush', gender: 'Woman' };
const params = { content_ids: ['DD161'], contents: [{ id: 'DD161', quantity: 2, item_price: 70000 }], currency: 'PYG', value: 140000 };

test('unknown or rejected consent loads no advertising SDK and rejection clears queued events', () => {
  const app = runtime();
  app.pixel.trackEvent('ViewContent', params, 'view-1');
  app.marketing.startMarketing();
  assert.equal(app.scripts.length, 0);
  assert.equal(app.window.fbq, undefined);
  app.consent.chooseMarketingConsent(false);
  app.marketing.revokeMarketing();
  app.pixel.trackEvent('AddToCart', params, 'cart-1');
  app.consent.chooseMarketingConsent(true);
  app.marketing.startMarketing();
  app.marketing.flushMarketingEvents();
  assert.equal(app.window.fbq.queue.filter(call => call[0] === 'track').length, 0);
});

test('early product events are delivered once, with the same catalog IDs and amounts on every platform', () => {
  const app = runtime();
  app.pixel.trackEvent('AddToCart', params, 'cart-2');
  app.gtag.gaAddToCart(app.gtag.toItem(product, 70000, '30 ML', 2));
  app.consent.chooseMarketingConsent(true);
  app.marketing.startMarketing();
  app.marketing.trackMarketingPageView();
  app.marketing.flushMarketingEvents();
  app.marketing.startMarketing();
  app.marketing.flushMarketingEvents();
  assert.equal(app.scripts.length, 3);
  const meta = app.window.fbq.queue.filter(call => call[1] === 'AddToCart');
  assert.equal(meta.length, 1);
  assert.equal(meta[0][2].content_ids[0], 'DD161');
  assert.equal(meta[0][3].eventID, 'cart-2');
  const tik = app.window.ttq.filter(call => call[0] === 'track' && call[1] === 'AddToCart');
  assert.equal(tik.length, 1);
  assert.equal(tik[0][2].contents[0].content_id, 'DD161');
  assert.equal(tik[0][2].contents[0].quantity, 2);
  assert.equal(tik[0][2].contents[0].price, 70000);
  assert.equal(tik[0][2].value, 140000);
  assert.equal(tik[0][2].currency, 'PYG');
  assert.equal(tik[0][3].event_id, 'cart-2');
  const ga = app.window.dataLayer.map(call => Array.from(call)).filter(call => call[1] === 'add_to_cart');
  assert.equal(ga.length, 1);
  assert.equal(ga[0][2].send_to, 'G-TESTONLY');
  assert.equal(ga[0][2].items[0].item_id, 'DD161');
  assert.equal(ga[0][2].value, 140000);
});

test('WhatsApp leads remain leads and never manufacture a purchase', () => {
  const app = runtime('granted');
  app.marketing.startMarketing();
  app.pixel.trackEvent('Lead', params, 'lead-1');
  app.gtag.gaGenerateLead([app.gtag.toItem(product, 70000, '30 ML')], 70000, 'ORDER-TEST');
  assert.equal(app.window.ttq.filter(call => call[1] === 'SubmitForm').length, 1);
  assert.equal(app.window.fbq.queue.filter(call => call[1] === 'Purchase').length, 0);
  assert.equal(app.window.ttq.filter(call => call[1] === 'Purchase').length, 0);
  assert.equal(app.window.dataLayer.map(call => Array.from(call)).filter(call => call[1] === 'purchase').length, 0);
});

test('revocation and later acceptance work without duplicate SDKs or initializations', () => {
  const app = runtime('granted');
  app.marketing.startMarketing();
  app.consent.chooseMarketingConsent(false);
  app.marketing.revokeMarketing();
  app.pixel.trackEvent('AddToCart', params);
  app.consent.chooseMarketingConsent(true);
  app.marketing.startMarketing();
  app.pixel.trackEvent('AddToCart', params);
  assert.equal(app.scripts.length, 3);
  assert.equal(app.window.fbq.queue.filter(call => call[0] === 'init').length, 1);
  assert.equal(app.window.fbq.queue.filter(call => call[1] === 'AddToCart').length, 1);
  assert.equal(app.window.fbq.queue.at(-2)[1], 'grant');
});

test('admin visits neither load SDKs nor send storefront events', () => {
  const app = runtime('granted');
  app.window.location.pathname = '/admin';
  app.marketing.startMarketing();
  app.pixel.trackEvent('ViewContent', params);
  app.marketing.trackMarketingPageView();
  assert.equal(app.scripts.length, 0);
});

test('initial page view is not duplicated by React Strict Mode, and client navigation sends another', () => {
  const app = runtime('granted');
  const ref = { current: null };
  let effect;
  const component = load('../src/components/MarketingTags.tsx', {
    react: { useRef: () => ref, useEffect: callback => { effect = callback; } },
    'next/navigation': { usePathname: () => app.window.location.pathname },
    '../lib/marketing': app.marketing,
    '../lib/marketingConsent': app.consent,
  }, app.globals).default;
  component();
  let cleanup = effect(); cleanup(); cleanup = effect();
  assert.equal(app.window.fbq.queue.filter(call => call[1] === 'PageView').length, 1);
  cleanup(); app.window.location.pathname = '/mujeres'; component(); cleanup = effect();
  assert.equal(app.window.fbq.queue.filter(call => call[1] === 'PageView').length, 2);
  cleanup();
});

test('Meta feed matches product codes, uses current artwork and lands on the advertised size', async () => {
  const route = load('../src/app/feed-meta.xml/route.ts', {
    '../../lib/serverData': { getVisibleProducts: async () => [product], getSettings: async () => ({ price10: 30000, price30: 70000, price50: 120000 }) },
    '../../lib/site': { SITE: 'https://www.aurafragancias.store' },
    '../../lib/productCopy': { buildProductDescription: () => 'Perfume' },
    '../../lib/productArtwork': { productArtworkUrl: p => `/api/perfume-art/${p.code}?v=4&notes=peonia` },
    '../../lib/giftCards': { GIFT_CARD_CODE: 'GIFT-CARD', GIFT_CARD_IMAGE: '/editorial/gift-card-aura.webp', GIFT_CARD_MIN: 100000, GIFT_CARD_DAYS: 60 },
  }, { Response, URL });
  const xml = await (await route.GET()).text();
  assert.match(xml, /<g:id>DD161<\/g:id>/);
  assert.match(xml, /https:\/\/www\.aurafragancias\.store\/api\/perfume-art\/DD161\?v=4&amp;notes=peonia/);
  assert.match(xml, /producto\/DD161\?size=10/);
  assert.match(xml, /<g:price>30000 PYG<\/g:price>/);
  assert.match(xml, /<g:id>GIFT-CARD<\/g:id>/);
  assert.match(xml, /<g:price>100000 PYG<\/g:price>/);
});
