import pg from 'pg';

// int8 (bigint) llega como string; los importes y los *_ms de la app son enteros seguros.
// Un valor fuera de rango (p. ej. un `total` absurdo enviado por un visitante) NO debe lanzar: pasa a NaN,
// que alerts.js rechaza como importe inválido, y el pedido simplemente no genera aviso.
function int8(value) {
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : Number.NaN;
}

export function createPool(databaseUrl, extra = {}) {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    application_name: 'aura-whatsapp-worker',
    options: '-c statement_timeout=30000',
    types: { getTypeParser: (oid, format) => (oid === 20 ? int8 : pg.types.getTypeParser(oid, format)) },
    ...extra,
  });
  pool.on('error', error => { process.stdout.write(`${JSON.stringify({ ts: new Date().toISOString(), level: 'warn', msg: 'pool error', code: error.code || error.message })}\n`); });
  return pool;
}
