import type { GiftCard } from './giftCards';
import { LOGO_AURA_TRAZOS, LOGO_AURA_VIEWBOX } from './labels/logo-aura';

const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!));
const money = (amount: number) => `Gs. ${amount.toLocaleString('es-PY')}`;
const date = (timestamp: number) => new Intl.DateTimeFormat('es-PY', { timeZone: 'America/Asuncion', dateStyle: 'medium', timeStyle: 'short' }).format(timestamp);
const fitted = (text: string, size: number) => Math.min(size, 880 / [...text].reduce((width, char) => width + ('MW'.includes(char) ? 0.9 : /[A-ZÁÉÍÓÚÑ]/.test(char) ? 0.72 : 0.6), 0));

export function giftCardVoucher(card: GiftCard): string {
  const lines: string[] = [];
  for (const word of card.message.split(/\s+/).flatMap(word => word.match(/.{1,44}/gu) || [])) {
    const last = lines.length - 1;
    if (last < 0 || lines[last].length + word.length > 44) lines.push(word);
    else lines[last] += ` ${word}`;
  }
  const recipient = `Para: ${card.recipient || 'Vos'}`;
  const sender = `De: ${card.sender || card.customer}`;
  const lineHeight = Math.min(34, 245 / Math.max(1, lines.length));
  const messageSize = Math.min(23, lineHeight * 0.78);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><title>Gift Card Äura ${escape(card.orderCode)}</title><rect width="1080" height="1350" fill="#f8f5f0"/><rect x="35" y="35" width="1010" height="1280" rx="18" fill="none" stroke="#c4a275" stroke-width="2"/><svg x="290" y="100" width="500" height="167" viewBox="${LOGO_AURA_VIEWBOX}">${LOGO_AURA_TRAZOS.replace(/#000000/g, '#580c17')}</svg><g fill="#580c17" font-family="Arial, sans-serif" text-anchor="middle"><text x="540" y="335" font-size="25" letter-spacing="8">GIFT CARD</text><text x="540" y="435" font-size="62" font-weight="600">${money(card.amount)}</text><text x="540" y="510" font-size="27">Un regalo para elegir.</text><text x="540" y="600" font-size="${fitted(recipient, 28)}">${escape(recipient)}</text><text x="540" y="648" font-size="${fitted(sender, 23)}">${escape(sender)}</text>${lines.map((line, i) => `<text x="540" y="${717 + i * lineHeight}" font-size="${messageSize}">${escape(line)}</text>`).join('')}<text x="540" y="1015" font-size="18" letter-spacing="1">CÓDIGO DE CANJE</text><text x="540" y="1057" font-size="25" font-family="monospace">${escape(card.code)}</text><text x="540" y="1112" font-size="20">Válida hasta ${escape(date(card.expiresAt))} (Paraguay)</text><text x="540" y="1152" font-size="18">60 días desde la confirmación del pago.</text><text x="540" y="1192" font-size="18">Canje por WhatsApp · Delivery de perfumes a cotizar</text><text x="540" y="1250" font-size="20" letter-spacing="2">aurafragancias.store</text></g></svg>`;
}

export async function downloadGiftCard(card: GiftCard) {
  const svgUrl = URL.createObjectURL(new Blob([giftCardVoucher(card)], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = reject; image.src = svgUrl; });
    const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar la imagen.');
    context.drawImage(image, 0, 0);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('No se pudo preparar la imagen.');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `Gift-Card-Aura-${card.orderCode}.png`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } finally { URL.revokeObjectURL(svgUrl); }
}
