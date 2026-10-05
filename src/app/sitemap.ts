import type { MetadataRoute } from 'next';
import { getProducts, getSettings } from '../lib/serverData';
import { SITE } from '../lib/site';
import { latestUpdate } from '../lib/catalogSeo';
import { GUIDES } from '../lib/guides';
import { cldn } from '../lib/img';

// La ruta de metadata debe regenerarse junto con el catálogo de Firestore.
// Así las altas, bajas y cambios de visibilidad llegan también al sitemap.
export const revalidate = 120;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ products }, settings] = await Promise.all([getProducts(), getSettings()]);
  const catalogUpdated = latestUpdate(settings.updatedAt, ...products.map((p) => p.updatedAt));
  const sections = ['/hombres', '/mujeres', '/unisex', '/mayoristas'].map((p) => ({
    url: `${SITE}${p}`, ...(catalogUpdated ? { lastModified: catalogUpdated } : {}), changeFrequency: 'weekly' as const, priority: 0.9,
  }));
  const legal = ['/sobre-inspiraciones', '/terminos-y-condiciones', '/envios-y-devoluciones'].map((p) => ({
    url: `${SITE}${p}`, changeFrequency: 'yearly' as const, priority: 0.3,
  }));
  const productUrls = products
    .filter((p) => p.visible !== false)
    .map((p) => {
      const updated = latestUpdate(p.updatedAt, settings.updatedAt);
      // Next concatena image:loc sin escapar XML; las URLs de Firebase llevan &token.
      const image = p.imageUrl ? new URL(cldn(p.imageUrl, 1000), SITE).href.replace(/&/g, '&amp;') : undefined;
      return { url: `${SITE}/producto/${p.code}`, ...(updated ? { lastModified: updated } : {}), ...(image ? { images: [image] } : {}), changeFrequency: 'monthly' as const, priority: 0.7 };
    });
  return [
    { url: SITE, ...(catalogUpdated ? { lastModified: catalogUpdated } : {}), changeFrequency: 'weekly', priority: 1.0 },
    ...sections,
    ...legal,
    ...productUrls,
    { url: `${SITE}/guias`, lastModified: '2026-10-04', changeFrequency: 'monthly', priority: 0.6 },
    ...GUIDES.map((g) => ({ url: `${SITE}/guias/${g.slug}`, lastModified: g.date, changeFrequency: 'monthly' as const, priority: 0.6 })),
  ];
}
