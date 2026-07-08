import type { Metadata } from 'next';
import Hero from '../../../components/Hero';
import ProductGrid from '../../../components/ProductGrid';
import CategorySeo from '../../../components/CategorySeo';
import { getSettings, getVisibleProducts } from '../../../lib/serverData';

export const metadata: Metadata = {
  title: 'Perfumes de Mujer — Inspiraciones de Lujo | Äura Paraguay',
  description:
    'Fragancias femeninas de alta gama con 30% de concentración. Inspiraciones de los perfumes de mujer más icónicos, con estela y fijación excepcionales. Envío a todo Paraguay.',
  alternates: { canonical: '/mujeres' },
};

const INTRO =
  'Descubrí perfumes de mujer creados como inspiraciones olfativas de las fragancias femeninas más deseadas, ' +
  'en formato Extrait de Parfum con 30% de concentración y una estela que acompaña entre 8 y 12 horas. El catálogo ' +
  'reúne florales frutales luminosos para el día, orientales florales y dulces amielados para la noche, y gourmands ' +
  'avainillados que envuelven sin empalagar. Todas las fragancias se maceran 21 días antes del envío y están ' +
  'disponibles en 10, 30 y 50 ML desde Gs. 30.000, con despacho a todo Paraguay y delivery gratis desde Gs. 300.000.';

export default async function MujeresPage() {
  const [settings, products] = await Promise.all([getSettings(), getVisibleProducts()]);
  return (
    <main>
      <Hero title="Mujeres" subtitle={settings.subtitleWomen} image={settings.bannerWomen} showCatalogButton={false} />
      <CategorySeo gender="Woman" label="Mujeres" path="/mujeres" intro={INTRO} products={products} />
      <ProductGrid gender="Woman" id="mujeres" />
    </main>
  );
}
