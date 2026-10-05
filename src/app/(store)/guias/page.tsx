import type { Metadata } from 'next';
import GuideLinks from '../../../components/GuideLinks';

export const metadata: Metadata = {
  title: 'Guías para elegir perfumes en Paraguay | Äura',
  description: 'Elegí tu próxima fragancia: perfumes para el calor, para la oficina y cómo comparar presentaciones de 10, 30 y 50 ml.',
  alternates: { canonical: '/guias' },
};
export default function GuidesPage() {
  return <main className="pt-32"><div className="section-shell pb-6"><h1 className="font-luxury text-4xl font-semibold sm:text-6xl">Elegí con confianza.</h1><p className="mt-5 max-w-2xl text-aura-ink/65">Consejos para encontrar una inspiración que acompañe tu estilo y tus planes.</p></div><GuideLinks /></main>;
}
