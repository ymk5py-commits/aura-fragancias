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
import {
  crearHtmlImpresionEtiqueta,
  dimensionesPngEtiqueta,
  FORMATO_ETIQUETA_INICIAL,
  FORMATO_ETIQUETA_STORAGE_KEY,
  orientarEtiqueta,
  pngConResolucionImpresion,
  validarFormatoEtiqueta,
  type FormatoEtiqueta,
} from '../lib/labels/formato';

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

async function svgToPng(svg: string, format: FormatoEtiqueta): Promise<Blob> {
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('No se pudo crear el PNG.'));
      image.src = svgUrl;
    });
    const canvas = document.createElement('canvas');
    const { ancho, alto } = dimensionesPngEtiqueta(format);
    canvas.width = ancho;
    canvas.height = alto;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Este navegador no permite crear el PNG.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, ancho, alto);
    context.drawImage(image, 0, 0, ancho, alto);
    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo crear el PNG.')), 'image/png');
    });
    return await pngConResolucionImpresion(png);
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
  const [format, setFormat] = useState<FormatoEtiqueta>(FORMATO_ETIQUETA_INICIAL);
  const [formatLoaded, setFormatLoaded] = useState(false);
  const [pngResult, setPngResult] = useState<{ svg: string; blob: Blob } | null>(null);
  const [notice, setNotice] = useState('');
  const formatError = validarFormatoEtiqueta(format);
  const orientation = format.altoMm > format.anchoMm ? 'vertical' : format.anchoMm > format.altoMm ? 'horizontal' : 'cuadrada';
  const formatCm = (value: number) => new Intl.NumberFormat('es-PY', { maximumFractionDigits: 2 }).format(value / 10);
  const dimensions = formatError ? 'Medidas personalizadas' : `${formatCm(format.anchoMm)} × ${formatCm(format.altoMm)} cm`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(FORMATO_ETIQUETA_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!validarFormatoEtiqueta(parsed)) setFormat({ anchoMm: parsed.anchoMm, altoMm: parsed.altoMm });
      }
    } catch { /* Las etiquetas también funcionan si el almacenamiento no está disponible. */ }
    setFormatLoaded(true);
  }, []);

  useEffect(() => {
    if (!formatLoaded || formatError) return;
    try { localStorage.setItem(FORMATO_ETIQUETA_STORAGE_KEY, JSON.stringify(format)); } catch { /* Sin persistencia en este navegador. */ }
  }, [format, formatLoaded, formatError]);

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
    if (!mounted || !formatLoaded || !selected) return null;
    return crearSvgEtiquetaAura({ codigo: selected.code, nombre: name, volumenMl: volume }, design, measureInBrowser, format);
  }, [mounted, formatLoaded, selected, name, volume, design, format]);
  const svg = result?.svg ?? null;
  const png = pngResult?.svg === svg ? pngResult.blob : null;

  useEffect(() => {
    if (!svg) {
      setPngResult(null);
      return;
    }
    let active = true;
    svgToPng(svg, format).then(blob => {
      if (active) setPngResult({ svg, blob });
    }).catch(() => {
      if (active) setPngResult(null);
    });
    return () => { active = false; };
  }, [svg, format]);

  const filename = `AURA-${(selected?.code ?? 'etiqueta').toUpperCase().replace(/[^A-Z0-9-]+/g, '-')}-${String(volume).replace('.', '-')}ML-${design}-${format.anchoMm}x${format.altoMm}mm-${orientation}`;

  function changeFormat(next: FormatoEtiqueta) {
    setFormat(next);
    setNotice('');
  }

  function selectProduct(nextCode: string) {
    const product = sorted.find(item => item.code === nextCode);
    setCode(nextCode);
    setName(product?.name ?? '');
    setNameEdited(false);
    setNotice('');
  }

  function printLabels() {
    if (!svg) return;
    const popup = window.open('', '_blank', 'width=500,height=550');
    if (!popup) {
      setNotice('El navegador bloqueó la ventana de impresión. Permití las ventanas emergentes.');
      return;
    }
    popup.onload = async () => {
      await popup.document.fonts.ready;
      popup.focus();
      popup.print();
    };
    popup.document.open();
    popup.document.write(crearHtmlImpresionEtiqueta(svg, copies, format));
    popup.document.close();
    setNotice(`${copies} ${copies === 1 ? 'etiqueta preparada' : 'etiquetas preparadas'} para imprimir en papel de ${dimensions} (${orientation}).`);
  }

  function downloadPng() {
    if (!png) return;
    downloadFile(png, `${filename}.png`);
    setNotice(`PNG descargado. Para imprimirlo fuera del panel, configurá el papel en ${dimensions} y escala 100%.`);
  }

  function downloadSvg() {
    if (!svg) return;
    downloadFile(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `${filename}.svg`);
    setNotice(`SVG descargado con medida física de ${dimensions}.`);
  }

  async function shareLabel() {
    if (!png || !selected) return;
    const file = new File([png], `${filename}.png`, { type: 'image/png' });
    const text = `Etiqueta Äura · ${selected.code} · ${name.trim()} · ${volume} ML · ${dimensions} (${orientation})`;
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
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">{dimensions} · {orientation} · negro sobre blanco</p>
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
              <input type="text" value={name} maxLength={120} disabled={!selected} onChange={event => { setName(event.target.value); setNameEdited(true); setNotice(''); }} className={inputClass} />
              <span className="mt-1.5 block text-xs text-zinc-500">Podés acortarlo para que se lea mejor. El producto no cambia.</span>
            </label>
            <label className="block">
              <span className={labelClass}>Volumen en ml</span>
              <input type="number" min={1} max={1000} step="1" value={volume} onChange={event => { setVolume(Number(event.target.value)); setNotice(''); }} className={inputClass} />
              <span className="mt-1.5 block text-xs text-zinc-500">10, 30, 50 u otro.</span>
            </label>
          </div>

          <fieldset className="space-y-4 border-t border-zinc-100 pt-5" disabled={!formatLoaded}>
            <legend className={labelClass}>Medidas de la etiqueta</legend>
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={Math.min(format.anchoMm, format.altoMm) === 20 && Math.max(format.anchoMm, format.altoMm) === 40} onClick={() => changeFormat(orientarEtiqueta({ anchoMm: 20, altoMm: 40 }, orientation === 'horizontal' ? 'horizontal' : 'vertical'))} className="min-h-11 border border-zinc-200 px-4 text-sm hover:border-aura-wine aria-pressed:border-aura-wine aria-pressed:bg-aura-ivory">4 × 2 cm</button>
              <button type="button" aria-pressed={format.anchoMm === 40 && format.altoMm === 40} onClick={() => changeFormat({ anchoMm: 40, altoMm: 40 })} className="min-h-11 border border-zinc-200 px-4 text-sm hover:border-aura-wine aria-pressed:border-aura-wine aria-pressed:bg-aura-ivory">4 × 4 cm</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className={labelClass}>Ancho (cm)</span>
                <input type="number" inputMode="decimal" min={1} max={15} step="0.1" value={Number.isFinite(format.anchoMm) ? format.anchoMm / 10 : ''} onChange={event => changeFormat({ ...format, anchoMm: event.target.value === '' ? NaN : Math.round(Number(event.target.value) * 100) / 10 })} aria-invalid={Boolean(formatError)} aria-describedby="label-format-hint" className={inputClass} />
              </label>
              <label className="block">
                <span className={labelClass}>Alto (cm)</span>
                <input type="number" inputMode="decimal" min={1} max={15} step="0.1" value={Number.isFinite(format.altoMm) ? format.altoMm / 10 : ''} onChange={event => changeFormat({ ...format, altoMm: event.target.value === '' ? NaN : Math.round(Number(event.target.value) * 100) / 10 })} aria-invalid={Boolean(formatError)} aria-describedby="label-format-hint" className={inputClass} />
              </label>
            </div>
            <p id="label-format-hint" className="text-xs leading-relaxed text-zinc-500">Personalizá las medidas entre 1 y 15 cm. Para las etiquetas paradas de 4 × 2 cm, usá 2 cm de ancho y 4 cm de alto. Se recuerda tu última medida en este navegador.</p>
          </fieldset>

          <fieldset>
            <legend className={labelClass}>Orientación</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['vertical', 'horizontal'] as const).map(option => (
                <button key={option} type="button" aria-pressed={orientation === option} disabled={Boolean(formatError) || format.anchoMm === format.altoMm} onClick={() => changeFormat(orientarEtiqueta(format, option))} className="flex min-h-14 items-center justify-center gap-3 border border-zinc-200 px-3 py-3 text-sm capitalize hover:border-aura-wine aria-pressed:border-aura-wine aria-pressed:bg-aura-ivory disabled:opacity-40">
                  <span aria-hidden="true" className={`inline-block border-2 border-current ${option === 'vertical' ? 'h-6 w-3' : 'h-3 w-6'}`} />{option}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-zinc-500">{orientation === 'cuadrada' ? 'Con ancho y alto iguales, la etiqueta es cuadrada.' : 'Al cambiar la orientación se intercambian el ancho y el alto.'}</p>
          </fieldset>

          <fieldset>
            <legend className={labelClass}>Diseño</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {DISENOS_AURA.map(option => (
                <button key={option.id} type="button" aria-pressed={design === option.id} onClick={() => { setDesign(option.id); setNotice(''); }} className={`min-h-20 border px-3 py-3 text-left transition-colors ${design === option.id ? 'border-aura-wine bg-aura-ivory' : 'border-zinc-200 hover:border-aura-ink/40'}`}>
                  <span className="block text-sm font-semibold text-aura-ink">{option.nombre}</span>
                  <span className="mt-1 block text-xs leading-snug text-zinc-500">{option.detalle}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className={labelClass}>Copias para imprimir</span>
            <input type="number" inputMode="numeric" min={1} max={50} step={1} value={copies} onChange={event => setCopies(Math.max(1, Math.min(50, Math.round(Number(event.target.value) || 1))))} className={`${inputClass} w-28`} />
          </label>

          <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-5">
            <button type="button" onClick={printLabels} disabled={!svg} className="inline-flex min-h-11 items-center gap-2 bg-aura-ink px-4 text-[11px] font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-aura-wine disabled:opacity-40"><Printer size={15} /> Imprimir</button>
            <button type="button" onClick={downloadPng} disabled={!png} className="inline-flex min-h-11 items-center gap-2 border border-aura-ink px-4 text-[11px] font-bold uppercase tracking-[0.1em] text-aura-ink transition-colors hover:bg-aura-ivory disabled:opacity-40"><Download size={15} /> PNG</button>
            <button type="button" onClick={downloadSvg} disabled={!svg} className="inline-flex min-h-11 items-center gap-2 border border-zinc-300 px-4 text-[11px] font-bold uppercase tracking-[0.1em] text-aura-ink transition-colors hover:border-aura-ink disabled:opacity-40"><Download size={15} /> SVG</button>
            <button type="button" onClick={shareLabel} disabled={!png} className="inline-flex min-h-11 items-center gap-2 border border-zinc-300 px-4 text-[11px] font-bold uppercase tracking-[0.1em] text-aura-ink transition-colors hover:border-aura-ink disabled:opacity-40"><MessageCircle size={15} /> WhatsApp</button>
          </div>
          <p role="status" aria-live="polite" className="min-h-5 text-sm text-aura-wine">{result?.error ?? notice}</p>
          <p className="text-xs leading-relaxed text-zinc-500">En el celular podés compartir el PNG desde el menú del dispositivo. En computadora se descarga para adjuntarlo en WhatsApp. Al imprimir, elegí papel de {dimensions}, escala 100%, sin márgenes ni encabezados.</p>
        </div>

        <div className="self-start border border-zinc-200 bg-aura-ivory p-5 sm:p-7 lg:sticky lg:top-32">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-luxury text-xl font-semibold text-aura-ink">Vista previa</h3>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">{dimensions}</span>
          </div>
          <div style={{ aspectRatio: formatError ? '1' : `${format.anchoMm} / ${format.altoMm}`, width: formatError ? '100%' : `${Math.min(320, 400 * format.anchoMm / format.altoMm)}px`, maxWidth: '100%' }} className="mx-auto mt-6 flex items-center justify-center bg-white shadow-[0_15px_35px_rgba(32,24,24,0.1)]">
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
