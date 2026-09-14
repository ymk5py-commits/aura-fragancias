/* ============================================================
   POST /api/pagopar/iniciar
   El checkout manda los datos del pedido; acá se validan los precios
   contra la configuración vigente, se pide al hub de ALBA que cree la
   transacción en Pagopar y se devuelve el hash y el link de pago.
   El navegador guarda el pedido en Firestore con ese hash.
   ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import { documentNumber, hubCall, PagoparError } from '../../../../lib/server/pagopar';
import { currentPricing } from '../../../../lib/server/pricing';
import { SITE } from '../../../../lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIN_AMOUNT = 1000;
const MAX_AMOUNT = 50000000;

interface Item {
  code?: string;
  name?: string;
  size?: string;
  price?: number;
  quantity?: number;
  image?: string;
}

/** Solo URLs https absolutas (o rutas del sitio) para la foto que muestra Pagopar. */
function imageUrl(value: unknown): string {
  const v = String(value || '').trim();
  if (/^https:\/\/[^\s"'<>]+$/i.test(v)) return v.slice(0, 500);
  if (/^\/[^\s"'<>]+$/.test(v)) return `${SITE}${v}`.slice(0, 500);
  return '';
}

interface Body {
  orderId?: string;
  name?: string;
  phone?: string;
  email?: string;
  document?: string;
  address?: string;
  cityAndNeighborhood?: string;
  discountPercent?: number;
  items?: Item[];
  ruc?: string;
  razonSocial?: string;
}

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: NextRequest) {
  try {
    const b = (await req.json().catch(() => null)) as Body | null;
    if (!b) return bad('Pedido inválido.');

    const orderId = String(b.orderId || '').trim().toUpperCase();
    if (!/^AURA-[A-Z0-9]{4,20}$/.test(orderId)) return bad('Pedido inválido.');

    const email = String(b.email || '').trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return bad('Necesitamos un correo válido para pagar con tarjeta.');
    const documento = documentNumber(String(b.document || ''));
    if (documento.length < 5) return bad('Necesitamos tu número de C.I. para pagar con tarjeta.');
    const name = String(b.name || '').trim();
    if (name.length < 3) return bad('Falta el nombre.');

    const items = Array.isArray(b.items) ? b.items : [];
    if (!items.length || items.length > 50) return bad('El pedido no tiene productos.');

    /* --- precios: los manda el navegador, los verificamos contra la tienda --- */
    const pricing = await currentPricing();
    let subtotal = 0;
    const hubItems = items.map((i) => {
      const size = String(i.size || '').trim().toUpperCase();
      const quantity = Math.max(1, Math.min(50, Math.round(Number(i.quantity) || 1)));
      const price = pricing.bySize[size];
      if (!price) throw new PagoparError(`Presentación desconocida: ${size || '(vacía)'}.`);
      if (Math.round(Number(i.price) || 0) !== price) {
        throw new PagoparError('Los precios cambiaron. Volvé al carrito y probá de nuevo.');
      }
      subtotal += price * quantity;
      return {
        nombre: `${String(i.name || 'Perfume').slice(0, 120)} · ${size}`,
        cantidad: quantity,
        precioTotal: price * quantity,
        idProducto: String(i.code || 'aura').slice(0, 40),
        urlImagen: imageUrl(i.image),
      };
    });

    const discountPercent = Math.max(0, Math.min(100, Math.round(Number(b.discountPercent) || 0)));
    if (discountPercent > pricing.welcomePercent) return bad('El descuento no es válido.');
    const discountAmount = discountPercent > 0 ? Math.round(subtotal * (discountPercent / 100)) : 0;
    const total = subtotal - discountAmount;
    if (total < MIN_AMOUNT) return bad(`El monto mínimo para pagar con tarjeta es Gs. ${MIN_AMOUNT}.`);
    if (total > MAX_AMOUNT) return bad(`El monto máximo para pagar con tarjeta es Gs. ${MAX_AMOUNT}.`);

    // Pagopar exige que la suma de los ítems sea el total: el descuento se
    // reparte restándolo del último ítem.
    if (discountAmount > 0) {
      const last = hubItems[hubItems.length - 1];
      last.precioTotal = Math.max(0, last.precioTotal - discountAmount);
      last.nombre = `${last.nombre} (con ${discountPercent}% de descuento)`.slice(0, 200);
    }

    const result = await hubCall<{ hash: string; url: string; numeroPedido: string }>({
      op: 'iniciar',
      idPedidoComercio: orderId,
      monto: total,
      descripcion: `Pedido ${orderId} — Äura Fragancias`,
      comprador: {
        nombre: name,
        email,
        telefono: String(b.phone || ''),
        documento,
        direccion: String(b.address || '').trim(),
        referencia: String(b.cityAndNeighborhood || '').trim(),
        ruc: String(b.ruc || '').replace(/[^\d-]/g, '').slice(0, 12),
        razonSocial: String(b.razonSocial || '').trim().slice(0, 120),
      },
      items: hubItems,
    });

    if (!result?.hash) return bad('Pagopar no devolvió el link de pago.', 502);
    return NextResponse.json({ hash: result.hash, url: result.url, numeroPedido: result.numeroPedido, total });
  } catch (error) {
    if (error instanceof PagoparError) return bad(error.message, 502);
    console.error('[pagopar/iniciar]', error);
    return bad('No pudimos iniciar el pago. Probá de nuevo.', 500);
  }
}
