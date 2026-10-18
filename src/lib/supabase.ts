// Supabase con carga 100% lazy (igual que antes con Firebase): el SDK solo se descarga cuando
// alguien lo pide — en la práctica, en /admin y al confirmar una compra, subir un comprobante o
// enviar una reseña. La tienda pública recibe sus datos por SSR/ISR y no paga este JS.
import type { SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

let clientPromise: Promise<SupabaseClient> | null = null;

export function getSupabase(): Promise<SupabaseClient> {
  if (!isSupabaseConfigured) return Promise.reject(new Error('Supabase no está configurado.'));
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(url as string, anonKey as string, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'aura-auth' },
        realtime: { params: { eventsPerSecond: 5 } },
      }),
    );
  }
  return clientPromise;
}

/** Error con nombre y código (como los de Firebase), para las alertas y los mensajes del panel. */
export function toError(error: { message?: string; code?: string; name?: string }, fallback = 'Error de base de datos'): Error {
  const err = new Error(error.message || fallback);
  err.name = error.name && error.name !== 'Error' ? error.name : 'SupabaseError';
  (err as Error & { code?: string }).code = error.code;
  return err;
}

type QueryResult<T> = { data: T | null; error: { message: string; code?: string } | null };

/**
 * Equivalente a onSnapshot: entrega la lista completa al empezar y de nuevo cada vez que cambia
 * alguna de las tablas observadas. Vuelve a consultar (las tablas son chicas y la consulta pasa
 * por la seguridad por fila), así nunca queda un estado a medias si se pierde un evento.
 */
export async function watch<T>(
  tables: string[],
  load: (sb: SupabaseClient) => PromiseLike<QueryResult<T>>,
  callback: (data: T) => void,
  onError?: (error: Error) => void,
): Promise<() => void> {
  const sb = await getSupabase();
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let again = false;

  const refresh = async () => {
    if (closed) return;
    if (running) { again = true; return; }
    running = true;
    try {
      const { data, error } = await load(sb);
      if (closed) return;
      if (error) onError?.(toError(error));
      else callback(data as T);
    } catch (err) {
      if (!closed) onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      running = false;
      if (again && !closed) { again = false; void refresh(); }
    }
  };
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => void refresh(), 150);
  };

  const name = `aura-${tables.join('-')}-${Math.random().toString(36).slice(2, 8)}`;
  let channel = sb.channel(name);
  for (const table of tables) channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, schedule);
  channel.subscribe((status) => {
    // Al (re)conectar se vuelve a leer, por si se perdió algo mientras no había conexión.
    if (status === 'SUBSCRIBED') schedule();
  });
  void refresh();

  return () => {
    closed = true;
    clearTimeout(timer);
    void sb.removeChannel(channel);
  };
}

/** Número aleatorio de 128 bits en hexadecimal (nombres de archivo imposibles de adivinar). */
export function randomHex(bytes = 16): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Identificador de 32 caracteres hex para filas creadas por el navegador (lo exige la política de pedidos). */
export function newRowId(): string {
  return crypto.randomUUID().replace(/-/g, '');
}
