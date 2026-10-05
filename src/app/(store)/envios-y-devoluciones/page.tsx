import type { Metadata } from 'next';
import LegalArticle from '../../../components/LegalArticle';
import { LEGAL_TEXTS } from '../../../constants';

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
        <h2 className="text-2xl font-luxury text-zinc-900 mb-6">Cómo se cotiza tu envío</h2>
        <p className="text-base leading-relaxed text-zinc-600">El delivery se cotiza individualmente según tu dirección. Coordinamos el importe antes de confirmar el pedido, tanto para Asunción y Gran Asunción como para el interior del país.</p>
        <p className="mt-5 border border-zinc-100 bg-aura-ivory px-5 py-4 text-sm font-semibold text-aura-gold-deep">En compras desde Gs. 300.000, el envío es gratis.</p>
      </div>
    </LegalArticle>
  );
}
