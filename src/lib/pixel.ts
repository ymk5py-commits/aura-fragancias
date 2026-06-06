
export const PIXEL_ID = (import.meta as any).env.VITE_META_PIXEL_ID || '1238570975103624';

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

export const initPixel = () => {
  if (typeof window === 'undefined' || !PIXEL_ID) return;

  (function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function() {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  window.fbq('init', PIXEL_ID);
  window.fbq('track', 'PageView');
};

export const trackEvent = (name: string, options = {}) => {
  if (typeof window !== 'undefined' && window.fbq && PIXEL_ID) {
    window.fbq('track', name, options);
  }
};

export const trackCustomEvent = (name: string, options = {}) => {
  if (typeof window !== 'undefined' && window.fbq && PIXEL_ID) {
    window.fbq('trackCustom', name, options);
  }
};
