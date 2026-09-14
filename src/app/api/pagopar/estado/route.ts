/* ============================================================
   GET /api/pagopar/estado?hash=...
   Estado real de un pago (Pagopar vía el hub de ALBA). Lo usa la
   página /pago/[hash], el panel (para confirmar pedidos con tarjeta)
   y ALBA (para saber si un hash es nuestro).
   ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import { hubCall, PagoparError, plainText, type PagoparRow } from '../../../../lib/server/pagopar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const hash = (req.nextUrl.searchParams.get('hash') || '').trim();
    if (!/^[A-Za-z0-9_-]{6,128}$/.test(hash)) return NextResponse.json({ error: 'Hash inválido.' }, { status: 400 });

    const { resultado } = await hubCall<{ resultado: PagoparRow | null }>({ op: 'estado', hash });
    if (!resultado) return NextResponse.json({ error: 'No encontramos ese pago.' }, { status: 404 });

    // Pagopar comparte la cuenta con ALBA: solo respondemos por pedidos AURA-…
    const idComercio = String(resultado.id_pedido_comercio || '');
    if (idComercio && !/^AURA-/i.test(idComercio)) {
      return NextResponse.json({ error: 'Ese pago no es de esta tienda.' }, { status: 404 });
    }

    const pagado = resultado.pagado === true;
    return NextResponse.json({
      hash,
      orderId: idComercio.replace(/-\d+$/, '') || '',
      pagado,
      cancelado: resultado.cancelado === true,
      formaPago: resultado.forma_pago || '',
      formaPagoId: resultado.forma_pago_identificador || '',
      monto: resultado.monto || '',
      fechaPago: resultado.fecha_pago || '',
      numeroComprobante: resultado.numero_comprobante_interno || '',
      numeroPedido: resultado.numero_pedido || '',
      titulo: plainText(resultado.mensaje_resultado_pago?.titulo) || (pagado ? 'Pago confirmado' : 'Pago pendiente'),
      descripcion: plainText(resultado.mensaje_resultado_pago?.descripcion),
    });
  } catch (error) {
    if (error instanceof PagoparError) return NextResponse.json({ error: error.message }, { status: 502 });
    console.error('[pagopar/estado]', error);
    return NextResponse.json({ error: 'No pudimos consultar el pago.' }, { status: 500 });
  }
}
