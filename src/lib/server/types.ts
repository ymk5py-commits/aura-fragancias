/* ============================================================
   El pedido visto desde el servidor: lo que las rutas de Pagopar
   necesitan leer y escribir del documento en Firestore.
   Es el modelo de src/types.ts (Order) más los campos de la pasarela.
   ============================================================ */

export interface OrderItemDoc {
  code: string;
  name: string;
  size: string;
  price: number;
  quantity: number;
}

export type PagoparStatus = 'pendiente' | 'pagado' | 'reversado';

export interface PagoparPayment {
  formaPago?: string;
  formaPagoId?: string;
  numeroComprobante?: string;
  fechaPago?: string;
  monto?: string;
}

export interface OrderDoc {
  /** id del documento en Firestore */
  id: string;
  /** código legible AURA-XXXXXX */
  orderId: string;
  status: 'pendiente' | 'confirmado' | 'cancelado';
  name: string;
  phone: string;
  email?: string;
  document?: string;
  cityAndNeighborhood?: string;
  address?: string;
  subtotal?: number;
  discountPercent?: number;
  discountAmount?: number;
  total: number;
  freeShipping?: boolean;
  items: OrderItemDoc[];
  paymentMethod?: string;
  /* --- Pagopar --- */
  pagoparHash?: string;
  pagoparNumeroPedido?: string;
  pagoparStatus?: PagoparStatus;
  pagoparAttempts?: number;
  pagoparInitiatedAt?: number;
  pagoparLastEventAt?: number;
  pagoparPayment?: PagoparPayment;
  paidAt?: number;
}
