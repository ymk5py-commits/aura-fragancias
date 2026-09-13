/* ============================================================
   POST /api/pagopar/iniciar   { orderId: <id del documento> }
   El checkout manda el id del pedido ya guardado en Firestore.
   Acá se lee el pedido (nunca confiamos en montos del navegador),
   se crea la transacción en Pagopar y se devuelve la URL de pago.
   ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import { getOrder, updateOrder } from '../../../../lib/server/firestoreRest';
import {
  checkoutUrl,
  documentNumber,
  internationalPhone,
  pagoparConfig,
  pagoparPost,
  PagoparError,
  paraguayDateTime,
  tokenIniciarTransaccion,
} from '../../../../lib/server/pagopar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_ATTEMPTS = 8;
const MIN_AMOUNT = 1000; // mínimo de Pagopar: Gs. 1.000
const MAX_AMOUNT = 50000000; // máximo de Pagopar: Gs. 50.000.000
const MAX_PAYMENT_HOURS = 48;

interface PagoparTransaction {
  data: string;
  pedido: string;
}

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as { orderId?: unknown } | null;
    const orderId = String(body?.orderId || '').trim();
    if (!/^[A-Za-z0-9_-]{6,80}$/.test(orderId)) return bad('Pedido inválido.');

    const config = pagoparConfig();
    const order = await getOrder(orderId);
    if (!order) return bad('No encontramos el pedido.', 404);

    if (!/pagopar|tarjeta/i.test(order.paymentMethod || '')) {
      return bad('Este pedido no es para pago con tarjeta.');
    }
    if (order.pagoparStatus === 'pagado') return bad('Este pedido ya está pagado.');
    if (order.status === 'cancelado') return bad('Este pedido fue cancelado.');

    const total = Math.round(Number(order.total) || 0);
    if (total < MIN_AMOUNT) return bad(`El monto mínimo para pagar con tarjeta es Gs. ${MIN_AMOUNT}.`);
    if (total > MAX_AMOUNT) return bad(`El monto máximo para pagar con tarjeta es Gs. ${MAX_AMOUNT}.`);

    const email = String(order.email || '').trim();
    if (!email) return bad('El pedido necesita un correo para pagar con tarjeta.');
    const documento = documentNumber(String(order.document || ''));
    if (documento.length < 5) return bad('El pedido necesita un número de C.I. válido para pagar con tarjeta.');
    if (!Array.isArray(order.items) || order.items.length === 0) return bad('El pedido no tiene productos.');

    /* --- id único por intento: Pagopar no acepta repetir id_pedido_comercio --- */
    const attempt = Math.max(0, Number(order.pagoparAttempts) || 0) + 1;
    if (attempt > MAX_ATTEMPTS) {
      return bad('Se hicieron demasiados intentos de pago. Escribinos por WhatsApp y lo resolvemos.', 429);
    }
    const code = String(order.orderId || order.id).replace(/[^A-Za-z0-9_-]/g, '');
    const idPedidoComercio = attempt === 1 ? code : `${code}-${attempt}`;

    const customerName = String(order.name || '').trim() || 'Cliente Äura';
    const deadline = new Date(Date.now() + MAX_PAYMENT_HOURS * 3600_000);

    const payload: Record<string, unknown> = {
      token: tokenIniciarTransaccion(config.privateKey, idPedidoComercio, total),
      public_key: config.publicKey,
      tipo_pedido: 'VENTA-COMERCIO',
      monto_total: total,
      forma_pago: 9, // Bancard: tarjetas de crédito/débito (se puede cambiar en el checkout de Pagopar)
      fecha_maxima_pago: paraguayDateTime(deadline),
      id_pedido_comercio: idPedidoComercio,
      descripcion_resumen: `Pedido ${order.orderId} — Äura Fragancias`,
      comprador: {
        ruc: '',
        email,
        ciudad: '1',
        nombre: customerName,
        telefono: internationalPhone(String(order.phone || '')),
        direccion: String(order.address || '').trim(),
        documento,
        coordenadas: '',
        razon_social: customerName,
        tipo_documento: 'CI',
        direccion_referencia: String(order.cityAndNeighborhood || '').trim(),
      },
      compras_items: order.items.map((item) => {
        const detail = [item.name, item.size ? `${item.size}` : ''].filter(Boolean).join(' · ');
        const quantity = Math.max(1, Math.round(Number(item.quantity) || 1));
        return {
          ciudad: '1',
          nombre: detail.slice(0, 200),
          cantidad: quantity,
          categoria: '909',
          public_key: config.publicKey,
          url_imagen: '',
          descripcion: detail.slice(0, 200),
          id_producto: String(item.code || 'aura'),
          precio_total: Math.round(Number(item.price) || 0) * quantity,
          vendedor_telefono: '',
          vendedor_direccion: '',
          vendedor_direccion_referencia: '',
          vendedor_direccion_coordenadas: '',
        };
      }),
    };

    const resultado = await pagoparPost<PagoparTransaction[]>('/api/comercios/2.0/iniciar-transaccion', payload);

    const hash = String(resultado?.[0]?.data || '').trim();
    if (!hash) return bad('Pagopar no devolvió el link de pago.', 502);

    await updateOrder(order.id, {
      pagoparHash: hash,
      pagoparNumeroPedido: String(resultado?.[0]?.pedido || ''),
      pagoparStatus: 'pendiente',
      pagoparAttempts: attempt,
      pagoparInitiatedAt: Date.now(),
    });

    return NextResponse.json({ url: checkoutUrl(hash), hash });
  } catch (error) {
    if (error instanceof PagoparError) return bad(error.resultado, 502);
    console.error('[pagopar/iniciar]', error);
    return bad('No pudimos iniciar el pago. Probá de nuevo.', 500);
  }
}
