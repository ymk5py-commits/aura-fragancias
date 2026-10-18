// Conexión directa a Postgres (la del Supabase propio) para las transacciones del panel.
// Solo se usa en el servidor: la variable DATABASE_URL nunca llega al navegador.
import { Pool, types, type PoolClient } from 'pg';

// bigint (int8) llega como texto por defecto; los importes de la app son enteros seguros.
types.setTypeParser(20, (value) => Number(value));
// date: se queda como 'AAAA-MM-DD' (sin convertir a Date y desplazar por zona horaria).
types.setTypeParser(1082, (value) => value);

let pool: Pool | undefined;

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error('La base de datos no está configurada.');
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 5, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 8_000 });
  return pool;
}

/** Ejecuta `fn` dentro de una transacción; si algo falla se deshace todo. */
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
