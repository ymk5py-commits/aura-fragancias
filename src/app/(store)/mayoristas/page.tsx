import type { Metadata } from 'next';
import Link from 'next/link';
import Wholesale from '../../../components/Wholesale';
import { SITE } from '../../../lib/site';

export const metadata: Metadata = {
  title: 'Perfumes por Mayor en Paraguay — Ventas Mayoristas | Äura Fragancias',
  description:
    'Revendé perfumes Extrait de Parfum (30% de concentración) con margen sugerido superior al 100%. Escalas desde 10 unidades, asesoramiento y envíos a todo Paraguay. Solicitá la lista mayorista por WhatsApp.',
  alternates: { canonical: '/mayoristas' },
};

const FAQS = [
  {
    q: '¿Cuál es el pedido mínimo para acceder al precio mayorista?',
    a: 'El precio mayorista arranca desde 10 unidades. Trabajamos con dos escalas de inversión: Escala 1 de 10 a 20 unidades y Escala 2 de 30 a 50 unidades, con mejor precio por volumen.',
  },
  {
    q: '¿Qué margen de ganancia deja revender perfumes Äura?',
    a: 'El margen de ganancia sugerido es superior al 100% sobre el precio mayorista. Al ser Extrait de Parfum con 30% de concentración y fijación de 8 a 12 horas, el producto genera recompra.',
  },
  {
    q: '¿Hacen envíos mayoristas al interior de Paraguay?',
    a: 'Sí. Despachamos a todo el país: entregas en 24 a 48 horas hábiles en Asunción y Gran Asunción, y por encomienda al interior (generalmente 2 a 5 días hábiles).',
  },
  {
    q: '¿Los perfumes son originales o inspiraciones?',
    a: 'Son inspiraciones olfativas: formulaciones propias de Äura con esencias premium importadas y 30% de concentración. No son copias ni falsificaciones; las marcas mencionadas se usan solo como referencia olfativa.',
  },
  {
    q: '¿Cómo solicito la lista de precios mayorista?',
    a: 'Escribinos por WhatsApp al +595 994 414986 con el mensaje "Quiero ser mayorista" y te enviamos la lista de precios vigente, el catálogo completo y el asesoramiento inicial sin costo.',
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE },
    { '@type': 'ListItem', position: 2, name: 'Mayoristas', item: `${SITE}/mayoristas` },
  ],
};

export default function MayoristasPage() {
  return (
    <main className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([faqJsonLd, breadcrumbJsonLd]) }} />

      {/* Encabezado */}
      <section className="bg-aura-ink text-white pt-40 pb-16 sm:pt-44 sm:pb-20">
        <div className="container mx-auto px-5 sm:px-6 max-w-4xl text-center">
          <span className="text-aura-gold font-semibold tracking-[0.4em] text-[10px] sm:text-[11px] uppercase mb-5 block">
            Negocio Äura · Reventa
          </span>
          <h1 className="text-4xl sm:text-6xl font-luxury leading-tight mb-6">
            Perfumes por Mayor en <span className="text-champagne">Paraguay</span>
          </h1>
          <p className="text-white/65 text-base sm:text-lg font-light leading-relaxed max-w-2xl mx-auto">
            Emprendé con la línea de inspiraciones olfativas más concentrada del mercado:
            Extrait de Parfum al 30%, escalas de compra desde 10 unidades y un margen de
            ganancia sugerido superior al 100%. Te acompañamos con asesoramiento para elegir
            los perfumes más vendidos de la temporada y despachamos a todo el país.
          </p>
        </div>
      </section>

      {/* Escalas + beneficios (sección existente) */}
      <Wholesale />

      {/* Preguntas frecuentes */}
      <section aria-labelledby="faq-mayoristas" className="py-20 sm:py-24 bg-white">
        <div className="container mx-auto px-5 sm:px-6 max-w-3xl">
          <h2 id="faq-mayoristas" className="text-3xl sm:text-4xl font-luxury text-zinc-900 text-center mb-12">
            Preguntas frecuentes de mayoristas
          </h2>
          <div className="divide-y divide-zinc-100 border-y border-zinc-100">
            {FAQS.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex items-center justify-between cursor-pointer list-none text-left">
                  <h3 className="text-base sm:text-lg font-semibold text-zinc-900 pr-6">{f.q}</h3>
                  <span className="text-aura-gold-deep text-xl leading-none transition-transform duration-300 group-open:rotate-45 shrink-0">+</span>
                </summary>
                <p className="mt-3 text-zinc-600 text-[15px] leading-relaxed font-light">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-10 text-center text-sm text-zinc-500">
            ¿Querés saber qué son exactamente nuestras inspiraciones?{' '}
            <Link href="/sobre-inspiraciones" className="text-aura-gold-deep font-semibold hover:underline">
              Leé la aclaración completa acá
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
