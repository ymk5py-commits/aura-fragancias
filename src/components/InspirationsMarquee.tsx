import React from 'react';

const BRANDS = [
  'Creed', 'Dior', 'Versace', 'Chanel', 'Giorgio Armani', 'Yves Saint Laurent',
  'Paco Rabanne', 'Jean Paul Gaultier', 'Carolina Herrera', 'Valentino', 'Azzaro',
  'Lancôme', 'Bvlgari', 'Gucci', 'Givenchy', 'Burberry', 'Parfums de Marly',
  'Xerjoff', 'Le Labo', 'Moschino', 'Nina Ricci',
];

const Diamond = () => <span className="text-aura-gold/60 text-[8px] mx-6 sm:mx-9 select-none">◆</span>;

const InspirationsMarquee: React.FC = () => {
  // Duplicamos la lista para un loop continuo.
  const loop = [...BRANDS, ...BRANDS];

  return (
    <section className="bg-aura-ivory border-b border-zinc-100 py-9 sm:py-12 overflow-hidden">
      <p className="text-center text-aura-gold-deep font-semibold tracking-[0.35em] text-[9px] sm:text-[10px] uppercase mb-7">
        Inspirado en las casas más icónicas del mundo
      </p>
      <div className="marquee-mask">
        <div className="flex w-max animate-marquee whitespace-nowrap will-change-transform">
          {loop.map((b, i) => (
            <span key={i} className="flex items-center">
              <span className="font-luxury text-2xl sm:text-4xl text-zinc-400 hover:text-aura-ink transition-colors duration-300">
                {b}
              </span>
              <Diamond />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default InspirationsMarquee;
