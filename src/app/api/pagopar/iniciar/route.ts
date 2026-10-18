/* ============================================================
   POST /api/pagopar/iniciar
   El checkout manda los datos del pedido; acá se validan los precios
   contra la configuración vigente, se pide al hub de ALBA que cree la
   transacción en Pagopar y se devuelve el hash y el link de pago.
   El navegador guarda el pedido en la base de datos con ese hash.
   ============================================================ */

import { NextRequest, NextResponse } from 'next/server';
import { documentNumber, hubCall, PagoparError } from '../../../../lib/server/pagopar';
import { currentPricing } from '../../../../lib/server/pricing';
import { SITE } from '../../../../lib/site';
import { isGiftCard, validateGiftCardAmount } from '../../../../lib/giftCards';
import { MAX_SHIPPING_COST } from '../../../../lib/validation';

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
  shippingCost?: number;
  items?: Item[];
  ruc?: string;
  razonSocial?: string;
}

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: NextRequest) {
  // Una pestaña vieja que todavía guarda en Firebase debe recargarse antes de crear un pago.
  if (req.headers.get('x-aura-data-version') !== 'supabase-v1') {
    return bad('Actualizamos la tienda. Recargá la página antes de continuar con el pago.', 409);
  }
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
    let merchandiseSubtotal = 0;
    let giftCardQuantity = 0;
    const hubItems = items.map((i) => {
      const size = String(i.size || '').trim().toUpperCase();
      const quantity = Number(i.quantity);
      if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 50) throw new PagoparError('La cantidad debe ser de 1 a 50.');
      const gift = isGiftCard(i);
      const price = gift ? Number(i.price) : pricing.bySize[size];
      if (gift) {
        giftCardQuantity += quantity;
        if (giftCardQuantity > 50) throw new PagoparError('El máximo por pedido es de 50 Gift Cards.');
        const error = validateGiftCardAmount(price);
        if (error) throw new PagoparError(error);
        if (size !== 'DIGITAL') throw new PagoparError('La Gift Card es una tarjeta digital.');
      }
      if (!price) throw new PagoparError(`Presentación desconocida: ${size || '(vacía)'}.`);
      if (Math.round(Number(i.price) || 0) !== price) {
        throw new PagoparError('Los precios cambiaron. Volvé al carrito y probá de nuevo.');
      }
      subtotal += price * quantity;
      if (!gift) merchandiseSubtotal += price * quantity;
      return {
        nombre: gift ? 'Gift Card Äura · Digital · Vigencia 60 días' : `${String(i.name || 'Perfume').slice(0, 120)} · ${size}`,
        cantidad: quantity,
        precioTotal: price * quantity,
        idProducto: String(i.code || 'aura').slice(0, 40),
        urlImagen: imageUrl(i.image),
      };
    });

    const discountPercent = Math.max(0, Math.min(100, Math.round(Number(b.discountPercent) || 0)));
    if (discountPercent > pricing.welcomePercent) return bad('El descuento no es válido.');
    const discountAmount = discountPercent > 0 ? Math.round(merchandiseSubtotal * (discountPercent / 100)) : 0;
    const productsTotal = subtotal - discountAmount;

    // Delivery ya coordinado por WhatsApp (opcional): lo carga el cliente y
    // se cobra en la misma transacción, como un ítem más.
    const shippingCost = Math.max(0, Math.round(Number(b.shippingCost) || 0));
    if (items.every(isGiftCard) && shippingCost > 0) return bad('La Gift Card digital no tiene costo de envío.');
    if (shippingCost > MAX_SHIPPING_COST) return bad('Revisá el monto del delivery.');
    const total = productsTotal + shippingCost;
    if (total < MIN_AMOUNT) return bad(`El monto mínimo para pagar con tarjeta es Gs. ${MIN_AMOUNT}.`);
    if (total > MAX_AMOUNT) return bad(`El monto máximo para pagar con tarjeta es Gs. ${MAX_AMOUNT}.`);

    // Distribuir solamente entre perfumes, conservando exactamente el total.
    let remainingDiscount = discountAmount;
    for (let index = hubItems.length - 1; index >= 0 && remainingDiscount > 0; index--) {
      if (isGiftCard(items[index])) continue;
      const reduction = Math.min(hubItems[index].precioTotal, remainingDiscount);
      hubItems[index].precioTotal -= reduction;
      remainingDiscount -= reduction;
      if (reduction) hubItems[index].nombre += ` (con descuento)`;
    }
    if (shippingCost > 0) {
      hubItems.push({
        nombre: 'Delivery',
        cantidad: 1,
        precioTotal: shippingCost,
        idProducto: 'delivery',
        urlImagen: '',
      });
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
    return NextResponse.json({ hash: result.hash, url: result.url, numeroPedido: result.numeroPedido, total, shippingCost });
  } catch (error) {
    if (error instanceof PagoparError) return bad(error.message, 502);
    console.error('[pagopar/iniciar]', error);
    return bad('No pudimos iniciar el pago. Probá de nuevo.', 500);
  }
}
