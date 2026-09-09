/**
 * Arnés de captura.
 *
 * El proyecto se construyó sin navegador: build, lint y checks pasan, pero
 * nadie vio nunca correr la intro ni una sección. Este script levanta el build
 * y saca las capturas necesarias para revisar el trabajo con los ojos.
 *
 *   npm run shots            # build + capturas
 *   npm run shots -- --fast  # sin build, reusa dist/
 *
 * Todo va a docs/shots/. Los nombres empiezan por viewport para que el listado
 * quede agrupado.
 */
import { spawn } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright'

const OUT = path.resolve('docs/shots')
const PORT = 4317
const BASE = `http://127.0.0.1:${PORT}`
const FAST = process.argv.includes('--fast')

/** Viewports probados. El de 390 es un iPhone 14; el de 1440 un notebook. */
const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 },
}

/** Cada cuánto y por cuánto se muestrea la intro. */
const INTRO_STEP_MS = 200
const INTRO_SPAN_MS = 3000

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...opts,
    })
    p.on('error', reject)
    p.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} salió con ${code}`)),
    )
  })
}

async function waitForServer(url, timeoutMs = 30_000) {
  const limite = Date.now() + timeoutMs
  while (Date.now() < limite) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // todavía no levantó
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`El preview no respondió en ${url}`)
}

const shot = (page, nombre, opts = {}) =>
  page.screenshot({ path: path.join(OUT, `${nombre}.png`), ...opts })

/**
 * Contexto nuevo por captura: sessionStorage arranca vacío, así que la intro
 * vuelve a correr. El addInitScript es el cinturón de seguridad por si el
 * navegador reusa almacenamiento.
 */
async function nuevaPagina(browser, viewport) {
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    try {
      sessionStorage.clear()
    } catch {
      /* storage bloqueado */
    }
  })
  return { ctx, page }
}

/** Espera a que la intro haya terminado (se desmonta del DOM) o al techo. */
async function esperarFinDeIntro(page) {
  await page
    .waitForFunction(() => !document.querySelector('[data-intro]'), null, {
      timeout: 6000,
    })
    .catch(() => {})
  await page.waitForTimeout(400)
}

/**
 * La intro, muestreada cada 200 ms durante 3 s.
 *
 * El reloj arranca en `domcontentloaded`, que es lo más cerca que se puede
 * estar del momento en que React monta y la timeline empieza. Cada archivo
 * lleva el tiempo REAL transcurrido, no el nominal: sacar un PNG cuesta unas
 * decenas de ms y mentir con el nombre haría que la revisión concluya cosas
 * falsas sobre el timing.
 */
async function capturarIntro(browser) {
  const { ctx, page } = await nuevaPagina(browser, VIEWPORTS.desktop)

  // Precalentado: la PRIMERA captura de un contexto cuesta ~450 ms y se comía
  // el láser entero (0.15–0.70 s). Un disparo en vacío deja el camino caliente
  // y a partir de ahí cada PNG sale en ~40 ms.
  await page.goto('about:blank')
  await page.screenshot()

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  const t0 = Date.now()

  for (let t = 0; t <= INTRO_SPAN_MS; t += INTRO_STEP_MS) {
    const espera = t0 + t - Date.now()
    if (espera > 0) await page.waitForTimeout(espera)
    const real = String(Date.now() - t0).padStart(4, '0')
    const nominal = String(t).padStart(4, '0')
    await shot(page, `intro/t${nominal}-real${real}ms`, { animations: 'allow' })
  }

  await ctx.close()
}

/**
 * Los beats de la intro, congelados.
 *
 * El muestreo contra el reloj de pared le erra por decenas de ms y no puede
 * caer exactamente en el aterrizaje del Flip, que es justo lo que hay que
 * mirar. Acá se intercepta la asignación de `window.__introTl`, se pausa la
 * timeline en el frame cero y después se hace `seek()` a cada beat.
 *
 * Además mide el aterrizaje del Flip: en t = 2.30 el logo volador y el del
 * header tienen que ocupar el mismo rectángulo. Si están corridos, se ve acá
 * en píxeles y no en una impresión.
 */
const BEATS = [
  ['0.00-negro', 0.0],
  ['0.15-laser-arranca', 0.15],
  ['0.42-laser-medio', 0.42],
  ['0.70-laser-sale', 0.7],
  ['0.92-palabra-media', 0.92],
  ['1.15-palabra-entera', 1.15],
  ['1.10-bandera-media', 1.1],
  ['1.30-bandera-entera', 1.3],
  ['1.65-linea-entera', 1.65],
  ['1.78-respiracion-pico', 1.775],
  ['2.00-respiracion-fin', 2.0],
  ['2.15-flip-medio', 2.15],
  ['2.30-flip-aterriza', 2.3],
  ['2.45-wipe-medio', 2.45],
  ['2.59-wipe-fin', 2.59],
]

async function capturarBeats(browser) {
  const { ctx, page } = await nuevaPagina(browser, VIEWPORTS.desktop)
  await page.addInitScript(() => {
    Object.defineProperty(window, '__introTl', {
      configurable: true,
      set(tl) {
        tl.pause(0, false)
        window.__tlCongelada = tl
      },
      get() {
        return window.__tlCongelada
      },
    })
  })
  await page.goto(BASE, { waitUntil: 'load' })
  await page.waitForFunction(() => Boolean(window.__tlCongelada), null, {
    timeout: 10_000,
  })

  for (const [nombre, t] of BEATS) {
    await page.evaluate((t) => {
      // El segundo argumento es `suppressEvents` y GSAP lo asume TRUE: sin el
      // `false` explícito, el `tl.call` del cambio de posta (2.30) nunca corre,
      // el stage no se apaga y el wipe queda tapado detrás. Se ve como si el
      // wipe estuviera roto, y lo único roto es la medición.
      window.__tlCongelada.pause(t, false)
    }, t)
    await page.waitForTimeout(120)
    await shot(page, `beats/${nombre}`, { animations: 'allow' })
  }

  // Aterrizaje del Flip, en píxeles.
  // Con llaves a propósito: `() => tl.pause(t)` devolvería la timeline, y
  // Playwright intenta serializar el grafo entero de GSAP y se cuelga.
  await page.evaluate(() => {
    window.__tlCongelada.pause(2.3, false)
  })
  await page.waitForTimeout(150)
  const fit = await page.evaluate(() => {
    const r = (el) => {
      const b = el.getBoundingClientRect()
      return {
        x: +b.x.toFixed(1),
        y: +b.y.toFixed(1),
        w: +b.width.toFixed(1),
        h: +b.height.toFixed(1),
      }
    }
    const volador = document.querySelector('[data-intro] svg')
    const header = document.getElementById('header-logo')
    if (!volador || !header) return null
    const a = r(volador)
    const b = r(header)
    return {
      volador: a,
      header: b,
      delta: {
        x: +(a.x - b.x).toFixed(1),
        y: +(a.y - b.y).toFixed(1),
        w: +(a.w - b.w).toFixed(1),
        h: +(a.h - b.h).toFixed(1),
      },
    }
  })
  console.log('[shots] aterrizaje del Flip:', JSON.stringify(fit))

  await ctx.close()
}

/** Un pase completo de página ya cargada, en un viewport. */
async function capturarPagina(browser, nombreVp) {
  const viewport = VIEWPORTS[nombreVp]
  const { ctx, page } = await nuevaPagina(browser, viewport)
  await page.goto(BASE, { waitUntil: 'load' })
  await esperarFinDeIntro(page)

  // ¿Cargó la tipografía de verdad o quedó la fallback? Todo el lenguaje
  // visual del sitio depende del eje de ancho de Archivo, y si el pedido a
  // Google Fonts falla el sitio se cae a Arial sin avisar. Se chequea midiendo
  // el ancho de una misma cadena en Archivo y en la fallback: si dan lo mismo,
  // Archivo no está.
  const fuentes = await page.evaluate(async () => {
    await document.fonts.ready
    const medir = (familia) => {
      const s = document.createElement('span')
      s.textContent = 'AUTOSHOPJUJUY'
      s.style.cssText = `position:absolute;visibility:hidden;font-size:100px;font-weight:700;font-variation-settings:'wdth' 125;font-family:${familia}`
      document.body.append(s)
      const w = s.getBoundingClientRect().width
      s.remove()
      return Math.round(w)
    }
    return {
      archivo: medir("'Archivo', sans-serif"),
      fallback: medir('sans-serif'),
      cargadas: [...document.fonts]
        .filter((f) => f.status === 'loaded')
        .map((f) => f.family),
    }
  })
  console.log(`[shots] ${nombreVp} fuentes:`, JSON.stringify(fuentes))

  // Full page. Lenis usa transform en el wrapper en algunas configuraciones;
  // acá scrollea el documento, así que el full-page nativo sirve.
  await shot(page, `${nombreVp}/00-fullpage`, { fullPage: true })

  // Una por sección, en viewport: el full-page aplasta las secciones de 100svh
  // y no deja ver cómo entra cada una realmente.
  const ids = await page.$$eval('main section[id]', (nodes) =>
    nodes.map((n) => n.id),
  )
  for (const [i, id] of ids.entries()) {
    await page.evaluate((sel) => {
      document.getElementById(sel)?.scrollIntoView({ behavior: 'instant' })
    }, id)
    await page.waitForTimeout(500)
    await shot(page, `${nombreVp}/${String(i + 1).padStart(2, '0')}-${id}`)
  }

  // FAQ con un ítem abierto: se abre el segundo, así se ve uno abierto y los
  // otros cerrados en la misma captura.
  const botones = page.locator('.faq-button')
  if (await botones.count()) {
    await botones.nth(1).click()
    await page.waitForTimeout(700)
    await page
      .locator('#preguntas')
      .scrollIntoViewIfNeeded()
      .catch(() => {})
    await page.waitForTimeout(400)
    await shot(page, `${nombreVp}/50-faq-abierta`)
    // El barrido de hover, que es la idea de movimiento de la sección.
    await botones.nth(2).hover()
    await page.waitForTimeout(700)
    await shot(page, `${nombreVp}/51-faq-hover`)
  }

  // Marcas: en reposo son casi invisibles, así que hay que capturar las dos
  // caras — la lista apagada y una marca encendida por hover.
  const marcas = page.locator('#marcas .marca')
  if (await marcas.count()) {
    await page.evaluate(() => {
      document
        .getElementById('marcas')
        ?.scrollIntoView({ behavior: 'instant', block: 'start' })
    })
    await page.waitForTimeout(600)
    await shot(page, `${nombreVp}/30-marcas`)
    console.log(
      `[shots] ${nombreVp} marcas encendidas en reposo:`,
      JSON.stringify(
        await page.$$eval('#marcas .marca', (ns) =>
          ns
            .filter((n) => getComputedStyle(n).color === 'rgb(253, 185, 22)')
            .map((n) => n.textContent),
        ),
      ),
    )
    await marcas.nth(2).hover()
    await page.waitForTimeout(400)
    await shot(page, `${nombreVp}/31-marcas-hover`)
    console.log(
      `[shots] ${nombreVp} marca encendida por la línea central:`,
      await page.$eval('#marcas', (s) => {
        const on = s.querySelector('[data-encendida="true"]')
        return on ? on.textContent : 'ninguna'
      }),
    )
  }

  // Contadores: hay que esperar a que el conteo termine (1,8 s) o la captura
  // muestra cifras a mitad de camino y no se puede juzgar el resultado.
  const contadores = page.locator('#contadores')
  if (await contadores.count()) {
    await page.evaluate(() => {
      document
        .getElementById('contadores')
        ?.scrollIntoView({ behavior: 'instant', block: 'center' })
    })
    await page.waitForTimeout(700)
    await shot(page, `${nombreVp}/40-contadores-contando`)
    await page.waitForTimeout(2000)
    await shot(page, `${nombreVp}/41-contadores-final`)
    console.log(
      `[shots] ${nombreVp} contadores:`,
      JSON.stringify(
        await page.$$eval('#contadores [data-cifra]', (n) =>
          n.map((e) => e.textContent),
        ),
      ),
    )

    // La franja pasando POR DEBAJO del header: es el momento en que el logo
    // tiene que ponerse negro. Blanco sobre ámbar no se lee, y el "SHOP" ámbar
    // directamente desaparece.
    await page.evaluate(() => {
      const el = document.getElementById('contadores')
      if (el) window.scrollTo(0, el.offsetTop - 24)
    })
    await page.waitForTimeout(800)
    await shot(page, `${nombreVp}/42-contadores-bajo-header`)
    console.log(
      `[shots] ${nombreVp} tono del header sobre la franja:`,
      await page.$eval('.header-adapt', (h) => h.dataset.tono),
    )
  }

  // Contacto: formulario vacío, con errores de validación y en estado de éxito.
  // La validación es todo lo que hay (no hay backend), así que se prueba de
  // verdad: se envía vacío, se leen los mensajes, y después se completa bien.
  const form = page.locator('#contacto form')
  if (await form.count()) {
    await page.evaluate(() => {
      document
        .getElementById('contacto')
        ?.scrollIntoView({ behavior: 'instant', block: 'start' })
    })
    await page.waitForTimeout(500)
    await shot(page, `${nombreVp}/70-contacto`)

    await form.locator('button[type=submit]').click()
    await page.waitForTimeout(400)
    await page.evaluate(() => {
      document
        .getElementById('contacto')
        ?.scrollIntoView({ behavior: 'instant', block: 'start' })
    })
    await page.waitForTimeout(300)
    await shot(page, `${nombreVp}/71-contacto-errores`)
    console.log(
      `[shots] ${nombreVp} errores de validación:`,
      JSON.stringify(
        await page.$$eval('#contacto [id$="-error"]', (n) =>
          n.map((e) => e.textContent),
        ),
      ),
    )

    await form.locator('input[type=text]').first().fill('Marcelo Quispe')
    await form.locator('input[type=email]').fill('marcelo@gmail.com')
    await form.locator('input[type=tel]').fill('388 415 2233')
    await form.locator('select').selectOption('comprar-usado')
    await form.locator('button[aria-pressed]').nth(1).click()
    await form
      .locator('textarea')
      .fill('Busco una Toro o una Strada 2021 en adelante, entrego mi Cronos.')
    await page.waitForTimeout(300)
    await shot(page, `${nombreVp}/72-contacto-completo`)

    await form.locator('button[type=submit]').click()
    await page.waitForTimeout(500)
    await page.evaluate(() => {
      document
        .getElementById('contacto')
        ?.scrollIntoView({ behavior: 'instant', block: 'start' })
    })
    await page.waitForTimeout(300)
    await shot(page, `${nombreVp}/73-contacto-enviado`)
  }

  // Footer entero.
  await page.evaluate(() => {
    document.getElementById('footer')?.scrollIntoView({ behavior: 'instant' })
  })
  await page.waitForTimeout(500)
  await shot(page, `${nombreVp}/60-footer`)
  await page.locator('#footer').screenshot({
    path: path.join(OUT, nombreVp, '61-footer-completo.png'),
  })

  // Footer con foco por teclado. Tiene que ser Tab de verdad: `.focus()`
  // programático no siempre activa :focus-visible, que es lo que dispara el `\`.
  await page.evaluate(() => {
    document.body.scrollIntoView({ behavior: 'instant' })
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(200)
  let encontrado = false
  for (let i = 0; i < 120 && !encontrado; i += 1) {
    await page.keyboard.press('Tab')
    encontrado = await page.evaluate(() => {
      const el = document.activeElement
      return Boolean(el?.classList?.contains('stagger-link') && el.closest('#footer'))
    })
  }
  if (encontrado) {
    // El Tab #4 dentro del footer cae en un ítem con sangría, donde el
    // escalonado se lee mejor que en el primero.
    for (let i = 0; i < 3; i += 1) await page.keyboard.press('Tab')
    await page.waitForTimeout(600)
    await shot(page, `${nombreVp}/62-footer-foco-teclado`)
  } else {
    console.warn(`[shots] no se llegó a un stagger-link con Tab en ${nombreVp}`)
  }

  // Desborde horizontal: el dato duro, no la impresión visual.
  const desborde = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    culpables: Array.from(document.querySelectorAll('body *'))
      .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
      .slice(0, 8)
      .map((el) => `${el.tagName.toLowerCase()}.${el.className}`.slice(0, 90)),
  }))
  console.log(`[shots] ${nombreVp} overflow-x:`, JSON.stringify(desborde))

  // El logotipo del footer tiene que llegar de margen a margen sin cortarse.
  // Se mide, no se mira: recortado en 1 px no se nota en la captura y sí en la
  // pantalla del cliente.
  const logotipo = await page.evaluate(() => {
    const h = document.querySelector('#footer h2')
    if (!h) return null
    // Con Range, no con scrollWidth: scrollWidth nunca baja de clientWidth y
    // taparía justo el caso de "le sobra lugar a la derecha".
    const r = document.createRange()
    r.selectNodeContents(h)
    const pedido = r.getBoundingClientRect().width
    return {
      disponible: h.clientWidth,
      pedido: +pedido.toFixed(1),
      fontSize: getComputedStyle(h).fontSize,
      llenado: +(pedido / h.clientWidth).toFixed(3),
    }
  })
  console.log(`[shots] ${nombreVp} logotipo footer:`, JSON.stringify(logotipo))

  await ctx.close()
}

async function main() {
  await rm(OUT, { recursive: true, force: true })
  await mkdir(path.join(OUT, 'intro'), { recursive: true })
  await mkdir(path.join(OUT, 'beats'), { recursive: true })
  for (const vp of Object.keys(VIEWPORTS)) {
    await mkdir(path.join(OUT, vp), { recursive: true })
  }

  if (!FAST) await run('npm', ['run', 'build'])

  const server = spawn(
    'npx',
    ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'],
    { stdio: 'ignore', shell: process.platform === 'win32', detached: false },
  )

  let browser
  try {
    await waitForServer(BASE)
    browser = await chromium.launch()

    await capturarIntro(browser)
    await capturarBeats(browser)
    await capturarPagina(browser, 'desktop')
    await capturarPagina(browser, 'mobile')

    console.log(`[shots] listo → ${OUT}`)
  } finally {
    await browser?.close()
    // En Windows, matar el proceso de npx no siempre mata al hijo que escucha
    // el puerto. taskkill /T se lleva el árbol entero.
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(server.pid), '/f', '/t'], {
        stdio: 'ignore',
      })
    } else {
      server.kill('SIGTERM')
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
