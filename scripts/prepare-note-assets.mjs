import fs from 'node:fs/promises';
import sharp from 'sharp';

const previous = 'output/marketing/2026-10-botanico/assets';
const current = 'output/marketing/2026-10-tres-notas';
const target = 'public/products/botanico-v3/_assets';
await fs.mkdir(target, { recursive: true });
const additions = JSON.parse(await fs.readFile(`${current}/note-assets.json`, 'utf8')).subjects;
const sources = [
  ...(await fs.readdir(previous)).filter(file => file.endsWith('.png')).map(file => ({ key: file.replace('.png', ''), path: `${previous}/${file}` })),
  ...additions.map(({ key }) => ({ key, path: `${current}/assets/${key}.png` })),
];
for (const source of sources) {
  if (source.key === 'frasco-aura-estudio') {
    await sharp(source.path).resize({ width: 800 }).png({ compressionLevel: 9 }).toFile(`${target}/frasco.png`);
    continue;
  }
  // Recortar únicamente el margen transparente; mantener textura y sombra natural.
  const { data, info } = await sharp(source.path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = 0, bottom = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] <= 24) continue;
    left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  left = Math.max(0, left - 20); top = Math.max(0, top - 20);
  right = Math.min(info.width - 1, right + 20); bottom = Math.min(info.height - 1, bottom + 20);
  await sharp(source.path).extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .resize({ width: 600, height: 400, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9 }).toFile(`${target}/${source.key}.png`);
}
// La nota genérica «frutas» se evoca con fruta tropical; no se cambia su nombre.
await fs.copyFile(`${target}/mango.png`, `${target}/frutas.png`);
console.log(`${sources.length + 1} assets de fotografía preparados.`);
