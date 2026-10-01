/**
 * AUDITORÍA DE RESPONSIVIDAD: números, no capturas.
 *
 * Recorre el sitio (y el panel, con el mock) en ocho anchos —de 360 a
 * 2560x1440— y mide tres cosas en cada página:
 *
 *  1. SOLAPES: dos textos de bloques distintos cuyas cajas se pisan. Se mide
 *     por renglón (`Range.getClientRects()`), recortado por cada ancestro con
 *     `overflow` distinto de `visible`, así que un texto escondido en una
 *     máscara no cuenta.
 *  2. DESBORDE horizontal: la página más ancha que el viewport, o un elemento
 *     que se sale por un costado sin nadie que lo recorte.
 *  3. TEXTOS CORTADOS: un renglón que su contenedor recorta a medias, un
 *     `truncate` que de verdad se come letras, o un `line-clamp` que esconde
 *     renglones.
 *
 *   npm run responsivo                  # mock (dist-mock/), sitio + panel
 *   npm run responsivo -- --real        # datos reales (dist-real/), solo
 *                                       # páginas públicas y SOLO LECTURA
 *   npm run responsivo -- --fast        # sin build
 *   npm run responsivo -- --shots       # además, una captura por página y ancho
 *   npm run responsivo -- --movimiento  # sin `reduce`: con las animaciones
 *
 * Con `--real`, todo pedido a Supabase que no sea GET/HEAD se ABORTA antes de
 * salir: el chequeo no puede escribir en la base aunque una página lo intente.
 *
 * Se mide con `prefers-reduced-motion: reduce`: así cada cosa está en su
 * estado final y una animación a mitad de camino no se confunde con un solape.
 * Sale con código 1 si encuentra algo.
 */
import { spawn } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright'

const REAL = process.argv.includes('--real')
const FAST = process.argv.includes('--fast')
const SHOTS = process.argv.includes('--shots')
/** Con movimiento normal en vez de `reduce`: lo que ve la mayoría. */
const MOVIMIENTO = process.argv.includes('--movimiento')
const OUT_BUILD = REAL ? 'dist-real' : 'dist-mock'
const PORT = REAL ? 4319 : 4318
const BASE = `http://127.0.0.1:${PORT}`
const OUT = path.resolve('docs/shots/responsivo', REAL ? 'real' : 'mock')
const FILTRO = process.argv.find((a) => a.startsWith('--solo='))?.slice(7)

export const ANCHOS = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
]

/**
 * La unidad más difícil que puede cargar la dueña, metida en el mock: título
 * real de los largos, precio de nueve cifras y las DOS etiquetas que admite la
 * card (`MAX_EN_TARJETA`), con rótulo y valor largos.
 */
const ESTRES = {
  titulo: 'VOLKSWAGEN AMAROK DC 2.0L TDI 140CV 4X2 MT HIGHLINE',
  precio: 144_500_000,
  etiquetas: [
    { titulo: 'Mínimo anticipo:', texto: '$22.250.000' },
    { titulo: 'Cuotas fijas desde:', texto: '$1.250.000' },
  ],
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts })
    p.on('error', reject)
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} salió con ${code}`))))
  })
}

async function esperarServidor(url, timeoutMs = 30_000) {
  const limite = Date.now() + timeoutMs
  while (Date.now() < limite) {
    try {
      if ((await fetch(url)).ok) return
    } catch {
      /* todavía no levantó */
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`El preview no respondió en ${url}`)
}

/**
 * La medición, entera dentro de la página. Devuelve listas cortas y legibles:
 * cada hallazgo con un selector aproximado y el texto en juego.
 */
function medir() {
  const vw = document.documentElement.clientWidth
  const vh = window.innerHeight
  const nombre = (el) => {
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 4).join('.') : ''
    return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls ? '.' + cls : ''}`.slice(0, 80)
  }
  const corto = (t) => t.replace(/\s+/g, ' ').trim().slice(0, 40)

  const BLOQUE = /^(block|flex|grid|list-item|table|table-cell|flow-root|inline-block|inline-flex|inline-grid)$/
  const bloqueDe = (el) => {
    for (let e = el; e; e = e.parentElement) if (BLOQUE.test(getComputedStyle(e).display)) return e
    return document.body
  }
  const fijoDe = (el) => {
    for (let e = el; e; e = e.parentElement) {
      // Las barras `sticky` del panel (guardar) se tratan como fijas: tapan
      // contenido mientras se scrollea por diseño, igual que la barra MENU.
      const p = getComputedStyle(e).position
      if (p === 'fixed' || p === 'sticky') return e
    }
    return null
  }

  /** El rectángulo visible de `el`: su caja recortada por los ancestros que recortan. */
  const recorteDe = (el) => {
    let r = { l: -1e9, t: -1e9, r: 1e9, b: 1e9 }
    const recortes = []
    // Desde el PROPIO elemento: un `sr-only` o un `line-clamp` se recortan a sí
    // mismos, y su texto escondido no se ve ni pisa nada.
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e)
      const ox = cs.overflowX !== 'visible'
      const oy = cs.overflowY !== 'visible'
      const cp = cs.clipPath !== 'none' && /inset\(/.test(cs.clipPath)
      if (!ox && !oy && !cp && cs.clip === 'auto') continue
      const b = e.getBoundingClientRect()
      if (ox || cs.clip !== 'auto' || cp) r = { ...r, l: Math.max(r.l, b.left), r: Math.min(r.r, b.right) }
      if (oy || cs.clip !== 'auto' || cp) r = { ...r, t: Math.max(r.t, b.top), b: Math.min(r.b, b.bottom) }
      recortes.push({ e, scroll: /auto|scroll/.test(cs.overflowX + cs.overflowY) })
      if (cs.position === 'fixed') break
    }
    return { r, recortes }
  }
  const inter = (a, b) => ({
    l: Math.max(a.l, b.l),
    t: Math.max(a.t, b.t),
    r: Math.min(a.r, b.r),
    b: Math.min(a.b, b.b),
  })
  const area = (a) => Math.max(0, a.r - a.l) * Math.max(0, a.b - a.t)

  // ── Renglones de texto visibles ─────────────────────────────────────────
  const renglones = []
  const cortados = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const cacheRecorte = new Map()
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim()) continue
    const el = n.parentElement
    if (!el || el.closest('script,style,noscript,svg,title')) continue
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue
    // Un texto marcado como decorado a propósito (el ticker duplicado, las
    // marcas de fondo) se sigue midiendo, pero se avisa como tal.
    const deco = Boolean(el.closest('[aria-hidden="true"]'))
    if (!cacheRecorte.has(el)) cacheRecorte.set(el, recorteDe(el))
    const { r: clip, recortes } = cacheRecorte.get(el)
    const rango = document.createRange()
    rango.selectNodeContents(n)
    for (const rc of rango.getClientRects()) {
      if (rc.width < 1 || rc.height < 1) continue
      const caja = { l: rc.left, t: rc.top, r: rc.right, b: rc.bottom }
      const vis = inter(caja, clip)
      const total = area(caja)
      const visible = area(vis)
      if (visible < 1) continue // escondido entero en una máscara: no se ve, no cuenta
      const enScroll = recortes.some((x) => x.scroll)
      // Cortado a medias por quien lo contiene (y no por un carrusel que se
      // scrollea, donde lo que queda afuera se alcanza deslizando).
      if (visible / total < 0.97 && !enScroll) {
        cortados.push({ el: nombre(el), texto: corto(n.textContent), visible: Math.round((visible / total) * 100) + '%', deco })
      }
      renglones.push({ n, el, bloque: bloqueDe(el), fijo: fijoDe(el), caja: vis, deco })
    }
  }

  // ── Solapes ─────────────────────────────────────────────────────────────
  // Se achica cada renglón a la zona de la tinta: la caja del Range es el área
  // de contenido de la fuente, más alta que las letras, y con `leading-none`
  // dos renglones vecinos se tocan sin que se pise nada.
  const tinta = (c) => {
    const h = c.b - c.t
    return { l: c.l + 1, r: c.r - 1, t: c.t + h * 0.22, b: c.b - h * 0.18 }
  }
  const solapes = []
  const vistos = new Set()
  for (let i = 0; i < renglones.length; i++) {
    const a = renglones[i]
    const ta = tinta(a.caja)
    for (let j = i + 1; j < renglones.length; j++) {
      const b = renglones[j]
      if (a.bloque === b.bloque) continue
      // Lo fijo contra el flujo solo cuenta arriba (header, riel): la barra
      // fija de abajo tapa contenido por diseño mientras se scrollea.
      if (Boolean(a.fijo) !== Boolean(b.fijo)) {
        const f = (a.fijo ? a : b).fijo.getBoundingClientRect()
        if (f.top > vh / 2) continue
      }
      const tb = tinta(b.caja)
      const x = inter(ta, tb)
      if (x.r - x.l < 2 || x.b - x.t < 2) continue
      const clave = `${a.n.textContent}|${b.n.textContent}`
      if (vistos.has(clave)) continue
      vistos.add(clave)
      solapes.push({
        a: `${nombre(a.el)} «${corto(a.n.textContent)}»`,
        b: `${nombre(b.el)} «${corto(b.n.textContent)}»`,
        px: `${Math.round(x.r - x.l)}x${Math.round(x.b - x.t)}`,
        deco: a.deco || b.deco,
        fijo: Boolean(a.fijo || b.fijo),
      })
    }
  }

  // ── truncate / line-clamp que esconden texto ────────────────────────────
  for (const el of document.querySelectorAll('body *')) {
    if (!el.childNodes.length || !el.textContent.trim()) continue
    const cs = getComputedStyle(el)
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue
    if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) {
      cortados.push({ el: nombre(el), texto: corto(el.textContent), visible: 'truncate', deco: false })
    }
    if (cs.webkitLineClamp !== 'none' && cs.webkitLineClamp && el.scrollHeight > el.clientHeight + 1) {
      cortados.push({ el: nombre(el), texto: corto(el.textContent), visible: `line-clamp ${cs.webkitLineClamp}`, deco: false })
    }
  }

  // ── Desborde horizontal ─────────────────────────────────────────────────
  const recortado = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const ov = getComputedStyle(p).overflowX
      if (ov !== 'visible') return true
    }
    return false
  }
  const desborde = [...document.querySelectorAll('body *')]
    .filter((el) => {
      const r = el.getBoundingClientRect()
      return r.width > 0 && (r.right > vw + 1 || r.left < -1) && !recortado(el)
    })
    .filter((el) => el.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
    .slice(0, 8)
    .map((el) => {
      const r = el.getBoundingClientRect()
      return `${nombre(el)} [${Math.round(r.left)}→${Math.round(r.right)}]`
    })

  // Contenedores de texto con ancho de línea desmedido: un párrafo de más de
  // ~95 caracteres por renglón ya no se lee. Lo que se mide es el ANCHO del
  // bloque contra el tamaño de su letra.
  const largos = []
  // Solo bloques de texto corrido: un `<li>` que adentro tiene su propio `<p>`
  // se mide en el `<p>`.
  for (const el of document.querySelectorAll('p, li, dd, blockquote')) {
    if (el.querySelector('p, div, ul, ol')) continue
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue
    const t = el.textContent.trim()
    if (t.length < 100) continue
    const fs = parseFloat(getComputedStyle(el).fontSize)
    const ancho = el.getBoundingClientRect().width
    const cpl = ancho / (fs * 0.5)
    if (cpl > 100) largos.push({ el: nombre(el), texto: corto(t), cpl: Math.round(cpl) })
  }

  // Un `truncate` aparece dos veces (renglón recortado y elipsis): una basta.
  const unicos = new Map(cortados.map((c) => [`${c.el}|${c.texto}`, c]))

  return {
    scrollWidth: document.documentElement.scrollWidth,
    vw,
    altoPagina: document.documentElement.scrollHeight,
    solapes,
    cortados: [...unicos.values()],
    desborde,
    largos,
  }
}

/** Monta todo lo perezoso: recorre la página y vuelve arriba. */
async function recorrer(page) {
  await page.evaluate(async () => {
    const paso = window.innerHeight * 0.7
    for (let y = 0; y < document.documentElement.scrollHeight; y += paso) {
      window.scrollTo({ top: y, behavior: 'instant' })
      await new Promise((r) => setTimeout(r, 90))
    }
    window.scrollTo({ top: 0, behavior: 'instant' })
  })
  // Fotos y tipografía antes de medir: una imagen sin cargar cambia altos.
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(700)
}

async function nuevoContexto(browser, vp, { sesion = false, estres = false } = {}) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, reducedMotion: MOVIMIENTO ? 'no-preference' : 'reduce' })
  await ctx.addInitScript(
    ({ sesion, estres }) => {
      try {
        sessionStorage.setItem('intro-seen', '1')
        if (sesion) {
          localStorage.setItem(
            'autoshop.sesion.v1',
            JSON.stringify({ email: 'dueña@autoshopjujuy.com', desde: new Date().toISOString() }),
          )
          localStorage.setItem('autoshop.panel.actividad', String(Date.now()))
        }
        if (estres) {
          const crudo = localStorage.getItem('autoshop.vehiculos.v4')
          if (crudo) {
            const lista = JSON.parse(crudo)
            const v = lista[0]
            if (v && v.titulo !== estres.titulo) {
              v.titulo = estres.titulo
              v.precio = estres.precio
              v.etiquetas = [
                ...estres.etiquetas.map((e, i) => ({
                  id: `estres-${i}`,
                  titulo: e.titulo,
                  texto: e.texto,
                  fotoFondoId: null,
                  orden: i,
                  enTarjeta: true,
                })),
                ...v.etiquetas
                  .filter((e) => !e.enTarjeta)
                  .map((e, i) => ({ ...e, orden: i + 2 })),
              ]
              localStorage.setItem('autoshop.vehiculos.v4', JSON.stringify(lista))
            }
          }
        }
      } catch {
        /* storage bloqueado */
      }
    },
    { sesion, estres: estres ? ESTRES : null },
  )

  // Solo lectura contra la base real: cualquier escritura se corta acá.
  const abortadas = []
  if (REAL) {
    await ctx.route(/supabase\.co/, (route) => {
      const m = route.request().method()
      if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return route.continue()
      abortadas.push(`${m} ${route.request().url().slice(0, 90)}`)
      return route.abort()
    })
  }
  return { ctx, abortadas }
}

/** Las páginas a medir, con lo que hace falta para ver cada estado. */
async function paginas(browser) {
  const { ctx } = await nuevoContexto(browser, ANCHOS[5], { estres: !REAL })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/catalogo`, { waitUntil: 'load' })
  if (!REAL) {
    // Primera carga siembra el mock; la segunda ya lee la unidad estresada.
    await page.reload({ waitUntil: 'load' })
  }
  await page.waitForSelector('a[href^="/vehiculo/"]', { timeout: 20_000 })
  const slugs = await page.$$eval('a[href^="/vehiculo/"]', (as) => [
    ...new Set(as.map((a) => a.getAttribute('href'))),
  ])
  let ids = []
  if (!REAL) {
    ids = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('autoshop.vehiculos.v4') || '[]').map((v) => v.id),
    )
  }
  await ctx.close()

  const lista = [
    { nombre: 'home', ruta: '/' },
    { nombre: 'catalogo-lista', ruta: '/catalogo', vista: 'lista' },
    { nombre: 'catalogo-grilla', ruta: '/catalogo', vista: 'grilla', soloAngosto: true },
    ...slugs.map((s) => ({ nombre: `ficha-${s.split('/').pop()}`, ruta: s })),
    { nombre: '404', ruta: '/no-existe' },
    { nombre: 'admin-login', ruta: '/admin/login' },
  ]
  if (!REAL) {
    lista.push(
      { nombre: 'panel-lista', ruta: '/admin', sesion: true, vistaPanel: 'lista' },
      { nombre: 'panel-grilla', ruta: '/admin', sesion: true, vistaPanel: 'grilla' },
      { nombre: 'panel-contenido', ruta: '/admin/contenido', sesion: true },
      ...ids.slice(0, 3).map((id) => ({ nombre: `panel-editar-${id}`, ruta: `/admin/editar/${id}`, sesion: true })),
    )
  }
  return lista
}

async function medirPagina(browser, vp, p) {
  const { ctx, abortadas } = await nuevoContexto(browser, vp, { sesion: p.sesion, estres: !REAL })
  const page = await ctx.newPage()
  if (!REAL) {
    // Siembra el mock en este contexto antes de entrar de verdad.
    await page.goto(`${BASE}/catalogo`, { waitUntil: 'load' })
    await page.waitForTimeout(300)
  }
  await page.addInitScript(
    ({ vista, vistaPanel }) => {
      try {
        if (vista) localStorage.setItem('autoshop.catalogo.vista', vista)
        if (vistaPanel) localStorage.setItem('autoshop.panel.vista', vistaPanel)
      } catch {
        /* storage bloqueado */
      }
    },
    { vista: p.vista, vistaPanel: p.vistaPanel },
  )
  await page.goto(`${BASE}${p.ruta}`, { waitUntil: 'load' })
  // Que terminen de llegar los datos: sin esqueletos a la vista.
  await page
    .waitForFunction(() => !document.querySelector('.animate-pulse'), null, { timeout: 15_000 })
    .catch(() => {})
  await recorrer(page)
  const m = await page.evaluate(medir)
  if (SHOTS) {
    await mkdir(path.join(OUT, String(vp.width)), { recursive: true })
    await page.screenshot({ path: path.join(OUT, String(vp.width), `${p.nombre}.png`), fullPage: true })
  }
  await ctx.close()
  return { ...m, abortadas }
}

async function main() {
  if (!FAST) {
    await run('npx', ['tsc', '-b'])
    const env = { ...process.env }
    if (REAL) delete env.VITE_DATOS
    else env.VITE_DATOS = 'mock'
    await run('npx', ['vite', 'build', '--outDir', OUT_BUILD, '--emptyOutDir'], { env })
  }
  if (SHOTS) await rm(OUT, { recursive: true, force: true })

  const server = spawn(
    'npx',
    ['vite', 'preview', '--outDir', OUT_BUILD, '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'],
    { stdio: 'ignore', shell: process.platform === 'win32' },
  )

  let browser
  let problemas = 0
  try {
    await esperarServidor(BASE)
    browser = await chromium.launch()
    const lista = await paginas(browser)
    console.log(`[responsivo] ${REAL ? 'DATOS REALES (solo lectura)' : 'mock + unidad estresada'}: ${lista.length} páginas × ${ANCHOS.length} anchos`)

    for (const vp of ANCHOS) {
      for (const p of lista) {
        if (p.soloAngosto && vp.width >= 640) continue
        if (FILTRO && !`${vp.width} ${p.nombre}`.includes(FILTRO)) continue
        const m = await medirPagina(browser, vp, p)
        const hallazgos = []
        if (m.scrollWidth > m.vw) hallazgos.push(`página ${m.scrollWidth}px > ${m.vw}px`)
        for (const d of m.desborde) hallazgos.push(`desborda: ${d}`)
        for (const s of m.solapes)
          hallazgos.push(`solape ${s.px}${s.deco ? ' (deco)' : ''}${s.fijo ? ' (fijo)' : ''}: ${s.a} ⟂ ${s.b}`)
        for (const c of m.cortados) hallazgos.push(`cortado ${c.visible}${c.deco ? ' (deco)' : ''}: ${c.el} «${c.texto}»`)
        for (const l of m.largos) hallazgos.push(`renglón largo ~${l.cpl} car.: ${l.el} «${l.texto}»`)
        for (const a of m.abortadas) hallazgos.push(`ESCRITURA BLOQUEADA: ${a}`)
        problemas += hallazgos.length
        const tag = `${vp.width}x${vp.height} ${p.nombre}`
        if (hallazgos.length === 0) console.log(`  ✓ ${tag}`)
        else {
          console.log(`  ✗ ${tag}`)
          for (const h of hallazgos.slice(0, 14)) console.log(`      ${h}`)
          if (hallazgos.length > 14) console.log(`      … y ${hallazgos.length - 14} más`)
        }
      }
    }
    console.log(problemas === 0 ? '[responsivo] limpio ✓' : `[responsivo] ${problemas} hallazgos ✗`)
  } finally {
    await browser?.close()
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(server.pid), '/f', '/t'], { stdio: 'ignore' })
    } else server.kill('SIGTERM')
  }
  process.exitCode = problemas === 0 ? 0 : 1
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
