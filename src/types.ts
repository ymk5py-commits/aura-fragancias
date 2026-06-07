
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
}