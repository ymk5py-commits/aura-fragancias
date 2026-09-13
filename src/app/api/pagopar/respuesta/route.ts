/* ============================================================
   POST /api/pagopar/respuesta  (webhook de Pagopar)

   Pagopar avisa cuando un pedido se paga o se reversa. Como el
   comercio es compartido con albastore.lat, Pagopar le pega a ALBA y
   ALBA reenvía acá lo que no es suyo. SIEMPRE se valida la firma
   sha1(clave_privada + hash_pedido) antes de tocar nada, y se responde
   el contenido de `resultado` tal cual (es lo que Pagopar espera).

   Respuestas: 200 = procesado (o pedido ajeno), 404 = el hash no es
   de esta tienda (para que el reenvío pruebe con otra), 500 = reintentar.
   ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import { findOrderByHash } from '../../../../lib/server/firestoreRest';
import { pagoparConfig, safeEqual, tokenWebhook } from '../../../../lib/server/pagopar';
import { applyPagoparResult, sendPurchaseToMeta, type PagoparOrderRow } from '../../../../lib/server/pagoparOrders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Un GET sirve para verificar desde el navegador que la URL existe.
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'pagopar/respuesta' });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      resultado?: Array<PagoparOrderRow & { token?: string }>;
    } | null;

    const item = body?.resultado?.[0];
    const hash = String(item?.hash_pedido || '').trim();
    const token = String(item?.token || '').trim();
    if (!item || !hash || !token) return NextResponse.json({ error: 'Notificación inválida.' }, { status: 400 });

    /* --- Validación obligatoria de la firma --- */
    const config = pagoparConfig();
    if (!safeEqual(tokenWebhook(config.privateKey, hash), token)) {
      return NextResponse.json({ error: 'Firma inválida.' }, { status: 401 });
    }

    const order = await findOrderByHash(hash);
    if (!order) return NextResponse.json({ error: 'Ese pago no es de esta tienda.' }, { status: 404 });

    const justPaid = await applyPagoparResult(order, item);
    if (justPaid) await sendPurchaseToMeta({ ...order, pagoparHash: hash });

    /* Pagopar espera el contenido de `resultado` tal cual, con HTTP 200. */
    return new NextResponse(JSON.stringify(body?.resultado ?? []), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (error) {
    console.error('[pagopar/respuesta]', error);
    // 500 para que quien reenvía (o Pagopar) reintente más tarde.
    return NextResponse.json({ error: 'No pudimos procesar la notificación.' }, { status: 500 });
  }
}
