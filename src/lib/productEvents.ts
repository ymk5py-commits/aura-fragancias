'use client';

import type { Perfume } from '../types';
import { trackEvent } from './pixel';
import { newEventId } from './tracking';
import { gaViewItem, gaRemarketing, toItem } from './gtag';

export function trackProductView(perfume: Perfume, price: number, size: string) {
  trackEvent('ViewContent', {
    content_name: perfume.name,
    content_ids: [perfume.code],
    content_type: 'product',
    content_category: perfume.gender === 'Man' ? 'Hombre' : perfume.gender === 'Woman' ? 'Mujer' : 'Unisex',
    contents: [{ id: perfume.code, quantity: 1, item_price: price }],
    value: price, currency: 'PYG',
  }, newEventId());
  gaViewItem(toItem(perfume, price, size));
  gaRemarketing('product', [perfume.code], price);
}
