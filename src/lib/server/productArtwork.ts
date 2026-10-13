import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { BOTANICAL_KEYS, type BotanicalKey } from '../productArtwork';
import { LABEL_GLYPHS } from './labelGlyphs';

const wine = '#580c17';
const assets = path.join(process.cwd(), 'public/products/botanico-v3/_assets');
const floral = new Set(['peonia', 'rosa', 'azahar', 'jazmin', 'iris', 'orquidea', 'lavanda', 'flor-durazno', 'magnolia', 'fresia', 'nardo', 'lirio-valles']);

export function parseArtworkNotes(value: string): BotanicalKey[] | null {
  if (!value) return [];
  const keys = value.split(',');
  if (keys.length > 3 || new Set(keys).size !== keys.length || keys.some(key => !BOTANICAL_KEYS.includes(key))) return null;
  return keys as BotanicalKey[];
}

function label(y: number, text: string, size: number, spacing = 1): string {
  const scale = size / LABEL_GLYPHS.unitsPerEm;
  const glyphs = Array.from(text, char => LABEL_GLYPHS.glyphs[char as keyof typeof LABEL_GLYPHS.glyphs]);
  const width = glyphs.reduce((total, glyph) => total + glyph.advance * scale, 0) + spacing * (glyphs.length - 1);
  let x = 540 - width / 2;
  return glyphs.map(glyph => {
    const outline = `<path d="${glyph.path}" transform="translate(${x} ${y}) scale(${scale} ${-scale})" fill="${wine}"/>`;
    x += glyph.advance * scale + spacing;
    return outline;
  }).join('');
}

/** Composición fotográfica compartida por la web y los carruseles. */
export async function productSceneSvg(code: string, keys: BotanicalKey[]): Promise<string> {
  const [bottle, wordmark, ...props] = await Promise.all([
    readFile(path.join(assets, 'frasco.png')),
    readFile(path.join(process.cwd(), 'public/brand/aura-wordmark-black.svg'), 'utf8'),
    ...keys.map(key => readFile(path.join(assets, `${key}.png`))),
  ]);
  const image = (id: string, bytes: Buffer, x: number, y: number, w: number, h: number) => `<image id="${id}" href="data:image/png;base64,${bytes.toString('base64')}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMax meet"/>`;
  const traces = wordmark.slice(wordmark.indexOf('>') + 1, wordmark.lastIndexOf('</svg>')).replaceAll('#000000', wine);
  const placements = keys.map((key, index) => {
    if (index === 0) return floral.has(key) ? { x: 165, y: 675, w: 330, h: 235 } : { x: 180, y: 716, w: 275, h: 200 };
    if (index === 1) return floral.has(key) ? { x: 650, y: 682, w: 300, h: 230 } : { x: 660, y: 717, w: 280, h: 205 };
    return { x: 310, y: 804, w: 235, h: 125 };
  });
  const definitions = props.map((bytes, i) => { const p = placements[i]; return image(`note-${i}`, bytes, p.x, p.y, p.w, p.h); }).join('');
  const propShadow = (i: number) => {
    const p = placements[i], base = p.y + p.h;
    return `<ellipse cx="${p.x + p.w / 2}" cy="${base - 3}" rx="${p.w * .3}" ry="7" fill="#604733" opacity=".13" filter="url(#contact)"/>
      <g filter="url(#cast)"><use href="#note-${i}" transform="matrix(1 0 -.28 -.1 ${base * .28} ${base * 1.1})"/></g>`;
  };
  return `<defs>
      ${image('bottle-photo', bottle, 280, 266, 520, 650)}${definitions}
      <radialGradient id="ground"><stop offset="0" stop-color="#6e5743" stop-opacity=".20"/><stop offset=".55" stop-color="#6e5743" stop-opacity=".07"/><stop offset="1" stop-color="#6e5743" stop-opacity="0"/></radialGradient>
      <filter id="contact" x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation="5"/></filter>
      <filter id="cast" x="-50%" y="-50%" width="200%" height="200%"><feColorMatrix type="matrix" values="0 0 0 0 .22  0 0 0 0 .15  0 0 0 0 .10  0 0 0 .24 0"/><feGaussianBlur stdDeviation="5"/></filter>
      <linearGradient id="reflection-fade" x1="0" y1="891" x2="0" y2="928" gradientUnits="userSpaceOnUse"><stop stop-color="white" stop-opacity=".12"/><stop offset="1" stop-color="black"/></linearGradient>
      <mask id="reflection-mask"><rect x="330" y="891" width="430" height="37" fill="url(#reflection-fade)"/></mask>
    </defs>
    <ellipse cx="590" cy="904" rx="340" ry="55" fill="url(#ground)"/>
    <g filter="url(#cast)"><use href="#bottle-photo" transform="matrix(1 0 -.32 -.06 285.12 944.46)"/></g>
    ${placements.slice(0, 2).map((_, i) => propShadow(i)).join('')}
    <ellipse cx="540" cy="893" rx="151" ry="15" fill="#5d4532" opacity=".26" filter="url(#contact)"/>
    ${placements.slice(0, 2).map((_, i) => `<use href="#note-${i}"/>`).join('')}
    <g mask="url(#reflection-mask)"><use href="#bottle-photo" transform="matrix(1 0 0 -1 0 1782)"/></g>
    <use href="#bottle-photo"/>
    <svg x="488" y="582" width="104" height="34.74" viewBox="0 0 1889 631">${traces}</svg>
    ${label(666, code, 27, 2)}${label(714, 'EXTRAIT DE PARFUM', 8.5)}${label(784, '50 ml · 30%', 10, 0)}
    ${placements.length > 2 ? propShadow(2) + '<use href="#note-2"/>' : ''}`;
}

// Assets locales: no hay consultas ni generación de IA al navegar.
export async function renderProductArtwork(code: string, keys: BotanicalKey[]): Promise<Buffer> {
  const scene = await productSceneSvg(code, keys);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><rect width="1080" height="1350" fill="#f8f5f0"/><g transform="translate(-216 -170) scale(1.4)">${scene}</g></svg>`;
  return sharp(Buffer.from(svg)).resize(960, 1200).jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toBuffer();
}

/** Vista rápida: transparencia real y encuadre ajustado al frasco y sus notas. */
export async function renderProductCutout(code: string, keys: BotanicalKey[]): Promise<Buffer> {
  const scene = await productSceneSvg(code, keys);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="820" viewBox="110 235 900 738">${scene}</svg>`;
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}
