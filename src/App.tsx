
import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import FeatureSection from './components/FeatureSection';
import ProductGrid from './components/ProductGrid';
import Wholesale from './components/Wholesale';
import TechnicalSection from './components/TechnicalSection';
import Footer from './components/Footer';
import PricingSection from './components/PricingSection';
import LegalModal from './components/LegalModal';
import SizeSelectorModal from './components/SizeSelectorModal';
import Checkout from './components/Checkout';
import WelcomeModal from './components/WelcomeModal';
import ProductPage from './components/ProductPage';
import { initPixel, trackEvent } from './lib/pixel';
import { PERFUMES, LEGAL_TEXTS, PRICES, BANNER_MEN, BANNER_WOMEN, BANNER_UNISEX } from './constants';
import ProductCard from './components/ProductCard';
import { CartItem, Perfume } from './types';

const App: React.FC = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeLegal, setActiveLegal] = useState<{title: string, content: string} | null>(null);
  const [isSizeSelectorOpen, setIsSizeSelectorOpen] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [lastNavClick, setLastNavClick] = useState<number>(0);
  const location = useLocation();
  const { pathname } = location;
  const navigate = useNavigate();

  // Cerrar checkout cuando cambia la ruta
  useEffect(() => {
    setShowCheckout(false);
  }, [pathname]);

  const handleNavClick = () => {
    setLastNavClick(Date.now());
    setShowCheckout(false);
  };

  // Manejo de enlaces profundos para productos (Meta Catalog)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const productCode = params.get('p');
    
    if (productCode) {
      const perfume = PERFUMES.find(p => p.code.toUpperCase() === productCode.toUpperCase());
      if (perfume) {
        // Redirigir a la página independiente del producto
        navigate(`/producto/${productCode.toUpperCase()}`, { replace: true });
        
        // Limpiamos el parámetro de la URL principal si es necesario
        const newUrl = window.location.origin + window.location.pathname + window.location.hash;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [pathname, navigate]);

  useEffect(() => {
    initPixel();
  }, []);

  useEffect(() => {
    trackEvent('PageView');
  }, [pathname]);

  useEffect(() => {
    if (pathname === '/' && location.hash) {
      const id = location.hash.substring(1);
      const element = document.getElementById(id);
      if (element) {
        const offset = 80;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = element.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, location.hash]);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      setShowWelcomeModal(true);
    }
  }, []);

  const handleAcceptWelcome = (code: string) => {
    setAppliedDiscount(10);
    localStorage.setItem('hasSeenWelcome', 'true');
    setShowWelcomeModal(false);
    showNotification(`¡Descuento de bienvenida aplicado!`);
  };

  const handleRejectWelcome = () => {
    localStorage.setItem('hasSeenWelcome', 'true');
    setShowWelcomeModal(false);
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddToCart = (perfume: Perfume, size: string, quantity: number = 1) => {
    const selectedPrice = PRICES.find(p => p.size === size)?.price || 0;
    
    setCart(prev => {
      const existingItemIndex = prev.findIndex(item => item.perfume.code === perfume.code && item.size === size);
      
      if (existingItemIndex !== -1) {
        const updatedCart = [...prev];
        updatedCart[existingItemIndex].quantity += quantity;
        showNotification(`Se actualizó la cantidad de ${perfume.name}`);
        return updatedCart;
      }
      
      const newItem: CartItem = {
        id: `${perfume.code}-${size}-${Date.now()}`,
        perfume,
        size,
        price: selectedPrice,
        quantity: quantity
      };

      trackEvent('AddToCart', {
        content_name: perfume.name,
        content_ids: [perfume.code],
        content_type: 'product',
        value: selectedPrice * quantity,
        currency: 'PYG'
      });

      showNotification(`Se agregó ${perfume.name} al carrito`);
      return [...prev, newItem];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const bestSellers = PERFUMES.filter(p => p.badge === 'Bestseller');

  if (showCheckout) {
    return (
      <Checkout 
        cart={cart} 
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromCart}
        initialDiscount={appliedDiscount}
        onBack={() => {
          setShowCheckout(false);
          window.scrollTo(0, 0);
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header 
        cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)} 
        onOpenCart={() => {
          if (cart.length > 0) setShowCheckout(true);
          else showNotification("Tu carrito está vacío. Agrega una fragancia para continuar.");
        }}
        onNavClick={handleNavClick}
      />
      
      <Routes>
        <Route path="/" element={
          <main>
            <Hero />
            
            <FeatureSection />

            <section id="top-ventas" className="py-16 sm:py-28 bg-white scroll-mt-24">
              <div className="container mx-auto px-3 sm:px-6">
                <div className="text-center mb-12 sm:mb-16">
                  <span className="text-aura-gold-deep font-semibold tracking-[0.4em] text-[10px] sm:text-[11px] uppercase mb-3 block">Los Favoritos</span>
                  <h2 className="text-3xl sm:text-5xl font-luxury text-aura-ink mb-5">Top Ventas</h2>
                  <div className="rule-gold w-20 mx-auto"></div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
                  {bestSellers.map(p => (
                    <ProductCard key={p.code} perfume={p} onAddToCart={handleAddToCart} lastNavClick={lastNavClick} />
                  ))}
                </div>
              </div>
            </section>

            <PricingSection />
            
            <Wholesale />
            
            <TechnicalSection />
          </main>
        } />
        <Route path="/hombres" element={
          <main>
            <Hero title="Hombres" subtitle="Fragancias masculinas de alta gama" image={BANNER_MEN} showCatalogButton={false} />
            <ProductGrid gender="Man" id="hombres" onAddToCart={handleAddToCart} lastNavClick={lastNavClick} />
          </main>
        } />
        <Route path="/mujeres" element={
          <main>
            <Hero title="Mujeres" subtitle="Elegancia y sofisticación femenina" image={BANNER_WOMEN} showCatalogButton={false} />
            <ProductGrid gender="Woman" id="mujeres" onAddToCart={handleAddToCart} lastNavClick={lastNavClick} />
          </main>
        } />
        <Route path="/unisex" element={
          <main>
            <Hero title="Unisex" subtitle="Aromas sin etiquetas, pura esencia" image={BANNER_UNISEX} showCatalogButton={false} />
            <ProductGrid gender="Unisex" id="unisex" onAddToCart={handleAddToCart} lastNavClick={lastNavClick} />
          </main>
        } />
        <Route path="/producto/:code" element={
          <ProductPage 
            cart={cart} 
            onAddToCart={handleAddToCart} 
            onOpenCart={() => {
              if (cart.length > 0) setShowCheckout(true);
              else showNotification("Tu carrito está vacío.");
            }} 
          />
        } />
      </Routes>

      <Footer 
        onLegalClick={(type) => setActiveLegal(LEGAL_TEXTS[type])} 
      />

      {activeLegal && (
        <LegalModal 
          title={activeLegal.title} 
          content={activeLegal.content} 
          onClose={() => setActiveLegal(null)} 
        />
      )}

      {isSizeSelectorOpen && (
        <SizeSelectorModal onClose={() => setIsSizeSelectorOpen(false)} />
      )}

      {showWelcomeModal && (
        <WelcomeModal 
          onAccept={handleAcceptWelcome}
          onReject={handleRejectWelcome}
        />
      )}

      {/* Notificación Flotante */}
      {notification && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] bg-zinc-900 text-white px-6 py-3 rounded-full text-[10px] font-bold tracking-widest uppercase shadow-2xl animate-slide-up flex items-center gap-3 border border-white/10 backdrop-blur-md">
          <div className="w-1.5 h-1.5 rounded-full bg-aura-gold animate-pulse"></div>
          {notification}
        </div>
      )}
    </div>
  );
};

export default App;
