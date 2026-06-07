import type { Metadata } from 'next';
import Hero from '../../../components/Hero';
import ProductGrid from '../../../components/ProductGrid';
import { getSettings } from '../../../lib/serverData';

export const metadata: Metadata = {
  title: 'Perfumes de Hombre — Inspiraciones de Lujo | Äura Paraguay',
  description:
    'Fragancias masculinas de alta gama con 30% de concentración. Inspiraciones de los perfumes de hombre más icónicos, con fijación de 8 a 12 horas. Envío a todo Paraguay.',
  alternates: { canonical: '/hombres' },
};

export default async function HombresPage() {
  const settings = await getSettings();
  return (
    <main>
      <Hero title="Hombres" subtitle={settings.subtitleMen} image={settings.bannerMen} showCatalogButton={false} />
      <ProductGrid gender="Man" id="hombres" />
    </main>
  );
}
