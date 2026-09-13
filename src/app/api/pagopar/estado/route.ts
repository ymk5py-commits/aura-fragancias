/* ============================================================
   GET /api/pagopar/estado?hash=...   (o ?orderId=<id del documento>)

   Lo usa la página /pago/[hash]. Consulta el estado real en Pagopar
   y, si ya está pagado y el webhook todavía no llegó, sincroniza el
   pedido. También lo consulta ALBA para saber si un hash es nuestro.
   ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import { findOrderByHash, getOrder } from '../../../../lib/server/firestoreRest';
import { pagoparConfig, pagoparPost, PagoparError, plainText, tokenConsultarPedido } from '../../../../lib/server/pagopar';
import { applyPagoparResult, sendPurchaseToMeta, type PagoparOrderRow } from '../../../../lib/server/pagoparOrders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PagoparOrderStatus extends PagoparOrderRow {
  mensaje_resultado_pago?: { titulo?: string; descripcion?: string };
}

export async function GET(req: NextRequest) {
  try {
    const hash = (req.nextUrl.searchParams.get('hash') || '').trim();
    const orderId = (req.nextUrl.searchParams.get('orderId') || '').trim();

    if (!hash && !orderId) return NextResponse.json({ error: 'Falta el identificador del pago.' }, { status: 400 });
    if (hash && !/^[A-Za-z0-9_-]{6,128}$/.test(hash)) return NextResponse.json({ error: 'Hash inválido.' }, { status: 400 });
    if (orderId && !/^[A-Za-z0-9_-]{6,80}$/.test(orderId)) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });

    const order = orderId ? await getOrder(orderId) : await findOrderByHash(hash);
    if (!order) return NextResponse.json({ error: 'No encontramos ese pago.' }, { status: 404 });

    /* --- Consulta en vivo a Pagopar --- */
    let status: PagoparOrderStatus | null = null;
    if (order.pagoparHash) {
      try {
        const config = pagoparConfig();
        const rows = await pagoparPost<PagoparOrderStatus[]>('/api/pedidos/1.1/traer', {
          hash_pedido: order.pagoparHash,
          token: tokenConsultarPedido(config.privateKey),
          token_publico: config.publicKey,
        });
        status = rows?.[0] ?? null;
      } catch (error) {
        // Si Pagopar no responde igual seguimos: mostramos lo que dice el pedido.
        if (!(error instanceof PagoparError)) console.error('[pagopar/estado]', error);
      }
    }

    /* --- Sincronización de respaldo (por si el webhook se demora) --- */
    if (status?.pagado === true && order.pagoparStatus !== 'pagado') {
      try {
        const justPaid = await applyPagoparResult(order, status);
        if (justPaid) await sendPurchaseToMeta(order);
      } catch (error) {
        console.error('[pagopar/estado] no se pudo sincronizar el pedido:', error);
      }
    }

    const pagado = status?.pagado === true || order.pagoparStatus === 'pagado';
    const payment = order.pagoparPayment;

    return NextResponse.json({
      orderId: order.id,
      number: order.orderId || '',
      pagado,
      cancelado: status?.cancelado === true,
      pagoparStatus: pagado ? 'pagado' : order.pagoparStatus || 'pendiente',
      formaPago: status?.forma_pago || payment?.formaPago || '',
      monto: status?.monto || payment?.monto || String(order.total || ''),
      fechaPago: status?.fecha_pago || payment?.fechaPago || '',
      numeroComprobante: status?.numero_comprobante_interno || payment?.numeroComprobante || '',
      titulo: plainText(status?.mensaje_resultado_pago?.titulo) || (pagado ? 'Pago confirmado' : 'Pago pendiente'),
      descripcion: plainText(status?.mensaje_resultado_pago?.descripcion),
      total: order.total,
      items: (order.items || []).map((i) => ({ code: i.code, name: i.name, size: i.size, price: i.price, quantity: i.quantity })),
      name: order.name || '',
    });
  } catch (error) {
    console.error('[pagopar/estado]', error);
    return NextResponse.json({ error: 'No pudimos consultar el pago.' }, { status: 500 });
  }
}
