import { LOGO_AURA_TRAZOS } from './logo-aura'

export const DISENOS_AURA = [
  { id: 'silencio', nombre: 'Silencio', detalle: 'Logo amplio y mucho aire' },
  { id: 'editorial', nombre: 'Editorial', detalle: 'Logo y código en una línea' },
  { id: 'sello', nombre: 'Firma', detalle: 'Logo protagonista y datos abajo' },
] as const

export type DisenoAura = (typeof DISENOS_AURA)[number]['id']

export interface DatosEtiquetaAura {
  codigo: string
  nombre: string
  volumenMl: number
}

export type MedirTexto = (texto: string, tamanio: number, fuente: string, peso: number) => number

interface PlantillaNombre {
  tamanios: number[]
  posiciones: number[]
}

const FUENTE_SERIF = 'Baskerville, Georgia, serif'
const FUENTE_SANS = 'Avenir Next, Arial, sans-serif'

function logoOficial(x: number, y: number, ancho: number): string {
  const alto = Math.round(ancho * 631 / 1889)
  return `<svg x="${x}" y="${y}" width="${ancho}" height="${alto}" viewBox="0 0 1889 631" data-brand-logo="aura-oficial" aria-hidden="true">${LOGO_AURA_TRAZOS}</svg>`
}

const PLANTILLAS: Record<DisenoAura, PlantillaNombre[]> = {
  silencio: [
    { tamanios: [47], posiciones: [253] },
    { tamanios: [39], posiciones: [253] },
    { tamanios: [34], posiciones: [253] },
    { tamanios: [47, 39], posiciones: [231, 278] },
    { tamanios: [43, 37], posiciones: [231, 278] },
    { tamanios: [38, 34], posiciones: [231, 278] },
    { tamanios: [31, 31, 31], posiciones: [216, 253, 290] },
    { tamanios: [28, 28, 28], posiciones: [216, 253, 290] },
    { tamanios: [25, 25, 25], posiciones: [216, 253, 290] },
  ],
  editorial: [
    { tamanios: [45], posiciones: [252] },
    { tamanios: [39], posiciones: [252] },
    { tamanios: [34], posiciones: [252] },
    { tamanios: [45, 41, 41], posiciones: [198, 246, 294] },
    { tamanios: [40, 38, 38], posiciones: [198, 246, 294] },
    { tamanios: [35, 35, 35], posiciones: [198, 246, 294] },
    { tamanios: [30, 30, 30], posiciones: [198, 246, 294] },
    { tamanios: [27, 27, 27], posiciones: [198, 246, 294] },
    { tamanios: [41, 38], posiciones: [220, 272] },
    { tamanios: [35, 35], posiciones: [220, 272] },
  ],
  sello: [
    { tamanios: [35], posiciones: [258] },
    { tamanios: [35, 31], posiciones: [238, 278] },
    { tamanios: [32, 29], posiciones: [238, 278] },
    { tamanios: [29, 29, 29], posiciones: [216, 255, 294] },
    { tamanios: [26, 26, 26], posiciones: [216, 255, 294] },
    { tamanios: [24, 24, 24], posiciones: [216, 255, 294] },
  ],
}

function escaparXml(valor: string): string {
  return valor.replace(/[&<>"']/g, caracter => {
    const entidades: Record<string, string> = {
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
    }
    return entidades[caracter] ?? caracter
  })
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

function mejorParticion(
  palabras: string[],
  tamanios: number[],
  fuente: string,
  peso: number,
  anchoMaximo: number,
  medir: MedirTexto
): string[] | null {
  let mejorLineas: string[] | null = null
  let mejorPuntaje = Number.POSITIVE_INFINITY

  function visitar(indice: number, lineas: string[], anchos: number[]) {
    if (lineas.length === tamanios.length) {
      if (indice !== palabras.length) return
      const promedio = anchos.reduce((suma, ancho) => suma + ancho, 0) / anchos.length
      const lineaFinal = lineas[lineas.length - 1] ?? ''
      const finalHuerfano = palabras.length >= lineas.length + 3 &&
        lineaFinal.split(' ').length === 1
      const puntaje = anchos.reduce((suma, ancho) => suma + (ancho - promedio) ** 2, 0) +
        (finalHuerfano ? 10_000 : 0)
      if (puntaje < mejorPuntaje) {
        mejorLineas = [...lineas]
        mejorPuntaje = puntaje
      }
      return
    }

    const restantes = tamanios.length - lineas.length - 1
    for (let final = indice + 1; final <= palabras.length - restantes; final++) {
      const linea = palabras.slice(indice, final).join(' ')
      const ancho = medir(linea, tamanios[lineas.length]!, fuente, peso)
      if (ancho > anchoMaximo) break
      visitar(final, [...lineas, linea], [...anchos, ancho])
    }
  }

  visitar(0, [], [])
  return mejorLineas
}

function componerNombre(nombre: string, diseno: DisenoAura, medir: MedirTexto): string | null {
  const palabras = nombre.trim().replace(/\s+/g, ' ').toLocaleUpperCase('es-PY').split(' ')
  const fuente = diseno === 'silencio' ? FUENTE_SERIF : FUENTE_SANS
  const peso = diseno === 'silencio' ? 600 : 700
  const ancho = diseno === 'editorial' ? 340 : 350
  const x = diseno === 'editorial' ? 30 : 200
  const anclaje = diseno === 'editorial' ? '' : ' text-anchor="middle"'
  let elegida: { lineas: string[]; plantilla: PlantillaNombre; puntaje: number } | null = null

  for (const plantilla of PLANTILLAS[diseno]) {
    const lineas = mejorParticion(palabras, plantilla.tamanios, fuente, peso, ancho, medir)
    if (!lineas) continue
    const mediaTamanio = plantilla.tamanios.reduce((suma, valor) => suma + valor, 0) / lineas.length
    // Un nombre largo con una palabra sola al final se ve accidental. Preferir
    // un cuerpo apenas menor que permita repartirlo con intención.
    const huerfana = palabras.length >= lineas.length + 3 &&
      lineas.some(linea => linea.split(' ').length === 1)
    const puntaje = mediaTamanio - (huerfana ? 9 : 0)
    if (!elegida || puntaje > elegida.puntaje) elegida = { lineas, plantilla, puntaje }
  }
  if (!elegida) return null
  return elegida.lineas.map((linea, i) =>
    `<text x="${x}" y="${elegida.plantilla.posiciones[i]}" fill="#000" font-family="${fuente}" font-size="${elegida.plantilla.tamanios[i]}" font-weight="${peso}"${anclaje}>${escaparXml(linea)}</text>`
  ).join('\n')
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
  medir: MedirTexto = medirTextoAproximado
): { svg: string; error?: never } | { svg?: never; error: string } {
  const codigo = datos.codigo.trim().toLocaleUpperCase('es-PY')
  const nombre = datos.nombre.trim()
  if (!codigo || !nombre) return { error: 'La etiqueta necesita código y nombre.' }
  if (!Number.isFinite(datos.volumenMl) || datos.volumenMl <= 0 || datos.volumenMl > 1000) {
    return { error: 'Elegí una presentación con volumen en ml.' }
  }
  if (!DISENOS_AURA.some(opcion => opcion.id === diseno)) return { error: 'Diseño desconocido.' }

  const codigoAncho = diseno === 'editorial' ? 132 : diseno === 'sello' ? 120 : 170
  const codigoTam = diseno === 'editorial' ? 24 : diseno === 'sello' ? 25 : 26
  if (medir(codigo, codigoTam, FUENTE_SANS, 700) > codigoAncho) {
    return { error: 'El código es demasiado largo para la etiqueta.' }
  }

  const nombreSvg = componerNombre(nombre, diseno, medir)
  if (!nombreSvg) return { error: 'El nombre no entra en 40 mm. Escribí una versión más corta para imprimir.' }
  const ml = `${String(datos.volumenMl).replace('.', ',')} ML`
  const limpio = escaparXml(codigo)

  const comunes = {
    silencio: `
${logoOficial(30, 22, 340)}
<text x="200" y="154" fill="#000" font-family="${FUENTE_SANS}" font-size="26" font-weight="700" text-anchor="middle" letter-spacing="4">${limpio}</text>
${nombreSvg}
<path d="M171 315h58" stroke="#000" stroke-width="2"/>
<text x="200" y="361" fill="#000" font-family="${FUENTE_SANS}" font-size="31" font-weight="600" text-anchor="middle" letter-spacing="6">${ml}</text>`,
    editorial: `
${logoOficial(29, 28, 195)}
<text x="371" y="73" fill="#000" font-family="${FUENTE_SANS}" font-size="24" font-weight="700" text-anchor="end" letter-spacing="2">${limpio}</text>
<path d="M29 108h342" stroke="#000" stroke-width="2"/>
${nombreSvg}
<text x="370" y="364" fill="#000" font-family="Optima, Georgia, serif" font-size="35" font-weight="600" text-anchor="end" letter-spacing="3">${ml}</text>`,
    sello: `
${logoOficial(32, 29, 336)}
<text x="200" y="179" fill="#000" font-family="${FUENTE_SANS}" font-size="25" font-weight="700" text-anchor="middle" letter-spacing="4">${limpio}</text>
${nombreSvg}
<text x="200" y="362" fill="#000" font-family="${FUENTE_SANS}" font-size="29" font-weight="700" text-anchor="middle" letter-spacing="4">${ml}</text>`,
  }[diseno]

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="40mm" height="40mm" viewBox="0 0 400 400" role="img" aria-label="Etiqueta Äura ${limpio} ${escaparXml(nombre)} ${ml}"><title>Etiqueta Äura ${limpio}</title><rect width="400" height="400" fill="#fff"/>${comunes}</svg>`,
  }
}