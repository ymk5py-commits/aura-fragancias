import { Perfume, Gender } from '../types';
import { SITE } from '../lib/site';

interface CategorySeoProps {
  gender: Gender;
  label: string;
  path: string;
  intro: string;
  products: Perfume[];
}

/**
 * Bloque SEO de página de categoría: texto introductorio visible +
 * JSON-LD ItemList (los productos del listado) y BreadcrumbList.
 */
export default function CategorySeo({ gender, label, path, intro, products }: CategorySeoProps) {
  const visible = products.filter((p) => p.visible !== false && p.gender === gender);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE },
        { '@type': 'ListItem', position: 2, name: label, item: `${SITE}${path}` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `Perfumes ${label} — Äura Fragancias`,
      numberOfItems: visible.length,
      itemListElement: visible.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: p.name,
        url: `${SITE}/producto/${p.code}`,
      })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="bg-white pt-14 sm:pt-16">
        <div className="container mx-auto px-5 sm:px-6 max-w-3xl text-center">
          <p className="text-zinc-600 text-[15px] sm:text-base leading-relaxed font-light">{intro}</p>
        </div>
      </section>
    </>
  );
}
