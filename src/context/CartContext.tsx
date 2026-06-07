'use client';

import React, { createContext, useContext, useState } from 'react';
import { CartItem, Perfume } from '../types';
import { useSettings } from './SettingsContext';
import { trackEvent } from '../lib/pixel';

interface CartContextValue {
  cart: CartItem[];
  cartCount: number;
  addToCart: (perfume: Perfume, size: string, quantity?: number) => void;
  updateQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  showCheckout: boolean;
  openCart: () => void;
  closeCheckout: () => void;
  notification: string | null;
  showNotification: (msg: string) => void;
  appliedDiscount: number;
  applyWelcomeDiscount: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
  return ctx;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, prices } = useSettings();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState(0);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const addToCart = (perfume: Perfume, size: string, quantity = 1) => {
    const selectedPrice = prices.find((p) => p.size === size)?.price || 0;
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.perfume.code === perfume.code && item.size === size);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx].quantity += quantity;
        showNotification(`Se actualizó la cantidad de ${perfume.name}`);
        return updated;
      }
      const newItem: CartItem = {
        id: `${perfume.code}-${size}-${Date.now()}`,
        perfume,
        size,
        price: selectedPrice,
        quantity,
      };
      trackEvent('AddToCart', {
        content_name: perfume.name,
        content_ids: [perfume.code],
        content_type: 'product',
        value: selectedPrice * quantity,
        currency: 'PYG',
      });
      showNotification(`Se agregó ${perfume.name} al carrito`);
      return [...prev, newItem];
    });
  };

  const updateQuantity = (id: string, delta: number) =>
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item))
    );

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((item) => item.id !== id));

  const openCart = () => {
    if (cart.length > 0) setShowCheckout(true);
    else showNotification('Tu carrito está vacío. Agregá una fragancia para continuar.');
  };

  const applyWelcomeDiscount = () => {
    setAppliedDiscount(settings.welcomePercent);
    showNotification('¡Descuento de bienvenida aplicado!');
  };

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        addToCart,
        updateQuantity,
        removeFromCart,
        showCheckout,
        openCart,
        closeCheckout: () => setShowCheckout(false),
        notification,
        showNotification,
        appliedDiscount,
        applyWelcomeDiscount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
