import type { Metadata } from 'next';
import PagoResultado from '../../../../components/PagoResultado';

export const metadata: Metadata = {
  title: 'Resultado del pago | Äura Fragancias',
  robots: { index: false, follow: false },
};

/**
 * Página a la que vuelve la clienta desde Pagopar. Consulta el estado real
 * del pago en /api/pagopar/estado (que a su vez pregunta a Pagopar).
 */
export default async function PagoPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  return <PagoResultado hash={hash} />;
}
