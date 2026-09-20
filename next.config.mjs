/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      // Fotos subidas desde el panel. Firebase Storage sirve las descargas desde
      // firebasestorage.googleapis.com con el bucket en la ruta, no como host.
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/v0/b/aura-fragancias.firebasestorage.app/o/**',
      },
    ],
  },
};
// Los banners y fotos locales cambian poco: una semana de caché en el navegador.
nextConfig.headers = async () => [
  {
    source: '/banners/:path*',
    headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }],
  },
];

export default nextConfig;
