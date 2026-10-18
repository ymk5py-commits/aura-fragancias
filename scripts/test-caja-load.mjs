import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const defaults = { '10 ML': 7000, '30 ML': 17000, '50 ML': 25000 };
const defaultRecipe = { alcoholRate: 10 };

function harness() {
  const listeners = [];
  const watch = async (tables, load, callback, onError) => {
    const listener = { path: '', select: '', tables: [...tables], callback, onError, closed: false };
    // Ejecuta la consulta para comprobar que una sola lectura trae ambos campos.
    load({ from: (table) => ({ select: (fields) => {
      listener.select = fields;
      return { eq: (key, id) => {
        assert.equal(key, 'id');
        listener.path = `${table}/${id}`;
        return { maybeSingle: () => Promise.resolve({ data: null, error: null }) };
      } };
    } }) });
    listeners.push(listener);
    return () => { listener.closed = true; };
  };
  const imports = {
    './adminApi': {}, './supabaseMap': {},
    './supabase': { watch },
    './sales': { INITIAL_COSTS: defaults },
    './erp': { INITIAL_RECIPE: defaultRecipe },
  };
  const source = readFileSync(new URL('../src/lib/salesService.ts', import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, require: (name) => {
    assert.ok(name in imports, `Unexpected import ${name}`);
    return imports[name];
  } });
  return { service: exports, listeners };
}

test('Caja reads costs and recipe with a single subscription', async () => {
  const { service, listeners } = harness();
  const results = [];
  const stop = await service.subscribeSaleConfiguration((config) => results.push(config), assert.fail);
  assert.equal(listeners.length, 1);
  assert.equal(listeners[0].path, 'sales_config/costs');
  assert.equal(listeners[0].select, 'costs,recipe');
  assert.deepEqual(listeners[0].tables, ['sales_config']);
  const recipe = { alcoholRate: 25 };
  listeners[0].callback({ costs: { '30 ML': 18000 }, recipe });
  assert.deepEqual({ ...results[0].costs }, { ...defaults, '30 ML': 18000 });
  assert.equal(results[0].recipe, recipe);
  stop();
  assert.equal(listeners[0].closed, true);
});

test('missing configuration keeps the existing default costs and recipe', async () => {
  const { service, listeners } = harness();
  let result;
  await service.subscribeSaleConfiguration((config) => { result = config; }, assert.fail);
  listeners[0].callback(null);
  assert.deepEqual({ ...result.costs }, defaults);
  assert.equal(result.recipe, defaultRecipe);
});

test('live cost updates update both values without opening another listener', async () => {
  const { service, listeners } = harness();
  const results = [];
  await service.subscribeSaleConfiguration((config) => results.push(config), assert.fail);
  listeners[0].callback({ costs: { '50 ML': 26000 }, recipe: { alcoholRate: 11 } });
  listeners[0].callback({ costs: { '50 ML': 28000 }, recipe: { alcoholRate: 12 } });
  assert.equal(listeners.length, 1);
  assert.equal(results.length, 2);
  assert.equal(results[1].costs['50 ML'], 28000);
  assert.equal(results[1].recipe.alcoholRate, 12);
});

test('permission errors reach the panel instead of displaying a default as saved data', async () => {
  const { service, listeners } = harness();
  const errors = [];
  await service.subscribeSaleConfiguration(assert.fail, (error) => errors.push(error));
  const denied = new Error('permission-denied');
  listeners[0].onError(denied);
  assert.deepEqual(errors, [denied]);
});
