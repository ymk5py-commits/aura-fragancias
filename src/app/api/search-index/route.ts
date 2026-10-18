import { after } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getProducts } from '../../../lib/serverData';
import { sendIndexNow } from '../../../lib/server/indexNow';
import { AdminAuthError, requireAdmin } from '../../../lib/server/adminAuth';

export const maxDuration = 30;
export async function POST(request: Request) {
  try {
    await requireAdmin(request); // mismo admin del panel; el token lo verifica el servidor, no el cliente
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
  } catch (error) {
    if (error instanceof AdminAuthError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: 'No se pudo procesar el aviso.' }, { status: 503 });
  }
}
