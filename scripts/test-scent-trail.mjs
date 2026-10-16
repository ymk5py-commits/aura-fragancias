// Lifecycle checks without a GPU. Visual rendering is verified in the browser.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const compiled = ts.transpileModule(
  readFileSync(new URL('../src/components/ScentTrail.tsx', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } },
).outputText;

class Events {
  listeners = new Map();
  addEventListener(name, fn) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(fn);
  }
  removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); }
  emit(name) { for (const fn of this.listeners.get(name) || []) fn(); }
  get count() { return [...this.listeners.values()].reduce((n, set) => n + set.size, 0); }
}

function mount({ reduced = false, saveData = false, memory = 8, mobile = false, unsupported = false, imageError = false, props } = {}) {
  const stage = Object.assign(new Events(), {
    clientWidth: 352, clientHeight: 316, children: [],
    appendChild(canvas) { this.children.push(canvas); },
  });
  const document = Object.assign(new Events(), {
    hidden: false,
    createElement() { return { setAttribute() {}, remove() { stage.children = stage.children.filter(c => c !== this); } }; },
  });
  const motion = Object.assign(new Events(), { matches: reduced });
  const connection = Object.assign(new Events(), { saveData });
  const engines = [];
  const timers = new Set();
  const refs = [{ current: {} }, { current: stage }, { current: null }];
  const states = [];
  let effect, cleanup, intersection, size, refIndex, stateIndex, tree, attempts = 0;
  const jsx = (type, props) => ({ type, props });
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, document,
    window: { matchMedia: query => query.includes('reduced-motion') ? motion : { matches: mobile } },
    navigator: { connection, deviceMemory: memory },
    Image: class {
      set src(value) { this.source = value; queueMicrotask(() => imageError ? this.onerror?.() : this.onload?.()); }
    },
    IntersectionObserver: class {
      constructor(callback) { intersection = this; this.callback = callback; }
      observe() {}
      disconnect() { this.disconnected = true; }
    },
    ResizeObserver: class {
      constructor() { size = this; }
      observe() {}
      disconnect() { this.disconnected = true; }
    },
    setTimeout(fn) { timers.add(fn); return fn; },
    clearTimeout(fn) { timers.delete(fn); },
    require(name) {
      if (name === 'react') return {
        useRef: () => refs[refIndex++],
        useState(initial) {
          const i = stateIndex++;
          if (!(i in states)) states[i] = initial;
          return [states[i], value => { states[i] = value; }];
        },
        useEffect(fn) { effect ??= fn; },
      };
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'lucide-react') return {};
      if (name.endsWith('.css')) return { default: {} };
      if (name.endsWith('scent-trail-engine')) return { LiquidEngine: class {
        constructor(canvas, options, fail) {
          attempts++;
          if (unsupported) throw new Error('WebGL unavailable');
          Object.assign(this, { canvas, options, fail, visible: false, pointers: [] });
          engines.push(this);
        }
        setVisible(value) { this.visible = value; }
        setImage() { this.onFirstFrame?.(); }
        resize(...args) { this.size = args; }
        pointer(...args) { this.pointers.push(args); }
        destroy() { this.destroyed = true; this.visible = false; }
      } };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  function render() { refIndex = stateIndex = 0; tree = exports.default(props); return tree; }
  render();
  cleanup = effect();
  const buttons = () => tree.props.children[1]?.props.children || [];
  return {
    engines, stage, document, motion, connection, timers, render, buttons,
    get attempts() { return attempts; },
    get ready() { return render().props['data-animated']; },
    async intersect(visible) { intersection.callback([{ isIntersecting: visible }]); await new Promise(setImmediate); render(); },
    unmount() { cleanup(); assert.ok(intersection.disconnected && size.disconnected); },
  };
}

test('no GPU is loaded offscreen or with motion/data-saving restrictions', async () => {
  for (const options of [{}, { reduced: true }, { saveData: true }, { memory: 2 }]) {
    const app = mount(options);
    assert.equal(app.attempts, 0);
    if (Object.keys(options).length) await app.intersect(true);
    assert.equal(app.attempts, 0);
    assert.equal(app.ready, false);
    assert.equal(app.stage.children.length, 0);
    app.unmount();
  }
});

test('product trails use their own artwork and animate gently on mobile', async () => {
  const source = 'data:image/svg+xml,test-product';
  const app = mount({ mobile: true, props: { source, variant: 'product', speed: 0.51 } });
  await app.intersect(true);
  const engine = app.engines[0];
  assert.equal(app.ready, true);
  assert.equal(engine.options.ambient, true);
  assert.equal(engine.options.ambientIntensity, 0.15);
  assert.equal(engine.options.speed, 0.51);
  assert.equal(app.render().props.children[0].props.children.props.src, source);
  app.unmount();
});

test('visibility, pause and cleanup stop the engine and pending touch releases', async () => {
  const app = mount({ mobile: true });
  await app.intersect(true);
  const engine = app.engines[0];
  assert.equal(app.ready, true);
  assert.equal(engine.visible, true);
  assert.equal(engine.options.lowPower, true);
  assert.equal(engine.options.ambient, false);
  app.document.hidden = true;
  app.document.emit('visibilitychange');
  assert.equal(engine.visible, false);
  await app.intersect(false);
  app.document.hidden = false;
  app.document.emit('visibilitychange');
  assert.equal(engine.visible, false, 'returning to the tab must not animate an offscreen canvas');
  await app.intersect(true);
  app.buttons()[1].props.onClick();
  app.render();
  assert.equal(engine.visible, false);
  assert.equal(app.buttons()[0].props.disabled, true);
  app.document.emit('visibilitychange');
  assert.equal(engine.visible, false, 'visibility changes must respect the manual pause');
  app.buttons()[1].props.onClick();
  app.render();
  app.buttons()[0].props.onClick();
  assert.equal(engine.visible, true);
  assert.equal(engine.pointers[0][0], 'down');
  assert.equal(app.timers.size, 1);
  app.unmount();
  assert.equal(engine.destroyed, true);
  assert.equal(app.timers.size, 0);
  assert.equal(app.stage.children.length, 0);
  assert.equal(app.stage.count + app.motion.count + app.connection.count + app.document.count, 0);
});

test('preference changes release the GPU and can restore the effect', async () => {
  const app = mount();
  await app.intersect(true);
  app.motion.matches = true;
  app.motion.emit('change');
  assert.equal(app.engines[0].destroyed, true);
  assert.equal(app.ready, false);
  assert.equal(app.stage.children.length, 0);
  app.motion.matches = false;
  app.motion.emit('change');
  await new Promise(setImmediate);
  assert.equal(app.ready, true);
  assert.equal(app.engines.length, 2);
  app.unmount();
});

test('unsupported GPUs, image failures and lost contexts retain the static fallback', async () => {
  for (const options of [{ unsupported: true }, { imageError: true }, {}]) {
    const app = mount(options);
    await app.intersect(true);
    if (!Object.keys(options).length) app.engines[0].fail();
    assert.equal(app.ready, false);
    assert.equal(app.stage.children.length, 0);
    await app.intersect(false);
    await app.intersect(true);
    assert.equal(app.attempts, 1, 'a failed GPU must not enter a retry loop');
    app.unmount();
  }
});
