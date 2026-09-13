/* ============================================================
   Pagos (cliente)
   La tienda cobra por transferencia (con comprobante y WhatsApp) y,
   cuando Pagopar está configurado, con tarjeta de crédito/débito.

   Con tarjeta el navegador solo manda el id del pedido ya guardado a
   /api/pagopar/iniciar; el servidor (con el token privado, que nunca
   viaja al cliente) arma la transacción y devuelve el link de pago.

   Se activa con NEXT_PUBLIC_PAGOPAR_ENABLED=true y las claves cargadas
   en el servidor (PAGOPAR_PUBLIC_KEY / PAGOPAR_PRIVATE_KEY).
   ============================================================ */

export const PAY_TRANSFER = 'Transferencia Bancaria / QR';
export const PAY_CARD = 'Tarjeta de crédito o débito (Pagopar)';

export const isCardPaymentEnabled = process.env.NEXT_PUBLIC_PAGOPAR_ENABLED === 'true';

export function isCardPayment(method?: string): boolean {
  return /pagopar|tarjeta/i.test(method || '');
}

/** Pagopar exige documento numérico: "4.348.713-0" → "4348713". */
export function documentDigits(value: string): string {
  return String(value || '').split('-')[0].replace(/\D/g, '');
}

/**
 * Inicia un pago con tarjeta para un pedido ya guardado en Firestore
 * y devuelve la URL de Pagopar a la que hay que redirigir.
 */
export async function startCardPayment(orderDocId: string): Promise<string> {
  if (!isCardPaymentEnabled) throw new Error('El pago con tarjeta todavía no está habilitado.');

  const res = await fetch('/api/pagopar/iniciar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: orderDocId }),
  });
  const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;

  if (!res.ok) throw new Error(data?.error || 'No pudimos generar el link de pago. Probá con transferencia.');
  if (!data?.url) throw new Error('La pasarela no devolvió un link de pago.');
  return data.url;
}

export interface PaymentStatus {
  orderId: string;
  number: string;
  pagado: boolean;
  cancelado: boolean;
  pagoparStatus: 'pendiente' | 'pagado' | 'reversado';
  formaPago: string;
  monto: string;
  fechaPago: string;
  numeroComprobante: string;
  titulo: string;
  descripcion: string;
  total: number;
  name: string;
  items: Array<{ code: string; name: string; size: string; price: number; quantity: number }>;
}

/** Estado real de un pago (consulta a Pagopar vía el servidor). */
export async function fetchPaymentStatus(hash: string): Promise<PaymentStatus> {
  const res = await fetch(`/api/pagopar/estado?hash=${encodeURIComponent(hash)}`, { cache: 'no-store' });
  const data = (await res.json().catch(() => null)) as (PaymentStatus & { error?: string }) | null;
  if (!res.ok || !data) throw new Error(data?.error || 'No pudimos consultar el estado del pago.');
  return data;
}
