/**
 * Copia los .woff2 variables de @fontsource-variable a public/fonts/.
 *
 * Por qué no se importa el CSS del paquete directamente: Vite hashea los
 * archivos que salen de un @import y los deja en dist/assets/ con un nombre
 * que no se conoce al escribir index.html. Sin nombre estable no se puede
 * poner <link rel="preload">, y la precarga de la fuente del titular es
 * justo lo que evita el flash con la fallback en el primer render.
 *
 * Los .woff2 quedan versionados en public/fonts/. El paquete de npm sigue
 * siendo la fuente de verdad: para actualizarlos, `npm update` y volver a
 * correr esto.
 *
 *   node scripts/sync-fonts.mjs
 */
import { copyFileSync, mkdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dest = join(root, 'public', 'fonts')

/**
 * Solo el subconjunto `latin` (U+0000–00FF + puntuación general). Alcanza para
 * el español entero: á é í ó ú ñ ü ¿ ¡ ° · — están todos ahí dentro. Sumar
 * latin-ext y vietnamese duplicaría el peso para cubrir glifos que este sitio
 * no escribe nunca.
 *
 * Manrope va en la variante `wght` (200–800): es la fuente del sitio y del
 * panel —texto, títulos, botones, rótulos y cifras—, y la ÚNICA familia del
 * proyecto. No tiene eje de ancho; los titulares se resuelven con peso 800 y
 * tracking negativo.
 */
const FUENTES = [
  ['@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2', 'manrope-latin-wght.woff2'],
]

mkdirSync(dest, { recursive: true })

for (const [origen, nombre] of FUENTES) {
  const src = join(root, 'node_modules', origen)
  const out = join(dest, nombre)
  copyFileSync(src, out)
  console.log(`  ${nombre.padEnd(34)} ${(statSync(out).size / 1024).toFixed(1)} KB`)
}
console.log('fuentes sincronizadas en public/fonts/')
