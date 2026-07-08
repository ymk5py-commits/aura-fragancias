import type { MetadataRoute } from 'next';
import { getProducts } from '../lib/serverData';
import { SITE } from '../lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products } = await getProducts();
  const now = new Date();
  const sections = ['/hombres', '/mujeres', '/unisex', '/mayoristas'].map((p) => ({
    url: `${SITE}${p}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.9,
  }));
  const legal = ['/sobre-inspiraciones', '/terminos-y-condiciones', '/envios-y-devoluciones'].map((p) => ({
    url: `${SITE}${p}`, lastModified: now, changeFrequency: 'yearly' as const, priority: 0.3,
  }));
  const productUrls = products
    .filter((p) => p.visible !== false)
    .map((p) => ({ url: `${SITE}/producto/${p.code}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 }));
  return [
    { url: SITE, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    ...sections,
    ...legal,
    ...productUrls,
  ];
}
