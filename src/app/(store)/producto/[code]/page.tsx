import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductView from '../../../../components/ProductView';
import { getProducts, getSettings } from '../../../../lib/serverData';
import { cldn } from '../../../../lib/img';
import { SITE } from '../../../../lib/site';
import { buildProductDescription } from '../../../../lib/productCopy';
import { Perfume } from '../../../../types';
import { productGroup, sizeKey } from '../../../../lib/catalogSeo';
import { getApprovedReviews, ratingJsonLd } from '../../../../lib/server/reviews';

async function findProduct(code: string) {
  const { products } = await getProducts();
  return products.find((p) => p.code.toUpperCase() === decodeURIComponent(code).toUpperCase() && p.visible !== false);
}

/** Relacionados: mismo género, prioriza familia/notas compartidas. */
function pickRelated(all: Perfume[], current: Perfume, count = 4): Perfume[] {
  const families = (current.family || '').toLowerCase().split(/[,\s]+/).filter(Boolean);
  return all
    .filter((p) => p.visible !== false && p.code !== current.code && p.gender === current.gender)
    .map((p) => {
      const fam = (p.family || '').toLowerCase();
      const famScore = families.filter((f) => fam.includes(f)).length;
      const inspScore = p.inspiration === current.inspiration ? 2 : 0;
      return { p, score: famScore + inspScore + (p.salesScore || 0) / 1000 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((x) => x.p);
}

export async function generateStaticParams() {
  const { products } = await getProducts();
  return products.filter((p) => p.visible !== false).map((p) => ({ code: p.code }));
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const perfume = await findProduct(code);
  if (!perfume) return { title: 'Producto no encontrado | Äura Fragancias' };
  const title = `${perfume.name} — Inspiración ${perfume.inspiration} | Äura`;
  const description = `${perfume.name}, inspiración olfativa de ${perfume.inspiration}. ${perfume.family}. Extrait de Parfum 30% en 10, 30 y 50 ml. Envíos a Paraguay.`;
  const image = new URL(cldn(perfume.imageUrl, 1000) || '/brand/aura-social-1200x630.png', SITE).href;
  return {
    title,
    description,
    alternates: { canonical: `/producto/${perfume.code}` },
    openGraph: { title, description, url: `${SITE}/producto/${perfume.code}`, images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function ProductoPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ size?: string | string[] }> }) {
  const [{ code }, query] = await Promise.all([params, searchParams]);
  const initialSize = `${sizeKey(query.size)} ML`;
  const [perfume, settings, { products }] = await Promise.all([findProduct(code), getSettings(), getProducts()]);
  if (!perfume) notFound();
  const reviews = await getApprovedReviews(perfume.code);

  const genderLabel = perfume.gender === 'Man' ? 'Hombre' : perfume.gender === 'Woman' ? 'Mujer' : 'Nicho & Unisex';
  const genderPath = perfume.gender === 'Man' ? '/hombres' : perfume.gender === 'Woman' ? '/mujeres' : '/unisex';
  const productUrl = `${SITE}/producto/${perfume.code}`;
  const description = buildProductDescription(perfume, settings);
  const related = pickRelated(products, perfume);
  const jsonLd = [
    {
      ...productGroup(perfume, settings, description),
      // aggregateRating + review solo con reseñas visibles en la página.
      ...ratingJsonLd(reviews),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE },
        { '@type': 'ListItem', position: 2, name: genderLabel, item: SITE + genderPath },
        { '@type': 'ListItem', position: 3, name: perfume.name, item: productUrl },
      ],
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <ProductView
        key={`${perfume.code}-${initialSize}`}
        initialSize={initialSize}
        perfume={perfume}
        description={description}
        related={related}
        breadcrumb={{ genderLabel, genderPath }}
        reviews={reviews}
      />
    </>
  );
}
