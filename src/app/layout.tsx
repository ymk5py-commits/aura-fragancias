import type { Metadata, Viewport } from 'next';
import { Bodoni_Moda, Jost } from 'next/font/google';
import Script from 'next/script';
import { GoogleAnalytics } from '@next/third-parties/google';
import './globals.css';
import Providers from './providers';
import MetaPixel from '../components/MetaPixel';
import CookieConsent from '../components/CookieConsent';
import { getProducts, getSettings } from '../lib/serverData';
import { SITE } from '../lib/site';
import { PIXEL_ID } from '../lib/pixel';

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;
const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
const GTAG_ID = GA4_ID || ADS_ID;

// Bodoni Moda: didone de alto contraste, mismo ADN que el wordmark Ä del logo.
// Jost: geométrica tipo Futura (código tipográfico clásico del lujo). Sin italics.
const bodoni = Bodoni_Moda({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
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
    <html lang="es" className={`${bodoni.variable} ${jost.variable}`}>
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        {/* Consent Mode v2 — default DENIED antes de cargar gtag (Ley 7593/2025 PY + EU/UK) */}
        {GTAG_ID && (
          <Script id="consent-default" strategy="beforeInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
              gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});
              gtag('set','url_passthrough',true);`}
          </Script>
        )}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([storeJsonLd, webSiteJsonLd]) }} />
      </head>
      <body className="bg-white text-zinc-900">
        <Providers settings={settings} products={productsData.products} source={productsData.source}>
          {children}
        </Providers>

        {/* Meta Pixel (init + PageView por ruta) */}
        <MetaPixel />

        {/* Google: GA4 y/o Google Ads (mismo gtag.js, config extra para Ads) */}
        {GTAG_ID && <GoogleAnalytics gaId={GTAG_ID} />}
        {GA4_ID && ADS_ID && (
          <Script id="google-ads-config" strategy="afterInteractive">
            {`gtag('config','${ADS_ID}');`}
          </Script>
        )}

        {/* Banner de consentimiento (solo si hay tags de Google) */}
        {GTAG_ID && <CookieConsent />}

        {/* Meta Pixel (noscript, fallback sin JS) */}
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img height="1" width="1" style={{ display: 'none' }} alt=""
            src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`} />
        </noscript>
      </body>
    </html>
  );
}
