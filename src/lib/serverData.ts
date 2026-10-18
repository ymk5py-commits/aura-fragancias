import { PERFUMES, DEFAULT_SETTINGS } from '../constants';
import { Perfume, SiteSettings } from '../types';
import { cleanCatalogProduct } from './catalogSeo';
import { productFromRow, type Row } from './supabaseMap';

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Consulta PostgREST con la clave pública (la seguridad por fila decide qué se ve). */
function rest(path: string, init: RequestInit & { next?: { revalidate?: number; tags?: string[] } } = {}) {
  return fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: KEY as string, Authorization: `Bearer ${KEY}`, ...(init.headers || {}) },
  });
}

/** Lee todos los productos visibles desde Supabase (PostgREST). Fallback: catálogo incluido. */
export async function getProducts(): Promise<{ products: Perfume[]; source: 'remote' | 'local' }> {
  if (!URL_BASE || !KEY) return { products: PERFUMES.map(cleanCatalogProduct), source: 'local' };
  try {
    // PostgREST entrega hasta 1000 filas por consulta; el catálogo ronda las 100.
    const res = await rest('products?select=*&order=code.asc&limit=1000', {
      next: { revalidate: 120, tags: ['catalog'] }, // ISR: refresca cada 2 min
    });
    if (!res.ok) return { products: PERFUMES.map(cleanCatalogProduct), source: 'local' };
    const rows = (await res.json()) as Row[];
    if (!rows.length) return { products: PERFUMES.map(cleanCatalogProduct), source: 'local' };
    const products: Perfume[] = rows.map((row) => {
      const product = productFromRow(row);
      // Conservar la fotografía corregida en la publicación original.
      return cleanCatalogProduct({ ...product, ...(product.id === 'DD161' ? { imageUrl: '/products/DD161.png' } : {}) } as Perfume);
    });
    return { products, source: 'remote' };
  } catch {
    return { products: PERFUMES.map(cleanCatalogProduct), source: 'local' };
  }
}

/** Solo productos visibles (para la tienda). */
export async function getVisibleProducts(): Promise<Perfume[]> {
  const { products } = await getProducts();
  return products.filter((p) => p.visible !== false);
}

// URLs de banners hotlinkeados a dominios de terceros que quedaron guardadas
// en la base de datos: se reescriben a los assets locales de /public/banners.
const LEGACY_BANNERS: Record<string, string> = {
  'https://www.druni.es/blog/wp-content/uploads/2026/03/03_Perfumes_unisex_PORTADA.jpg': '/editorial/hero-cc180.webp',
  '/banners/hero.jpg': '/editorial/hero-cc180.webp',
  'https://www.radioformula.com.mx/__export/1768509508491/sites/formula/img/2026/01/15/perfume_de_hombre_exitosox_portada.png_2053803405.png': '/banners/men.jpg',
  'https://fragarabic.com/cdn/shop/articles/Botellas_de_perfumes_arabes.jpg?v=1724446535&width=2048': '/banners/unisex.jpg',
};

function localizeBanners(s: SiteSettings): SiteSettings {
  const fix = (url: string, fallback: string) => {
    if (!url) return fallback;
    if (LEGACY_BANNERS[url]) return LEGACY_BANNERS[url];
    if (url.includes('publimetro.cl')) return '/banners/women.jpg';
    return url;
  };
  return {
    ...s,
    heroImage: fix(s.heroImage, '/editorial/hero-cc180.webp'),
    bannerMen: fix(s.bannerMen, '/banners/men.jpg'),
    bannerWomen: fix(s.bannerWomen, '/banners/women.jpg'),
    bannerUnisex: fix(s.bannerUnisex, '/banners/unisex.jpg'),
  };
}

/** Lee la configuración del sitio desde Supabase. Fallback: defaults. */
export async function getSettings(): Promise<SiteSettings> {
  if (!URL_BASE || !KEY) return localizeBanners(DEFAULT_SETTINGS);
  try {
    const res = await rest('settings?select=data&id=eq.site', {
      next: { revalidate: 120, tags: ['settings'] },
    });
    if (!res.ok) return localizeBanners(DEFAULT_SETTINGS);
    const rows = (await res.json()) as Array<{ data?: Record<string, unknown> }>;
    if (!rows[0]?.data) return localizeBanners(DEFAULT_SETTINGS);
    return localizeBanners({ ...DEFAULT_SETTINGS, ...(rows[0].data as Partial<SiteSettings>) });
  } catch {
    return localizeBanners(DEFAULT_SETTINGS);
  }
}
