import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from './providers';
import { getProducts, getSettings } from '../lib/serverData';

const SITE = 'https://aurafrangancias.store';

export const viewport: Viewport = {
  themeColor: '#0c0a09',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: 'Äura Fragancias | Perfumes de Lujo Accesible en Paraguay · Extrait de Parfum 30%',
  description:
    'Alta perfumería en Paraguay con 30% de concentración (Extrait de Parfum). Inspiraciones olfativas premium de las fragancias más icónicas, con fijación y estela excepcionales. Envío gratis desde Gs. 300.000.',
  keywords: [
    'perfumes Paraguay', 'fragancias de lujo', 'Äura', 'perfumes premium Asunción',
    'inspiraciones olfativas', 'extrait de parfum', 'perfumes importados', 'perfumes mayoristas Paraguay',
  ],
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    siteName: 'Äura Fragancias',
    locale: 'es_PY',
    url: SITE,
    title: 'Äura Fragancias | Perfumes de Lujo Accesible · Extrait de Parfum 30%',
    description: 'Alta perfumería en Paraguay con 30% de concentración. Inspiraciones olfativas premium con fijación y estela excepcionales.',
    images: [{ url: '/logo-512.png', width: 512, height: 512 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Äura Fragancias | Perfumes de Lujo Accesible · Extrait de Parfum 30%',
    description: 'Alta perfumería en Paraguay con 30% de concentración. Inspiraciones olfativas premium.',
    images: ['/logo-512.png'],
  },
  icons: {
    icon: [{ url: '/logo.svg', type: 'image/svg+xml' }, { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' }],
    apple: '/apple-touch-icon.png',
  },
};

const storeJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Store',
  name: 'Äura Fragancias',
  description: 'Alta perfumería en Paraguay con 30% de concentración (Extrait de Parfum). Inspiraciones olfativas premium de lujo accesible.',
  image: `${SITE}/logo-512.png`,
  logo: `${SITE}/logo-512.png`,
  '@id': SITE,
  url: SITE,
  telephone: '+595994414986',
  priceRange: 'Gs. 30.000 - Gs. 120.000',
  currenciesAccepted: 'PYG',
  address: { '@type': 'PostalAddress', addressLocality: 'Asunción', addressRegion: 'Asunción', addressCountry: 'PY' },
  geo: { '@type': 'GeoCoordinates', latitude: -25.2637, longitude: -57.5759 },
  sameAs: [
    'https://www.facebook.com/aurafraganciaspy',
    'https://www.instagram.com/aura_fraganciaspy/',
    'https://www.tiktok.com/@aura_fraganciaspy',
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, productsData] = await Promise.all([getSettings(), getProducts()]);

  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd) }} />
      </head>
      <body className="bg-white text-zinc-900">
        <Providers settings={settings} products={productsData.products} source={productsData.source}>
          {children}
        </Providers>
        {/* Facebook Pixel (noscript) */}
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img height="1" width="1" style={{ display: 'none' }} alt=""
            src="https://www.facebook.com/tr?id=1238570975103624&ev=PageView&noscript=1" />
        </noscript>
      </body>
    </html>
  );
}
