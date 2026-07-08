'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Perfume } from '../types';
import { useSettings } from './SettingsContext';
import { useProducts } from './ProductsContext';
import { trackEvent } from '../lib/pixel';
import { newEventId } from '../lib/tracking';
import { toItem, gaAddToCart } from '../lib/gtag';

interface CartContextValue {
  cart: CartItem[];
  cartCount: number;
  addToCart: (perfume: Perfume, size: string, quantity?: number) => void;
  updateQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  showCheckout: boolean;
  openCart: () => void;
  closeCheckout: () => void;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  goToCheckout: () => void;
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

const STORAGE_KEY = 'aura_cart';
const TTL = 7 * 24 * 60 * 60 * 1000; // 7 días

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, prices } = useSettings();
  const { visibleProducts } = useProducts();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState(0);

  // Rehidratar el carrito desde localStorage (con TTL). Guardamos solo
  // code/size/quantity y reconstruimos el precio actual (no congelar precios viejos).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.ts && Date.now() - parsed.ts < TTL && Array.isArray(parsed.items)) {
          const restored: CartItem[] = [];
          for (const it of parsed.items) {
            const perfume = visibleProducts.find((p) => p.code === it.code);
            const price = prices.find((pr) => pr.size === it.size)?.price;
            if (perfume && price) {
              restored.push({ id: `${it.code}-${it.size}-${Date.now()}`, perfume, size: it.size, price, quantity: it.quantity });
            }
          }
          if (restored.length) setCart(restored);
        }
      }
    } catch {
      /* localStorage no disponible */
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persistir en cada cambio (después de hidratar, para no pisar con el estado vacío inicial).
  useEffect(() => {
    if (!hydrated) return;
    try {
      const items = cart.map((i) => ({ code: i.perfume.code, size: i.size, quantity: i.quantity }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ts: Date.now(), items }));
    } catch {
      /* noop */
    }
  }, [cart, hydrated]);

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
      const eventID = newEventId();
      trackEvent('AddToCart', {
        content_name: perfume.name,
        content_ids: [perfume.code],
        content_type: 'product',
        contents: [{ id: perfume.code, quantity, item_price: selectedPrice }],
        value: selectedPrice * quantity,
        currency: 'PYG',
      }, eventID);
      gaAddToCart(toItem(perfume, selectedPrice, size, quantity));
      showNotification(`Se agregó ${perfume.name} al carrito`);
      return [...prev, newItem];
    });
    setIsDrawerOpen(true);
  };

  const updateQuantity = (id: string, delta: number) =>
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item))
    );

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((item) => item.id !== id));

  const openCart = () => {
    if (cart.length > 0) setIsDrawerOpen(true);
    else showNotification('Tu carrito está vacío. Agregá una fragancia para continuar.');
  };

  const goToCheckout = () => {
    if (cart.length === 0) {
      showNotification('Tu carrito está vacío.');
      return;
    }
    setIsDrawerOpen(false);
    setShowCheckout(true);
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
        isDrawerOpen,
        openDrawer: () => setIsDrawerOpen(true),
        closeDrawer: () => setIsDrawerOpen(false),
        goToCheckout,
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
