'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Download, MessageCircle, Printer, Search } from 'lucide-react';
import { useProducts } from '../context/ProductsContext';
import {
  crearSvgEtiquetaAura,
  DISENOS_AURA,
  medirTextoAproximado,
  type DisenoAura,
  type MedirTexto,
} from '../lib/labels/aura';

const inputClass = 'w-full min-h-11 border border-zinc-200 bg-white px-3 py-2.5 text-sm text-aura-ink outline-none transition-colors focus:border-aura-wine';
const labelClass = 'mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500';
const noSubscription = () => () => {};
let measureContext: CanvasRenderingContext2D | null = null;

const measureInBrowser: MedirTexto = (text, size, font, weight) => {
  if (typeof document === 'undefined') return medirTextoAproximado(text, size, font, weight);
  measureContext ??= document.createElement('canvas').getContext('2d');
  if (!measureContext) return medirTextoAproximado(text, size, font, weight);
  measureContext.font = `${weight} ${size}px ${font}`;
  return measureContext.measureText(text).width * 1.035;
};

async function svgToPng(svg: string): Promise<Blob> {
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('No se pudo crear el PNG.'));
      image.src = svgUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 320;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Este navegador no permite crear el PNG.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, 320, 320);
    context.drawImage(image, 0, 0, 320, 320);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo crear el PNG.')), 'image/png');
    });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function printHtml(svg: string, copies: number) {
  const pages = Array.from({ length: copies }, (_, index) =>
    `<div class="page${index === copies - 1 ? ' last' : ''}">${svg}</div>`
  ).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Etiquetas Äura</title><style>
    @page { size: 40mm 40mm; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; }
    .page { width: 40mm; height: 40mm; overflow: hidden; break-after: page; page-break-after: always; }
    .page.last { break-after: auto; page-break-after: auto; }
    svg { display: block; width: 40mm; height: 40mm; }
    @media screen { body { width: 40mm; margin: 24px auto; } .page { border: 1px solid #ddd; margin-bottom: 12px; } }
    @media print { .page { border: 0; } }
  </style></head><body>${pages}</body></html>`;
}

export default function AdminLabels() {
  const { products, source } = useProducts();
  const mounted = useSyncExternalStore(noSubscription, () => true, () => false);
  const sorted = useMemo(() => [...products].sort((a, b) => a.code.localeCompare(b.code, 'es', { numeric: true })), [products]);
  const [search, setSearch] = useState('');
  const [code, setCode] = useState(products[0]?.code ?? '');
  const [name, setName] = useState(products[0]?.name ?? '');
  const [nameEdited, setNameEdited] = useState(false);
  const [volume, setVolume] = useState(30);
  const [design, setDesign] = useState<DisenoAura>('silencio');
  const [copies, setCopies] = useState(1);
  const [png, setPng] = useState<Blob | null>(null);
  const [notice, setNotice] = useState('');

  const selected = sorted.find(product => product.code === code);
  const matches = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es-PY');
    return term
      ? sorted.filter(product => `${product.code} ${product.name} ${product.inspiration}`.toLocaleLowerCase('es-PY').includes(term))
      : sorted;
  }, [sorted, search]);

  useEffect(() => {
    if (selected || sorted.length === 0) return;
    setCode(sorted[0].code);
    setName(sorted[0].name);
    setNameEdited(false);
  }, [selected, sorted]);

  useEffect(() => {
    if (!nameEdited && selected) setName(selected.name);
  }, [nameEdited, selected]);

  const result = useMemo(() => {
    if (!mounted || !selected) return null;
    return crearSvgEtiquetaAura({ codigo: selected.code, nombre: name, volumenMl: volume }, design, measureInBrowser);
  }, [mounted, selected, name, volume, design]);
  const svg = result?.svg ?? null;

  useEffect(() => {
    if (!svg) {
      setPng(null);
      return;
    }
    let active = true;
    svgToPng(svg).then(blob => {
      if (active) setPng(blob);
    }).catch(() => {
      if (active) setPng(null);
    });
    return () => { active = false; };
  }, [svg]);

  const filename = `AURA-${(selected?.code ?? 'etiqueta').toUpperCase().replace(/[^A-Z0-9-]+/g, '-')}-${String(volume).replace('.', '-')}ML-${design}`;

  function selectProduct(nextCode: string) {
    const product = sorted.find(item => item.code === nextCode);
    setCode(nextCode);
    setName(product?.name ?? '');
    setNameEdited(false);
    setPng(null);
    setNotice('');
  }

  function printLabels() {
    if (!svg) return;
    const popup = window.open('', '_blank', 'width=500,height=550');
    if (!popup) {
      setNotice('El navegador bloqueó la ventana de impresión. Permití las ventanas emergentes.');
      return;
    }
    popup.onload = () => { popup.focus(); popup.print(); };
    popup.document.open();
    popup.document.write(printHtml(svg, copies));
    popup.document.close();
    setNotice(`${copies} ${copies === 1 ? 'etiqueta preparada' : 'etiquetas preparadas'} para imprimir en papel de 40 × 40 mm.`);
  }

  function downloadPng() {
    if (!png) return;
    downloadFile(png, `${filename}.png`);
    setNotice('PNG descargado. Para imprimirlo fuera del panel, configurá el papel en 40 × 40 mm.');
  }

  function downloadSvg() {
    if (!svg) return;
    downloadFile(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `${filename}.svg`);
    setNotice('SVG descargado con medida física de 40 × 40 mm.');
  }

  async function shareLabel() {
    if (!png || !selected) return;
    const file = new File([png], `${filename}.png`, { type: 'image/png' });
    const text = `Etiqueta Äura · ${selected.code} · ${name.trim()} · ${volume} ML`;
    let supportsFile = false;
    try {
      supportsFile = Boolean(navigator.share) && (!navigator.canShare || navigator.canShare({ files: [file] }));
    } catch {
      supportsFile = false;
    }
    if (supportsFile) {
      try {
        await navigator.share({ files: [file], title: 'Etiqueta Äura', text });
        setNotice('Etiqueta compartida desde el menú del dispositivo.');
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    downloadFile(png, `${filename}.png`);
    const popup = window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    setNotice(popup
      ? 'Se descargó el PNG. Adjuntalo en la conversación de WhatsApp que se abrió.'
      : 'Se descargó el PNG. Abrí WhatsApp y adjuntalo para enviarlo.');
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-aura-wine">Atelier Äura / impresión</p>
          <h2 className="font-luxury text-3xl font-semibold tracking-tight text-aura-ink sm:text-4xl">Etiquetas de perfume</h2>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">Elegí un perfume del catálogo, ajustá el nombre y prepará su etiqueta térmica con el logo oficial.</p>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">40 × 40 mm · negro sobre blanco</p>
      </div>

      {source === 'local' && (
        <p className="border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900">Se muestra el catálogo incluido. Cuando Firebase termine de cargar, aparecerán todos tus perfumes.</p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,410px)]">
        <div className="space-y-6 border border-zinc-200 bg-white p-5 sm:p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Buscar perfume</span>
              <span className="relative block">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Código o nombre" className={`${inputClass} pl-9`} />
              </span>
            </label>
            <label className="block">
              <span className={labelClass}>Producto · {products.length} en catálogo</span>
              <select value={code} onChange={event => selectProduct(event.target.value)} className={inputClass}>
                {selected && !matches.some(product => product.code === selected.code) && <option value={selected.code}>{selected.code} · {selected.name}</option>}
                {matches.map(product => <option key={product.code} value={product.code}>{product.code} · {product.name}</option>)}
              </select>
            </label>
          </div>
          {matches.length === 0 && <p className="text-sm text-zinc-500">No hay perfumes para esa búsqueda.</p>}

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_150px]">
            <label className="block">
              <span className={labelClass}>Nombre en la etiqueta</span>
              <input type="text" value={name} maxLength={120} disabled={!selected} onChange={event => { setName(event.target.value); setNameEdited(true); setPng(null); setNotice(''); }} className={inputClass} />
              <span className="mt-1.5 block text-xs text-zinc-500">Podés acortarlo para que se lea mejor. El producto no cambia.</span>
            </label>
            <label className="block">
              <span className={labelClass}>Volumen en ml</span>
              <input type="number" min={1} max={1000} step="1" value={volume} onChange={event => { setVolume(Number(event.target.value)); setPng(null); }} className={inputClass} />
              <span className="mt-1.5 block text-xs text-zinc-500">10, 30, 50 u otro.</span>
            </label>
          </div>

          <fieldset>
            <legend className={labelClass}>Diseño</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {DISENOS_AURA.map(option => (
                <button key={option.id} type="button" aria-pressed={design === option.id} onClick={() => { setDesign(option.id); setPng(null); setNotice(''); }} className={`min-h-20 border px-3 py-3 text-left transition-colors ${design === option.id ? 'border-aura-wine bg-aura-ivory' : 'border-zinc-200 hover:border-aura-ink/40'}`}>
                  <span className="block text-sm font-semibold text-aura-ink">{option.nombre}</span>
                  <span className="mt-1 block text-xs leading-snug text-zinc-500">{option.detalle}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className={labelClass}>Copias para imprimir</span>
            <input type="number" min={1} max={50} value={copies} onChange={event => setCopies(Math.max(1, Math.min(50, Number(event.target.value) || 1)))} className={`${inputClass} w-28`} />
          </label>

          <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-5">
            <button type="button" onClick={printLabels} disabled={!svg} className="inline-flex min-h-11 items-center gap-2 bg-aura-ink px-4 text-[11px] font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-aura-wine disabled:opacity-40"><Printer size={15} /> Imprimir</button>
            <button type="button" onClick={downloadPng} disabled={!png} className="inline-flex min-h-11 items-center gap-2 border border-aura-ink px-4 text-[11px] font-bold uppercase tracking-[0.1em] text-aura-ink transition-colors hover:bg-aura-ivory disabled:opacity-40"><Download size={15} /> PNG</button>
            <button type="button" onClick={downloadSvg} disabled={!svg} className="inline-flex min-h-11 items-center gap-2 border border-zinc-300 px-4 text-[11px] font-bold uppercase tracking-[0.1em] text-aura-ink transition-colors hover:border-aura-ink disabled:opacity-40"><Download size={15} /> SVG</button>
            <button type="button" onClick={shareLabel} disabled={!png} className="inline-flex min-h-11 items-center gap-2 border border-zinc-300 px-4 text-[11px] font-bold uppercase tracking-[0.1em] text-aura-ink transition-colors hover:border-aura-ink disabled:opacity-40"><MessageCircle size={15} /> WhatsApp</button>
          </div>
          <p role="status" aria-live="polite" className="min-h-5 text-sm text-aura-wine">{result?.error ?? notice}</p>
          <p className="text-xs leading-relaxed text-zinc-500">En el celular podés compartir el PNG desde el menú del dispositivo. En computadora se descarga para adjuntarlo en WhatsApp. Al imprimir, elegí papel de 40 × 40 mm y escala 100%.</p>
        </div>

        <div className="self-start border border-zinc-200 bg-aura-ivory p-5 sm:p-7 lg:sticky lg:top-32">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-luxury text-xl font-semibold text-aura-ink">Vista previa</h3>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">40 × 40 mm</span>
          </div>
          <div className="mx-auto mt-6 flex aspect-square w-full max-w-[320px] items-center justify-center bg-white shadow-[0_15px_35px_rgba(32,24,24,0.1)]">
            {svg ? (
              <div className="h-full w-full [&>svg]:block [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
            ) : (
              <p className="px-6 text-center text-sm text-zinc-500">{result?.error ?? 'Elegí un perfume para ver la etiqueta.'}</p>
            )}
          </div>
          <p className="mt-5 text-center text-xs text-zinc-500">Vista ampliada. La impresión usa la medida real.</p>
        </div>
      </div>
    </div>
  );
}