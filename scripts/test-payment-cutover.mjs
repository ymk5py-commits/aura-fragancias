import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function load(file, imports, extra = {}) {
  const output = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, console, ...extra, require: (name) => {
    assert.ok(name in imports, `Unexpected import ${name}`);
    return imports[name];
  } });
  return exports;
}
const imports = {
  'next/server': require('next/server'),
  '../../../../lib/server/pagopar': {},
  '../../../../lib/server/pricing': { currentPricing: () => assert.fail('No debe consultar precios ni crear un pago') },
  '../../../../lib/site': {}, '../../../../lib/giftCards': {}, '../../../../lib/validation': {},
};
const { POST } = load('../src/app/api/pagopar/iniciar/route.ts', imports);

test('a checkout left open before the migration cannot create a payment', async () => {
  const request = new Request('https://www.aurafragancias.store/api/pagopar/iniciar', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: 'AURA-TEST01' }),
  });
  const response = await POST(request);
  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /Recargá la página/);
});

test('the current checkout still validates orders before contacting Pagopar', async () => {
  const response = await POST(new Request('https://www.aurafragancias.store/api/pagopar/iniciar', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Aura-Data-Version': 'supabase-v1' }, body: '{}',
  }));
  assert.equal(response.status, 400);
});

test('the current client sends the data version with the payment request', async () => {
  let sent;
  const payments = load('../src/lib/payments.ts', {}, {
    process: { env: { NEXT_PUBLIC_PAGOPAR_ENABLED: 'true' } },
    fetch: async (url, options) => {
      sent = { url, options };
      return new Response(JSON.stringify({ hash: 'test123', url: 'https://example.test/pago', total: 30000 }));
    },
    Response,
  });
  await payments.startCardPayment({ orderId: 'AURA-TEST01' });
  assert.equal(sent.url, '/api/pagopar/iniciar');
  assert.equal(sent.options.headers['X-Aura-Data-Version'], 'supabase-v1');
});
