'use client';

import React, { useState, useEffect } from 'react';
import { Menu, X, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSettings } from '../context/SettingsContext';
import { useCart } from '../context/CartContext';

const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const { settings } = useSettings();
  const { cartCount, openCart, closeCheckout } = useCart();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isMenuOpen]);

  const navLinks = [
    { name: 'Hombres', href: '/hombres' },
    { name: 'Mujeres', href: '/mujeres' },
    { name: 'Unisex', href: '/unisex' },
    { name: 'Top Ventas', href: '/#top-ventas' },
    { name: 'Mayoristas', href: '/mayoristas' },
  ];

  const handleNavClick = (href: string) => {
    setIsMenuOpen(false);
    closeCheckout();
    if (href.startsWith('/#') && pathname === '/') {
      const id = href.substring(2);
      const element = document.getElementById(id);
      if (element) {
        const top = element.getBoundingClientRect().top - document.body.getBoundingClientRect().top - 90;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    }
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50">
      {/* Announcement bar */}
      <div className="bg-aura-ink text-white/90 overflow-hidden">
        <div className="py-2 px-4 text-center">
          <p className="text-[8px] sm:text-[10px] font-semibold tracking-[0.3em] uppercase">
            <span className="text-aura-gold">✦</span>&nbsp; {settings.announcement} &nbsp;<span className="text-aura-gold">✦</span>
          </p>
        </div>
      </div>

      <div className={`bg-aura-ivory/96 backdrop-blur-md border-b border-aura-ink/10 transition-shadow duration-300 ${isScrolled ? 'shadow-[0_8px_30px_-22px_rgba(20,15,12,0.5)]' : ''}`}>
        <div className="section-shell flex min-h-16 items-center justify-between gap-5 py-2">
          <Link href="/" onClick={() => handleNavClick('/')} className="group flex shrink-0 items-center" aria-label="Äura Fragancias, inicio">
            <img src="/brand/aura-wordmark-burgundy.png" alt="Äura Fragancias" className="h-auto w-[132px] transition-transform duration-300 group-hover:scale-[1.03] sm:w-[150px] xl:w-[164px]" width={1600} height={534} />
          </Link>

          <nav className="hidden lg:flex items-center gap-5 xl:gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => handleNavClick(link.href)}
                className={`relative text-[10px] font-bold tracking-[0.18em] uppercase transition-colors duration-300 after:absolute after:-bottom-1.5 after:left-0 after:h-px after:bg-aura-cognac after:transition-all after:duration-300 hover:after:w-full text-aura-ink/70 hover:text-aura-ink ${pathname === link.href ? 'after:w-full text-aura-ink' : 'after:w-0'}`}
              >
                {link.name}
              </Link>
            ))}

            <button
              onClick={openCart}
              className="flex min-h-11 items-center gap-2.5 px-5 py-2.5 text-[10px] font-bold tracking-[0.18em] uppercase transition-all duration-300 active:scale-95 ml-2 bg-aura-ink text-aura-ivory hover:bg-aura-cognac"
            >
              <div className="relative">
                <ShoppingBag size={16} strokeWidth={1.75} />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-aura-gold text-white text-[7px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full">{cartCount}</span>
                )}
              </div>
              Mi Carrito
            </button>
          </nav>

          <div className="lg:hidden flex items-center gap-1">
            <button onClick={openCart} aria-label="Abrir carrito" className="relative flex min-h-11 min-w-11 items-center justify-center text-aura-ink">
              <ShoppingBag size={22} strokeWidth={1.75} />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 bg-aura-gold text-white text-[8px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{cartCount}</span>
              )}
            </button>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={isMenuOpen} className="flex min-h-11 min-w-11 items-center justify-center text-aura-ink">
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[100] animate-fade-in">
          <div className="absolute inset-0 bg-aura-ink/50 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
          <div className="absolute top-0 right-0 w-[82%] max-w-sm h-full bg-white flex flex-col p-8 shadow-2xl animate-slide-left">
            <div className="flex justify-between items-center mb-10">
              <img src="/brand/aura-wordmark-burgundy.png" alt="Äura Fragancias" className="h-auto w-36" width={1600} height={534} />
              <button onClick={() => setIsMenuOpen(false)} aria-label="Cerrar menú" className="p-2 text-aura-ink"><X size={24} /></button>
            </div>
            <nav className="flex flex-col">
              {navLinks.map((link) => (
                <Link key={link.name} href={link.href} onClick={() => handleNavClick(link.href)} className="text-2xl font-luxury text-aura-ink hover:text-aura-gold transition-colors text-left border-b border-zinc-100 py-4">
                  {link.name}
                </Link>
              ))}
            </nav>
            <Link href="/#top-ventas" onClick={() => setIsMenuOpen(false)} className="mt-auto flex min-h-12 w-full items-center justify-center bg-aura-ink px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-aura-cognac">
              Descubrir top ventas
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;