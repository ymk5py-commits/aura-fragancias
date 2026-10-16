export interface FormatoEtiqueta {
  anchoMm: number
  altoMm: number
}

export const FORMATO_ETIQUETA_INICIAL: FormatoEtiqueta = { anchoMm: 20, altoMm: 40 }
export const FORMATO_ETIQUETA_STORAGE_KEY = 'aura-etiquetas-formato-v1'

export function validarFormatoEtiqueta(formato: FormatoEtiqueta): string | null {
  if (!formato || ![formato.anchoMm, formato.altoMm].every(valor =>
    typeof valor === 'number' && Number.isFinite(valor) && valor >= 10 && valor <= 150
  )) return 'Ingresá un ancho y un alto entre 1 y 15 cm.'
  return null
}

export function orientarEtiqueta(formato: FormatoEtiqueta, orientacion: 'vertical' | 'horizontal'): FormatoEtiqueta {
  const menor = Math.min(formato.anchoMm, formato.altoMm)
  const mayor = Math.max(formato.anchoMm, formato.altoMm)
  return orientacion === 'vertical' ? { anchoMm: menor, altoMm: mayor } : { anchoMm: mayor, altoMm: menor }
}

export function dimensionesPngEtiqueta(formato: FormatoEtiqueta) {
  return { ancho: Math.round(formato.anchoMm / 25.4 * 300), alto: Math.round(formato.altoMm / 25.4 * 300) }
}

/** Canvas no conserva la medida de impresión: registrar 300 ppp en el propio PNG. */
export async function pngConResolucionImpresion(blob: Blob): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const lectura = new DataView(bytes.buffer)
  const resolucion = new Uint8Array(21)
  const escritura = new DataView(resolucion.buffer)
  escritura.setUint32(0, 9)
  resolucion.set([112, 72, 89, 115], 4) // pHYs
  escritura.setUint32(8, 11811) // 300 píxeles/pulgada en píxeles/metro
  escritura.setUint32(12, 11811)
  resolucion[16] = 1
  let crc = 0xffffffff
  for (const byte of resolucion.subarray(4, 17)) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  escritura.setUint32(17, (crc ^ 0xffffffff) >>> 0)
  const partes: BlobPart[] = [bytes.subarray(0, 33), resolucion]
  // Quitar resoluciones previas, también las que puedan venir en EXIF.
  for (let posicion = 33; posicion < bytes.length;) {
    const fin = posicion + lectura.getUint32(posicion) + 12
    const tipo = lectura.getUint32(posicion + 4)
    if (tipo !== 0x70485973 && tipo !== 0x65584966) partes.push(bytes.subarray(posicion, fin))
    posicion = fin
  }
  return new Blob(partes, { type: 'image/png' })
}

/** Una página por etiqueta, con la misma medida física que el SVG. */
export function crearHtmlImpresionEtiqueta(svg: string, copias: number, formato: FormatoEtiqueta): string {
  if (validarFormatoEtiqueta(formato)) throw new Error('Medidas de etiqueta inválidas.')
  if (!Number.isInteger(copias) || copias < 1 || copias > 50) throw new Error('Elegí entre 1 y 50 copias.')
  const { anchoMm, altoMm } = formato
  const paginas = Array.from({ length: copias }, (_, indice) =>
    `<div class="page${indice === copias - 1 ? ' last' : ''}">${svg}</div>`
  ).join('')
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Etiquetas Äura</title><style>
    @page { size: ${anchoMm}mm ${altoMm}mm; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; }
    .page { width: ${anchoMm}mm; height: ${altoMm}mm; overflow: hidden; break-after: page; page-break-after: always; }
    .page.last { break-after: auto; page-break-after: auto; }
    svg { display: block; width: ${anchoMm}mm; height: ${altoMm}mm; }
    @media screen { body { width: ${anchoMm}mm; margin: 24px auto; } .page { outline: 1px solid #ddd; margin-bottom: 12px; } }
    @media print { * { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style></head><body>${paginas}</body></html>`
}
