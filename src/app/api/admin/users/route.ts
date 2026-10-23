/* ============================================================
   POST /api/admin/users
   Cuentas del panel: listar, crear, contraseña nueva y quitar acceso.
   Solo admins; la respuesta lleva contraseñas temporales, por eso nunca se guarda en caché.
   Cuerpo: { action: 'list' | 'create' | 'reset-password' | 'delete', ... }
   ============================================================ */

import { AdminAuthError, requireAdmin } from '../../../../lib/server/adminAuth';
import { AdminUsersError, runUsersAction } from '../../../../lib/server/adminUsers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: NO_STORE });

export async function POST(request: Request) {
  try {
    const actor = await requireAdmin(request);
    const text = await request.text();
    if (text.length > 4096) return json({ error: 'La solicitud es demasiado grande.' }, 413);
    let input: unknown;
    try {
      input = JSON.parse(text);
    } catch {
      return json({ error: 'Solicitud inválida.' }, 400);
    }
    if (!input || typeof input !== 'object' || Array.isArray(input)) return json({ error: 'Solicitud inválida.' }, 400);
    const result = await runUsersAction(actor, input as Record<string, unknown>);
    return json({ ok: true, result });
  } catch (error) {
    if (error instanceof AdminAuthError || error instanceof AdminUsersError) return json({ error: error.message }, error.status);
    console.error('[api/admin/users]', error);
    return json({ error: 'No se pudo completar la operación. Probá de nuevo.' }, 500);
  }
}
