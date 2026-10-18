// HEALTHCHECK del contenedor: el carril de eventos debe haber dado señales de vida hace menos de 5 minutos.
import { statSync } from 'node:fs';

const file = process.env.WORKER_HEARTBEAT_FILE || '/tmp/aura-worker.heartbeat';
try {
  const age = Date.now() - statSync(file).mtimeMs;
  process.exit(age < 5 * 60_000 ? 0 : 1);
} catch {
  process.exit(1);
}
