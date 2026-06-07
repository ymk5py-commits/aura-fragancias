import type { Metadata } from 'next';
import Hero from '../../../components/Hero';
import ProductGrid from '../../../components/ProductGrid';
import { getSettings } from '../../../lib/serverData';

export const metadata: Metadata = {
  title: 'Perfumes de Mujer — Inspiraciones de Lujo | Äura Paraguay',
  description:
    'Fragancias femeninas de alta gama con 30% de concentración. Inspiraciones de los perfumes de mujer más icónicos, con estela y fijación excepcionales. Envío a todo Paraguay.',
  alternates: { canonical: '/mujeres' },
};

export default async function MujeresPage() {
  const settings = await getSettings();
  return (
    <main>
      <Hero title="Mujeres" subtitle={settings.subtitleWomen} image={settings.bannerWomen} showCatalogButton={false} />
      <ProductGrid gender="Woman" id="mujeres" />
    </main>
  );
}
