'use client';

import { sendGAEvent } from '@next/third-parties/google';
import { Perfume } from '../types';

const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
const WA_LABEL = process.env.NEXT_PUBLIC_GADS_WA_LABEL;

const genderCat = (g: string) => (g === 'Man' ? 'Hombre' : g === 'Woman' ? 'Mujer' : 'Unisex');

export interface GaItem {
  item_id: string;
  item_name: string;
  item_brand: string;
  item_category: string;
  item_variant?: string;
  price: number;
  quantity: number;
}

export function toItem(p: Perfume, price: number, size?: string, quantity = 1): GaItem {
  return {
    item_id: p.code,
    item_name: p.name,
    item_brand: 'Äura Fragancias',
    item_category: genderCat(p.gender),
    ...(size ? { item_variant: size } : {}),
    price,
    quantity,
  };
}

function ga(name: string, params: Record<string, unknown>) {
  try {
    sendGAEvent('event', name, params);
  } catch {
    /* gtag aún no cargó o sin consentimiento */
  }
}

// GA4 e-commerce (moneda PYG, valores enteros: guaraní es zero-decimal)
export const gaViewItem = (item: GaItem) =>
  ga('view_item', { currency: 'PYG', value: item.price, items: [item] });

export const gaAddToCart = (item: GaItem) =>
  ga('add_to_cart', { currency: 'PYG', value: item.price * item.quantity, items: [item] });

export const gaBeginCheckout = (items: GaItem[], value: number) =>
  ga('begin_checkout', { currency: 'PYG', value, items });

/**
 * Cierre del formulario → abre WhatsApp. NO es purchase: se modela como lead
 * (intención de compra con datos de envío). Dispara también la conversión de
 * Google Ads tipo Contact/Lead si están configurados los IDs.
 */
export const gaGenerateLead = (items: GaItem[], value: number, transactionId: string) => {
  ga('generate_lead', { currency: 'PYG', value, items, transaction_id: transactionId });
  if (ADS_ID && WA_LABEL) {
    ga('conversion', {
      send_to: `${ADS_ID}/${WA_LABEL}`,
      value,
      currency: 'PYG',
      transaction_id: transactionId,
    });
  }
};

/** Remarketing dinámico de Google Ads: el prodid DEBE ser el code (= g:id del feed). */
export const gaRemarketing = (
  pagetype: 'home' | 'category' | 'product' | 'cart' | 'purchase',
  prodids: string[],
  value: number
) => {
  if (!ADS_ID) return;
  ga('page_view', {
    send_to: ADS_ID,
    ecomm_pagetype: pagetype,
    ecomm_prodid: prodids,
    ecomm_totalvalue: value,
    items: prodids.map((id) => ({ id, google_business_vertical: 'retail' })),
  });
};
