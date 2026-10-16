import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import sharp from 'sharp';

function load(file, imports = {}) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInThisContext(`(function(exports, require) { ${js}\n })`)(exports, name => { assert.ok(name in imports, name); return imports[name]; });
  return exports;
}
const format = load('../src/lib/labels/formato.ts');
const logo = load('../src/lib/labels/logo-aura.ts');
const labels = load('../src/lib/labels/aura.ts', { './logo-aura': logo, './formato': format });
const { PERFUMES } = load('../src/constants.tsx');
const data = { codigo: 'CC180', nombre: 'ACQUA DI PI PROFONDO', volumenMl: 30 };

test('new bottle labels start upright at 2 cm wide and 4 cm high in all three designs', () => {
  for (const design of labels.DISENOS_AURA) {
    const result = labels.crearSvgEtiquetaAura(data, design.id);
    assert.ok(result.svg, result.error);
    assert.match(result.svg, /width="20mm" height="40mm" viewBox="0 0 200 400"/);
    assert.ok(result.svg.includes(logo.LOGO_AURA_TRAZOS));
    for (const word of ['CC180', 'ACQUA', 'PROFONDO', '30 ML']) assert.ok(result.svg.includes(word));
  }
});

test('orientation swaps the actual paper dimensions and keeps print pages consistent', () => {
  for (const orientation of ['vertical', 'horizontal']) {
    const size = format.orientarEtiqueta({ anchoMm: 20, altoMm: 40 }, orientation);
    assert.deepEqual(size, orientation === 'vertical' ? { anchoMm: 20, altoMm: 40 } : { anchoMm: 40, altoMm: 20 });
    for (const design of labels.DISENOS_AURA) {
      const result = labels.crearSvgEtiquetaAura(data, design.id, undefined, size);
      assert.ok(result.svg, result.error);
      const html = format.crearHtmlImpresionEtiqueta(result.svg, 3, size);
      assert.ok(html.includes(`@page { size: ${size.anchoMm}mm ${size.altoMm}mm; margin: 0; }`));
      assert.equal((html.match(/<div class="page/g) || []).length, 3);
      assert.equal((html.match(/class="page last"/g) || []).length, 1);
      const png = format.dimensionesPngEtiqueta(size);
      assert.deepEqual(png, orientation === 'vertical' ? { ancho: 236, alto: 472 } : { ancho: 472, alto: 236 });
    }
  }
});

test('custom decimal dimensions reach both SVG and paper in either orientation', () => {
  for (const size of [{ anchoMm: 25, altoMm: 45 }, { anchoMm: 55, altoMm: 32.5 }, { anchoMm: 30, altoMm: 30 }]) {
    const result = labels.crearSvgEtiquetaAura(data, 'silencio', undefined, size);
    assert.ok(result.svg, result.error);
    assert.ok(result.svg.includes(`width="${size.anchoMm}mm" height="${size.altoMm}mm"`));
    assert.ok(format.crearHtmlImpresionEtiqueta(result.svg, 1, size).includes(`size: ${size.anchoMm}mm ${size.altoMm}mm`));
  }
});

test('every catalog perfume fits the new stock in both orientations, alignments and all designs', () => {
  for (const product of PERFUMES) for (const design of labels.DISENOS_AURA) {
    for (const size of [{ anchoMm: 20, altoMm: 40 }, { anchoMm: 40, altoMm: 20 }]) for (const alignment of ['centrada', 'izquierda']) {
      const result = labels.crearSvgEtiquetaAura({ codigo: product.code, nombre: product.name, volumenMl: 30 }, design.id, undefined, size, { alineacion: alignment });
      assert.ok(result.svg, `${product.code} / ${design.id} / ${size.anchoMm} × ${size.altoMm}: ${result.error}`);
    }
  }
});

test('the requested modern layout keeps 212 HEROES MEN in at most two lines with discreet secondary details', () => {
  const result = labels.crearSvgEtiquetaAura({ codigo: 'CC007', nombre: '212 HEROES MEN', volumenMl: 30 }, 'silencio');
  assert.ok(result.svg, result.error);
  const lines = [...result.svg.matchAll(/<text data-label-part="name"[^>]*>(.*?)<\/text>/g)];
  assert.ok(lines.length <= 2);
  assert.equal(lines.map(line => line[1]).join(' '), '212 HEROES MEN');
  assert.ok(result.svg.includes('CC007 · 30 ML'));
});

test('the longest published perfume name stays complete on square labels in every design', () => {
  const name = 'VALENTINO DONNA BORN IN ROMA GREEN STRAVAGANZ';
  for (const design of labels.DISENOS_AURA) {
    const result = labels.crearSvgEtiquetaAura({ codigo: 'DD161', nombre: name, volumenMl: 30 }, design.id, undefined, { anchoMm: 40, altoMm: 40 });
    assert.ok(result.svg, `${design.id}: ${result.error}`);
    const lines = [...result.svg.matchAll(/<text data-label-part="name"[^>]*>(.*?)<\/text>/g)];
    assert.equal(lines.map(line => line[1]).join(' '), name);
  }
});

test('empty, corrupt and out-of-range measurements cannot be printed', () => {
  for (const size of [null, {}, { anchoMm: '20', altoMm: 40 }, { anchoMm: NaN, altoMm: 40 }, { anchoMm: 0, altoMm: 40 }, { anchoMm: -20, altoMm: 40 }, { anchoMm: 20, altoMm: Infinity }, { anchoMm: 20, altoMm: 151 }]) {
    assert.ok(format.validarFormatoEtiqueta(size));
    assert.ok(labels.crearSvgEtiquetaAura(data, 'silencio', undefined, size).error);
    assert.throws(() => format.crearHtmlImpresionEtiqueta('<svg/>', 1, size));
  }
  for (const copies of [0, 1.5, 51, NaN]) assert.throws(() => format.crearHtmlImpresionEtiqueta('<svg/>', copies, format.FORMATO_ETIQUETA_INICIAL));
});

test('unprintable text produces a useful error and XML content stays escaped', () => {
  const tooLong = labels.crearSvgEtiquetaAura({ ...data, nombre: 'W'.repeat(120) }, 'silencio');
  assert.ok(tooLong.error);
  assert.equal(tooLong.svg, undefined);
  const escaped = labels.crearSvgEtiquetaAura({ ...data, nombre: 'A & B <C>' }, 'silencio');
  assert.ok(escaped.svg);
  assert.ok(escaped.svg.includes('&amp;'));
  assert.ok(escaped.svg.includes('&lt;C&gt;'));
});

test('PNG files preserve pixels and record the print resolution, replacing previous metadata', async () => {
  for (const existingDensity of [null, 72, 96, 300]) {
    const image = sharp({ create: { width: 236, height: 472, channels: 3, background: '#ffffff' } });
    const original = await (existingDensity ? image.withMetadata({ density: existingDensity }) : image).png().toBuffer();
    const result = await format.pngConResolucionImpresion(new Blob([original]));
    const bytes = Buffer.from(await result.arrayBuffer());
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.width, 236);
    assert.equal(metadata.height, 472);
    assert.equal(metadata.density, 300);
    assert.deepEqual(await sharp(bytes).raw().toBuffer(), await sharp(original).raw().toBuffer());
  }
});
