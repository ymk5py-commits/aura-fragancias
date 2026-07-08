import type { ImageLoaderProps } from 'next/image';

/**
 * Loader para next/image:
 * - URLs de Cloudinary → transformación on-the-fly (f_auto, q_auto, w_{width}):
 *   srcset responsive real servido por el CDN de Cloudinary.
 * - Resto (assets locales /banners, Firebase Storage) → se sirven tal cual.
 */
export default function smartImageLoader({ src, width, quality }: ImageLoaderProps): string {
  if (!src.includes('res.cloudinary.com/')) return src;
  if (/\/upload\/(f_auto|q_auto|w_\d|c_)/.test(src)) return src;
  const q = quality ? `q_${quality}` : 'q_auto';
  return src.replace('/upload/', `/upload/f_auto,${q},w_${width}/`);
}
