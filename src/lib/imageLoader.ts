import type { ImageLoaderProps } from 'next/image';

/**
 * Loader para next/image:
 * - URLs de Cloudinary → transformación on-the-fly (f_auto, q_auto, w_{width}):
 *   srcset responsive real servido por el CDN de Cloudinary.
 * - Resto (Firebase Storage, assets locales /banners) → optimizador de Next
 *   (/_next/image): redimensiona y convierte a WebP/AVIF. Sin esto, una foto
 *   subida desde el panel a Firebase pesaba 2 MB en la ficha.
 */
export default function smartImageLoader({ src, width, quality }: ImageLoaderProps): string {
  if (src.includes('res.cloudinary.com/')) {
    if (/\/upload\/(f_auto|q_auto|w_\d|c_)/.test(src)) return src;
    const q = quality ? `q_${quality}` : 'q_auto';
    return src.replace('/upload/', `/upload/f_auto,${q},w_${width}/`);
  }
  if (src.startsWith('data:') || src.startsWith('blob:')) return src;
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality || 75}`;
}
