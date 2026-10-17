export const CONSENT_KEY = 'aura_consent_v1';
export const CONSENT_EVENT = 'aura:consent';
export type MarketingConsent = 'granted' | 'denied' | null;
let memoryConsent: MarketingConsent = null;

export function marketingConsent(): MarketingConsent {
  if (typeof window === 'undefined') return null;
  try {
    const saved = window.localStorage.getItem(CONSENT_KEY);
    return saved === 'granted' || saved === 'denied' ? saved : null;
  } catch { return memoryConsent; }
}

export function chooseMarketingConsent(granted: boolean) {
  memoryConsent = granted ? 'granted' : 'denied';
  try { window.localStorage.setItem(CONSENT_KEY, memoryConsent); } catch { /* session choice still applies */ }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}
