import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { GUIDES } from '../lib/guides';

export default function GuideLinks() {
  return <section className="bg-aura-sand py-14 sm:py-24" aria-labelledby="guias-title">
    <div className="section-shell">
      <span className="eyebrow mb-4">Elegir se vuelve más fácil</span>
      <h2 id="guias-title" className="font-luxury text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">Una guía para tu próxima fragancia.</h2>
      <div className="mt-8 grid gap-4 md:grid-cols-3">{GUIDES.map((guide) => <Link key={guide.slug} href={`/guias/${guide.slug}`} className="group flex flex-col border border-aura-ink/15 bg-aura-ivory p-6 transition-colors hover:border-aura-wine">
        <span className="text-[10px] font-bold uppercase tracking-widest text-aura-cognac">{guide.eyebrow}</span>
        <h3 className="mt-4 font-luxury text-2xl font-semibold leading-tight">{guide.title}</h3>
        <p className="mb-6 mt-4 text-sm leading-relaxed text-aura-ink/65">{guide.description}</p>
        <span className="mt-auto flex items-center gap-3 text-xs font-semibold text-aura-wine">Leer guía <ArrowUpRight size={16} /></span>
      </Link>)}</div>
    </div>
  </section>;
}
