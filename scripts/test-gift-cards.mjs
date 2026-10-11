import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function load(file, imports = {}) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInThisContext(`(function(exports, require) { ${js}\n })`)(exports, name => { assert.ok(name in imports, name); return imports[name]; });
  return exports;
}
const gift = load('../src/lib/giftCards.ts');
const logo = load('../src/lib/labels/logo-aura.ts');
const labels = load('../src/lib/labels/aura.ts', { './logo-aura': logo });
const validation = load('../src/lib/validation.ts');
const voucher = load('../src/lib/giftCardVoucher.ts', { './labels/logo-aura': logo, './validation': validation });
let gatewayCalls = [];
class PagoparError extends Error {}
const route = load('../src/app/api/pagopar/iniciar/route.ts', {
  'next/server': { NextResponse: { json: (body, options = {}) => ({ status: options.status || 200, body }) } },
  '../../../../lib/server/pagopar': { PagoparError, documentNumber: value => value.replace(/\D/g, ''), hubCall: async data => { gatewayCalls.push(data); return { hash: 'test-only', url: 'https://example.invalid', numeroPedido: 'test-only' }; } },
  '../../../../lib/server/pricing': { currentPricing: async () => ({ bySize: { '10 ML': 30000, '30 ML': 70000, '50 ML': 120000 }, welcomePercent: 10 }) },
  '../../../../lib/site': { SITE: 'https://aurafragancias.store' },
  '../../../../lib/validation': { MAX_SHIPPING_COST: 500000 },
  '../../../../lib/giftCards': gift,
});
const item = { code: 'GIFT-CARD', name: 'Gift Card Äura', size: 'Digital', price: 150000, quantity: 1 };
const buyer = { orderId: 'AURA-TESTGIFT', name: 'Cliente Prueba', email: 'prueba@example.com', phone: '0981123456', document: '1234567' };
const request = body => ({ json: async () => ({ ...buyer, ...body }) });

test('minimum, integer amounts and 60-day expiry include the exact boundary', () => {
  assert.ok(gift.validateGiftCardAmount(99999)); assert.ok(gift.validateGiftCardAmount(100000.1));
  assert.equal(gift.validateGiftCardAmount(100000), null);
  assert.equal(gift.validateGiftCardAmount(150000), null);
  const activatedAt = Date.parse('2026-10-11T22:00:00Z');
  const card = { status: 'activa', balance: 100000, expiresAt: gift.giftCardExpiry(activatedAt) };
  assert.equal(card.expiresAt, activatedAt + 60 * 86400000);
  assert.equal(gift.validateGiftCardUse(card, 100000, card.expiresAt - 1), null);
  assert.ok(gift.validateGiftCardUse(card, 1, card.expiresAt));
});
test('payment server accepts a custom amount and never discounts gift credit', async () => {
  gatewayCalls = [];
  const result = await route.POST(request({ items: [item], discountPercent: 10 }));
  assert.equal(result.status, 200); assert.equal(result.body.total, 150000);
  assert.equal(gatewayCalls.length, 1); assert.equal(gatewayCalls[0].monto, 150000);
});
test('mixed basket discounts only perfumes and gateway lines sum to the exact charge', async () => {
  gatewayCalls = [];
  const result = await route.POST(request({ items: [{ code: 'A01', size: '30 ML', name: 'Perfume', price: 70000, quantity: 1 }, item], discountPercent: 10, shippingCost: 20000 }));
  assert.equal(result.status, 200); assert.equal(result.body.total, 233000);
  const lines = gatewayCalls[0].items;
  assert.equal(lines.find(i => i.idProducto === 'GIFT-CARD').precioTotal, 150000);
  assert.equal(lines.reduce((sum, i) => sum + i.precioTotal, 0), result.body.total);
});
test('invalid amounts, quantities and digital delivery fail before creating a payment', async () => {
  for (const body of [{ items: [{ ...item, price: 99999 }] }, { items: [{ ...item, price: 100000.5 }] }, { items: [{ ...item, price: 50000001 }] }, { items: [{ ...item, quantity: 1.5 }] }, { items: [{ ...item, quantity: 50 }, item] }, { items: [{ ...item, size: '30 ML' }] }, { items: [item], shippingCost: 20000 }]) {
    gatewayCalls = [];
    const result = await route.POST(request(body));
    assert.notEqual(result.status, 200); assert.equal(gatewayCalls.length, 0);
  }
});
test('the three print designs use the exact current official logo at 40 × 40 mm', () => {
  const original = readFileSync(new URL('../public/brand/aura-wordmark-black.svg', import.meta.url), 'utf8');
  const paths = original.slice(original.indexOf('>') + 1, original.lastIndexOf('</svg>')).trim();
  assert.equal(logo.LOGO_AURA_TRAZOS, paths);
  for (const design of labels.DISENOS_AURA) for (const ml of [10, 30, 50]) {
    const result = labels.crearSvgEtiquetaAura({ codigo: 'CC180', nombre: 'ACQUA DI PI PROFONDO', volumenMl: ml }, design.id);
    assert.ok(result.svg); assert.ok(result.svg.includes('width="40mm" height="40mm"'));
    assert.ok(result.svg.includes(paths)); assert.ok(result.svg.includes('CC180')); assert.ok(result.svg.includes(`${ml} ML`));
  }
});

test('WhatsApp opens a draft for the buyer with the exact code and expiration', () => {
  const card = { customer: 'Luis Pérez', phone: '0981 123 456', recipient: 'Ana', amount: 150000, code: 'MUESTRA-SIN-VALOR', expiresAt: Date.parse('2026-12-10T22:00:00Z') };
  const url = new URL(voucher.giftCardWhatsAppUrl(card));
  assert.equal(url.origin, 'https://wa.me');
  assert.equal(url.pathname, '/595981123456');
  const text = url.searchParams.get('text');
  assert.ok(text.includes('150.000'));
  assert.ok(text.includes('Ana'));
  assert.ok(text.includes(card.code));
  assert.ok(text.includes('PDF'));
  assert.ok(text.includes('10 dic. 2026'));
  assert.equal(voucher.giftCardWhatsAppUrl({ ...card, phone: '+595981123456' }), url.toString());
  assert.equal(voucher.giftCardWhatsAppUrl({ ...card, phone: 'no válido' }), null);
});
