import type { Metadata } from 'next';
import Hero from '../../../components/Hero';
import ProductGrid from '../../../components/ProductGrid';
import CategorySeo from '../../../components/CategorySeo';
import { getSettings, getVisibleProducts } from '../../../lib/serverData';

export const metadata: Metadata = {
  title: 'Perfumes de Hombre — Inspiraciones de Lujo | Äura Paraguay',
  description:
    'Fragancias masculinas de alta gama con 30% de concentración. Inspiraciones de los perfumes de hombre más icónicos, con fijación de 8 a 12 horas. Envío a todo Paraguay.',
  alternates: { canonical: '/hombres' },
};

const INTRO =
  'Elegí tu perfume de hombre entre más de veinte inspiraciones olfativas de las casas más icónicas del mundo, ' +
  'elaboradas como Extrait de Parfum con 30% de concentración: el formato más intenso de la perfumería, con fijación ' +
  'de 8 a 12 horas sobre la piel. Encontrás familias amaderadas y orientales especiadas para la noche, cítricas y ' +
  'marinas para el día a día en el calor paraguayo, y dulces avainilladas para salidas. Cada fragancia está disponible ' +
  'en presentaciones de 10, 30 y 50 ML desde Gs. 30.000, con envío a todo Paraguay y delivery gratis en compras desde Gs. 300.000.';

export default async function HombresPage() {
  const [settings, products] = await Promise.all([getSettings(), getVisibleProducts()]);
  return (
    <main>
      <Hero title="Hombres" subtitle={settings.subtitleMen} image={settings.bannerMen} showCatalogButton={false} />
      <CategorySeo gender="Man" label="Hombres" path="/hombres" intro={INTRO} products={products} />
      <ProductGrid gender="Man" id="hombres" />
    </main>
  );
}
