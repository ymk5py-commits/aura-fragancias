'use client';

import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import { SettingsProvider } from '../context/SettingsContext';
import { ProductsProvider } from '../context/ProductsContext';
import { CartProvider } from '../context/CartContext';
import { Perfume, SiteSettings } from '../types';

export default function Providers({
  children,
  settings,
  products,
  source,
}: {
  children: React.ReactNode;
  settings: SiteSettings;
  products: Perfume[];
  source: 'firebase' | 'local';
}) {
  return (
    <AuthProvider>
      <SettingsProvider initial={settings}>
        <ProductsProvider initial={products} initialSource={source}>
          <CartProvider>{children}</CartProvider>
        </ProductsProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
