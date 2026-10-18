/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: import.meta.dirname,
  },
  outputFileTracingIncludes: {
    '/api/perfume-art/*': ['./public/products/botanico-v3/_assets/**', './public/products/botanico-v4/_assets/**', './public/brand/aura-wordmark-black.svg'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    localPatterns: [
      { pathname: '**', search: '' },
      { pathname: '/api/perfume-art/*' },
    ],
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      // Fotos subidas desde el panel: almacenamiento del Supabase propio.
      { protocol: 'https', hostname: 'db.aurafragancias.store', pathname: '/storage/v1/object/public/**' },
      // Fotos antiguas (Firebase Storage): sirve las descargas desde
      // firebasestorage.googleapis.com con el bucket en la ruta, no como host.
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/v0/b/aura-fragancias.firebasestorage.app/o/**',
      },
    ],
  },
};
// Headers de seguridad en todas las rutas. Antes vivían en vercel.json; aquí valen igual
// en Vercel y en el servidor propio (Coolify).
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];
// Los banners y fotos locales cambian poco: una semana de caché en el navegador.
nextConfig.headers = async () => [
  { source: '/(.*)', headers: securityHeaders },
  {
    source: '/banners/:path*',
    headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }],
  },
];

export default nextConfig;
