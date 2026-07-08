import { getVisibleProducts, getSettings } from '../../lib/serverData';
import { SITE } from '../../lib/site';
import { buildProductDescription } from '../../lib/productCopy';

// Feed único RSS 2.0 con namespace g: — sirve para Google Merchant Center
// (Shopping/PMax) y para el catálogo de Meta a la vez.
export const revalidate = 3600;

function esc(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Cloudinary con padding a cuadrado 1000x1000 sobre blanco (requisito de imagen de producto).
function feedImage(url: string): string {
  if (!url || !url.includes('res.cloudinary.com/')) return url;
  if (/\/upload\/(f_auto|q_auto|w_\d|c_)/.test(url)) return url;
  return url.replace('/upload/', '/upload/c_pad,b_white,w_1000,h_1000,q_auto,f_auto/');
}

const genderCat = (g: string) => (g === 'Man' ? 'Hombre' : g === 'Woman' ? 'Mujer' : 'Unisex');

export async function GET() {
  const [products, settings] = await Promise.all([getVisibleProducts(), getSettings()]);

  const sizes = [
    { key: '10', label: '10 ml', price: settings.price10 },
    { key: '30', label: '30 ml', price: settings.price30 },
    { key: '50', label: '50 ml', price: settings.price50 },
  ];

  const items = products
    .flatMap((p) => {
      const desc = esc(buildProductDescription(p, settings));
      const img = esc(feedImage(p.imageUrl));
      const cat = esc(genderCat(p.gender));
      return sizes.map(
        (s) => `
    <item>
      <g:id>${esc(p.code)}-${s.key}</g:id>
      <g:item_group_id>${esc(p.code)}</g:item_group_id>
      <title>${esc(p.name)} ${s.label} — Inspiración ${esc(p.inspiration)}</title>
      <description>${desc}</description>
      <link>${SITE}/producto/${esc(p.code)}?size=${s.key}</link>
      <g:image_link>${img}</g:image_link>
      <g:availability>in_stock</g:availability>
      <g:price>${s.price} PYG</g:price>
      <g:brand>Äura Fragancias</g:brand>
      <g:condition>new</g:condition>
      <g:identifier_exists>no</g:identifier_exists>
      <g:mpn>${esc(p.code)}-${s.key}</g:mpn>
      <g:google_product_category>2915</g:google_product_category>
      <g:product_type>Perfumes &gt; ${cat} &gt; Inspiración ${esc(p.inspiration)}</g:product_type>
      <g:size>${s.label}</g:size>
    </item>`
      );
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Äura Fragancias — Catálogo</title>
    <link>${SITE}</link>
    <description>Perfumes Extrait de Parfum 30% — inspiraciones olfativas premium en Paraguay</description>${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
