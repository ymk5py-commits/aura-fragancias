import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GUIDES } from '../../../../lib/guides';
import { getVisibleProducts } from '../../../../lib/serverData';
import { SITE } from '../../../../lib/site';
import ProductCard from '../../../../components/ProductCard';

export function generateStaticParams() { return GUIDES.map((g) => ({ slug: g.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) return { title: 'Guía no encontrada | Äura' };
  return { title: `${guide.title} | Äura`, description: guide.description, alternates: { canonical: `/guias/${guide.slug}` }, openGraph: { title: guide.title, description: guide.description, url: `${SITE}/guias/${guide.slug}` } };
}
export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) notFound();
  const products = (await getVisibleProducts()).filter(guide.matches).slice(0, 4);
  const url = `${SITE}/guias/${slug}`;
  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'Article', headline: guide.title, description: guide.description, datePublished: guide.date, dateModified: guide.date, author: { '@type': 'Organization', name: 'Äura Fragancias', url: SITE }, image: `${SITE}/brand/aura-social-1200x630.png`, mainEntityOfPage: url },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE }, { '@type': 'ListItem', position: 2, name: 'Guías', item: `${SITE}/guias` }, { '@type': 'ListItem', position: 3, name: guide.title, item: url }] },
  ];
  return <main className="bg-aura-ivory pb-16 pt-32 sm:pt-36">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <div className="section-shell">
      <nav aria-label="Ruta de navegación" className="mb-8 text-xs text-aura-cognac"><Link href="/">Inicio</Link> / <Link href="/guias">Guías</Link></nav>
      <article className="mx-auto max-w-3xl">
        <span className="eyebrow">{guide.eyebrow}</span>
        <h1 className="mt-5 font-luxury text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-6xl">{guide.title}</h1>
        <p className="mt-7 text-lg leading-relaxed text-aura-ink/75">{guide.intro}</p>
        {guide.sections.map((s) => <section key={s.title} className="mt-9 border-t border-aura-ink/12 pt-7"><h2 className="font-luxury text-2xl font-semibold">{s.title}</h2><p className="mt-4 text-base leading-relaxed text-aura-ink/70">{s.text}</p></section>)}
        <p className="mt-8 text-xs text-aura-ink/50">Guía de Äura Fragancias · Actualizada el 4 de octubre de 2026</p>
        <Link href="/buscar" className="mt-8 inline-flex min-h-12 items-center bg-aura-wine px-6 text-sm font-semibold text-white">Explorar todas las fragancias</Link>
      </article>
      {products.length > 0 && <section className="mt-16" aria-labelledby="guide-products"><h2 id="guide-products" className="mb-7 font-luxury text-3xl font-semibold">Inspiraciones para explorar</h2><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{products.map((p) => <ProductCard key={p.code} perfume={p} />)}</div></section>}
      <nav aria-label="Otras guías" className="mt-12 flex flex-wrap gap-4 border-t border-aura-ink/15 pt-8">{GUIDES.filter((g) => g.slug !== slug).map((g) => <Link key={g.slug} href={`/guias/${g.slug}`} className="text-sm text-aura-cognac underline underline-offset-4">{g.title}</Link>)}</nav>
    </div>
  </main>;
}
