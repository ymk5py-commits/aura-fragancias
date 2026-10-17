import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Jost } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import MarketingTags from '../components/MarketingTags';
import CookieConsent from '../components/CookieConsent';
import { getProducts, getSettings } from '../lib/serverData';
import { SITE } from '../lib/site';

// Bricolage Grotesque aporta una voz contemporánea y propia sin recurrir al
// serif editorial genérico. Jost mantiene el cuerpo claro y geométrico.
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const jost = Jost({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#580c17',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  verification: {
    google: 'wH10kV5eETSoJqom4VlMCDfUsT0g_8-5zPiQZ9h3NWc',
    other: { 'msvalidate.01': '7C48645DA64DE74C9B7AC4411773FEB6' },
  },
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
    images: [{ url: '/brand/aura-social-1200x630.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Äura Fragancias | Perfumes de Lujo Accesible · Extrait de Parfum 30%',
    description: 'Alta perfumería en Paraguay con 30% de concentración. Inspiraciones olfativas premium.',
    images: ['/brand/aura-social-1200x630.png'],
  },
  icons: {
    icon: [{ url: '/brand/aura-icon.svg', type: 'image/svg+xml' }, { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' }],
    apple: '/apple-touch-icon.png',
  },
};

const storeJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'OnlineStore',
  name: 'Äura Fragancias',
  description: 'Alta perfumería en Paraguay con 30% de concentración (Extrait de Parfum). Inspiraciones olfativas premium de lujo accesible.',
  image: `${SITE}/brand/aura-social-1200x630.png`,
  logo: `${SITE}/brand/aura-wordmark-burgundy.png`,
  '@id': SITE,
  url: SITE,
  telephone: '+595994414986',
  priceRange: 'Gs. 30.000 - Gs. 120.000',
  currenciesAccepted: 'PYG',
  areaServed: { '@type': 'Country', name: 'Paraguay' },
  sameAs: [
    'https://www.facebook.com/aurafraganciaspy',
    'https://www.instagram.com/aura_fraganciaspy/',
    'https://www.tiktok.com/@aura_fraganciaspy',
  ],
};

const webSiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Äura Fragancias',
  url: SITE,
  inLanguage: 'es-PY',
  publisher: { '@id': SITE },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, productsData] = await Promise.all([getSettings(), getProducts()]);

  return (
    <html lang="es" className={`${bricolage.variable} ${jost.variable}`}>
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([storeJsonLd, webSiteJsonLd]) }} />
      </head>
      <body className="bg-aura-ivory text-aura-ink">
        <Providers settings={settings} products={productsData.products} source={productsData.source}>
          {children}
        </Providers>

        <MarketingTags />
        <CookieConsent />
      </body>
    </html>
  );
}
