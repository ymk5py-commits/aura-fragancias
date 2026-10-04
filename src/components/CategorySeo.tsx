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
  const lead = {
    Man: 'Fragancias masculinas para cada momento, de los clásicos que acompañan todos los días a las inspiraciones que dejan una marca propia.',
    Woman: 'Una selección de aromas que reúne flores, frutas, maderas y acordes intensos. Encontrá la fragancia que se sienta tuya.',
    Unisex: 'Composiciones sin etiquetas: notas que se encuentran, cambian sobre la piel y se vuelven inconfundibles.',
  }[gender];

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
      <section className="bg-aura-sand py-11 sm:py-16">
        <div className="section-shell grid gap-6 border-t border-aura-ink/20 pt-6 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] md:gap-16">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-aura-cognac">Dentro de la colección</span>
            <p className="mt-3 font-luxury text-3xl font-semibold tracking-[-0.04em] text-aura-ink sm:text-4xl">{visible.length} fragancias.</p>
          </div>
          <div>
            <p className="max-w-[52ch] font-luxury text-xl leading-snug text-aura-ink sm:text-2xl">{lead}</p>
            <details className="group mt-5 max-w-[68ch]">
              <summary className="inline-flex min-h-11 cursor-pointer items-center border-b border-aura-cognac text-[10px] font-bold uppercase tracking-[0.15em] text-aura-cognac">Sobre la colección {label.toLowerCase()}</summary>
              <p className="pb-2 pt-4 text-sm leading-relaxed text-aura-ink/70">{intro}</p>
            </details>
          </div>
        </div>
      </section>
    </>
  );
}