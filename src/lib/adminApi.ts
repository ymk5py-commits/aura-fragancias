// Llamadas del panel a /api/admin/*: las operaciones que antes eran transacciones de Firestore
// ahora las ejecuta el servidor. Se manda el token de sesión del admin; el servidor lo verifica.
import { getSupabase } from './supabase';

export async function adminCall<T = unknown>(operation: string, input: Record<string, unknown>): Promise<T> {
  const sb = await getSupabase();
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Tu sesión venció. Volvé a iniciar sesión.');
  const res = await fetch(`/api/admin/${operation}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const body = (await res.json().catch(() => null)) as { ok?: boolean; result?: T; error?: string } | null;
  if (!res.ok || !body?.ok) throw new Error(body?.error || 'No se pudo completar la operación.');
  return body.result as T;
}
