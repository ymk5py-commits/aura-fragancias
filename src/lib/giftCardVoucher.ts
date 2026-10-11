import type { GiftCard } from './giftCards';
import { LOGO_AURA_TRAZOS, LOGO_AURA_VIEWBOX } from './labels/logo-aura';
import { normalizePhone } from './validation';

const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!));
const money = (amount: number) => `Gs. ${amount.toLocaleString('es-PY')}`;
const date = (timestamp: number) => new Intl.DateTimeFormat('es-PY', { timeZone: 'America/Asuncion', dateStyle: 'medium', timeStyle: 'short' }).format(timestamp);
export const GIFT_CARD_LAYOUT = { width: 1800, height: 800, widthMm: 180, heightMm: 80, codeX: 80, codeY: 667, codeSize: 28 } as const;

const characterWidth = (char: string) => /[MW@%]/.test(char) ? 0.96 : /[ilI.,'! :;]/.test(char) ? 0.3 : /[A-ZÁÉÍÓÚÑ]/.test(char) ? 0.75 : /[^\u0000-\u024f]/.test(char) ? 1 : 0.6;
const textWidth = (text: string) => [...text].reduce((width, char) => width + characterWidth(char), 0);

function wrapText(text: string, maxWidth: number, size: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.trim().split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (textWidth(next) * size <= maxWidth) { line = next; continue; }
    if (line) { lines.push(line); line = ''; }
    for (const char of word) {
      if (line && textWidth(line + char) * size > maxWidth) { lines.push(line); line = ''; }
      line += char;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function textBlock(text: string, x: number, y: number, width: number, preferredSize: number, maxLines: number, lineHeight: number): string {
  let size = preferredSize;
  while (wrapText(text, width, size).length > maxLines && size > 10) size -= 0.5;
  return wrapText(text, width, size).map((line, i) => `<text x="${x}" y="${y + i * lineHeight}" font-size="${size}">${escape(line)}</text>`).join('');
}

export function giftCardVoucher(card: GiftCard): string {
  const { width, height, codeX, codeY, codeSize } = GIFT_CARD_LAYOUT;
  const amount = card.amount.toLocaleString('es-PY');
  const amountSize = Math.min(76, 350 / textWidth(amount));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <title>Gift Card Äura ${escape(card.orderCode)}</title>
    <defs><clipPath id="stub"><rect x="1350" width="450" height="800"/></clipPath></defs>
    <rect width="1800" height="800" fill="#f8f5f0"/>
    <rect x="1350" width="450" height="800" fill="#580c17"/>
    <g clip-path="url(#stub)" fill="none" stroke="#c4a275" stroke-width="1" opacity="0.19">
      ${Array.from({ length: 12 }, (_, i) => `<ellipse cx="1710" cy="770" rx="${150 + i * 20}" ry="${240 + i * 25}" transform="rotate(-35 1710 770)"/>`).join('')}
    </g>
    <rect x="22" y="22" width="1756" height="756" fill="none" stroke="#c4a275" stroke-width="1.5"/>
    <path d="M1322 57V743" stroke="#c4a275" stroke-width="1.5" stroke-dasharray="5 9"/>
    <circle cx="1350" cy="0" r="15" fill="#f8f5f0"/><circle cx="1350" cy="800" r="15" fill="#f8f5f0"/>
    <svg x="80" y="65" width="280" height="94" viewBox="${LOGO_AURA_VIEWBOX}">${LOGO_AURA_TRAZOS.replace(/#000000/g, '#580c17')}</svg>
    <g fill="#580c17" font-family="Arial, sans-serif">
      <text x="1260" y="99" font-size="18" text-anchor="end" letter-spacing="2">REGALÁ UN RECUERDO</text>
      <text x="1260" y="138" font-size="18" text-anchor="end" opacity="0.7">N.º ${escape(card.orderCode)}</text>
      <text x="80" y="252" font-family="Georgia, 'Times New Roman', serif" font-size="69">Un regalo para elegir.</text>
      <g font-size="18" letter-spacing="2" fill="#8d6d59"><text x="80" y="320">PARA</text><text x="80" y="390">DE</text></g>
      ${textBlock(card.recipient || 'Vos', 180, 320, 1080, 33, 2, 34)}
      ${textBlock(card.sender || card.customer, 180, 390, 1080, 27, 2, 29)}
      <g font-family="Georgia, 'Times New Roman', serif" font-style="italic" fill="#76554b">${textBlock(card.message || 'Elegí ese aroma que se siente como vos.', 80, 472, 1180, 29, 4, 32)}</g>
      <path d="M80 597H1260" stroke="#c4a275" stroke-width="1"/>
      <text x="80" y="630" font-size="17" letter-spacing="3">CÓDIGO DE CANJE</text>
      <text x="${codeX}" y="${codeY}" font-family="Courier, monospace" font-size="${codeSize}">${escape(card.code)}</text>
      <text x="80" y="716" font-size="19">Válida hasta ${escape(date(card.expiresAt))} (Paraguay).</text>
      <text x="80" y="752" font-size="17" fill="#76554b">60 días desde la confirmación del pago · Canje por WhatsApp · Delivery de perfumes a cotizar</text>
    </g>
    <g fill="#f8f5f0" font-family="Arial, sans-serif" text-anchor="middle">
      <text x="1575" y="172" font-size="20" letter-spacing="5">GIFT CARD</text>
      <path d="M1515 210H1635" stroke="#c4a275" stroke-width="1.5"/>
      <text x="1575" y="308" font-family="Georgia, 'Times New Roman', serif" font-size="43">La libertad</text>
      <text x="1575" y="361" font-family="Georgia, 'Times New Roman', serif" font-size="43" font-style="italic">de elegir.</text>
      <text x="1575" y="444" font-size="26" letter-spacing="3">Gs.</text>
      <text x="1575" y="525" font-size="${amountSize}" font-family="Georgia, 'Times New Roman', serif">${amount}</text>
      <text x="1575" y="613" font-size="20">Tu próxima fragancia.</text>
      <text x="1575" y="647" font-size="20">Tu próximo recuerdo.</text>
      <text x="1575" y="738" font-size="18">aurafragancias.store</text>
    </g>
  </svg>`;
}

async function giftCardImage(card: GiftCard): Promise<Blob> {
  const svgUrl = URL.createObjectURL(new Blob([giftCardVoucher(card)], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = reject; image.src = svgUrl; });
    const canvas = document.createElement('canvas'); canvas.width = GIFT_CARD_LAYOUT.width; canvas.height = GIFT_CARD_LAYOUT.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar la imagen.');
    context.drawImage(image, 0, 0);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('No se pudo preparar la imagen.');
    return blob;
  } finally { URL.revokeObjectURL(svgUrl); }
}

/** El código queda como texto seleccionable, incluso al abrir el PDF en WhatsApp. */
export async function createGiftCardPdf(card: GiftCard): Promise<Blob> {
  const [image, { PDFDocument, StandardFonts, rgb }] = await Promise.all([
    giftCardImage({ ...card, code: '' }), import('pdf-lib'),
  ]);
  const document = await PDFDocument.create();
  document.setTitle(`Gift Card Äura - ${card.orderCode}`);
  document.setAuthor('Äura Fragancias');
  const { width, height, widthMm, heightMm, codeX, codeY, codeSize } = GIFT_CARD_LAYOUT;
  const pageWidth = widthMm * 72 / 25.4;
  const pageHeight = heightMm * 72 / 25.4;
  const scale = pageWidth / width;
  const page = document.addPage([pageWidth, pageHeight]);
  const background = await document.embedPng(await image.arrayBuffer());
  page.drawImage(background, { x: 0, y: 0, width: pageWidth, height: pageHeight });
  const font = await document.embedFont(StandardFonts.Courier);
  const size = Math.min(codeSize * scale, 1180 * scale / Math.max(1, font.widthOfTextAtSize(card.code, 1)));
  page.drawText(card.code, { x: codeX * scale, y: (height - codeY) * scale, size, font, color: rgb(88 / 255, 12 / 255, 23 / 255) });
  return new Blob([new Uint8Array(await document.save())], { type: 'application/pdf' });
}

export async function downloadGiftCard(card: GiftCard) {
  const url = URL.createObjectURL(await createGiftCardPdf(card));
  const link = document.createElement('a');
  link.href = url;
  link.download = `Gift-Card-Aura-${card.orderCode}-${card.code.slice(-6)}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Abre un borrador. El administrador adjunta el PDF y confirma el envío. */
export function giftCardWhatsAppUrl(card: GiftCard): string | null {
  const phone = normalizePhone(card.phone);
  if (!phone) return null;
  const text = `¡Hola ${card.customer}! Tu Gift Card Äura de ${money(card.amount)} ya está activada.\n\n` +
    `Para: ${card.recipient || 'quien vos elijas'}\nCódigo: ${card.code}\n` +
    `Válida hasta ${date(card.expiresAt)} (hora Paraguay).\n\n` +
    'Te compartimos la tarjeta en PDF para que puedas regalarla. Para canjearla, escribinos con el código y las fragancias elegidas.';
  return `https://wa.me/595${phone.slice(1)}?text=${encodeURIComponent(text)}`;
}
