import { LOGO_AURA_TRAZOS, LOGO_AURA_VIEWBOX } from './logo-aura'
import { FORMATO_ETIQUETA_INICIAL, validarFormatoEtiqueta, type FormatoEtiqueta } from './formato'

export const DISENOS_AURA = [
  { id: 'silencio', nombre: 'Minimal', detalle: 'Limpio y equilibrado' },
  { id: 'sello', nombre: 'Clásico', detalle: 'Serif y línea sutil' },
  { id: 'editorial', nombre: 'Editorial', detalle: 'Tipografía con carácter' },
] as const

export type DisenoAura = (typeof DISENOS_AURA)[number]['id']
export type AlineacionEtiquetaAura = 'centrada' | 'izquierda'
export interface OpcionesEtiquetaAura { alineacion?: AlineacionEtiquetaAura }
export interface DatosEtiquetaAura { codigo: string; nombre: string; volumenMl: number }
export type MedirTexto = (texto: string, tamanio: number, fuente: string, peso: number) => number

const FUENTE_SERIF = 'Georgia, Times New Roman, serif'
const FUENTE_SANS = 'Helvetica Neue, Arial, sans-serif'
const ESTILOS = {
  silencio: { fuente: FUENTE_SANS, peso: 400, tamanio: 22, espaciado: 0.9, logo: 0.86 },
  sello: { fuente: FUENTE_SERIF, peso: 400, tamanio: 26, espaciado: 0.2, logo: 0.86 },
  editorial: { fuente: FUENTE_SANS, peso: 500, tamanio: 23, espaciado: 0.6, logo: 0.78 },
} as const

function escaparXml(valor: string): string {
  return valor.replace(/[&<>"']/g, caracter => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[caracter]!)
}

export function extraerVolumenMl(atributos: Record<string, unknown> | null): number | null {
  if (!atributos || atributos['granel'] !== undefined) return null
  const valor = atributos['ml']
  if (typeof valor !== 'string' && typeof valor !== 'number') return null
  const texto = String(valor).trim().replace(',', '.')
  if (!/^\d+(?:\.\d+)?(?:\s*ml)?$/i.test(texto)) return null
  const numero = Number.parseFloat(texto)
  return Number.isFinite(numero) && numero > 0 && numero <= 1000 ? numero : null
}

function mejorParticion(palabras: string[], cantidad: number, anchoMaximo: number, medir: (texto: string) => number): string[] | null {
  let elegida: string[] | null = null
  let puntaje = Infinity
  function visitar(indice: number, lineas: string[], anchos: number[]) {
    if (lineas.length === cantidad) {
      if (indice !== palabras.length) return
      const promedio = anchos.reduce((suma, ancho) => suma + ancho, 0) / cantidad
      const diferencia = anchos.reduce((suma, ancho) => suma + (ancho - promedio) ** 2, 0)
      if (diferencia < puntaje) { elegida = [...lineas]; puntaje = diferencia }
      return
    }
    const restantes = cantidad - lineas.length - 1
    for (let final = indice + 1; final <= palabras.length - restantes; final++) {
      const linea = palabras.slice(indice, final).join(' ')
      const ancho = medir(linea)
      if (ancho > anchoMaximo) break
      visitar(final, [...lineas, linea], [...anchos, ancho])
    }
  }
  visitar(0, [], [])
  return elegida
}

interface NombreCompuesto { lineas: string[]; tamanio: number; interlineado: number; alto: number; puntaje: number }

function componerNombre(nombre: string, diseno: DisenoAura, escala: number, ancho: number, alto: number, medir: MedirTexto): NombreCompuesto | null {
  const estilo = ESTILOS[diseno]
  const palabras = nombre.trim().replace(/\s+/g, ' ').toLocaleUpperCase('es-PY').split(' ')
  let elegida: NombreCompuesto | null = null
  for (let base = estilo.tamanio; base >= 15; base--) {
    const tamanio = base * escala
    const interlineado = tamanio * 1.34
    const medirLinea = (linea: string) => medir(linea, tamanio, estilo.fuente, estilo.peso) +
      Math.max(0, [...linea].length - 1) * estilo.espaciado * escala
    for (let cantidad = 1; cantidad <= Math.min(4, palabras.length); cantidad++) {
      const bloqueAlto = tamanio + (cantidad - 1) * interlineado
      if (bloqueAlto > alto) break
      const lineas = mejorParticion(palabras, cantidad, ancho, medirLinea)
      if (!lineas) continue
      // Evitar tres líneas grandes si el nombre puede respirar en dos apenas menores.
      const huerfana = palabras.length >= 6 && cantidad >= 3 && lineas.some(linea => !linea.includes(' '))
      const puntaje = base - (cantidad - 1) * 1.6 - (huerfana ? 3 : 0)
      if (!elegida || puntaje > elegida.puntaje) elegida = { lineas, tamanio, interlineado, alto: bloqueAlto, puntaje }
    }
  }
  return elegida
}

/** Estimador conservador para tests y entornos sin Canvas. En la UI se mide con Canvas. */
export const medirTextoAproximado: MedirTexto = (texto, tamanio) => {
  const unidades = [...texto].reduce((suma, letra) =>
    suma + ('MW'.includes(letra) ? 0.84 : 'IJ'.includes(letra) ? 0.36 : letra === ' ' ? 0.3 : 0.61), 0)
  return unidades * tamanio
}

export function crearSvgEtiquetaAura(
  datos: DatosEtiquetaAura,
  diseno: DisenoAura,
  medir: MedirTexto = medirTextoAproximado,
  formato: FormatoEtiqueta = FORMATO_ETIQUETA_INICIAL,
  opciones: OpcionesEtiquetaAura = {}
): { svg: string; error?: never } | { svg?: never; error: string } {
  const codigo = datos.codigo.trim().toLocaleUpperCase('es-PY')
  const nombre = datos.nombre.trim()
  if (!codigo || !nombre) return { error: 'La etiqueta necesita código y nombre.' }
  if (!Number.isFinite(datos.volumenMl) || datos.volumenMl <= 0 || datos.volumenMl > 1000) {
    return { error: 'Elegí una presentación con volumen en ml.' }
  }
  if (!DISENOS_AURA.some(opcion => opcion.id === diseno)) return { error: 'Diseño desconocido.' }
  const errorFormato = validarFormatoEtiqueta(formato)
  if (errorFormato) return { error: errorFormato }
  const alineacion = opciones.alineacion ?? 'centrada'
  if (alineacion !== 'centrada' && alineacion !== 'izquierda') return { error: 'Alineación desconocida.' }

  const ancho = formato.anchoMm * 10
  const alto = formato.altoMm * 10
  const escala = Math.min(ancho, alto, 300) / 200
  const margen = 22 * escala
  const anchoUtil = ancho - margen * 2
  const compacto = ancho >= alto
  const estilo = ESTILOS[diseno]
  const logoAncho = Math.min(anchoUtil * estilo.logo, alto * (compacto ? 0.57 : 0.75))
  const logoAlto = logoAncho * 631 / 1889
  const separacionNombre = (compacto ? 18 : 40) * escala
  const separacionDatos = (compacto ? 18 : 30) * escala
  const datosTam = 12 * escala
  const datosEspacio = 1.1 * escala
  const ml = `${String(datos.volumenMl).replace('.', ',')} ML`
  const detalle = `${codigo} · ${ml}`
  const datosAncho = medir(detalle, datosTam, FUENTE_SANS, 400) + ([...detalle].length - 1) * datosEspacio
  if (datosAncho > anchoUtil) return { error: 'El código o volumen no entra en estas medidas. Aumentá el ancho de la etiqueta.' }

  const nombreAlto = alto - margen * 2 - logoAlto - separacionNombre - separacionDatos - datosTam
  const composicion = componerNombre(nombre, diseno, escala, anchoUtil, nombreAlto, medir)
  if (!composicion) return { error: 'El texto no entra en estas medidas. Acortá el nombre o aumentá el tamaño de la etiqueta.' }
  const bloqueAlto = logoAlto + separacionNombre + composicion.alto + separacionDatos + datosTam
  const inicio = (alto - bloqueAlto) / 2
  const centrada = alineacion === 'centrada'
  const x = centrada ? ancho / 2 : margen
  const anclaje = centrada ? 'middle' : 'start'
  const nombreInicio = inicio + logoAlto + separacionNombre
  const datosInicio = nombreInicio + composicion.alto + separacionDatos
  const nombreSvg = composicion.lineas.map((linea, indice) =>
    `<text data-label-part="name" x="${x}" y="${nombreInicio + composicion.tamanio * 0.8 + indice * composicion.interlineado}" fill="#000" font-family="${estilo.fuente}" font-size="${composicion.tamanio}" font-weight="${estilo.peso}" text-anchor="${anclaje}" letter-spacing="${estilo.espaciado * escala}">${escaparXml(linea)}</text>`
  ).join('\n')
  const linea = diseno === 'sello'
    ? `<path data-label-part="rule" d="M${centrada ? ancho / 2 - 14 * escala : margen} ${datosInicio - separacionDatos / 2}h${28 * escala}" stroke="#000" stroke-width="${0.8 * escala}"/>` : ''

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${formato.anchoMm}mm" height="${formato.altoMm}mm" viewBox="0 0 ${ancho} ${alto}" role="img" aria-label="Etiqueta Äura ${escaparXml(codigo)} ${escaparXml(nombre)} ${ml}" data-label-design="${diseno}" data-label-alignment="${alineacion}"><title>Etiqueta Äura ${escaparXml(codigo)}</title><rect width="${ancho}" height="${alto}" fill="#fff"/>
<svg x="${centrada ? (ancho - logoAncho) / 2 : margen}" y="${inicio}" width="${logoAncho}" height="${logoAlto}" viewBox="${LOGO_AURA_VIEWBOX}" data-brand-logo="aura-oficial" aria-hidden="true">${LOGO_AURA_TRAZOS}</svg>
${nombreSvg}${linea}
<text data-label-part="details" x="${x}" y="${datosInicio + datosTam * 0.8}" fill="#000" font-family="${FUENTE_SANS}" font-size="${datosTam}" font-weight="400" text-anchor="${anclaje}" letter-spacing="${datosEspacio}">${escaparXml(detalle)}</text></svg>`,
  }
}
