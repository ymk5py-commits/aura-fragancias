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
      { protocol: 'https', hostname: '*.firebasestorage.app' },
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
