import { getVisibleProducts, getSettings } from '../../lib/serverData';
import { SITE } from '../../lib/site';
import { buildProductDescription } from '../../lib/productCopy';
import { productArtworkUrl } from '../../lib/productArtwork';
import { GIFT_CARD_CODE, GIFT_CARD_IMAGE, GIFT_CARD_MIN, GIFT_CARD_DAYS } from '../../lib/giftCards';

// Feed exclusivo para el catálogo de Meta (Advantage+ catalog ads).
// A diferencia de /feed.xml (una variante por tamaño para Google
// Shopping), acá va UN ítem por fragancia con `g:id` = código, que es
// lo que el píxel manda en `content_ids` (ViewContent / AddToCart /
// Purchase). Sin esa coincidencia Meta no puede hacer remarketing
// producto a producto. El precio publicado es el de entrada (10 ml).
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
// Valores que Meta acepta en g:gender; alimentan los conjuntos "Damas" / "Caballeros" del catálogo.
const metaGender = (g: string) => (g === 'Man' ? 'male' : g === 'Woman' ? 'female' : 'unisex');

export async function GET() {
  const [products, settings] = await Promise.all([getVisibleProducts(), getSettings()]);

  const items = products
    .map((p) => {
      const desc = esc(buildProductDescription(p, settings));
      const img = esc(new URL(feedImage(productArtworkUrl(p) || '/brand/aura-social-1200x630.png'), SITE).href);
      const cat = esc(genderCat(p.gender));
      return `
    <item>
      <g:id>${esc(p.code)}</g:id>
      <g:item_group_id>${esc(p.code)}</g:item_group_id>
      <title>${esc(p.name)} — Inspiración ${esc(p.inspiration)}</title>
      <description>${desc}</description>
      <link>${SITE}/producto/${esc(p.code)}?size=10</link>
      <g:image_link>${img}</g:image_link>
      <g:availability>in_stock</g:availability>
      <g:price>${settings.price10} PYG</g:price>
      <g:brand>Äura Fragancias</g:brand>
      <g:condition>new</g:condition>
      <g:identifier_exists>no</g:identifier_exists>
      <g:mpn>${esc(p.code)}</g:mpn>
      <g:gender>${metaGender(p.gender)}</g:gender>
      <g:age_group>adult</g:age_group>
      <g:google_product_category>2915</g:google_product_category>
      <g:product_type>Perfumes &gt; ${cat} &gt; Inspiración ${esc(p.inspiration)}</g:product_type>
      <g:custom_label_0>${cat}</g:custom_label_0>
      <g:custom_label_1>desde 10 ml · 30 ml ${settings.price30} · 50 ml ${settings.price50}</g:custom_label_1>
    </item>`;
    })
    .join('');

  // Gift Cards are sold and tracked on the storefront too. Their stable code
  // must exist in the catalog; the landing page starts at the advertised minimum.
  const giftCard = `
    <item>
      <g:id>${GIFT_CARD_CODE}</g:id>
      <title>Gift Card Äura — Desde Gs. 100.000</title>
      <description>Gift Card digital para elegir perfumes Äura. Monto personalizable desde Gs. 100.000. Vigencia de ${GIFT_CARD_DAYS} días desde la confirmación del pago. Entrega por WhatsApp sin costo de envío.</description>
      <link>${SITE}/gift-card</link>
      <g:image_link>${esc(new URL(GIFT_CARD_IMAGE, SITE).href)}</g:image_link>
      <g:availability>in_stock</g:availability>
      <g:price>${GIFT_CARD_MIN} PYG</g:price>
      <g:brand>Äura Fragancias</g:brand>
      <g:condition>new</g:condition>
      <g:identifier_exists>no</g:identifier_exists>
      <g:product_type>Gift Cards</g:product_type>
      <g:custom_label_0>Gift Card</g:custom_label_0>
      <g:custom_label_1>Monto personalizable</g:custom_label_1>
    </item>`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Äura Fragancias — Catálogo Meta</title>
    <link>${SITE}</link>
    <description>Perfumes Extrait de Parfum 30% — inspiraciones olfativas premium en Paraguay</description>${items}${giftCard}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
