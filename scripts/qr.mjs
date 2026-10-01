/**
 * EL QR DE LA CALLE: https://autoshopjujuy.com
 *
 *   npm run qr
 *
 * Arma tres versiones en `docs/qr/` —módulos negros sobre ámbar, sobre hueso,
 * y con marco y botón "ESCANEÁ Y MIRÁ EL CATÁLOGO"—, cada una en SVG (para
 * imprenta: todo en curvas, el texto incluido) y en PNG de 4096 px.
 *
 * Y NO LAS DA POR BUENAS PORQUE SE VEN BIEN: las decodifica con DOS lectores
 * distintos (jsQR y ZXing) limpias y castigadas —achicadas a 200 px,
 * desenfocadas, con un velo de sol, con un reflejo encima y despintadas—. Un
 * caso pasa solo si los DOS lectores devuelven la URL exacta. Sale con código
 * 1 si algo obligatorio falla. Las imágenes castigadas quedan en
 * `docs/qr/pruebas/`.
 *
 *   QR_VERSION=4 QR_HUECO=11x7 QR_MASCARA=2 QR_BISEL=0.5 npm run qr
 *   QR_SOLO=hueso QR_SEMILLAS=10 QR_DETALLE=1 npm run qr
 *
 * Las variables sirven para volver a medir las alternativas que se
 * descartaron; sin ellas sale lo que se entrega.
 *
 * Todo lo que usa es de desarrollo: `qrcode` arma la matriz, `fontkit` y
 * `wawoff2` pasan Manrope a curvas, Playwright rasteriza y castiga, y jsQR y
 * ZXing leen. Nada de esto entra al bundle del sitio.
 *
 * LAS REGLAS QUE NO SE NEGOCIAN, y dónde se cumplen:
 *  - Corrección H y la URL exacta (`URL`, `NIVEL`).
 *  - Módulos oscuros sobre fondo claro, cuadrados, en un solo `<path>`.
 *  - Los tres cuadros de las esquinas sin deformar: SIN el bisel del sitio,
 *    que se probó y rompe la lectura (ver `BISEL_CUADRO`).
 *  - Zona libre de 4 módulos (`ZONA`).
 *  - El logo en una placa negra biselada, con margen claro hasta los módulos,
 *    y el hueco entero (placa + margen) en no más del 20% del área del código:
 *    el script lo mide y corta si se pasa (`HUECO`).
 *
 * LO QUE NO SE PUEDE: que lea con el 10–15% de los módulos despintados. El
 * nivel H corrige ~30% de las PALABRAS de código, y cada mancha toca varias
 * a la vez: aun sin logo, el techo teórico para un 15% está entre 1 y 30%.
 * `teoria()` lo calcula sin lector, mapeando cada módulo a su palabra y su
 * bloque, y el reporte lo muestra al lado de lo que leyeron jsQR y ZXing.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import * as fontkit from 'fontkit'
import QRCode from 'qrcode'
import { decompress } from 'wawoff2'
import { chromium } from 'playwright'

const URL = 'https://autoshopjujuy.com'
const NIVEL = 'H'
/** Zona libre alrededor, en módulos. El estándar pide 4. */
const ZONA = 4
/**
 * Versión FORZADA a 5 (37 módulos) y no la 4 que alcanza para la URL.
 *
 * En la 4, el centro del código cae casi entero en dos de sus cuatro bloques
 * de corrección: cualquier logo centrado les come el margen a esos dos y los
 * deja sin aire para el despintado o un reflejo (un hueco de 11×7 les gastaba
 * 6 de los 8 errores que corrige cada bloque). En la 5 el centro se reparte
 * entre los cuatro bloques y cada uno corrige 11. Los módulos quedan un 11%
 * más chicos: se paga con un poco más de tamaño de impresión y se gana mucha
 * tolerancia al daño. Ver `teoria()` y el reporte de `npm run qr`.
 */
const VERSION = Number(process.env.QR_VERSION ?? 5)
/**
 * El hueco del centro, en módulos (ancho × alto, impares para quedar
 * centrado). Lo que ocupa cuenta TODO: placa negra y margen claro.
 */
const HUECO = (() => {
  const [ancho, alto] = (process.env.QR_HUECO ?? '7x5').split('x').map(Number)
  return { ancho, alto }
})()
/** Margen claro entre la placa del logo y los módulos, en módulos. */
const MARGEN_PLACA = 0.5
/** Aire entre el borde de la placa y el logo, en módulos. */
const AIRE_LOGO = 0.4
/**
 * Bisel del marco exterior de los cuadros de esquina, en módulos: CERO.
 *
 * Se probó con 1.2 y jsQR dejaba de leer hasta el PNG limpio de 4096: los
 * lectores validan cada cuadro también en DIAGONAL, y el bisel del sitio
 * corta justo las esquinas de esa diagonal (arriba-izquierda y
 * abajo-derecha): ahí el anillo de afuera quedaba en un 40% de su grosor. Se
 * deja el parámetro para poder volver a medirlo (`QR_BISEL=0.5 npm run qr`).
 */
const BISEL_CUADRO = Number(process.env.QR_BISEL ?? 0)

const COLOR = {
  negro: '#000000',
  ambar: '#FDB916',
  hueso: '#FEFDF8',
}

const OUT = path.resolve('docs/qr')
const PRUEBAS = path.join(OUT, 'pruebas')
const PNG_LADO = 4096

// ── Anatomía de la versión: bloques de corrección y orden de los bits ─────

/**
 * Bloques de nivel H por versión: [palabras de datos, palabras de corrección]
 * de cada bloque (ISO/IEC 18004, tabla 9), y el centro del patrón de
 * alineación. Cada bloque corrige hasta la mitad de sus palabras de corrección.
 */
const ANATOMIA = {
  4: { alineacion: [26], bloques: [[9, 16], [9, 16], [9, 16], [9, 16]] },
  5: { alineacion: [30], bloques: [[11, 22], [11, 22], [12, 22], [12, 22]] },
  6: { alineacion: [34], bloques: [[15, 28], [15, 28], [15, 28], [15, 28]] },
}
if (!ANATOMIA[VERSION]) throw new Error(`Versión ${VERSION} sin anatomía cargada (4 a 6).`)

const N = 17 + 4 * VERSION

/**
 * A qué palabra de código pertenece cada módulo de datos, y a qué bloque cada
 * palabra. Es el recorrido en zigzag del estándar, de a dos columnas desde la
 * derecha, salteando los patrones de función; y el entrelazado de bloques.
 * Con esto se sabe EXACTAMENTE cuántos errores le mete a cada bloque un
 * módulo perdido, sin depender de que un lector tenga suerte.
 */
function anatomia() {
  const { alineacion, bloques } = ANATOMIA[VERSION]
  const funcion = (r, c) =>
    (r < 9 && c < 9) ||
    (r < 9 && c >= N - 8) ||
    (r >= N - 8 && c < 9) ||
    r === 6 ||
    c === 6 ||
    alineacion.some((a) => r >= a - 2 && r <= a + 2 && c >= a - 2 && c <= a + 2)
  const orden = []
  let sube = true
  for (let der = N - 1; der >= 1; der -= 2) {
    if (der === 6) der = 5
    for (let i = 0; i < N; i++) {
      const r = sube ? N - 1 - i : i
      for (const c of [der, der - 1]) if (!funcion(r, c)) orden.push([r, c])
    }
    sube = !sube
  }
  const bloqueDe = []
  const maxDatos = Math.max(...bloques.map((b) => b[0]))
  for (let i = 0; i < maxDatos; i++) bloques.forEach((b, j) => i < b[0] && bloqueDe.push(j))
  for (let i = 0; i < bloques[0][1]; i++) bloques.forEach((_, j) => bloqueDe.push(j))
  const palabraDe = new Map()
  orden.forEach(([r, c], bit) => bit < bloqueDe.length * 8 && palabraDe.set(r * N + c, Math.floor(bit / 8)))
  return { palabraDe, bloqueDe, corrige: bloques.map((b) => b[1] / 2), orden }
}
const ANAT = anatomia()

/** Errores por bloque si se pierden (pasan a claro) estos módulos oscuros. */
function erroresPorBloque(matriz, perdidos) {
  const palabras = new Set()
  for (const k of perdidos) {
    if (matriz.get(Math.floor(k / N), k % N) && ANAT.palabraDe.has(k)) palabras.add(ANAT.palabraDe.get(k))
  }
  const cuenta = ANAT.corrige.map(() => 0)
  for (const w of palabras) cuenta[ANAT.bloqueDe[w]]++
  return cuenta
}

// ── Matriz ────────────────────────────────────────────────────────────────

/** Las tres esquinas de 7×7, con su separador (8×8). */
const enCuadro = (r, c) =>
  (r < 8 && c < 8) || (r < 8 && c >= N - 8) || (r >= N - 8 && c < 8)

const hueco = {
  c0: (N - HUECO.ancho) / 2,
  r0: (N - HUECO.alto) / 2,
  c1: (N + HUECO.ancho) / 2 - 1,
  r1: (N + HUECO.alto) / 2 - 1,
}
const enHueco = (r, c) => r >= hueco.r0 && r <= hueco.r1 && c >= hueco.c0 && c <= hueco.c1
const MODULOS_HUECO = []
for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (enHueco(r, c)) MODULOS_HUECO.push(r * N + c)

const proporcionHueco = (HUECO.ancho * HUECO.alto) / (N * N)
if (proporcionHueco > 0.2) {
  console.error(`El hueco del logo ocupa ${(proporcionHueco * 100).toFixed(1)}% del código: el tope es 20%.`)
  process.exit(1)
}
// El hueco no puede pisar patrones de función: separadores, líneas de tiempo
// (fila y columna 6) ni el patrón de alineación (abajo a la derecha).
const alin = ANATOMIA[VERSION].alineacion[0]
if (HUECO.ancho && (hueco.r0 <= 8 || hueco.c0 <= 8 || hueco.r1 >= alin - 2 || hueco.c1 >= alin - 2)) {
  console.error('El hueco del logo pisa un patrón de función.')
  process.exit(1)
}

/**
 * La máscara se elige por el logo y no por las reglas de penalidad de la
 * librería: la que deja al bloque más castigado con menos errores (y, a
 * igualdad, menos errores en total). Las ocho máscaras son igual de válidas.
 */
const { qr, costoLogo } = (() => {
  const forzada = process.env.QR_MASCARA
  let mejor = null
  for (const m of forzada ? [Number(forzada)] : [0, 1, 2, 3, 4, 5, 6, 7]) {
    const q = QRCode.create(URL, { errorCorrectionLevel: NIVEL, version: VERSION, maskPattern: m })
    const costo = erroresPorBloque(q.modules, MODULOS_HUECO)
    const peor = Math.max(...costo)
    const suma = costo.reduce((a, b) => a + b, 0)
    if (!mejor || peor < mejor.peor || (peor === mejor.peor && suma < mejor.suma)) {
      mejor = { qr: q, costoLogo: costo, peor, suma }
    }
  }
  return mejor
})()
const oscuro = (r, c) => Boolean(qr.modules.get(r, c))

// Comprobación del mapa: los primeros 12 bits de datos, leídos de la matriz
// con la máscara quitada, tienen que ser el modo byte (0100) y el largo de la
// URL. Si el recorrido estuviera mal, toda la teoría sería ficción.
{
  const MASCARAS = [
    (r, c) => (r + c) % 2 === 0,
    (r) => r % 2 === 0,
    (r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
  ]
  // Por el entrelazado, la segunda palabra del bloque 0 es la palabra número
  // `bloques` de la secuencia, no la siguiente.
  const palabra = (k) => {
    let bits = ''
    for (let i = 0; i < 8; i++) {
      const [r, c] = ANAT.orden[k * 8 + i]
      bits += (oscuro(r, c) ? 1 : 0) ^ (MASCARAS[qr.maskPattern](r, c) ? 1 : 0)
    }
    return bits
  }
  const leidos = palabra(0) + palabra(ANAT.corrige.length)
  const esperado =
    '0100' + URL.length.toString(2).padStart(8, '0') + URL.charCodeAt(0).toString(2).padStart(8, '0').slice(0, 4)
  if (leidos !== esperado) throw new Error(`El mapa de módulos no coincide con la matriz (${leidos} ≠ ${esperado}).`)
}

// ── Piezas de dibujo (en unidades de módulo) ──────────────────────────────

const f = (n) => +n.toFixed(3)

/**
 * Polígono biselado como `<Bevel>`: esquinas superior izquierda e inferior
 * derecha cortadas en diagonal.
 */
function biselado(x, y, w, h, b) {
  return `M${f(x + b)} ${f(y)}H${f(x + w)}V${f(y + h - b)}L${f(x + w - b)} ${f(y + h)}H${f(x)}V${f(y + b)}Z`
}

/** Los módulos oscuros, salvo esquinas y hueco, en UN solo path por filas. */
function pathModulos(tapados = new Set()) {
  let d = ''
  for (let r = 0; r < N; r++) {
    let c = 0
    while (c < N) {
      const vale = (k) => oscuro(r, k) && !enCuadro(r, k) && !enHueco(r, k) && !tapados.has(r * N + k)
      if (!vale(c)) {
        c++
        continue
      }
      const desde = c
      while (c < N && vale(c)) c++
      d += `M${desde + ZONA} ${r + ZONA}h${c - desde}v1h${desde - c}Z`
    }
  }
  return d
}

/**
 * Un cuadro de esquina: anillo de 7×7 con el bisel SOLO en su borde de
 * afuera (el de adentro queda en escuadra), y el centro de 3×3 macizo.
 * Un solo path con `evenodd`: contorno de afuera biselado menos el hueco de
 * 5×5, más el centro.
 */
function cuadroDeEsquina(r, c) {
  const x = c + ZONA
  const y = r + ZONA
  return (
    (BISEL_CUADRO ? biselado(x, y, 7, 7, BISEL_CUADRO) : `M${x} ${y}h7v7h-7Z`) +
    `M${x + 1} ${y + 1}h5v5h-5Z` +
    `M${x + 2} ${y + 2}h3v3h-3Z`
  )
}

function pathCuadros() {
  return cuadroDeEsquina(0, 0) + cuadroDeEsquina(0, N - 7) + cuadroDeEsquina(N - 7, 0)
}

/** El logo: los 50 paths del sitio, con los colores reales en vez de las variables. */
async function leerLogo() {
  const crudo = await readFile('src/assets/logo.svg', 'utf8')
  const vb = crudo.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number)
  const cuerpo = crudo
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/var\(--logo-white,\s*(#[0-9A-Fa-f]{6})\)/g, '$1')
    .replace(/var\(--logo-yellow,\s*(#[0-9A-Fa-f]{6})\)/g, '$1')
    .replace(/\sid="[^"]*"/g, '')
  if (/var\(/.test(cuerpo)) throw new Error('Quedó una variable CSS en el logo.')
  return { ancho: vb[2], alto: vb[3], cuerpo }
}

/** Placa negra biselada y el logo adentro, centrados en el hueco. */
function placaConLogo(logo) {
  if (!HUECO.ancho) return ''
  const x = hueco.c0 + ZONA + MARGEN_PLACA
  const y = hueco.r0 + ZONA + MARGEN_PLACA
  const w = HUECO.ancho - 2 * MARGEN_PLACA
  const h = HUECO.alto - 2 * MARGEN_PLACA
  const lw = w - 2 * AIRE_LOGO
  const lh = h - 2 * AIRE_LOGO
  const escala = Math.min(lw / logo.ancho, lh / logo.alto)
  const ox = x + (w - logo.ancho * escala) / 2
  const oy = y + (h - logo.alto * escala) / 2
  return (
    `<path fill="${COLOR.negro}" d="${biselado(x, y, w, h, 0.9)}"/>` +
    `<g fill-rule="evenodd" transform="translate(${f(ox)} ${f(oy)}) scale(${escala.toFixed(6)})">${logo.cuerpo}</g>`
  )
}

/** El código con su zona libre, sobre un fondo biselado del color pedido. */
function codigo(logo, fondo, tapados) {
  const L = N + 2 * ZONA
  return (
    // El bisel del fondo cae en la zona libre lejos de los cuadros: la línea
    // de corte queda a más de 4 módulos de cualquier esquina del código.
    `<path fill="${fondo}" d="${biselado(0, 0, L, L, 2)}"/>` +
    `<path fill="${COLOR.negro}" d="${pathModulos(tapados)}"/>` +
    `<path fill="${COLOR.negro}" fill-rule="evenodd" d="${pathCuadros()}"/>` +
    placaConLogo(logo)
  )
}

// ── Texto en curvas (Manrope 700, el registro de los botones) ─────────────

async function manrope700() {
  const woff2 = await readFile('node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2')
  // fontkit no aplica variaciones sobre WOFF2 (falla en los glifos compuestos
  // como Á y É): se descomprime a TTF y ahí sí se instancia el peso.
  const ttf = Buffer.from(await decompress(woff2))
  return fontkit.create(ttf).getVariation({ wght: 700 })
}

/**
 * Una línea de texto como UN path: tamaño `fs`, tracking 0.08em como
 * `font-hud`. Devuelve el path y el ancho que ocupa.
 */
function textoEnCurvas(fuente, texto, fs, x, base) {
  const k = fs / fuente.unitsPerEm
  const tracking = 0.08 * fs
  const corrida = fuente.layout(texto)
  let d = ''
  let cx = x
  corrida.glyphs.forEach((g, i) => {
    const pos = corrida.positions[i]
    const px = (u) => f(cx + (pos.xOffset + u) * k)
    const py = (v) => f(base - (pos.yOffset + v) * k)
    for (const { command, args } of g.path.commands) {
      if (command === 'moveTo') d += `M${px(args[0])} ${py(args[1])}`
      else if (command === 'lineTo') d += `L${px(args[0])} ${py(args[1])}`
      else if (command === 'quadraticCurveTo') d += `Q${px(args[0])} ${py(args[1])} ${px(args[2])} ${py(args[3])}`
      else if (command === 'bezierCurveTo')
        d += `C${px(args[0])} ${py(args[1])} ${px(args[2])} ${py(args[3])} ${px(args[4])} ${py(args[5])}`
      else if (command === 'closePath') d += 'Z'
    }
    cx += pos.xAdvance * k + (i < corrida.glyphs.length - 1 ? tracking : 0)
  })
  return { d, ancho: cx - x }
}

// ── Las tres versiones ────────────────────────────────────────────────────

const svg = (w, h, cuerpo) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(w)} ${f(h)}" width="${f(w * 25)}" height="${f(h * 25)}" shape-rendering="geometricPrecision">` +
  `<title>QR a ${URL}</title>${cuerpo}</svg>\n`

function versionPlana(logo, fondo, tapados) {
  const L = N + 2 * ZONA
  return svg(L, L, codigo(logo, fondo, tapados))
}

/**
 * Con marco negro biselado y el botón ámbar abajo: "ESCANEÁ Y MIRÁ EL
 * CATÁLOGO \", en mayúscula, 700 y tracking 0.08em, con el `\` del riel al
 * final como los botones del sitio. El código va sobre hueso, que es el
 * fondo de más contraste.
 */
function versionMarco(logo, fuente, tapados) {
  const L = N + 2 * ZONA
  const borde = 1.6
  const separacion = 1.2
  const altoBoton = 4.6
  const W = L + 2 * borde
  const H = borde + L + separacion + altoBoton + borde

  // El tamaño de letra sale de medir: la frase y el `\` llenan el botón con
  // una sangría de 2 módulos por lado.
  const frase = 'ESCANEÁ Y MIRÁ EL CATÁLOGO'
  const prueba = textoEnCurvas(fuente, `${frase}  \\`, 1, 0, 0)
  const fs = Math.min((L - 4) / prueba.ancho, 2.1)
  const alturaMayus = (1440 / fuente.unitsPerEm) * fs
  const yBoton = borde + L + separacion
  const base = yBoton + altoBoton / 2 + alturaMayus / 2
  const medida = textoEnCurvas(fuente, `${frase}  \\`, fs, 0, 0)
  const texto = textoEnCurvas(fuente, `${frase}  \\`, fs, borde + (L - medida.ancho) / 2, base)

  return svg(
    W,
    H,
    `<path fill="${COLOR.negro}" d="${biselado(0, 0, W, H, 3)}"/>` +
      `<g transform="translate(${borde} ${borde})">${codigo(logo, COLOR.hueso, tapados)}</g>` +
      `<path fill="${COLOR.ambar}" d="${biselado(borde, yBoton, L, altoBoton, 1.1)}"/>` +
      `<path fill="${COLOR.negro}" d="${texto.d}"/>`,
  )
}

// ── Castigos ──────────────────────────────────────────────────────────────

/** PRNG con semilla: las manchas son al azar pero se pueden reproducir. */
function azar(semilla) {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Los módulos que se pueden tapar: todo menos las tres esquinas y el hueco del logo. */
const CANDIDATOS = []
for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!enCuadro(r, c) && !enHueco(r, c)) CANDIDATOS.push(r * N + c)

/** Tamaño de cada mancha según el modelo de despintado, en módulos. */
const MANCHAS = {
  chicas: [3, 10], // pintura saltada en puntos
  grandes: [15, 40], // una zona raspada o lavada
}

/**
 * Despintado: manchas de módulos pegados que crecen al azar hasta cubrir
 * `fraccion` de los módulos candidatos (todo menos las tres esquinas y el
 * hueco del logo). Lo tapado queda del color del fondo, como pintura que se
 * fue: un módulo claro tapado no cambia nada, uno oscuro se pierde.
 */
function despintar(fraccion, semilla, modelo = 'chicas') {
  const [min, max] = MANCHAS[modelo]
  const rnd = azar(semilla)
  const meta = Math.round(fraccion * CANDIDATOS.length)
  const libre = new Set(CANDIDATOS)
  const tapados = new Set()
  while (tapados.size < meta) {
    const arranque = [...libre][Math.floor(rnd() * libre.size)]
    const tam = min + Math.floor(rnd() * (max - min + 1))
    const mancha = [arranque]
    tapados.add(arranque)
    libre.delete(arranque)
    while (mancha.length < tam && tapados.size < meta) {
      const base = mancha[Math.floor(rnd() * mancha.length)]
      const r = Math.floor(base / N)
      const c = base % N
      const vecinos = [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1],
      ]
        .filter(([rr, cc]) => rr >= 0 && cc >= 0 && rr < N && cc < N)
        .map(([rr, cc]) => rr * N + cc)
        .filter((k) => libre.has(k))
      if (!vecinos.length) break
      const k = vecinos[Math.floor(rnd() * vecinos.length)]
      mancha.push(k)
      tapados.add(k)
      libre.delete(k)
    }
  }
  return tapados
}

/**
 * La misma cuenta sin lector: de `intentos` despintados al azar, cuántos
 * quedan dentro de lo que corrige cada bloque, sumando lo que ya se lleva el
 * logo. Es el techo teórico: un lector real lee igual o peor.
 */
function teoria(fraccion, modelo, intentos = 2000) {
  let leen = 0
  for (let s = 1; s <= intentos; s++) {
    const tapados = despintar(fraccion, 100_003 * s + Math.round(fraccion * 1000), modelo)
    const errores = erroresPorBloque(qr.modules, [...MODULOS_HUECO, ...tapados])
    if (errores.every((e, i) => e <= ANAT.corrige[i])) leen++
  }
  return Math.round((leen / intentos) * 100)
}

/**
 * Lo que corre adentro de la página: rasteriza, castiga y decodifica con los
 * dos lectores. `fuente` es una data URL (SVG o PNG).
 */
async function enPagina({ fuente, base, lado, filtro, velo, reflejo, guardar, transparente }) {
  const img = new Image()
  img.src = fuente
  await img.decode()
  // Primero a un raster base, como una foto del cartel; después el castigo.
  const prop = img.naturalHeight / img.naturalWidth || 1
  const b = document.createElement('canvas')
  b.width = base
  b.height = Math.round(base * prop)
  const bx = b.getContext('2d')
  // El papel o la pared detrás de las esquinas biseladas. El PNG de entrega
  // va transparente ahí, para troquelarlo o apoyarlo sobre cualquier cosa.
  bx.fillStyle = '#fff'
  if (!transparente) bx.fillRect(0, 0, b.width, b.height)
  bx.drawImage(img, 0, 0, b.width, b.height)

  const cv = document.createElement('canvas')
  cv.width = lado
  cv.height = Math.round(lado * prop)
  const cx = cv.getContext('2d', { willReadFrequently: true })
  cx.imageSmoothingQuality = 'high'
  cx.fillStyle = '#fff'
  if (!transparente) cx.fillRect(0, 0, cv.width, cv.height)
  if (filtro) cx.filter = filtro
  cx.drawImage(b, 0, 0, cv.width, cv.height)
  cx.filter = 'none'
  // El sol: un velo blanco parejo encima de todo, que es lo que hace la luz de
  // frente sobre la impresión y sobre el vidrio de la cámara. NO es bajar el
  // contraste hacia el gris medio: eso deja el negro en gris oscuro, que no
  // es lo que pasa al sol, y voltea a los dos lectores aun con un QR pelado.
  if (velo) {
    cx.fillStyle = `rgba(255,255,255,${velo})`
    cx.fillRect(0, 0, cv.width, cv.height)
  }
  if (reflejo) {
    const { x, y, r, alfa } = reflejo
    const g = cx.createRadialGradient(x * cv.width, y * cv.height, 0, x * cv.width, y * cv.height, r * cv.width)
    g.addColorStop(0, `rgba(255,255,255,${alfa})`)
    g.addColorStop(0.55, `rgba(255,255,255,${alfa * 0.75})`)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    cx.fillStyle = g
    cx.fillRect(0, 0, cv.width, cv.height)
  }

  const { data, width, height } = cx.getImageData(0, 0, cv.width, cv.height)

  const j = window.jsQR(data, width, height, { inversionAttempts: 'dontInvert' })

  let z = null
  try {
    const lum = new Uint8ClampedArray(width * height)
    for (let i = 0; i < lum.length; i++) {
      lum[i] = (data[i * 4] * 299 + data[i * 4 + 1] * 587 + data[i * 4 + 2] * 114) / 1000
    }
    const Z = window.ZXing
    const fuenteLum = new Z.RGBLuminanceSource(lum, width, height)
    const bitmap = new Z.BinaryBitmap(new Z.HybridBinarizer(fuenteLum))
    z = new Z.QRCodeReader().decode(bitmap).getText()
  } catch {
    z = null
  }

  return {
    jsqr: j?.data ?? null,
    zxing: z,
    png: guardar ? cv.toDataURL('image/png') : null,
  }
}

const dataUrl = (tipo, contenido) =>
  `data:${tipo};base64,${Buffer.from(contenido).toString('base64')}`

async function main() {
  await mkdir(PRUEBAS, { recursive: true })
  const logo = await leerLogo()
  const fuente = await manrope700()

  const VERSIONES = {
    ambar: (t) => versionPlana(logo, COLOR.ambar, t),
    hueso: (t) => versionPlana(logo, COLOR.hueso, t),
    marco: (t) => versionMarco(logo, fuente, t),
  }

  console.log(
    `[qr] ${URL} · nivel ${NIVEL} · versión ${qr.version} (${N}×${N}) · máscara ${qr.maskPattern}` +
      ` · hueco del logo ${HUECO.ancho}×${HUECO.alto} = ${(proporcionHueco * 100).toFixed(1)}% del código`,
  )
  console.log(
    `[qr] el logo le cuesta a cada bloque [${costoLogo.join(', ')}] de [${ANAT.corrige.join(', ')}] errores que corrige`,
  )
  const memo = new Map()
  const teoriaCache = (fr, mo) => {
    const k = `${fr}|${mo}`
    if (!memo.has(k)) memo.set(k, teoria(fr, mo))
    return memo.get(k)
  }

  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.setContent('<!doctype html><body></body>')
  await page.addScriptTag({ path: 'node_modules/jsqr/dist/jsQR.js' })
  await page.addScriptTag({ path: 'node_modules/@zxing/library/umd/index.min.js' })

  const leer = (opts) => page.evaluate(enPagina, opts)
  const URLS_OK = (r) => r.jsqr === URL && r.zxing === URL

  let fallas = 0
  const filas = []

  for (const [nombre, armar] of Object.entries(VERSIONES)) {
    if (process.env.QR_SOLO && process.env.QR_SOLO !== nombre) continue
    const limpio = armar()
    await writeFile(path.join(OUT, `qr-${nombre}.svg`), limpio)

    // El PNG de entrega: 4096 del lado largo, rasterizado del mismo SVG.
    const ent = await leer({
      fuente: dataUrl('image/svg+xml', limpio),
      base: PNG_LADO,
      lado: PNG_LADO,
      guardar: true,
      transparente: true,
    })
    const png = Buffer.from(ent.png.split(',')[1], 'base64')
    await writeFile(path.join(OUT, `qr-${nombre}.png`), png)
    const pngUrl = dataUrl('image/png', png)

    // Módulo en px a un lado dado, para poder leer los castigos en módulos.
    const anchoTotal = nombre === 'marco' ? N + 2 * ZONA + 3.2 : N + 2 * ZONA
    const modulo = (lado) => (lado / anchoTotal).toFixed(1)

    const casos = [
      { caso: 'PNG 4096, limpio', fuente: pngUrl, base: PNG_LADO, lado: PNG_LADO },
      { caso: 'achicado a 200 px', fuente: pngUrl, base: PNG_LADO, lado: 200, nota: `${modulo(200)} px/módulo` },
      { caso: 'desenfocado', fuente: pngUrl, base: 1024, lado: 400, filtro: `blur(${(0.3 * modulo(400)).toFixed(2)}px)`, nota: 'σ = 0.3 módulo' },
      ...[300, 450, 600].map((lado) => ({
        caso: `${lado === 300 ? '' : 'borde · '}sol: velo 50%, ${lado} px`,
        fuente: pngUrl,
        base: 1024,
        lado,
        velo: 0.5,
        // Obligatorio a 300 px. A 450 y 600 es el borde: los dos lectores
        // binarizan por bloques de 8 px, y un bloque entero adentro de un
        // módulo negro agrisado por el velo lo toman por claro. Cuantos más px
        // por módulo, más bloques así. El ámbar, que arranca con menos
        // contraste, es el primero en caer.
        extra: lado !== 300,
        nota: `${modulo(lado)} px/módulo`,
      })),
      { caso: 'reflejo blanco', fuente: pngUrl, base: 1024, lado: 600, reflejo: { x: 0.62, y: 0.38, r: 0.3, alfa: 0.92 } },
      // Más duros que lo pedido: no son condición, dicen dónde está el borde.
      { caso: 'borde · 140 px', fuente: pngUrl, base: PNG_LADO, lado: 140, extra: true, nota: `${modulo(140)} px/módulo` },
      { caso: 'borde · desenfoque fuerte', fuente: pngUrl, base: 1024, lado: 400, filtro: `blur(${(0.45 * modulo(400)).toFixed(2)}px)`, extra: true, nota: 'σ = 0.45 módulo' },
      ...[300, 450, 600].map((lado) => ({
        caso: `borde · sol: velo 60%, ${lado} px`,
        fuente: pngUrl,
        base: 1024,
        lado,
        velo: 0.6,
        extra: true,
      })),
      { caso: 'borde · velo 50% + 200 px + desenfoque', fuente: pngUrl, base: PNG_LADO, lado: 200, velo: 0.5, filtro: 'blur(0.8px)', extra: true },
    ]

    for (const c of casos) {
      const r = await leer({ ...c, guardar: true })
      const ok = URLS_OK(r)
      if (!ok && !c.extra) fallas++
      filas.push({ version: nombre, caso: c.caso, ok, r, extra: c.extra, nota: c.nota })
      const archivo = c.caso.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
      await writeFile(path.join(PRUEBAS, `${nombre}-${archivo}.png`), Buffer.from(r.png.split(',')[1], 'base64'))
    }

    // Despintado: treinta despintados distintos por caso. NINGUNO es
    // obligatorio, y no por comodidad: el 10–15% pedido está por encima de lo
    // que corrige el nivel H aun sin logo (ver `teoria`). Se corren todos y se
    // informan con su tasa por lector, sin redondear a "lee".
    for (const [fraccion, modelo] of [
      [0.05, 'chicas'],
      [0.05, 'grandes'],
      [0.1, 'chicas'],
      [0.1, 'grandes'],
      [0.15, 'chicas'],
      [0.15, 'grandes'],
    ]) {
      const extra = true
      let leyeron = 0
      let soloJ = 0
      let soloZ = 0
      const SEMILLAS = Number(process.env.QR_SEMILLAS ?? 30)
      for (let s = 1; s <= SEMILLAS; s++) {
        const tapados = despintar(fraccion, s * 7919 + Math.round(fraccion * 100), modelo)
        const r = await leer({
          fuente: dataUrl('image/svg+xml', armar(tapados)),
          base: 1024,
          lado: 600,
          guardar: s === 1,
        })
        if (URLS_OK(r)) leyeron++
        if (r.jsqr === URL) soloJ++
        if (r.zxing === URL) soloZ++
        if (process.env.QR_DETALLE && !URLS_OK(r)) {
          const zonas = new Set()
          for (const k of tapados) {
            const rr = Math.floor(k / N), cc = k % N
            if (!oscuro(rr, cc)) continue
            if ((rr === 8 && (cc < 9 || cc >= N - 8)) || (cc === 8 && (rr < 9 || rr >= N - 8))) zonas.add(`formato(${rr},${cc})`)
            else if (rr === 6 || cc === 6) zonas.add('tiempo')
            else if (Math.abs(rr - alin) <= 2 && Math.abs(cc - alin) <= 2) zonas.add('alineación')
          }
          console.log(`    ${nombre} ${fraccion} ${modelo} semilla ${s}: jsQR ${r.jsqr ? '✓' : '✗'} ZXing ${r.zxing ? '✓' : '✗'} · errores ${erroresPorBloque(qr.modules, [...MODULOS_HUECO, ...tapados])} · ${[...zonas].join(' ')}`)
        }
        if (s === 1) {
          const archivo = `${nombre}-despintado-${modelo}-${Math.round(fraccion * 100)}`
          await writeFile(path.join(PRUEBAS, `${archivo}.png`), Buffer.from(r.png.split(',')[1], 'base64'))
        }
      }
      const caso = `borde · despintado ${Math.round(fraccion * 100)}%, manchas ${modelo}`
      const ok = leyeron === SEMILLAS
      if (!ok && !extra) fallas++
      filas.push({
        version: nombre,
        caso,
        ok,
        extra,
        nota: `${leyeron}/${SEMILLAS} los dos (jsQR ${soloJ}, ZXing ${soloZ}) · techo teórico ${teoriaCache(fraccion, modelo)}%`,
      })
    }
  }

  await browser.close()

  for (const fl of filas) {
    const lect = fl.r ? ` jsQR ${fl.r.jsqr === URL ? '✓' : '✗'} ZXing ${fl.r.zxing === URL ? '✓' : '✗'}` : ''
    console.log(
      `  ${fl.ok ? '✓' : fl.extra ? '·' : '✗'} ${fl.version.padEnd(6)} ${fl.caso.padEnd(44)}${lect}${fl.nota ? `  (${fl.nota})` : ''}`,
    )
  }
  console.log(
    fallas === 0
      ? '[qr] las tres versiones leen en todos los casos obligatorios ✓'
      : `[qr] ${fallas} casos obligatorios fallaron ✗`,
  )
  console.log('[qr] "borde" no es condición: dice dónde deja de leer. El despintado del 10–15% NO se cumple (ver techo teórico).')
  process.exitCode = fallas === 0 ? 0 : 1
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
