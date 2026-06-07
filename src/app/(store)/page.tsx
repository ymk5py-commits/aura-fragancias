import Hero from '../../components/Hero';
import FeatureSection from '../../components/FeatureSection';
import PricingSection from '../../components/PricingSection';
import Wholesale from '../../components/Wholesale';
import TechnicalSection from '../../components/TechnicalSection';
import Reveal from '../../components/Reveal';
import ProductCard from '../../components/ProductCard';
import ScentFamilies from '../../components/ScentFamilies';
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

      <FeatureSection />

      <section id="top-ventas" className="py-16 sm:py-28 bg-white scroll-mt-24">
        <div className="container mx-auto px-3 sm:px-6">
          <Reveal className="text-center mb-12 sm:mb-16">
            <span className="text-aura-gold-deep font-semibold tracking-[0.4em] text-[10px] sm:text-[11px] uppercase mb-3 block">Los Favoritos</span>
            <h2 className="text-3xl sm:text-5xl font-luxury text-aura-ink mb-5">Top Ventas</h2>
            <div className="rule-gold w-20 mx-auto" />
          </Reveal>

          {bestSellers.length > 0 && (
            <Reveal className="mb-5 sm:mb-8">
              <ProductCard perfume={bestSellers[0]} rank={1} featured />
            </Reveal>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            {bestSellers.slice(1).map((p, i) => (
              <Reveal key={p.code} delay={(i % 4) * 70}>
                <ProductCard perfume={p} rank={i + 2} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <ScentFamilies />
      <PricingSection />
      <Wholesale />
      <TechnicalSection />
    </main>
  );
}
