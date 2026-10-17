'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { CONSENT_EVENT, CONSENT_KEY, marketingConsent } from '../lib/marketingConsent';
import { flushMarketingEvents, isStorefront, revokeMarketing, startMarketing, trackMarketingPageView } from '../lib/marketing';

export default function MarketingTags() {
  const pathname = usePathname();
  const lastPage = useRef<string | null>(null);
  useEffect(() => {
    const sync = () => {
      if (!isStorefront()) { revokeMarketing(); lastPage.current = null; return; }
      const consent = marketingConsent();
      if (consent === 'denied') { revokeMarketing(); lastPage.current = null; return; }
      if (consent !== 'granted') return;
      startMarketing();
      if (lastPage.current !== pathname) { trackMarketingPageView(); lastPage.current = pathname; }
      flushMarketingEvents();
    };
    const onStorage = (event: StorageEvent) => { if (event.key === CONSENT_KEY) sync(); };
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener(CONSENT_EVENT, sync); window.removeEventListener('storage', onStorage); };
  }, [pathname]);
  return null;
}
