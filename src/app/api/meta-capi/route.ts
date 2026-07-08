import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '1238570975103624';
const TOKEN = process.env.META_CAPI_TOKEN;
const TEST_CODE = process.env.META_TEST_EVENT_CODE;
const API_VERSION = 'v21.0';

function sha256(v: string): string {
  return crypto.createHash('sha256').update(v).digest('hex');
}
function hashNorm(v?: string): string | undefined {
  if (!v) return undefined;
  return sha256(v.trim().toLowerCase());
}
function hashPhone(v?: string): string | undefined {
  if (!v) return undefined;
  let digits = v.replace(/\D/g, '');
  if (!digits) return undefined;
  // Normalizar a E.164 sin '+': asumir Paraguay (595) si viene con 0 local.
  if (digits.startsWith('0')) digits = '595' + digits.slice(1);
  return sha256(digits);
}

/**
 * Conversions API de Meta. Recibe eventos del cliente (o del admin) y los
 * reenvía server-side con el MISMO event_id para dedup contra el Pixel.
 * El token vive solo en el servidor (META_CAPI_TOKEN, sin NEXT_PUBLIC).
 */
export async function POST(req: NextRequest) {
  if (!TOKEN) {
    // Sin token configurado el endpoint es un no-op silencioso (no rompe el cliente).
    return NextResponse.json({ ok: false, skipped: 'META_CAPI_TOKEN no configurado' }, { status: 200 });
  }
  try {
    const b = await req.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userData: Record<string, any> = {};
    if (b.userData?.email) userData.em = [hashNorm(b.userData.email)];
    if (b.userData?.phone) userData.ph = [hashPhone(b.userData.phone)];
    if (b.userData?.firstName) userData.fn = [hashNorm(b.userData.firstName)];
    if (b.userData?.city) userData.ct = [hashNorm(b.userData.city)];
    if (b.fbp) userData.fbp = b.fbp; // RAW — nunca hashear
    if (b.fbc) userData.fbc = b.fbc; // RAW
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    if (ip) userData.client_ip_address = ip;
    const ua = req.headers.get('user-agent');
    if (ua) userData.client_user_agent = ua;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customData: Record<string, any> = {};
    if (b.value != null) customData.value = b.value; // PYG entero
    if (b.currency) customData.currency = b.currency;
    if (b.contentIds) {
      customData.content_ids = b.contentIds;
      customData.content_type = 'product';
    }
    if (b.contents) customData.contents = b.contents;
    if (b.numItems != null) customData.num_items = b.numItems;

    const event = {
      event_name: b.eventName,
      event_time: b.eventTime || Math.floor(Date.now() / 1000),
      event_id: b.eventId,
      event_source_url: b.eventSourceUrl,
      action_source: b.actionSource || 'website',
      user_data: userData,
      custom_data: customData,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: Record<string, any> = { data: [event] };
    if (TEST_CODE) payload.test_event_code = TEST_CODE;

    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${TOKEN}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
    );
    const json = await res.json();
    return NextResponse.json({ ok: res.ok, meta: json }, { status: res.ok ? 200 : 502 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 200 });
  }
}
