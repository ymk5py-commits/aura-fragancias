'use client';

import React, { useEffect, useState } from 'react';
import Header from './Header';
import Footer from './Footer';
import WhatsAppButton from './WhatsAppButton';
import Checkout from './Checkout';
import WelcomeModal from './WelcomeModal';
import LegalModal from './LegalModal';
import { LEGAL_TEXTS } from '../constants';
import { useCart } from '../context/CartContext';

type LegalKey = 'inspirations' | 'terms' | 'shipping';

const StoreChrome: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    showCheckout, cart, updateQuantity, removeFromCart, appliedDiscount,
    closeCheckout, notification, applyWelcomeDiscount,
  } = useCart();
  const [activeLegal, setActiveLegal] = useState<{ title: string; content: string } | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('hasSeenWelcome')) setShowWelcome(true);
  }, []);

  return (
    <>
      <Header />
      {children}
      <Footer onLegalClick={(t: LegalKey) => setActiveLegal(LEGAL_TEXTS[t])} />
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

      {activeLegal && (
        <LegalModal title={activeLegal.title} content={activeLegal.content} onClose={() => setActiveLegal(null)} />
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
