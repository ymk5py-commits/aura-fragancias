import { after } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getProducts } from '../../../lib/serverData';
import { sendIndexNow } from '../../../lib/server/indexNow';

export const maxDuration = 30;
export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token || token.length > 8192) return Response.json({ error: 'Acceso administrativo requerido.' }, { status: 401 });
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!key) return Response.json({ error: 'Servicio no configurado.' }, { status: 503 });
  try {
    // Misma cuenta autenticada del admin; el token lo valida Firebase, no el cliente.
    const auth = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token }),
      cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
    if (!auth.ok) return Response.json({ error: 'Sesión inválida.' }, { status: 401 });
    const account = (await auth.json()).users?.[0];
    if (!account?.localId || account.disabled) return Response.json({ error: 'Sesión inválida.' }, { status: 401 });
    const body = await request.text();
    if (body.length > 500) return Response.json({ error: 'Solicitud inválida.' }, { status: 400 });
    let input: { catalog?: unknown; code?: unknown };
    try { input = JSON.parse(body); } catch { return Response.json({ error: 'Solicitud inválida.' }, { status: 400 }); }
    if (!input || !(input.catalog === true || (typeof input.code === 'string' && /^[a-zA-Z0-9_-]{1,60}$/.test(input.code)))) {
      return Response.json({ error: 'Código inválido.' }, { status: 400 });
    }
    revalidateTag('catalog', { expire: 0 });
    revalidateTag('settings', { expire: 0 });
    revalidatePath('/sitemap.xml');
    revalidatePath('/feed.xml');
    revalidatePath('/feed-meta.xml');
    after(async () => {
      try {
        const codes = input.catalog === true ? (await getProducts()).products.map((p) => p.code) : [input.code as string];
        await sendIndexNow(codes);
      } catch (error) { console.warn('[Äura] Aviso a buscadores pendiente:', error instanceof Error ? error.message : 'Error de conexión'); }
    });
    return Response.json({ accepted: true }, { status: 202 });
  } catch { return Response.json({ error: 'No se pudo procesar el aviso.' }, { status: 503 }); }
}
