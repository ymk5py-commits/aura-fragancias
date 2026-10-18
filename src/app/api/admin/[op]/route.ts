/* ============================================================
   POST /api/admin/<operación>
   Operaciones del panel que necesitan una transacción (confirmar pedido,
   canjear Gift Card, guardar venta/gasto, importar historial). Solo admins
   de Supabase: se verifica el token y el rol en el servidor.
   ============================================================ */

import type { PoolClient } from 'pg';
import { ADMIN_OPERATIONS, type AdminOperation } from '../../../../lib/server/adminOps';
import { AdminAuthError, requireAdmin } from '../../../../lib/server/adminAuth';
import { transaction } from '../../../../lib/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_BODY = 4 * 1024 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ op: string }> }) {
  const { op } = await params;
  const run = (ADMIN_OPERATIONS as Record<string, (client: PoolClient, input: never) => Promise<unknown>>)[op];
  if (!Object.hasOwn(ADMIN_OPERATIONS, op) || !run) return Response.json({ error: 'Operación desconocida.' }, { status: 404 });
  try {
    await requireAdmin(request);
    const text = await request.text();
    if (text.length > MAX_BODY) return Response.json({ error: 'La solicitud es demasiado grande.' }, { status: 413 });
    let input: unknown;
    try {
      input = JSON.parse(text);
    } catch {
      return Response.json({ error: 'Solicitud inválida.' }, { status: 400 });
    }
    if (!input || typeof input !== 'object') return Response.json({ error: 'Solicitud inválida.' }, { status: 400 });
    const result = await transaction((client) => run(client, input as never));
    return Response.json({ ok: true, result: result ?? null });
  } catch (error) {
    if (error instanceof AdminAuthError) return Response.json({ error: error.message }, { status: error.status });
    // Los errores de la base traen un código SQLSTATE: no se muestran al navegador.
    const dbCode = typeof (error as { code?: unknown })?.code === 'string' && /^[0-9A-Z]{5}$/.test((error as { code: string }).code);
    if (error instanceof Error && !dbCode) return Response.json({ error: error.message }, { status: 409 });
    console.error(`[api/admin/${op}]`, error);
    return Response.json({ error: 'No se pudo completar la operación. Probá de nuevo.' }, { status: 500 });
  }
}
