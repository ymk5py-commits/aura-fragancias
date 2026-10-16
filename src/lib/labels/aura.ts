import { LOGO_AURA_TRAZOS, LOGO_AURA_VIEWBOX } from './logo-aura'
import { FORMATO_ETIQUETA_INICIAL, validarFormatoEtiqueta, type FormatoEtiqueta } from './formato'

export const DISENOS_AURA = [
  { id: 'silencio', nombre: 'Silencio', detalle: 'Logo amplio y mucho aire' },
  { id: 'editorial', nombre: 'Editorial', detalle: 'Texto alineado y línea fina' },
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
  return `<svg x="${x}" y="${y}" width="${ancho}" height="${alto}" viewBox="${LOGO_AURA_VIEWBOX}" data-brand-logo="aura-oficial" aria-hidden="true">${LOGO_AURA_TRAZOS}</svg>`
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

/** Recompone el contenido para el rectángulo disponible sin deformar el logo ni las letras. */
function componerRectangular(datos: DatosEtiquetaAura, diseno: DisenoAura, medir: MedirTexto, ancho: number, alto: number): string | null {
  const horizontal = ancho > alto
  const margen = Math.min(ancho, alto) * 0.075
  const escala = Math.min(ancho / 200, alto / 200, 1.5)
  const editorial = diseno === 'editorial'
  const fuente = diseno === 'silencio' ? FUENTE_SERIF : FUENTE_SANS
  const peso = diseno === 'silencio' ? 600 : 700
  const logoAncho = horizontal ? Math.min(ancho * 0.48, alto * 0.9) : ancho - margen * 2
  const logoY = margen
  const logoAlto = Math.round(logoAncho * 631 / 1889)
  const logoX = editorial || horizontal ? margen : (ancho - logoAncho) / 2
  const codigoTam = 20 * escala
  const codigoEspacio = 2 * escala
  const codigo = datos.codigo.trim().toLocaleUpperCase('es-PY')
  const codigoAncho = medir(codigo, codigoTam, FUENTE_SANS, 700) + Math.max(0, codigo.length - 1) * codigoEspacio
  const espacioCodigo = horizontal ? ancho - logoAncho - margen * 3 : ancho - margen * 2
  if (codigoAncho > espacioCodigo) return null
  const codigoY = horizontal ? logoY + logoAlto * 0.72 : logoY + logoAlto + 35 * escala
  const cabeceraFin = horizontal ? logoY + logoAlto + 8 * escala : codigoY + 18 * escala
  const volumenTam = 23 * escala
  const volumenY = alto - margen - volumenTam * 0.2
  const nombreInicio = cabeceraFin + (horizontal ? 6 : 12) * escala
  const nombreFin = volumenY - volumenTam - (horizontal ? 8 : 20) * escala
  const espacioNombre = nombreFin - nombreInicio
  const palabras = datos.nombre.trim().replace(/\s+/g, ' ').toLocaleUpperCase('es-PY').split(' ')
  let nombreSvg: string | null = null

  for (let tamanio = 28 * escala; tamanio >= 16 * escala && !nombreSvg; tamanio -= 2 * escala) {
    const interlineado = tamanio * 1.22
    for (let cantidad = 1; cantidad <= Math.min(4, palabras.length); cantidad++) {
      const bloqueAlto = tamanio + (cantidad - 1) * interlineado
      if (bloqueAlto > espacioNombre) break
      const lineas = mejorParticion(palabras, Array(cantidad).fill(tamanio), fuente, peso, ancho - margen * 2, medir)
      if (!lineas) continue
      const primeraLinea = nombreInicio + (espacioNombre - bloqueAlto) / 2 + tamanio * 0.8
      nombreSvg = lineas.map((linea, indice) =>
        `<text x="${editorial ? margen : ancho / 2}" y="${primeraLinea + indice * interlineado}" fill="#000" font-family="${fuente}" font-size="${tamanio}" font-weight="${peso}"${editorial ? '' : ' text-anchor="middle"'}>${escaparXml(linea)}</text>`
      ).join('\n')
      break
    }
  }
  if (!nombreSvg) return null
  const ml = `${String(datos.volumenMl).replace('.', ',')} ML`
  const volumenEspacio = 2 * escala
  if (medir(ml, volumenTam, FUENTE_SANS, 600) + (ml.length - 1) * volumenEspacio > ancho - margen * 2) return null
  return `${logoOficial(logoX, logoY, logoAncho)}
<text x="${horizontal || editorial ? ancho - margen : ancho / 2}" y="${codigoY}" fill="#000" font-family="${FUENTE_SANS}" font-size="${codigoTam}" font-weight="700" text-anchor="${horizontal || editorial ? 'end' : 'middle'}" letter-spacing="${codigoEspacio}">${escaparXml(codigo)}</text>
${editorial ? `<path d="M${margen} ${cabeceraFin}h${ancho - margen * 2}" stroke="#000" stroke-width="${escala}"/>` : ''}
${nombreSvg}
${diseno === 'silencio' ? `<path d="M${ancho / 2 - 20 * escala} ${volumenY - volumenTam - 7 * escala}h${40 * escala}" stroke="#000" stroke-width="${escala}"/>` : ''}
<text x="${editorial ? ancho - margen : ancho / 2}" y="${volumenY}" fill="#000" font-family="${FUENTE_SANS}" font-size="${volumenTam}" font-weight="${diseno === 'sello' ? 700 : 600}" text-anchor="${editorial ? 'end' : 'middle'}" letter-spacing="${volumenEspacio}">${ml}</text>`
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
  formato: FormatoEtiqueta = FORMATO_ETIQUETA_INICIAL
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

  if (formato.anchoMm !== formato.altoMm) {
    const ancho = formato.anchoMm * 10
    const alto = formato.altoMm * 10
    const contenido = componerRectangular(datos, diseno, medir, ancho, alto)
    if (!contenido) return { error: 'El texto no entra en estas medidas. Acortá el nombre o aumentá el tamaño de la etiqueta.' }
    return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${formato.anchoMm}mm" height="${formato.altoMm}mm" viewBox="0 0 ${ancho} ${alto}" role="img" aria-label="Etiqueta Äura ${escaparXml(codigo)} ${escaparXml(nombre)}"><title>Etiqueta Äura ${escaparXml(codigo)}</title><rect width="${ancho}" height="${alto}" fill="#fff"/>${contenido}</svg>` }
  }

  const codigoAncho = diseno === 'editorial' ? 132 : diseno === 'sello' ? 120 : 170
  const codigoTam = diseno === 'editorial' ? 24 : diseno === 'sello' ? 25 : 26
  if (medir(codigo, codigoTam, FUENTE_SANS, 700) > codigoAncho) {
    return { error: 'El código es demasiado largo para la etiqueta.' }
  }

  const nombreSvg = componerNombre(nombre, diseno, medir)
  if (!nombreSvg) return { error: 'El nombre no entra en la etiqueta. Escribí una versión más corta para imprimir.' }
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
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${formato.anchoMm}mm" height="${formato.altoMm}mm" viewBox="0 0 400 400" role="img" aria-label="Etiqueta Äura ${limpio} ${escaparXml(nombre)} ${ml}"><title>Etiqueta Äura ${limpio}</title><rect width="400" height="400" fill="#fff"/>${comunes}</svg>`,
  }
}
