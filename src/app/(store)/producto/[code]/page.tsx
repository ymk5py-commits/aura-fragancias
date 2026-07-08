import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductView from '../../../../components/ProductView';
import { getProducts, getSettings } from '../../../../lib/serverData';
import { cldn } from '../../../../lib/img';
import { SITE } from '../../../../lib/site';
import { buildProductDescription } from '../../../../lib/productCopy';
import { Perfume } from '../../../../types';

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
  const [perfume, settings, { products }] = await Promise.all([findProduct(code), getSettings(), getProducts()]);
  if (!perfume) notFound();

  const genderLabel = perfume.gender === 'Man' ? 'Hombre' : perfume.gender === 'Woman' ? 'Mujer' : 'Nicho & Unisex';
  const genderPath = perfume.gender === 'Man' ? '/hombres' : perfume.gender === 'Woman' ? '/mujeres' : '/unisex';
  const productUrl = `${SITE}/producto/${perfume.code}`;
  const description = buildProductDescription(perfume, settings);
  const related = pickRelated(products, perfume);
  const priceValidUntil = `${new Date().getFullYear()}-12-31`;

  const shippingDetails = {
    '@type': 'OfferShippingDetails',
    shippingRate: { '@type': 'MonetaryAmount', value: '0', currency: 'PYG' },
    shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'PY' },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
      transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 5, unitCode: 'DAY' },
    },
  };

  const returnPolicy = {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'PY',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: 7,
    returnMethod: 'https://schema.org/ReturnByMail',
    returnFees: 'https://schema.org/FreeReturn',
  };

  const offers = [
    { size: '10 ML', price: settings.price10 },
    { size: '30 ML', price: settings.price30 },
    { size: '50 ML', price: settings.price50 },
  ].map(({ size, price }) => ({
    '@type': 'Offer',
    name: `${perfume.name} — ${size}`,
    priceCurrency: 'PYG',
    price,
    priceValidUntil,
    availability: 'https://schema.org/InStock',
    itemCondition: 'https://schema.org/NewCondition',
    url: productUrl,
    seller: { '@type': 'Organization', name: 'Äura Fragancias' },
    shippingDetails,
    hasMerchantReturnPolicy: returnPolicy,
  }));

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: perfume.name,
      image: cldn(perfume.imageUrl, 800) || `${SITE}/logo-512.png`,
      description,
      sku: perfume.code,
      mpn: perfume.code,
      category: 'Health & Beauty > Personal Care > Cosmetics > Fragrance',
      brand: { '@type': 'Brand', name: 'Äura Fragancias' },
      offers,
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProductView
        perfume={perfume}
        description={description}
        related={related}
        breadcrumb={{ genderLabel, genderPath }}
      />
    </>
  );
}
