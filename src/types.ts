
export type Category = 'Daily' | 'Casual' | 'Night';
export type Gender = 'Man' | 'Woman' | 'Unisex';
export type Badge = 'Bestseller' | 'Recommended' | 'New';

export interface Perfume {
  id?: string;          // Firestore document id (optional for bundled catalog)
  code: string;
  name: string;
  inspiration: string;
  family: string;
  notes: string[];
  intensity: number; // 1-5
  duration: string;
  gender: Gender;
  category: Category;
  badge?: Badge;
  imageUrl: string;
  visible?: boolean;    // false = oculto en la tienda (default: visible)
  salesScore?: number;  // unidades vendidas (ordena el Top Ventas)
  description?: string; // prosa única del producto (SEO + ficha); si falta, se genera desde los datos
}

export interface CartItem {
  id: string; // unique id for each entry in cart
  perfume: Perfume;
  size: string;
  price: number;
  quantity: number;
}

export interface WholesaleScale {
  units: string;
  discount: string;
}

export interface SiteSettings {
  // Hero principal (home)
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  // Banners de categorías
  bannerMen: string;
  bannerWomen: string;
  bannerUnisex: string;
  subtitleMen: string;
  subtitleWomen: string;
  subtitleUnisex: string;
  // Barra de aviso + contacto
  announcement: string;
  whatsappNumber: string;
  // Descuento de bienvenida
  welcomeCode: string;
  welcomePercent: number;
  // Precios por presentación (Gs.)
  price10: number;
  price30: number;
  price50: number;
  // Datos para transferencia bancaria (editables desde /admin)
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  bankCi: string;
  bankAlias: string;
}

export type OrderStatus = 'pendiente' | 'confirmado' | 'cancelado';

export interface OrderItem {
  code: string;
  name: string;
  size: string;
  price: number;
  quantity: number;
}

export interface Order {
  id?: string;           // id del documento en Firestore
  orderId: string;       // código legible: AURA-XXXX
  createdAt?: unknown;    // serverTimestamp
  status: OrderStatus;
  // Cliente
  name: string;
  phone: string;
  cityAndNeighborhood: string;
  address: string;
  // Importes
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  freeShipping: boolean;
  items: OrderItem[];
  // Pago
  receiptUrl?: string;   // comprobante de transferencia subido por el cliente
  paymentMethod: string;
  // Datos extra que pide Pagopar para pagar con tarjeta
  email?: string;
  document?: string;
  // Factura con RUC (opcional)
  invoice?: { ruc: string; razonSocial: string };
  // Pagopar (los escribe el servidor: /api/pagopar/*)
  pagoparHash?: string;
  pagoparNumeroPedido?: string;
  pagoparStatus?: 'pendiente' | 'pagado' | 'reversado';
  pagoparAttempts?: number;
  pagoparPayment?: {
    formaPago?: string;
    formaPagoId?: string;
    numeroComprobante?: string;
    fechaPago?: string;
    monto?: string;
  };
  paidAt?: number;
}
/* ---------- alertas (compras que no se pudieron completar) ---------- */

export type IncidentSource =
  | 'pedido-no-guardado' // el pedido no se pudo guardar en Firestore
  | 'pago-tarjeta' // no se consiguió el link de pago (hub / Pagopar)
  | 'comprobante' // el comprobante de transferencia no se pudo subir
  | 'verificacion-pago'; // la página /pago no pudo consultar el estado

/** Una falla que le impidió comprar a un cliente. Se ve en /admin → Alertas. */
export interface Incident {
  id: string;
  source: IncidentSource;
  message: string;
  detail?: string;
  orderId?: string;
  paymentMethod?: string;
  total?: number;
  customerName?: string;
  customerPhone?: string;
  page?: string;
  userAgent?: string;
  createdAt: number;
  /** Ya la revisó alguien del panel. */
  seen: boolean;
  seenAt?: number;
}

/* ---------- reseñas ---------- */

export interface Review {
  id: string;
  /** código del perfume */
  productId: string;
  productName?: string;
  name: string;
  city?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  /** Solo las aprobadas se muestran en la tienda. */
  approved: boolean;
  createdAt: number;
}
