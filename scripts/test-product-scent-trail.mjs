import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import sharp from 'sharp';

const compiled = ts.transpileModule(readFileSync(new URL('../src/lib/productScentTrail.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
vm.runInNewContext(compiled, { exports });
const { productScentTrail } = exports;

test('each product has a stable visual identity and catalog family controls color', () => {
  const perfume = { code: 'DD161', family: 'FLORAL ORIENTAL', intensity: 4 };
  const first = productScentTrail(perfume);
  assert.equal(first.source, productScentTrail({ ...perfume }).source);
  assert.notEqual(first.source, productScentTrail({ ...perfume, code: 'DD193' }).source);
  for (const [family, palette] of [['CÍTRICO ACUÁTICO', 'fresh'], ['AMADERADO', 'wood'], ['ÁMBAR', 'amber'], ['AROMÁTICO', 'aromatic'], ['OTRO', 'signature']]) {
    assert.equal(productScentTrail({ ...perfume, family }).palette, palette);
  }
  assert.equal(perfume.family, 'FLORAL ORIENTAL');
});

test('freeform catalog text never enters SVG markup and motion speed stays bounded', async () => {
  for (const intensity of [NaN, -100, 0, 1, 5, 500]) {
    const trail = productScentTrail({ code: '"><script>alert(1)</script>', family: 'Floral <image href="https://example.com"/>', intensity });
    const svg = decodeURIComponent(trail.source.split(',')[1]);
    assert.ok(trail.speed >= 0.44 && trail.speed <= 0.71);
    assert.doesNotMatch(svg, /script|https:|<image/);
    const rendered = await sharp(Buffer.from(svg)).png().toBuffer();
    const meta = await sharp(rendered).metadata();
    assert.equal(meta.width, 640);
    assert.equal(meta.height, 960);
    assert.equal(meta.hasAlpha, true);
  }
});
