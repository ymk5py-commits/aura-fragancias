import type { Metadata } from 'next';
import Link from 'next/link';
import CatalogImage from '../../../components/CatalogImage';
import { Search } from 'lucide-react';
import { getVisibleProducts, getSettings } from '../../../lib/serverData';
import { productLink, searchCatalog, sizeKey } from '../../../lib/catalogSeo';

export const metadata: Metadata = { title: 'Buscar fragancias | Äura', robots: { index: false, follow: true }, alternates: { canonical: '/buscar' } };
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; size?: string; genero?: string }> }) {
  const [params, products, settings] = await Promise.all([searchParams, getVisibleProducts(), getSettings()]);
  const query = typeof params.q === 'string' ? params.q.trim().slice(0, 100) : '';
  const size = params.size ? sizeKey(params.size) : undefined;
  const gender = ['Man', 'Woman', 'Unisex'].includes(params.genero || '') ? params.genero : '';
  const results = (query ? searchCatalog(products, query) : products).filter((p) => !gender || p.gender === gender);
  return <main className="min-h-screen bg-aura-ivory pb-16 pt-32 sm:pt-36"><div className="section-shell">
    <span className="eyebrow">Toda la colección Äura</span><h1 className="mt-4 font-luxury text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">Encontrá tu fragancia.</h1>
    <form action="/buscar" method="get" role="search" className="my-8 grid gap-3 rounded-sm border border-aura-ink/15 bg-white p-4 sm:grid-cols-[1fr_auto_auto_auto]">
      <label className="flex min-h-12 items-center gap-3"><Search size={18} className="shrink-0 text-aura-cognac" /><span className="sr-only">Nombre, código, inspiración o nota</span><input type="search" name="q" defaultValue={query} maxLength={100} placeholder="Fragancia, código, inspiración o nota…" className="w-full min-w-0 bg-transparent text-base outline-none" /></label>
      <label><span className="sr-only">Colección</span><select name="genero" defaultValue={gender} className="min-h-12 w-full border border-aura-ink/15 bg-aura-ivory px-3 text-sm"><option value="">Todas las colecciones</option><option value="Man">Hombres</option><option value="Woman">Mujeres</option><option value="Unisex">Unisex</option></select></label>
      <label><span className="sr-only">Presentación</span><select name="size" defaultValue={size || ''} className="min-h-12 w-full border border-aura-ink/15 bg-aura-ivory px-3 text-sm"><option value="">Todos los tamaños</option><option value="10">10 ml</option><option value="30">30 ml</option><option value="50">50 ml</option></select></label>
      <button className="min-h-12 bg-aura-wine px-6 text-sm font-semibold text-white">Buscar</button>
    </form>
    <p role="status" className="mb-6 text-sm text-aura-ink/65">{results.length} {results.length === 1 ? 'fragancia' : 'fragancias'}{query ? ` para “${query}”` : ''}{size ? ` · ${size} ml` : ''}</p>
    {results.length ? <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">{results.map((p, i) => <Link key={p.code} href={productLink(p.code, size)} className="group">
      <div className="relative aspect-[4/5] overflow-hidden bg-aura-sand">{p.imageUrl && <CatalogImage src={p.imageUrl} alt={`${p.name} — inspiración ${p.inspiration}`} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" priority={i < 2} className="object-cover transition-transform group-hover:scale-[1.03]" />}</div>
      <p className="mt-3 text-[10px] uppercase tracking-wider text-aura-cognac">Inspiración {p.inspiration}</p><h2 className="mt-2 font-luxury text-lg font-semibold leading-tight sm:text-xl">{p.name}</h2><p className="mt-2 text-xs text-aura-ink/60">{p.code} · {p.family}</p><p className="mt-3 text-sm font-semibold">{size ? `${size} ml · ` : 'Desde '}Gs. {settings[size ? `price${size}` : 'price10'].toLocaleString('es-PY')}</p>
    </Link>)}</div> : <div className="border border-aura-ink/15 p-8"><p>No encontramos una fragancia con esa combinación. Probá con otra nota o inspiración.</p><Link href="/buscar" className="mt-4 inline-flex min-h-11 items-center text-aura-wine underline">Ver toda la colección</Link></div>}
  </div></main>;
}
