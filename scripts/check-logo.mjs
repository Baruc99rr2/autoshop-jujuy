/**
 * Guarda de los ids del logo.
 *
 * Toda la intro depende de poder targetear #lg-word y los 7 hijos de #lg-flag.
 * Si alguien prende SVGO en la config de svgr, o reemplaza el SVG por el
 * vectorial que mande el cliente, esos ids se pueden ir sin que el build falle
 * — y la intro se rompe en silencio. Este chequeo lo hace ruidoso.
 *
 *   node scripts/check-logo.mjs
 */
import { readFileSync } from 'node:fs'

const svg = readFileSync(new URL('../src/assets/logo.svg', import.meta.url), 'utf8')

const REQUERIDOS = [
  'lg-word',
  'lg-automotores',
  'lg-auto',
  'lg-shop',
  'lg-jujuy',
  'lg-flag',
  ...Array.from({ length: 7 }, (_, i) => `lg-flag-${i + 1}`),
]

const faltan = REQUERIDOS.filter((id) => !svg.includes(`id="${id}"`))

// El stagger de la bandera asume orden de documento de izquierda a derecha.
const flagStart = svg.indexOf('<g id="lg-flag"')
const flagInner = svg.slice(flagStart, flagStart + svg.slice(flagStart).indexOf('</g>'))
const orden = (flagInner.match(/id="lg-flag-(\d)"/g) || []).map((m) => m.match(/\d/)[0])
const ordenOk = orden.join('') === '1234567'

// lg-word tiene que venir antes que lg-flag: la palabra se dibuja primero.
const ordenGrupos = svg.indexOf('<g id="lg-word"') < flagStart

console.log(`ids presentes: ${REQUERIDOS.length - faltan.length}/${REQUERIDOS.length}`)
console.log(`paths de #lg-flag: ${(flagInner.match(/<path/g) || []).length}/7`)
console.log(`orden izquierda→derecha: ${ordenOk ? 'ok' : orden.join(',')}`)
console.log(`#lg-word antes de #lg-flag: ${ordenGrupos ? 'ok' : 'NO'}`)

if (faltan.length || !ordenOk || !ordenGrupos) {
  console.error('✗ el logo perdió estructura que la intro necesita:', faltan)
  process.exit(1)
}
console.log('✓ el logo conserva todo lo que la intro necesita')
