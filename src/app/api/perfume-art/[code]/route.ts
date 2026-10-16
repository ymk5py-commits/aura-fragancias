import { parseArtworkNotes, renderProductArtwork, renderProductCutout } from '../../../../lib/server/productArtwork';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const url = new URL(request.url);
  const keys = parseArtworkNotes(url.searchParams.get('notes') || '');
  const view = url.searchParams.get('view') || '';
  const version = url.searchParams.get('v') || '';
  if (!/^(CC|DD|UU)\d{3,6}$/.test(code) || !keys || !['1', '2', '3', '4'].includes(version) || !['', 'cutout'].includes(view)) {
    return new Response('Imagen no disponible', { status: 400 });
  }
  try {
    const style = version === '4' ? 'expressive' : 'classic';
    const image = await (view === 'cutout' ? renderProductCutout(code, keys, style) : renderProductArtwork(code, keys, style));
    return new Response(new Uint8Array(image), {
      headers: {
        'Content-Type': view === 'cutout' ? 'image/png' : 'image/jpeg',
        'Cache-Control': 'public, max-age=604800, s-maxage=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('No se pudo componer la imagen de perfume', error);
    return new Response('Imagen temporalmente no disponible', { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
