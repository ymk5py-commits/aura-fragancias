import type { Metadata } from 'next';
import Hero from '../../../components/Hero';
import ProductGrid from '../../../components/ProductGrid';
import CategorySeo from '../../../components/CategorySeo';
import { getSettings, getVisibleProducts } from '../../../lib/serverData';

export const metadata: Metadata = {
  title: 'Perfumes Nicho & Unisex — Inspiraciones de Lujo | Äura Paraguay',
  description:
    'Fragancias nicho y unisex con 30% de concentración. Aromas sin etiquetas, inspiraciones de alta perfumería con carácter. Envío a todo Paraguay.',
  alternates: { canonical: '/unisex' },
};

const INTRO =
  'La colección Nicho & Unisex reúne inspiraciones de la alta perfumería de autor: fragancias sin etiquetas de género, ' +
  'con personalidad amaderada, ambarada y frutal-dulce, pensadas para quienes buscan un aroma distinto al de todos. ' +
  'Son Extrait de Parfum con 30% de concentración, macerados 21 días antes de cada envío, con fijación de 8 a 12 horas. ' +
  'Disponibles en presentaciones de 10, 30 y 50 ML desde Gs. 30.000, con envío a todo Paraguay y delivery gratis en ' +
  'compras desde Gs. 300.000.';

export default async function UnisexPage() {
  const [settings, products] = await Promise.all([getSettings(), getVisibleProducts()]);
  return (
    <main>
      <Hero title="Unisex" subtitle={settings.subtitleUnisex} image={settings.bannerUnisex} showCatalogButton={false} />
      <CategorySeo gender="Unisex" label="Nicho & Unisex" path="/unisex" intro={INTRO} products={products} />
      <ProductGrid gender="Unisex" id="unisex" />
    </main>
  );
}
