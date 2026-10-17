// Standard events shared by Meta and TikTok. MarketingTags initializes the
// SDKs after consent and flushes events emitted before they were ready.
import { META_PIXEL_ID } from './marketingConfig';
import { sendMetaEvent, sendTikTokEvent } from './marketing';

export const PIXEL_ID = META_PIXEL_ID;

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
  sendMetaEvent(name, options, eventID);
  sendTikTokEvent(name, options, eventID);
};

export const trackCustomEvent = (
  name: string,
  options: Record<string, unknown> = {},
  eventID?: string
) => {
  sendMetaEvent(name, options, eventID, true);
};
