import type { Metadata } from 'next';
import LegalArticle from '../../../components/LegalArticle';
import { LEGAL_TEXTS, SHIPPING_ZONES } from '../../../constants';

export const metadata: Metadata = {
  title: 'Envíos y Devoluciones en Paraguay | Äura Fragancias',
  description:
    'Envíos a todo Paraguay: 24-48h en Asunción y Gran Asunción, 2-5 días al interior. Envío gratis en compras desde Gs. 300.000. Política de cambios y devoluciones de Äura Fragancias.',
  alternates: { canonical: '/envios-y-devoluciones' },
};

export default function EnviosPage() {
  return (
    <LegalArticle title={LEGAL_TEXTS.shipping.title} content={LEGAL_TEXTS.shipping.content}>
      <div className="mt-12">
        <h2 className="text-2xl font-luxury text-zinc-900 mb-6">Tarifas de envío por zona</h2>
        <ul className="divide-y divide-zinc-100 border border-zinc-100">
          {SHIPPING_ZONES.map((z) => (
            <li key={z.name} className="flex items-center justify-between px-5 py-4">
              <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-zinc-600">{z.name}</span>
              <span className="text-sm font-semibold text-zinc-900 tabular">Gs. {z.price.toLocaleString('es-PY')}</span>
            </li>
          ))}
          <li className="flex items-center justify-between px-5 py-4 bg-aura-ivory">
            <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-zinc-600">Compras desde Gs. 300.000</span>
            <span className="text-sm font-semibold text-aura-gold-deep">Envío gratis</span>
          </li>
        </ul>
      </div>
    </LegalArticle>
  );
}
