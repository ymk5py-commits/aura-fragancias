import { readFileSync } from 'node:fs';

const TRUE = /^(1|true|yes|si|sí|on)$/i;

/** Lee la configuración del entorno. Nada se imprime ni se registra desde acá. */
export function loadConfig(env = process.env) {
  let apiKey = (env.YCLOUD_API_KEY || '').trim();
  if (!apiKey && env.YCLOUD_API_KEY_FILE) {
    try { apiKey = readFileSync(env.YCLOUD_API_KEY_FILE, 'utf8').trim(); } catch { apiKey = ''; }
  }
  return {
    // Apagado por defecto: mientras la web use Firebase, las funciones de Google son las que envían.
    enabled: TRUE.test(String(env.WHATSAPP_ALERTS_ENABLED ?? '').trim()),
    // Se fija al activar para no enviar avisos por el historial importado o editado.
    startedAt: String(env.WHATSAPP_ALERTS_STARTED_AT ?? '').trim(),
    dailyLimit: String(env.WHATSAPP_ALERTS_DAILY_LIMIT ?? '100').trim(),
    apiKey,
    databaseUrl: String(env.DATABASE_URL ?? '').trim(),
    pollIntervalMs: Number(env.WORKER_POLL_MS || 30_000),
    slowIntervalMs: Number(env.WORKER_SLOW_MS || 5 * 60_000),
  };
}

/** Devuelve la lista de problemas; vacía si la configuración sirve. Ante la duda, el trabajador no arranca. */
export function validateConfig(config) {
  const problems = [];
  if (!config.databaseUrl) problems.push('Falta DATABASE_URL.');
  if (!/^\d+$/.test(config.dailyLimit)) problems.push('WHATSAPP_ALERTS_DAILY_LIMIT debe ser un entero >= 0.');
  if (!(config.pollIntervalMs >= 1000)) problems.push('WORKER_POLL_MS debe ser >= 1000.');
  if (!(config.slowIntervalMs >= 10_000)) problems.push('WORKER_SLOW_MS debe ser >= 10000.');
  if (config.enabled) {
    if (!Number.isFinite(Date.parse(config.startedAt))) problems.push('Con los avisos encendidos hace falta WHATSAPP_ALERTS_STARTED_AT (fecha ISO UTC).');
    if (!config.apiKey) problems.push('Con los avisos encendidos hace falta YCLOUD_API_KEY (o YCLOUD_API_KEY_FILE).');
  }
  return problems;
}

/** Configuración normalizada que usa el núcleo (límite ya numérico). */
export function runtimeConfig(config) {
  return { ...config, dailyLimit: Math.max(0, Number.parseInt(config.dailyLimit, 10) || 0) };
}
