'use client';

import { Download, Tags } from 'lucide-react';

const downloads = [
  {
    title: 'Kit para redes sociales',
    detail: 'Foto de perfil, logo completo en borgoña, blanco y negro, y versiones vectoriales.',
    href: '/brand/descargas/AURA-logo-redes-sociales.zip',
    meta: 'ZIP · Instagram, Facebook y WhatsApp Business',
  },
  {
    title: 'Logo oficial y muestras de etiqueta',
    detail: 'Archivos originales y tres ejemplos de impresión térmica de 40 × 40 mm.',
    href: '/brand/descargas/AURA-logo-oficial-entregables.zip',
    meta: 'ZIP · marca e impresión',
  },
  {
    title: 'Flyers de perfumes',
    detail: '94 piezas verticales del catálogo listas para publicaciones de Instagram.',
    href: '/brand/descargas/AURA-94-flyers-Instagram.zip',
    meta: 'ZIP · 1080 × 1350 px · 94 archivos',
  },
] as const;

export default function AdminBrand({ onGoToLabels }: { onGoToLabels: () => void }) {
  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-aura-wine">Identidad oficial Äura</p>
          <h2 className="font-luxury text-3xl font-semibold tracking-tight text-aura-ink sm:text-4xl">Logo y materiales</h2>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">Archivos listos para redes, piezas de producto e impresión. Usan el logo que aprobaste para la tienda.</p>
        </div>
        <button type="button" onClick={onGoToLabels} className="inline-flex min-h-11 items-center gap-2 border border-aura-ink px-4 text-[11px] font-bold uppercase tracking-[0.12em] text-aura-ink transition-colors hover:bg-aura-ivory">
          <Tags size={15} /> Preparar etiquetas
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.4fr)]">
        <div className="border border-zinc-200 bg-white p-5 sm:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Foto de perfil</p>
          <div className="mx-auto my-6 aspect-square w-full max-w-52 overflow-hidden bg-aura-wine">
            <img src="/logo-512.png" alt="Isologo Äura, letra Ä blanca sobre borgoña" className="h-full w-full object-cover" width={512} height={512} />
          </div>
          <p className="text-sm font-semibold text-aura-ink">Para Instagram, Facebook y WhatsApp</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">El monograma se lee bien incluso después del recorte circular de las fotos de perfil.</p>
          <a href="/logo-512.png" download="AURA-foto-perfil.png" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 bg-aura-ink px-4 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-aura-wine"><Download size={15} /> Descargar PNG</a>
        </div>

        <div className="grid gap-4 sm:grid-rows-2">
          <div className="flex flex-col justify-between border border-zinc-200 bg-[#f7f4ef] p-5 sm:p-7">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Logotipo completo · fondo claro</p>
              <img src="/brand/aura-wordmark-burgundy.png" alt="Logo oficial Äura en borgoña" className="my-6 h-auto w-full max-w-md" width={1600} height={534} />
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <a href="/brand/aura-wordmark-burgundy.png" download className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-aura-wine hover:underline"><Download size={14} /> PNG transparente</a>
              <a href="/brand/aura-wordmark-burgundy.svg" download className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-aura-wine hover:underline"><Download size={14} /> SVG vectorial</a>
            </div>
          </div>
          <div className="flex flex-col justify-between border border-aura-wine bg-aura-wine p-5 sm:p-7">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">Logotipo completo · fondo oscuro</p>
              <img src="/brand/aura-wordmark-white.png" alt="Logo oficial Äura en blanco" className="my-6 h-auto w-full max-w-md" width={1600} height={534} />
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <a href="/brand/aura-wordmark-white.png" download className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white hover:underline"><Download size={14} /> PNG transparente</a>
              <a href="/brand/aura-wordmark-white.svg" download className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white hover:underline"><Download size={14} /> SVG vectorial</a>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {downloads.map(item => (
          <a key={item.href} href={item.href} download className="group flex min-h-44 flex-col justify-between border border-zinc-200 bg-white p-5 transition-colors hover:border-aura-wine">
            <span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-aura-wine">{item.meta}</span>
              <span className="mt-4 block font-luxury text-lg font-semibold text-aura-ink">{item.title}</span>
              <span className="mt-1.5 block text-xs leading-relaxed text-zinc-500">{item.detail}</span>
            </span>
            <span className="mt-5 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-aura-ink group-hover:text-aura-wine"><Download size={15} /> Descargar</span>
          </a>
        ))}
      </div>
    </div>
  );
}