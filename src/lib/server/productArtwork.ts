import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { BOTANICAL_KEYS, type BotanicalKey } from '../productArtwork';
import { LABEL_GLYPHS } from './labelGlyphs';

const wine = '#580c17';
const assets = path.join(process.cwd(), 'public/products/botanico/_assets');
const floral = new Set(['peonia', 'rosa', 'azahar', 'jazmin', 'iris', 'orquidea', 'lavanda', 'flor-durazno']);

export function parseArtworkNotes(value: string): BotanicalKey[] | null {
  if (!value) return [];
  const keys = value.split(',');
  if (keys.length > 3 || new Set(keys).size !== keys.length || keys.some(key => !BOTANICAL_KEYS.includes(key))) return null;
  return keys as BotanicalKey[];
}

// Se reutilizan assets locales optimizados; no se genera ni consulta IA al navegar.
export async function renderProductArtwork(code: string, keys: BotanicalKey[]): Promise<Buffer> {
  const [bottle, wordmark, ...props] = await Promise.all([
    readFile(path.join(assets, 'frasco.png')),
    readFile(path.join(process.cwd(), 'public/brand/aura-wordmark-black.svg'), 'utf8'),
    ...keys.map(key => readFile(path.join(assets, `${key}.png`))),
  ]);
  const image = (bytes: Buffer, x: number, y: number, w: number, h: number) => `<image href="data:image/png;base64,${bytes.toString('base64')}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
  const traces = wordmark.slice(wordmark.indexOf('>') + 1, wordmark.lastIndexOf('</svg>')).replaceAll('#000000', wine);
  const label = (y: number, text: string, size: number, spacing = 1) => {
    const scale = size / LABEL_GLYPHS.unitsPerEm;
    const glyphs = Array.from(text, char => LABEL_GLYPHS.glyphs[char as keyof typeof LABEL_GLYPHS.glyphs]);
    const width = glyphs.reduce((total, glyph) => total + glyph.advance * scale, 0) + spacing * (glyphs.length - 1);
    let x = 540 - width / 2;
    return glyphs.map(glyph => {
      const outline = `<path d="${glyph.path}" transform="translate(${x} ${y}) scale(${scale} ${-scale})" fill="${wine}"/>`;
      x += glyph.advance * scale + spacing;
      return outline;
    }).join('');
  };
  const garnish = keys.map((key, index) => {
    const flower = floral.has(key);
    if (index === 0) return image(props[index], flower ? 220 : 235, flower ? 657 : 723, flower ? 350 : 290, flower ? 263 : 218);
    if (index === 1) return image(props[index], 630, flower ? 665 : 741, flower ? 320 : 280, flower ? 240 : 210);
    return image(props[index], 290, 801, 230, 173);
  });
  // La misma composición de los carruseles, ampliada y centrada para tarjetas 4:5.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
    <rect width="1080" height="1350" fill="#f8f5f0"/>
    <defs><radialGradient id="ground"><stop offset="0" stop-color="#6e5743" stop-opacity=".18"/><stop offset=".5" stop-color="#6e5743" stop-opacity=".06"/><stop offset="1" stop-color="#6e5743" stop-opacity="0"/></radialGradient><filter id="soft"><feGaussianBlur stdDeviation="11"/></filter></defs>
    <g transform="translate(-216 -170) scale(1.4)">
      <ellipse cx="611" cy="895" rx="278" ry="37" fill="url(#ground)" transform="rotate(-4 611 895)"/>
      <ellipse cx="580" cy="886" rx="156" ry="17" fill="#6c5948" opacity=".12" filter="url(#soft)"/>
      ${garnish.slice(0, 2).join('')}
      ${image(bottle, 280, 266, 520, 650)}
      <svg x="488" y="582" width="104" height="34.74" viewBox="0 0 1889 631">${traces}</svg>
      ${label(666, code, 27, 2)}${label(714, 'EXTRAIT DE PARFUM', 8.5)}${label(784, '50 ml · 30%', 10, 0)}
      ${garnish[2] || ''}
    </g>
  </svg>`;
  return sharp(Buffer.from(svg)).resize(960, 1200).jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toBuffer();
}
