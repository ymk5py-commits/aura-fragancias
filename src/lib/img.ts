/**
 * Optimiza URLs de Cloudinary insertando transformaciones (formato y calidad
 * automáticos + ancho). Reduce ~90% el peso de las imágenes.
 * Si la URL no es de Cloudinary o ya tiene transformaciones, la devuelve igual.
 */
export function cldn(url: string | undefined, width = 700): string {
  if (!url) return '';
  if (!url.includes('res.cloudinary.com/')) return url;
  // Evitar doble transformación
  if (/\/upload\/(f_auto|q_auto|w_\d|c_)/.test(url)) return url;
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width},dpr_auto/`);
}
