/* ============================================================
   POST /api/pagopar/respuesta  (webhook de Pagopar, reenviado por ALBA)

   Pagopar le avisa a ALBA (única URL de respuesta de la cuenta) y ALBA
   reenvía acá lo que no es suyo, firmado con el secreto compartido.
   Äura no persiste nada desde el servidor: el estado real se consulta
   a Pagopar cuando hace falta (página /pago y panel). Respondemos el
   contenido de `resultado` tal cual, como pide Pagopar.
   ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import { secretMatches } from '../../../../lib/server/pagopar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'pagopar/respuesta' });
}

export async function POST(req: NextRequest) {
  if (!secretMatches(req.headers.get('x-alba-secret'))) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { resultado?: unknown[] } | null;
  const item = body?.resultado?.[0] as { hash_pedido?: string; id_pedido_comercio?: string } | undefined;
  if (!item?.hash_pedido) return NextResponse.json({ error: 'Notificación inválida.' }, { status: 400 });
  console.info('[pagopar/respuesta]', item.id_pedido_comercio || '', item.hash_pedido);
  return new NextResponse(JSON.stringify(body?.resultado ?? []), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
