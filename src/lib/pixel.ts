// Meta Pixel — helpers de eventos del lado cliente.
// La inicialización (init + PageView) la hace <MetaPixel/> con next/script;
// acá solo quedan los disparadores de eventos, con soporte de eventID para
// deduplicar contra la Conversions API.

export const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '1238570975103624';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fbq: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _fbq: any;
  }
}

export const trackEvent = (
  name: string,
  options: Record<string, unknown> = {},
  eventID?: string
) => {
  if (typeof window !== 'undefined' && window.fbq && PIXEL_ID) {
    if (eventID) window.fbq('track', name, options, { eventID });
    else window.fbq('track', name, options);
  }
};

export const trackCustomEvent = (
  name: string,
  options: Record<string, unknown> = {},
  eventID?: string
) => {
  if (typeof window !== 'undefined' && window.fbq && PIXEL_ID) {
    if (eventID) window.fbq('trackCustom', name, options, { eventID });
    else window.fbq('trackCustom', name, options);
  }
};
