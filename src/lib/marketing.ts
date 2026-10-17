'use client';

import { GA4_ID, GOOGLE_ADS_ID, META_PIXEL_ID, TIKTOK_PIXEL_ID } from './marketingConfig';
import { marketingConsent } from './marketingConsent';

type Params = Record<string, unknown>;
type Channel = 'meta' | 'google' | 'tiktok';
type Event = { channel: Channel; name: string; params: Params; eventId?: string; custom?: boolean };
const pending: Event[] = [];
const initialized = { meta: false, google: false, tiktok: false };
const MAX_PENDING = 60;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
    ttq?: any;
    TiktokAnalyticsObject?: string;
  }
}

export function isStorefront() {
  return typeof window !== 'undefined' && !/^\/admin(?:\/|$)/.test(window.location.pathname);
}

function deliver(event: Event) {
  if (event.channel === 'meta') {
    const args: unknown[] = [event.custom ? 'trackCustom' : 'track', event.name, event.params];
    if (event.eventId) args.push({ eventID: event.eventId });
    window.fbq(...args);
  } else if (event.channel === 'google') {
    window.gtag?.('event', event.name, { ...(GA4_ID ? { send_to: GA4_ID } : {}), ...event.params });
  } else {
    window.ttq.track(event.name, event.params, event.eventId ? { event_id: event.eventId } : undefined);
  }
}

function send(event: Event) {
  if (!isStorefront() || marketingConsent() === 'denied') return;
  if (marketingConsent() === 'granted' && initialized[event.channel]) deliver(event);
  else {
    if (pending.length >= MAX_PENDING) pending.shift();
    pending.push(event);
  }
}

export function sendGoogleEvent(name: string, params: Params) {
  if (GA4_ID || GOOGLE_ADS_ID) send({ channel: 'google', name, params });
}

export function sendMetaEvent(name: string, params: Params, eventId?: string, custom = false) {
  if (META_PIXEL_ID) send({ channel: 'meta', name, params, eventId, custom });
}

/** TikTok uses the same catalog product IDs as Meta, with its own event names. */
export function sendTikTokEvent(name: string, params: Params, eventId?: string) {
  if (!TIKTOK_PIXEL_ID) return;
  const event = ({ ViewContent: 'ViewContent', AddToCart: 'AddToCart', InitiateCheckout: 'InitiateCheckout', Purchase: 'Purchase', Lead: 'SubmitForm', Contact: 'Contact', Search: 'Search' } as Record<string, string>)[name];
  if (!event) return;
  const ids = Array.isArray(params.content_ids) ? params.content_ids : [];
  const contents = Array.isArray(params.contents) ? params.contents.map(item => ({
    content_id: item.id, quantity: item.quantity, price: item.item_price,
  })) : ids.map(id => ({ content_id: id, quantity: 1, ...(ids.length === 1 ? { price: params.value } : {}) }));
  send({ channel: 'tiktok', name: event, eventId, params: {
    content_type: 'product', content_ids: ids, contents,
    ...(params.content_name ? { content_name: params.content_name } : {}),
    ...(params.currency ? { currency: params.currency } : {}),
    ...(params.value != null ? { value: params.value } : {}),
    ...(params.search_string ? { search_string: params.search_string } : {}),
  } });
}

function script(id: string, src: string) {
  if (document.getElementById(id)) return;
  const element = document.createElement('script');
  element.id = id;
  element.async = true;
  element.src = src;
  document.head.appendChild(element);
}

export function startMarketing() {
  if (!isStorefront() || marketingConsent() !== 'granted') return;
  if (initialized.google) window.gtag?.('consent', 'update', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' });
  if (initialized.meta) window.fbq('consent', 'grant');
  if (initialized.tiktok) window.ttq.grantConsent();
  if (!initialized.google && (GA4_ID || GOOGLE_ADS_ID)) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });
    window.gtag('consent', 'update', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' });
    window.gtag('js', new Date());
    if (GA4_ID) window.gtag('config', GA4_ID, { send_page_view: false });
    if (GOOGLE_ADS_ID) window.gtag('config', GOOGLE_ADS_ID, { send_page_view: false });
    script('aura-google-tag', `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4_ID || GOOGLE_ADS_ID)}`);
    initialized.google = true;
  }
  if (!initialized.meta && META_PIXEL_ID) {
    if (!window.fbq) {
      const fbq: any = function (...args: unknown[]) { fbq.callMethod ? fbq.callMethod(...args) : fbq.queue.push(args); };
      Object.assign(fbq, { push: fbq, loaded: true, version: '2.0', queue: [] });
      window.fbq = window._fbq = fbq;
    }
    window.fbq('consent', 'grant');
    window.fbq('init', META_PIXEL_ID);
    script('aura-meta-pixel', 'https://connect.facebook.net/en_US/fbevents.js');
    initialized.meta = true;
  }
  if (!initialized.tiktok && TIKTOK_PIXEL_ID) {
    // Official TikTok queue and per-pixel metadata expected by events.js.
    const ttq: any = window.ttq = window.ttq || [];
    window.TiktokAnalyticsObject = 'ttq';
    ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie', 'holdConsent', 'revokeConsent', 'grantConsent'];
    ttq.setAndDefer = (target: any, method: string) => { target[method] = (...args: unknown[]) => target.push([method, ...args]); };
    for (const method of ttq.methods) ttq.setAndDefer(ttq, method);
    ttq._i = ttq._i || {};
    ttq._i[TIKTOK_PIXEL_ID] = [];
    ttq._i[TIKTOK_PIXEL_ID]._u = 'https://analytics.tiktok.com/i18n/pixel/events.js';
    ttq._t = ttq._t || {};
    ttq._t[TIKTOK_PIXEL_ID] = Date.now();
    ttq._o = ttq._o || {};
    ttq._o[TIKTOK_PIXEL_ID] = {};
    ttq.instance = (id: string) => {
      const instance = ttq._i[id] || [];
      for (const method of ttq.methods) ttq.setAndDefer(instance, method);
      return instance;
    };
    ttq.grantConsent();
    script('aura-tiktok-pixel', `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(TIKTOK_PIXEL_ID)}&lib=ttq`);
    initialized.tiktok = true;
  }
}

export function trackMarketingPageView() {
  if (!isStorefront() || marketingConsent() !== 'granted') return;
  if (initialized.meta) window.fbq('track', 'PageView');
  if (initialized.tiktok) window.ttq.page();
  if (initialized.google) window.gtag?.('event', 'page_view', {
    send_to: GA4_ID || GOOGLE_ADS_ID, page_path: window.location.pathname + window.location.search,
    page_location: window.location.href, page_title: document.title,
  });
}

export function flushMarketingEvents() {
  if (marketingConsent() !== 'granted') { pending.length = 0; return; }
  const queued = pending.splice(0);
  for (const event of queued) if (initialized[event.channel]) deliver(event);
}

export function revokeMarketing() {
  pending.length = 0;
  window.gtag?.('consent', 'update', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });
  if (initialized.meta) window.fbq('consent', 'revoke');
  if (initialized.tiktok) window.ttq.revokeConsent();
}
