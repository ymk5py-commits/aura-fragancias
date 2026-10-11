import type { Metadata } from 'next';
import GiftCardProduct from '../../../components/GiftCardProduct';
import { SITE } from '../../../lib/site';
import { GIFT_CARD_IMAGE, GIFT_CARD_MIN } from '../../../lib/giftCards';

export const metadata: Metadata = {
  title: 'Gift Card Äura | Regalos desde Gs. 100.000',
  description: 'Regalá la libertad de elegir una fragancia. Gift Card Äura digital con monto personalizable desde Gs. 100.000 y vigencia de 60 días desde la confirmación del pago.',
  alternates: { canonical: '/gift-card' },
  openGraph: { title: 'Gift Card Äura · Un regalo para elegir', description: 'Desde Gs. 100.000 · Vigencia: 60 días desde la confirmación del pago.', images: [{ url: GIFT_CARD_IMAGE }], url: `${SITE}/gift-card` },
};

export default function GiftCardPage() {
  const structuredData = { '@context': 'https://schema.org', '@type': 'Product', name: 'Gift Card Äura de Gs. 100.000', sku: 'GIFT-CARD', image: `${SITE}${GIFT_CARD_IMAGE}`, description: 'Gift Card digital. Monto personalizable desde Gs. 100.000. Vigencia de 60 días desde la confirmación del pago. Entrega y canje por WhatsApp.', brand: { '@type': 'Brand', name: 'Äura' }, offers: { '@type': 'Offer', url: `${SITE}/gift-card`, priceCurrency: 'PYG', price: GIFT_CARD_MIN, availability: 'https://schema.org/InStock' } };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} /><GiftCardProduct /></>;
}
