import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import AsciiArt from './AsciiArt';
import Reveal from './Reveal';

export default function AsciiEditorial() {
  return (
    <section aria-labelledby="ascii-title" className="relative isolate overflow-hidden bg-aura-ink py-20 text-aura-ivory sm:py-28">
      <div className="absolute inset-0 aura-noise" aria-hidden="true" />
      <div className="section-shell relative">
        <div className="grid gap-10 border-t border-white/20 pt-8 lg:grid-cols-[1fr_0.8fr] lg:items-end lg:gap-20">
          <Reveal>
            <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-aura-gold-soft">La experiencia Äura / 01</span>
            <h2 id="ascii-title" className="mt-6 max-w-[13ch] font-luxury text-[clamp(3.1rem,7.7vw,7.8rem)] font-semibold leading-[0.88] tracking-[-0.065em] text-white">
              Lo invisible deja <span className="text-aura-gold-soft">huella.</span>
            </h2>
          </Reveal>
          <Reveal delay={100} className="lg:pb-2">
            <p className="max-w-[43ch] text-sm leading-relaxed text-white/65 sm:text-base">
              Un perfume transforma lo que no se ve: el momento de encontrarte con alguien y la estela que queda después.
            </p>
            <Link href="/#top-ventas" className="mt-6 inline-flex min-h-11 items-center gap-3 border-b border-aura-gold-soft/70 text-[10px] font-bold uppercase tracking-[0.17em] text-aura-gold-soft transition-colors hover:border-white hover:text-white">
              Encontrá tu fragancia <ArrowUpRight size={16} />
            </Link>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-4 lg:mt-16 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,0.75fr)] lg:gap-5">
          <Reveal>
            <figure className="relative overflow-hidden bg-black">
              <div className="aspect-[4/3] sm:aspect-[16/9] lg:aspect-[1.58]">
                <AsciiArt src="/ascii/encuentro.mp4" poster="/ascii/encuentro.webp" className="h-full w-full object-cover" />
              </div>
              <figcaption className="absolute bottom-0 left-0 right-0 flex items-end justify-between bg-gradient-to-t from-black/85 to-transparent px-5 pb-5 pt-16 sm:px-7 sm:pb-7">
                <span className="font-luxury text-2xl text-white sm:text-3xl">El encuentro</span>
                <span className="text-[10px] font-bold tracking-[0.2em] text-white/70">01 / 02</span>
              </figcaption>
            </figure>
          </Reveal>
          <Reveal delay={110}>
            <figure className="relative h-full min-h-[300px] overflow-hidden bg-black sm:min-h-[430px] lg:min-h-0">
              <AsciiArt src="/ascii/escultura.mp4" poster="/ascii/escultura.webp" className="absolute inset-0 h-full w-full object-cover" />
              <figcaption className="absolute bottom-0 left-0 right-0 flex items-end justify-between bg-gradient-to-t from-black/85 to-transparent px-5 pb-5 pt-16 sm:px-7 sm:pb-7">
                <span className="font-luxury text-2xl text-white sm:text-3xl">La estela</span>
                <span className="text-[10px] font-bold tracking-[0.2em] text-white/70">02 / 02</span>
              </figcaption>
            </figure>
          </Reveal>
        </div>
        <p className="mt-5 text-right text-[9px] font-medium uppercase tracking-[0.2em] text-white/45">Dos momentos. Una impresión que permanece.</p>
      </div>
    </section>
  );
}