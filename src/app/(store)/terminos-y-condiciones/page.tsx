import type { Metadata } from 'next';
import LegalArticle from '../../../components/LegalArticle';
import { LEGAL_TEXTS } from '../../../constants';

export const metadata: Metadata = {
  title: 'Términos y Condiciones | Äura Fragancias',
  description:
    'Términos y condiciones de compra en Äura Fragancias: pedidos por WhatsApp, precios en guaraníes, stock y responsabilidad. Perfumería de inspiraciones olfativas en Paraguay.',
  alternates: { canonical: '/terminos-y-condiciones' },
};

export default function TerminosPage() {
  return <LegalArticle title={LEGAL_TEXTS.terms.title} content={LEGAL_TEXTS.terms.content} />;
}
