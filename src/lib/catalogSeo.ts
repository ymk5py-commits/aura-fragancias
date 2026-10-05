import type { Perfume, SiteSettings } from '../types';
import { SITE } from './site';
import { cldn } from './img';

export const SIZE_KEYS = ['10', '30', '50'] as const;
export type SizeKey = typeof SIZE_KEYS[number];
export function sizeKey(value?: string | string[]): SizeKey {
  return SIZE_KEYS.includes(value as SizeKey) ? value as SizeKey : '30';
}
export function productLink(code: string, size?: SizeKey) {
  return `/producto/${encodeURIComponent(code)}${size ? `?size=${size}` : ''}`;
}

// Correcciones ortográficas inequívocas; no cambia códigos ni descripciones propias.
export function cleanCatalogProduct(p: Perfume): Perfume {
  return { ...p, inspiration: p.inspiration?.replace(/\bGIOGIO\b/gi, 'GIORGIO'), family: p.family?.replace(/\bESPACIADO\b/gi, 'ESPECIADO') };
}

export function latestUpdate(...values: (string | undefined)[]): string | undefined {
  const dates = values.filter((v): v is string => !!v && Number.isFinite(Date.parse(v)));
  return dates.sort((a, b) => Date.parse(b) - Date.parse(a))[0];
}

export function productGroup(p: Perfume, settings: SiteSettings, description: string) {
  const image = cldn(p.imageUrl, 1000) || '/brand/aura-social-1200x630.png';
  const imageUrl = new URL(image, SITE).href;
  return {
    '@context': 'https://schema.org', '@type': 'ProductGroup',
    '@id': `${SITE}${productLink(p.code)}#grupo`,
    name: p.name, description, image: imageUrl, url: `${SITE}${productLink(p.code)}`,
    brand: { '@type': 'Brand', name: 'Äura Fragancias' },
    productGroupID: p.code, variesBy: ['https://schema.org/size'],
    hasVariant: SIZE_KEYS.map((key) => ({
      '@type': 'Product', sku: `${p.code}-${key}`, name: `${p.name} — ${key} ML`,
      description, image: imageUrl, size: `${key} ML`,
      offers: {
        '@type': 'Offer', url: `${SITE}${productLink(p.code, key)}`,
        price: settings[`price${key}`], priceCurrency: 'PYG',
        availability: 'https://schema.org/InStock', itemCondition: 'https://schema.org/NewCondition',
        seller: { '@type': 'Organization', name: 'Äura Fragancias' },
        // El delivery se cotiza por destino; no declarar una tarifa gratis universal.
      },
    })),
  };
}

export function searchCatalog(products: Perfume[], query: string) {
  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const words = normalize(query.trim()).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return products.filter((p) => p.visible !== false && words.every((word) => normalize([p.code, p.name, p.inspiration, p.family, ...(p.notes || [])].join(' ')).includes(word)));
}
