import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductView from '../../../../components/ProductView';
import { getProducts, getSettings } from '../../../../lib/serverData';
import { cldn } from '../../../../lib/img';

const SITE = 'https://aurafrangancias.store';

async function findProduct(code: string) {
  const { products } = await getProducts();
  return products.find((p) => p.code.toUpperCase() === decodeURIComponent(code).toUpperCase() && p.visible !== false);
}

export async function generateStaticParams() {
  const { products } = await getProducts();
  return products.filter((p) => p.visible !== false).map((p) => ({ code: p.code }));
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const perfume = await findProduct(code);
  if (!perfume) return { title: 'Producto no encontrado | Äura Fragancias' };
  const title = `${perfume.name} — Inspiración ${perfume.inspiration} | Äura Fragancias`;
  const description = `${perfume.name}: inspiración olfativa de ${perfume.inspiration}, familia ${perfume.family}. Extrait de Parfum 30%, fijación ${perfume.duration}. Envío a todo Paraguay.`;
  const image = cldn(perfume.imageUrl, 800) || `${SITE}/logo-512.png`;
  return {
    title,
    description,
    alternates: { canonical: `/producto/${perfume.code}` },
    openGraph: { title, description, url: `${SITE}/producto/${perfume.code}`, images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function ProductoPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [perfume, settings] = await Promise.all([findProduct(code), getSettings()]);
  if (!perfume) notFound();

  const genderLabel = perfume.gender === 'Man' ? 'Hombre' : perfume.gender === 'Woman' ? 'Mujer' : 'Nicho & Unisex';
  const genderPath = perfume.gender === 'Man' ? '/hombres' : perfume.gender === 'Woman' ? '/mujeres' : '/unisex';

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: perfume.name,
      image: cldn(perfume.imageUrl, 800) || `${SITE}/logo-512.png`,
      description: `Inspiración olfativa de ${perfume.inspiration}. Familia ${perfume.family}. Extrait de Parfum 30% con fijación de ${perfume.duration}.`,
      sku: perfume.code,
      brand: { '@type': 'Brand', name: 'Äura Fragancias' },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'PYG',
        price: settings.price10,
        availability: 'https://schema.org/InStock',
        url: `${SITE}/producto/${perfume.code}`,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE },
        { '@type': 'ListItem', position: 2, name: genderLabel, item: SITE + genderPath },
        { '@type': 'ListItem', position: 3, name: perfume.name, item: `${SITE}/producto/${perfume.code}` },
      ],
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProductView perfume={perfume} />
    </>
  );
}
