'use client';

import React, { useEffect, useState } from 'react';
import Header from './Header';
import Footer from './Footer';
import WhatsAppButton from './WhatsAppButton';
import Checkout from './Checkout';
import WelcomeModal from './WelcomeModal';
import { useCart } from '../context/CartContext';

const StoreChrome: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    showCheckout, cart, updateQuantity, removeFromCart, appliedDiscount,
    closeCheckout, notification, applyWelcomeDiscount,
  } = useCart();
  const [showWelcome, setShowWelcome] = useState(false);

  // El descuento de bienvenida no interrumpe la primera impresión: aparece
  // recién a los 12s o cuando la persona ya scrolleó un 35% (lo que pase antes).
  useEffect(() => {
    if (localStorage.getItem('hasSeenWelcome')) return;
    let fired = false;
    const fire = () => {
      if (fired) return;
      fired = true;
      setShowWelcome(true);
      window.removeEventListener('scroll', onScroll);
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max > 0.35) fire();
    };
    const timer = setTimeout(fire, 12000);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <>
      <Header />
      {children}
      <Footer />
      <WhatsAppButton />

      {showCheckout && (
        <div className="fixed inset-0 z-[200] overflow-y-auto bg-white">
          <Checkout
            cart={cart}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeFromCart}
            initialDiscount={appliedDiscount}
            onBack={closeCheckout}
          />
        </div>
      )}

      {showWelcome && (
        <WelcomeModal
          onAccept={() => { applyWelcomeDiscount(); localStorage.setItem('hasSeenWelcome', 'true'); setShowWelcome(false); }}
          onReject={() => { localStorage.setItem('hasSeenWelcome', 'true'); setShowWelcome(false); }}
        />
      )}

      {notification && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] bg-zinc-900 text-white px-6 py-3 rounded-full text-[10px] font-bold tracking-widest uppercase shadow-2xl animate-slide-up flex items-center gap-3 border border-white/10 backdrop-blur-md">
          <div className="w-1.5 h-1.5 rounded-full bg-aura-gold animate-pulse" />
          {notification}
        </div>
      )}
    </>
  );
};

export default StoreChrome;
