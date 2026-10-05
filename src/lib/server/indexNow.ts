import { SITE } from '../site';
import { productLink, SIZE_KEYS } from '../catalogSeo';

// Clave pública de verificación: también se sirve en /<clave>.txt.
export const INDEXNOW_KEY = 'd5e49457d6e6e181042837619d3e53fa';
export function indexUrls(codes: string[]) {
  return [...new Set([SITE, `${SITE}/hombres`, `${SITE}/mujeres`, `${SITE}/unisex`, ...codes.flatMap((code) => [
    `${SITE}${productLink(code)}`, ...SIZE_KEYS.map((size) => `${SITE}${productLink(code, size)}`),
  ])])];
}
export async function sendIndexNow(codes: string[]) {
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ host: new URL(SITE).host, key: INDEXNOW_KEY, keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`, urlList: indexUrls(codes) }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`IndexNow respondió ${res.status}`);
}
