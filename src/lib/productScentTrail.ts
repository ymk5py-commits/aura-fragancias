import type { Perfume } from '../types';

const PALETTES = [
  { key: 'floral', match: /floral|flor[ae]s/, color: '#d7acb6', light: '#ffebe5' },
  { key: 'fresh', match: /citric|acuatic|marin|fresc/, color: '#b8c99b', light: '#f0f4d9' },
  { key: 'wood', match: /amader|madera|cuero|oud/, color: '#c59974', light: '#ffe4c7' },
  { key: 'amber', match: /ambar|oriental|gourmand|dulce|vainilla/, color: '#d4b176', light: '#fff0ce' },
  { key: 'aromatic', match: /aromatic|fougere|verde/, color: '#a2c3b8', light: '#e3f4eb' },
];

/** Art direction from the catalog family; it does not infer notes or performance. */
export function productScentTrail(perfume: Pick<Perfume, 'code' | 'family' | 'intensity'>) {
  const family = perfume.family.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const palette = PALETTES.find(p => p.match.test(family)) ?? { key: 'signature', color: '#c4a275', light: '#fff3e0' };
  const seed = Array.from(perfume.code).reduce((n, char) => (n * 31 + char.charCodeAt(0)) >>> 0, 0);
  const bend = seed % 57 - 28;
  const tilt = seed % 9 - 4;
  const intensity = Number.isFinite(perfume.intensity) ? Math.min(5, Math.max(1, perfume.intensity)) : 3;
  const path = `M180 865 C${350 + bend} 775 ${495 + bend} 737 421 603 C${350 - bend} 474 ${141 - bend} 497 205 354 C${251 + bend} 257 ${419 + bend} 270 451 105`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="960" viewBox="0 0 640 960" fill="none">
    <defs>
      <linearGradient id="ribbon" x1="180" y1="865" x2="451" y2="105" gradientUnits="userSpaceOnUse"><stop stop-color="${palette.color}" stop-opacity="0"/><stop offset=".25" stop-color="${palette.color}" stop-opacity=".5"/><stop offset=".52" stop-color="${palette.light}"/><stop offset=".8" stop-color="${palette.color}" stop-opacity=".5"/><stop offset="1" stop-color="${palette.color}" stop-opacity="0"/></linearGradient>
      <filter id="haze" x="-80%" y="-30%" width="260%" height="160%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="15"/></filter>
      <filter id="soft" x="-45%" y="-15%" width="190%" height="130%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="2.5"/></filter>
    </defs>
    <g transform="rotate(${tilt} 320 480)" stroke="url(#ribbon)" stroke-linecap="round">
      <path d="${path}" stroke-width="56" opacity=".42" filter="url(#haze)"/>
      <path d="${path}" stroke-width="18" opacity=".7" filter="url(#soft)"/>
      <path d="${path}" stroke-width="3"/>
      <path d="${path}" stroke-width="1.4" transform="translate(12 0) rotate(2 320 480)" opacity=".85"/>
      <path d="${path}" stroke-width="1.1" transform="translate(-15 8) rotate(-2 320 480)" opacity=".7"/>
      <path d="${path}" stroke-width="1.8" transform="translate(20 -4) scale(.97 1)" opacity=".55"/>
      <path d="${path}" stroke-width="5" transform="translate(-24 20) scale(1.06 .94)" opacity=".25" filter="url(#soft)"/>
    </g>
  </svg>`;
  return { palette: palette.key, color: palette.color, source: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, speed: 0.38 + intensity * 0.065 };
}
