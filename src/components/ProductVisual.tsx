'use client';

import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import Image from 'next/image';
import { Sparkles } from 'lucide-react';
import type { Perfume } from '../types';
import { productArtworkUrl } from '../lib/productArtwork';
import { productScentTrail } from '../lib/productScentTrail';
import smartImageLoader from '../lib/imageLoader';
import ScentTrail from './ScentTrail';

interface Props {
  perfume: Perfume;
  view?: 'catalog' | 'cutout';
  priority?: boolean;
  sizes: string;
}

export default function ProductVisual({ perfume, view = 'catalog', priority = false, sizes }: Props) {
  const [active, setActive] = useState(0);
  const id = useId();
  const trail = useMemo(() => productScentTrail(perfume), [perfume.code, perfume.family, perfume.intensity]);
  const artwork = productArtworkUrl(perfume, view);
  const hasTrail = /^(CC|DD|UU)\d+$/i.test(perfume.code);

  function changeTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') next = 1 - index;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = 1;
    else return;
    event.preventDefault();
    setActive(next);
    const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    tabs?.[next]?.focus();
  }

  return (
    <div className={`relative grid h-full w-full ${hasTrail ? 'grid-rows-[minmax(0,1fr)_48px]' : 'grid-rows-1'}`} data-product-visual={perfume.code}>
      <div id={`${id}-panel`} role={hasTrail ? 'tabpanel' : undefined} aria-labelledby={hasTrail ? `${id}-tab-${active}` : undefined} className="relative min-h-0 overflow-hidden" tabIndex={hasTrail ? 0 : undefined}>
        {active === 0 ? (
          artwork ? <Image src={artwork} alt={`${perfume.name} — inspiración ${perfume.inspiration}`} fill priority={priority} sizes={sizes} loader={smartImageLoader} className="object-contain" /> : (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center text-aura-ink">
              <span className="font-luxury text-5xl">{perfume.code}</span>
              <span className="mt-4 font-luxury text-2xl">{perfume.name}</span>
            </div>
          )
        ) : (
          <div className="relative h-full bg-aura-ink" data-scent-palette={trail.palette}>
            <ScentTrail source={trail.source} variant="product" speed={trail.speed} inQuickView={view === 'cutout'} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-aura-ink via-aura-ink/95 to-transparent px-5 pb-5 pt-10 sm:px-7 sm:pb-7">
              <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.18em]" style={{ color: trail.color }}>Äura / {perfume.code}</p>
              <p className="font-luxury text-[clamp(1.15rem,2.4vw,2rem)] leading-[1.08] tracking-[-0.025em] text-aura-ivory">{perfume.name}</p>
              <p className="mt-2 text-[9px] uppercase tracking-[0.13em] text-aura-ivory/65">{perfume.family}</p>
            </div>
          </div>
        )}
      </div>
      {hasTrail && (
        <div role="tablist" aria-label={`Descubrí ${perfume.name}`} className="grid grid-cols-2 border-t border-aura-ink/10 bg-aura-ivory">
          {['El perfume', 'Su estela'].map((label, index) => (
            <button key={label} type="button" id={`${id}-tab-${index}`} role="tab" aria-selected={active === index} aria-controls={`${id}-panel`} tabIndex={active === index ? 0 : -1} onKeyDown={event => changeTab(event, index)} onClick={() => setActive(index)} className={`flex min-w-0 items-center justify-center gap-2 border-b-2 px-2 text-[10px] font-semibold uppercase tracking-[0.13em] transition-colors focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-aura-cognac ${active === index ? 'border-aura-wine text-aura-wine' : 'border-transparent text-aura-ink/55 hover:bg-aura-sand hover:text-aura-ink'}`}>
              {index === 1 && <Sparkles size={13} strokeWidth={1.5} aria-hidden="true" />}{label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
