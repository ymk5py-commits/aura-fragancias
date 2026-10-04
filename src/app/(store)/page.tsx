import Hero from '../../components/Hero';
import FeatureSection from '../../components/FeatureSection';
import PricingSection from '../../components/PricingSection';
import Wholesale from '../../components/Wholesale';
import TechnicalSection from '../../components/TechnicalSection';
import HomeFaq from '../../components/HomeFaq';
import Reveal from '../../components/Reveal';
import ProductCard from '../../components/ProductCard';
import ScentFamilies from '../../components/ScentFamilies';
import InspirationsMarquee from '../../components/InspirationsMarquee';
import AsciiEditorial from '../../components/AsciiEditorial';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getVisibleProducts, getSettings } from '../../lib/serverData';
import { SALES_BY_CODE, TOP_SELLERS_COUNT } from '../../constants';

export default async function HomePage() {
  const [products, settings] = await Promise.all([getVisibleProducts(), getSettings()]);

  const bestSellers = [...products]
    .map((p) => ({ p, score: (p.salesScore || 0) || SALES_BY_CODE[p.code] || (p.badge === 'Bestseller' ? 1 : 0) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_SELLERS_COUNT)
    .map((x) => x.p);

  return (
    <main>
      <Hero title={settings.heroTitle} subtitle={settings.heroSubtitle} image={settings.heroImage} />

      <InspirationsMarquee />
      <AsciiEditorial />

      <section id="top-ventas" className="relative py-20 sm:py-32 bg-aura-ivory scroll-mt-24 aura-grid overflow-hidden">
        <div className="section-shell relative">
          <Reveal className="mb-12 sm:mb-16 grid gap-7 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <span className="eyebrow mb-4">Elegidos por nuestros clientes</span>
              <h2 className="max-w-3xl text-[clamp(2.8rem,7vw,6.4rem)] font-luxury font-semibold leading-[0.92] tracking-[-0.055em] text-aura-ink">
                Los aromas que dejan <span className="text-aura-cognac">huella.</span>
              </h2>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-3 md:justify-end">
              {[
                { label: 'Hombres', href: '/hombres' },
                { label: 'Mujeres', href: '/mujeres' },
                { label: 'Unisex', href: '/unisex' },
              ].map(({ label, href }) => (
                <Link key={href} href={href} className="group inline-flex min-h-11 items-center gap-2 border-b border-aura-ink/30 text-[10px] font-bold uppercase tracking-[0.16em] text-aura-ink transition-colors hover:border-aura-cognac hover:text-aura-cognac">
                  {label}
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </Link>
              ))}
            </div>
          </Reveal>

          {bestSellers.length > 0 && (
            <Reveal className="mb-5 sm:mb-8">
              <ProductCard perfume={bestSellers[0]} rank={1} featured />
            </Reveal>
          )}

          <div className="mt-8 grid grid-cols-1 gap-x-3 gap-y-9 min-[360px]:grid-cols-2 sm:gap-x-7 sm:gap-y-12 lg:grid-cols-4">
            {bestSellers.slice(1).map((p, i) => (
              <Reveal key={p.code} delay={(i % 4) * 70}>
                <ProductCard perfume={p} rank={i + 2} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <FeatureSection />
      <ScentFamilies />
      <PricingSection />
      <Wholesale />
      <TechnicalSection />
      <HomeFaq />
    </main>
  );
}