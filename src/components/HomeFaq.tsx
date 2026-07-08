import Link from 'next/link';

const FAQS = [
  {
    q: '¿Qué es un Extrait de Parfum con 30% de concentración?',
    a: 'Es el formato más concentrado de la perfumería: el 30% del contenido es esencia pura (un eau de toilette suele tener 5-15%). Por eso los perfumes Äura logran una fijación de 8 a 12 horas y una estela notable con pocas pulverizaciones.',
  },
  {
    q: '¿Qué significa que un perfume sea una "inspiración olfativa"?',
    a: 'Es una formulación propia de Äura que captura el perfil aromático de una fragancia icónica. No son copias ni falsificaciones: las marcas mencionadas en el catálogo se usan únicamente como referencia olfativa para que identifiques el estilo que buscás.',
  },
  {
    q: '¿Cuánto dura el perfume en la piel?',
    a: 'Entre 8 y 12 horas según la variante, la piel y el clima. Cada frasco pasa por 21 días de macerado y reposo antes del envío, lo que potencia la fijación y la estela.',
  },
  {
    q: '¿Cuánto cuesta el envío y cuándo es gratis?',
    a: 'El envío es gratis en compras desde Gs. 300.000. Para compras menores: Asunción Gs. 20.000, Gran Asunción Gs. 25.000 e interior del país por encomienda Gs. 35.000. Entregas en 24-48 horas hábiles en Asunción y Gran Asunción.',
  },
  {
    q: '¿Cómo compro y cuáles son los medios de pago?',
    a: 'Elegís tus perfumes en la web, los agregás al carrito y confirmás el pedido por WhatsApp, donde te asesoramos en el momento. Aceptamos transferencia bancaria y pago QR.',
  },
  {
    q: '¿Puedo revender perfumes Äura?',
    a: 'Sí. Tenemos un programa de ventas mayoristas con escalas desde 10 unidades y un margen de ganancia sugerido superior al 100%. Pedí la lista mayorista por WhatsApp.',
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

/** FAQ de la home: server-rendered, citable por buscadores y motores de IA. */
export default function HomeFaq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="py-20 sm:py-28 bg-aura-ivory scroll-mt-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <div className="container mx-auto px-5 sm:px-6 max-w-3xl">
        <div className="text-center mb-12">
          <span className="text-aura-gold-deep font-semibold tracking-[0.4em] text-[10px] sm:text-[11px] uppercase mb-3 block">
            Resolvé tus dudas
          </span>
          <h2 id="faq-title" className="text-3xl sm:text-5xl font-luxury text-aura-ink mb-5">Preguntas Frecuentes</h2>
          <div className="rule-gold w-20 mx-auto" />
        </div>

        <div className="divide-y divide-zinc-200/70 border-y border-zinc-200/70 bg-white/40">
          {FAQS.map((f) => (
            <details key={f.q} className="group py-5 px-4 sm:px-6">
              <summary className="flex items-center justify-between cursor-pointer list-none text-left">
                <h3 className="text-base sm:text-lg font-semibold text-zinc-900 pr-6">{f.q}</h3>
                <span className="text-aura-gold-deep text-xl leading-none transition-transform duration-300 group-open:rotate-45 shrink-0">+</span>
              </summary>
              <p className="mt-3 text-zinc-600 text-[15px] leading-relaxed font-light">{f.a}</p>
            </details>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-zinc-500">
          Más detalles en{' '}
          <Link href="/envios-y-devoluciones" className="text-aura-gold-deep font-semibold hover:underline">Envíos y Devoluciones</Link>
          {' '}·{' '}
          <Link href="/sobre-inspiraciones" className="text-aura-gold-deep font-semibold hover:underline">Sobre las Inspiraciones</Link>
          {' '}·{' '}
          <Link href="/mayoristas" className="text-aura-gold-deep font-semibold hover:underline">Mayoristas</Link>
        </p>
      </div>
    </section>
  );
}
