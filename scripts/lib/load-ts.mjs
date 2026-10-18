// Carga módulos TypeScript del proyecto en las pruebas (transpila al vuelo y resuelve imports relativos).
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const nodeRequire = createRequire(import.meta.url);
const cache = new Map();

function resolveRelative(dir, name) {
  for (const candidate of [`${name}.ts`, `${name}.tsx`, path.join(name, 'index.ts'), name]) {
    const full = path.resolve(dir, candidate);
    if (existsSync(full) && /\.tsx?$/.test(full)) return full;
  }
  throw new Error(`No encuentro ${name} desde ${dir}`);
}

export function loadTs(file) {
  const abs = path.resolve(file);
  if (cache.has(abs)) return cache.get(abs).exports;
  const output = ts.transpileModule(readFileSync(abs, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  cache.set(abs, mod);
  const req = (name) => (name.startsWith('.') ? loadTs(resolveRelative(path.dirname(abs), name)) : nodeRequire(name));
  vm.runInThisContext(`(function(exports, require, module) { ${output}\n })`)(mod.exports, req, mod);
  return mod.exports;
}
