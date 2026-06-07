import type { Metadata } from 'next';
import Hero from '../../../components/Hero';
import ProductGrid from '../../../components/ProductGrid';
import { getSettings } from '../../../lib/serverData';

export const metadata: Metadata = {
  title: 'Perfumes Nicho & Unisex — Inspiraciones de Lujo | Äura Paraguay',
  description:
    'Fragancias nicho y unisex con 30% de concentración. Aromas sin etiquetas, inspiraciones de alta perfumería con carácter. Envío a todo Paraguay.',
  alternates: { canonical: '/unisex' },
};

export default async function UnisexPage() {
  const settings = await getSettings();
  return (
    <main>
      <Hero title="Unisex" subtitle={settings.subtitleUnisex} image={settings.bannerUnisex} showCatalogButton={false} />
      <ProductGrid gender="Unisex" id="unisex" />
    </main>
  );
}
