/**
 * Compresión de fotos en el navegador antes de subirlas a Firebase Storage.
 *
 * Las fotos del panel llegaban como PNG de 1080x1350 y ~2 MB; el optimizador
 * de Next las servía bien, pero cada primera carga en frío tardaba 5-8 s y
 * Storage guardaba el peso completo. Acá se re-encodean a JPEG (fondo blanco,
 * calidad MAX_QUALITY) y se limitan a MAX_SIDE px por el lado mayor. JPEG y no
 * WebP porque la misma URL va al catálogo de Meta (/feed-meta.xml) y a las
 * vistas previas de WhatsApp.
 *
 * Sin dependencias: createImageBitmap + canvas.toBlob.
 */

/** Lado mayor máximo en px. Las fotos del panel (1080x1350) quedan igual. */
export const MAX_SIDE = 2000;
/** Calidad JPEG (0-1). */
export const MAX_QUALITY = 0.85;

/** Medidas finales para que la imagen entre en `maxSide` sin deformarse ni agrandarse. */
export function fitWithin(width: number, height: number, maxSide: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width, height };
  const scale = maxSide / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** Nombre del archivo con extensión .jpg. */
export function jpegName(name: string): string {
  return name.replace(/\.[^./\\]+$/, '') + '.jpg';
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

/**
 * Devuelve la foto como JPEG comprimido. Si el navegador no puede decodificarla
 * o el resultado pesa más que el original, devuelve el archivo tal cual.
 */
export async function compressImage(
  file: File,
  { maxSide = MAX_SIDE, quality = MAX_QUALITY }: { maxSide?: number; quality?: number } = {},
): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file;
  }
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;

  let bitmap: ImageBitmap;
  try {
    // 'from-image' respeta la orientación EXIF de fotos sacadas con el celular.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }

  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    // JPEG no tiene transparencia: lo que era transparente pasa a blanco.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await toBlob(canvas, quality);
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], jpegName(file.name), { type: 'image/jpeg', lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}
