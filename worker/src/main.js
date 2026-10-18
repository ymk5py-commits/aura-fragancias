import { closeSync, openSync, utimesSync } from 'node:fs';
import { loadConfig, runtimeConfig, validateConfig } from './config.js';
import { createPool } from './db.js';
import { log } from './log.js';
import { createWorker } from './worker.js';

export const HEARTBEAT = process.env.WORKER_HEARTBEAT_FILE || '/tmp/aura-worker.heartbeat';

function touch(file) {
  try { utimesSync(file, new Date(), new Date()); } catch { try { closeSync(openSync(file, 'w')); } catch { /* sin disco: el healthcheck avisará */ } }
}

const raw = loadConfig();
const problems = validateConfig(raw);
if (problems.length) {
  log.error('configuración inválida; el trabajador no arranca', { problems });
  process.exit(1);
}
const config = runtimeConfig(raw);
const pool = createPool(config.databaseUrl);
const controller = new AbortController();
const worker = createWorker({ pool, config, log, signal: controller.signal });

log.info('trabajador iniciado', {
  enabled: config.enabled, startedAt: config.startedAt || null, dailyLimit: config.dailyLimit,
  pollMs: config.pollIntervalMs, slowMs: config.slowIntervalMs,
  nota: config.enabled ? 'AVISOS ENCENDIDOS' : 'avisos APAGADOS: no consume eventos ni envía nada',
});

const sleep = ms => new Promise(resolve => {
  const timer = setTimeout(resolve, ms);
  controller.signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
});

/** Un carril independiente: una pasarela lenta no frena el envío de pedidos nuevos. */
function lane(name, intervalMs, startDelayMs, job, { beat = false } = {}) {
  return (async () => {
    await sleep(startDelayMs);
    while (!controller.signal.aborted) {
      try {
        await job();
        if (beat) touch(HEARTBEAT);
      } catch (error) {
        log.error(`falló el carril ${name}`, { code: error.code || error.message });
      }
      await sleep(intervalMs);
    }
  })();
}

// Con los avisos apagados el carril solo comprueba que la base responde (sin leer ni escribir datos).
const eventos = () => (config.enabled ? worker.processEvents() : pool.query('SELECT 1'));

const lanes = Promise.all([
  lane('eventos', config.pollIntervalMs, 0, eventos, { beat: true }),
  lane('pagos', config.slowIntervalMs, 10_000, () => worker.verifyCardPayments()),
  lane('conciliacion', config.slowIntervalMs, 20_000, () => worker.reconcileAlerts()),
]);

async function shutdown(signal) {
  if (controller.signal.aborted) return;
  log.info('apagando', { signal });
  controller.abort();
  const timeout = setTimeout(() => { log.warn('cierre forzado'); process.exit(1); }, 30_000);
  await lanes;
  await pool.end().catch(() => {});
  clearTimeout(timeout);
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
