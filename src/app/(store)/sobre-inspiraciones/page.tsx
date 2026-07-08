import type { Metadata } from 'next';
import LegalArticle from '../../../components/LegalArticle';
import { LEGAL_TEXTS } from '../../../constants';

export const metadata: Metadata = {
  title: '¿Qué son las Inspiraciones Olfativas? | Äura Fragancias',
  description:
    'Las inspiraciones olfativas de Äura son formulaciones propias con 30% de concentración (Extrait de Parfum) que capturan el perfil aromático de las fragancias más icónicas. No son copias ni falsificaciones.',
  alternates: { canonical: '/sobre-inspiraciones' },
};

export default function SobreInspiracionesPage() {
  return <LegalArticle title={LEGAL_TEXTS.inspirations.title} content={LEGAL_TEXTS.inspirations.content} />;
}
