import React, { useState, useEffect } from 'react';
import { Menu, X, ShoppingBag } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';

interface HeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  onNavClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ cartCount, onOpenCart, onNavClick }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const { settings } = useSettings();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const onDark = !isScrolled && pathname === '/';

  const navLinks = [
    { name: 'Hombres', href: '/hombres' },
    { name: 'Mujeres', href: '/mujeres' },
    { name: 'Unisex', href: '/unisex' },
    { name: 'Top Ventas', href: '/#top-ventas' },
    { name: 'Mayoristas', href: '/#mayoristas' },
  ];

  const handleNavClick = (href: string) => {
    setIsMenuOpen(false);
    if (onNavClick) onNavClick();
    if (href.startsWith('/#') && pathname === '/') {
      const id = href.substring(2);
      const element = document.getElementById(id);
      if (element) {
        const offset = 90;
        const top = element.getBoundingClientRect().top - document.body.getBoundingClientRect().top - offset;
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

      <div
        className={`transition-all duration-500 ${
          onDark ? 'bg-transparent' : 'glass shadow-[0_1px_0_rgba(0,0,0,0.06)]'
        }`}
      >
        <div
          className={`container mx-auto px-5 sm:px-6 flex justify-between items-center transition-all duration-500 ${
            isScrolled || pathname !== '/' ? 'py-3' : 'py-4 sm:py-5'
          }`}
        >
          <Link to="/" onClick={() => handleNavClick('/')} className="flex items-center gap-2.5 sm:gap-3 group">
            <img
              src="/logo.svg"
              alt="Äura Fragancias"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full group-hover:scale-105 transition-transform duration-300"
              width={40}
              height={40}
            />
            <span
              className={`text-2xl sm:text-3xl font-luxury font-semibold tracking-[0.2em] transition-colors duration-300 ${
                onDark ? 'text-white' : 'text-aura-ink'
              }`}
            >
              ÄURA
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex space-x-7 lg:space-x-9 items-center">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                onClick={() => handleNavClick(link.href)}
                className={`relative text-[11px] font-semibold tracking-[0.2em] uppercase transition-colors duration-300 after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-0 after:bg-aura-gold after:transition-all after:duration-300 hover:after:w-full ${
                  onDark ? 'text-white/85 hover:text-white' : 'text-zinc-700 hover:text-aura-ink'
                }`}
              >
                {link.name}
              </Link>
            ))}

            <button
              onClick={onOpenCart}
              className={`flex items-center gap-2.5 px-5 py-2.5 text-[10px] font-bold tracking-[0.2em] uppercase transition-all duration-300 active:scale-95 ml-2 ${
                onDark
                  ? 'bg-white text-aura-ink hover:bg-aura-gold hover:text-white'
                  : 'bg-aura-ink text-white hover:bg-aura-gold'
              }`}
            >
              <div className="relative">
                <ShoppingBag size={16} strokeWidth={1.75} />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-aura-gold text-white text-[7px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full">
                    {cartCount}
                  </span>
                )}
              </div>
              Mi Carrito
            </button>
          </nav>

          {/* Mobile Toggle */}
          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={onOpenCart}
              aria-label="Abrir carrito"
              className={`relative p-2 ${onDark ? 'text-white' : 'text-aura-ink'}`}
            >
              <ShoppingBag size={22} strokeWidth={1.75} />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 bg-aura-gold text-white text-[8px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {cartCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Abrir menú"
              className={`p-2 ${onDark ? 'text-white' : 'text-aura-ink'}`}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[100] animate-fade-in">
          <div className="absolute inset-0 bg-aura-ink/50 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
          <div className="absolute top-0 right-0 w-[82%] max-w-sm h-full bg-white flex flex-col p-8 shadow-2xl animate-slide-left">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-2.5">
                <img src="/logo.svg" alt="Äura" className="w-9 h-9 rounded-full" width={36} height={36} />
                <span className="text-2xl font-luxury font-semibold tracking-[0.2em] text-aura-ink">ÄURA</span>
              </div>
              <button onClick={() => setIsMenuOpen(false)} aria-label="Cerrar menú" className="p-2 text-aura-ink">
                <X size={24} />
              </button>
            </div>
            <nav className="flex flex-col">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  onClick={() => handleNavClick(link.href)}
                  className="text-2xl font-luxury text-aura-ink hover:text-aura-gold transition-colors text-left border-b border-zinc-100 py-4"
                >
                  {link.name}
                </Link>
              ))}
            </nav>
            <Link
              to="/hombres"
              onClick={() => setIsMenuOpen(false)}
              className="mt-auto w-full bg-aura-ink text-white py-4 text-[10px] font-bold tracking-[0.25em] text-center block uppercase hover:bg-aura-gold transition-colors"
            >
              Ver Catálogo
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
