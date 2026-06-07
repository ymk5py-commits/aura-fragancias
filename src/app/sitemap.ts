import type { MetadataRoute } from 'next';
import { getProducts } from '../lib/serverData';

const SITE = 'https://aurafrangancias.store';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products } = await getProducts();
  const sections = ['/hombres', '/mujeres', '/unisex'].map((p) => ({
    url: `${SITE}${p}`, changeFrequency: 'weekly' as const, priority: 0.9,
  }));
  const productUrls = products
    .filter((p) => p.visible !== false)
    .map((p) => ({ url: `${SITE}/producto/${p.code}`, changeFrequency: 'monthly' as const, priority: 0.7 }));
  return [
    { url: SITE, changeFrequency: 'weekly', priority: 1.0 },
    ...sections,
    ...productUrls,
  ];
}
