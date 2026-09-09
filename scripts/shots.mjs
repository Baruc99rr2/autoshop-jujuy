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

  // ── HERO ───────────────────────────────────────────────────────────
  // El video es vertical y el layout de desktop depende de eso. Se mide el
  // rectángulo real del panel: si el aspecto se aleja de 0.5625 (9:16), el
  // video está estirado o recortado y se pierde el farol o el auto.
  // Hay DOS <video> en el DOM —el de mobile a sangre y el del panel de
  // desktop— y uno de los dos está siempre en display:none. Buscar el primero
  // del DOM devolvía el oculto, con rectángulo 0x0, y eso parecía un bug del
  // layout cuando era un bug de la medición.
  const hero = await page.evaluate(() => {
    const visibles = [...document.querySelectorAll('#hero video')].filter(
      (v) => v.getBoundingClientRect().width > 0,
    )
    const v = visibles[0]
    if (!v) return { video: 'ningún <video> visible' }
    const r = v.getBoundingClientRect()
    return {
      src: v.getAttribute('src'),
      w: Math.round(r.width),
      h: Math.round(r.height),
      aspecto: +(r.width / r.height).toFixed(4),
      videosEnDom: document.querySelectorAll('#hero video').length,
      dentroDelViewport: r.bottom <= window.innerHeight + 1,
    }
  })
  console.log(`[shots] ${nombreVp} hero video:`, JSON.stringify(hero))

  // El titular del hero vive en una columna angosta y con un clamp mal
  // calculado se parte en renglones de más. Se mide cada línea contra el ancho
  // disponible: `llenado` arriba de 1 significa que esa línea se partió.
  const titular = await page.evaluate(() => {
    const h1 = document.querySelector('#hero h1')
    if (!h1) return null
    const disponible = h1.clientWidth
    return {
      disponible,
      fontSize: getComputedStyle(h1).fontSize,
      alto: Math.round(h1.getBoundingClientRect().height),
      lineas: [...h1.children].map((n) => {
        const r = document.createRange()
        r.selectNodeContents(n)
        return {
          t: n.textContent,
          llenado: +(r.getBoundingClientRect().width / disponible).toFixed(3),
        }
      }),
    }
  })
  console.log(`[shots] ${nombreVp} hero titular:`, JSON.stringify(titular))

  // El corte del loop. Se saltea el video a 0,2 s del final para ver si la
  // atenuación se lee como un faro que pasa o como un apagón.
  const conVideo = await page.locator('#hero video').count()
  if (conVideo) {
    await page.evaluate(() => {
      document
        .getElementById('hero')
        ?.scrollIntoView({ behavior: 'instant', block: 'start' })
    })
    await page.waitForTimeout(300)
    await shot(page, `${nombreVp}/01a-hero-normal`)

    // Sin atenuación, para poder comparar contra el corte pelado.
    await page.evaluate(() => {
      const v = document.querySelector('#hero video')
      if (!v) return
      v.pause()
      v.currentTime = Math.max(0, (v.duration || 7) - 0.2)
    })

    await page.waitForTimeout(500)
    await shot(page, `${nombreVp}/01b-hero-corte-atenuado`)
    console.log(
      `[shots] ${nombreVp} opacidad en el corte:`,
      await page.$eval('#hero video', (v) => v.style.opacity || '1'),
    )

    // El último frame contra el primero: si son muy parecidos, la atenuación
    // sobra. Se comparan como data URL de un canvas de 16x16.
    const salto = await page.evaluate(async () => {
      const v = document.querySelector('#hero video')
      if (!v) return null
      const muestra = async (t) => {
        v.currentTime = t
        await new Promise((r) => v.addEventListener('seeked', r, { once: true }))
        const c = document.createElement('canvas')
        c.width = 16
        c.height = 16
        c.getContext('2d').drawImage(v, 0, 0, 16, 16)
        return c.getContext('2d').getImageData(0, 0, 16, 16).data
      }
      const fin = await muestra(Math.max(0, (v.duration || 7) - 0.05))
      const ini = await muestra(0.05)
      let dif = 0
      for (let i = 0; i < fin.length; i += 4) {
        dif += Math.abs(fin[i] - ini[i]) + Math.abs(fin[i + 1] - ini[i + 1]) + Math.abs(fin[i + 2] - ini[i + 2])
      }
      return { difMediaPorCanal: +(dif / (16 * 16 * 3)).toFixed(1) }
    })
    console.log(
      `[shots] ${nombreVp} salto del loop (0=idéntico, 255=opuesto):`,
      JSON.stringify(salto),
    )

    await page.evaluate(() => {
      const v = document.querySelector('#hero video')
      if (v) {
        v.currentTime = 0
        v.style.opacity = '1'
        v.play().catch(() => {})
      }
    })
  }

  // ── CARRUSEL DE SEGMENTOS ──────────────────────────────────────────
  // Lo que hay que verificar no es que "se vea bien" sino que la lista y la
  // imagen NUNCA muestren cosas distintas. Se recorre el pin en cuatro
  // posiciones y en cada una se lee cuál es el ítem encendido y cuánto está
  // recortada cada imagen, y se comparan.
  const segmentos = page.locator('#segmentos')
  if (await segmentos.count()) {
    const alto = viewport.height
    // El arranque del pin NO se calcula: se alcanza y después se lee. Medirlo
    // de antemano daba 1848 contra los 1132 reales —la sección está dentro de
    // un pin-spacer que ScrollTrigger crea y redimensiona en cada refresh— y
    // con 716 px de error el recorrido arrancaba ya en el segundo segmento,
    // así que las capturas mostraban un estado y se leían como otro.
    // Se posiciona y se CORRIGE, hasta tres veces, en vez de calcular. Un
    // `scrollIntoView` sobre esta sección deja el borde superior 720 px arriba
    // del viewport: entre el pin-spacer que ScrollTrigger crea, el
    // `ScrollTrigger.refresh()` que disparan las imágenes al cargar y el snap
    // que reacomoda la posición, el layout se mueve DESPUÉS del scroll. En vez
    // de perseguir la causa, se lee el error y se resta, que converge en dos
    // iteraciones y deja constancia de cuánto se corrigió.
    let correccion = 0
    for (let intento = 0; intento < 3; intento += 1) {
      const dy = await page.evaluate(() => {
        const t = Math.round(
          document.getElementById('segmentos').getBoundingClientRect().top,
        )
        if (Math.abs(t) > 2) window.scrollBy(0, t)
        return t
      })
      await page.waitForTimeout(600)
      correccion += dy
      if (Math.abs(dy) <= 2) break
    }
    // El arranque REAL sale del propio ScrollTrigger, no de la posición de la
    // sección: son cosas distintas y confundirlas fue el origen del enredo.
    const st = await page.evaluate(() => {
      const t = window.__segST
      return t ? { start: Math.round(t.start), end: Math.round(t.end) } : null
    })
    const base = st ? st.start : await page.evaluate(() => Math.round(window.scrollY))
    console.log(
      `[shots] ${nombreVp} segmentos pin:`,
      JSON.stringify({ ...st, corregido: correccion }),
    )

    // Un paso por tramo, y se scrollea DOS VECES al mismo punto.
    //
    // El `snap` de ScrollTrigger es direccional por defecto: al llegar bajando
    // no se queda en el punto donde uno cae, avanza al siguiente. Es el
    // comportamiento correcto para el usuario —scrolleás hacia abajo, el
    // carrusel avanza— pero para medir hace que el primer paso informe el
    // segundo segmento. El segundo scroll al mismo destino sale desde el punto
    // ya asentado y no tiene dirección, así que el snap lo deja donde cae.
    const pasos = nombreVp === 'mobile' ? [] : [0, 1, 2, 3]
    for (const [i, k] of pasos.entries()) {
      const destino = base + k * alto * 0.8
      for (const espera of [900, 500]) {
        await page.evaluate(
          ([y]) => window.scrollTo({ top: y, behavior: 'instant' }),
          [destino],
        )
        await page.waitForTimeout(espera)
      }
      await shot(page, `${nombreVp}/1${i}-segmentos-${i + 1}`)
      void k

      const estado = await page.evaluate(() => {
        const activo = document.querySelector('#segmentos [data-activo="true"]')
        const imgs = [...document.querySelectorAll('#segmentos .seg-img')]
        // La imagen "que se ve" es la última que no está recortada del todo.
        const recortes = imgs.map((el) => getComputedStyle(el).clipPath)
        const visible = recortes.reduce(
          (acc, c, idx) => (c.includes('100%') ? acc : idx),
          0,
        )
        const contador = document.querySelector('#segmentos .seg-contador')
        const sec = document.getElementById('segmentos')
        const t = window.__segST
        return {
          progreso: t ? +t.progress.toFixed(3) : null,
          encendido: activo?.querySelector('span')?.textContent ?? 'ninguno',
          imagenVisible: visible,
          contador: contador?.textContent?.replace(/\s+/g, ' ').trim(),
          scrollY: Math.round(window.scrollY),
          secTop: Math.round(sec.getBoundingClientRect().top),
          secAlto: Math.round(sec.getBoundingClientRect().height),
        }
      })
      console.log(`[shots] ${nombreVp} segmentos paso ${i + 1}:`, JSON.stringify(estado))
    }

    // MOBILE: no hay pin ni ScrollTrigger, hay un riel con scroll-snap. Se
    // recorre card por card llevando el riel a cada una.
    if (nombreVp === 'mobile') {
      const riel = page.locator('#segmentos .seg-riel')
      const cards = await page.locator('#segmentos .seg-card').count()
      for (let i = 0; i < cards; i += 1) {
        await riel.evaluate((el, idx) => {
          const card = el.children[idx]
          el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: 'instant' })
        }, i)
        await page.waitForTimeout(500)
        await shot(page, `${nombreVp}/1${i}-segmentos-${i + 1}`)
      }
      const rielInfo = await riel.evaluate((el) => ({
        anchoVisible: el.clientWidth,
        anchoTotal: el.scrollWidth,
        snap: getComputedStyle(el).scrollSnapType,
        cards: el.children.length,
      }))
      console.log(`[shots] ${nombreVp} segmentos riel:`, JSON.stringify(rielInfo))
    }

    // Contraste del texto sobre la imagen: las cuatro fotos son oscuras, pero
    // el copy va sobre el negro de la columna izquierda, no sobre la foto.
    // Lo que sí se comprueba es que la caja de la imagen no tape la lista.
    const solape = await page.evaluate(() => {
      const lista = document.querySelector('#segmentos ul')
      const caja = document.querySelector('#segmentos .seg-img')?.parentElement
      if (!lista || !caja) return null
      const a = lista.getBoundingClientRect()
      const b = caja.getBoundingClientRect()
      return { listaDerecha: Math.round(a.right), imagenIzquierda: Math.round(b.left) }
    })
    console.log(`[shots] ${nombreVp} segmentos solape:`, JSON.stringify(solape))
  }

  // ── MENÚ ───────────────────────────────────────────────────────────
  const botonMenu = page.locator('.menu-btn')
  if (await botonMenu.count()) {
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(400)
    await botonMenu.hover()
    await page.waitForTimeout(400)
    await shot(page, `${nombreVp}/80-menu-boton-hover`)

    await botonMenu.click()
    // A mitad del dibujado de los ítems: es donde se ve si las barras entran
    // antes que el texto o si todo aparece junto.
    await page.waitForTimeout(430)
    await shot(page, `${nombreVp}/81-menu-dibujandose`)
    await page.waitForTimeout(900)
    await shot(page, `${nombreVp}/82-menu-abierto`)

    console.log(
      `[shots] ${nombreVp} menú abierto — riel/header:`,
      JSON.stringify(
        await page.evaluate(() => ({
          tonoHeader: document.querySelector('header')?.dataset.tono,
          // La variable se redefine en el <header data-tono>, NO en :root:
          // leerla de documentElement devolvía siempre el bone y hacía parecer
          // que la adaptación no corría.
          logoBlanco: (() => {
            const h = document.querySelector('header')
            return h ? getComputedStyle(h).getPropertyValue('--logo-white').trim() : '?'
          })(),
          rielVisible: (() => {
            const riel = document.querySelector('[aria-hidden="true"].fixed.inset-y-0')
            if (!riel) return 'no encontrado'
            const z = +getComputedStyle(riel).zIndex
            const panel = document.querySelector('[role="dialog"]')
            return panel ? `riel z=${z} vs panel z=${getComputedStyle(panel).zIndex}` : 'sin panel'
          })(),
          scrollBloqueado: getComputedStyle(document.documentElement).overflow,
          foco: document.activeElement?.textContent?.trim().slice(0, 24),
        })),
      ),
    )

    await page.locator('.menu-item').nth(2).hover()
    await page.waitForTimeout(400)
    await shot(page, `${nombreVp}/83-menu-item-hover`)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(700)
    console.log(
      `[shots] ${nombreVp} menú tras Escape:`,
      JSON.stringify({
        panel: await page.locator('[role="dialog"]').count(),
        scroll: await page.evaluate(() => getComputedStyle(document.documentElement).overflow),
        focoVuelto: await page.evaluate(() => document.activeElement?.className?.includes?.('menu-btn') ?? false),
      }),
    )
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

  // Post-venta: los cuatro tiles en reposo y uno con el barrido ámbar. El
  // barrido responde igual al hover que al foco, así que se prueba con hover
  // y se verifica el color resultante.
  const tiles = page.locator('#postventa .tile-host')
  if (await tiles.count()) {
    await page.evaluate(() => {
      document
        .getElementById('postventa')
        ?.scrollIntoView({ behavior: 'instant', block: 'start' })
    })
    // El puntero quedó donde lo dejó el paso anterior y puede caer sobre un
    // tile: sin moverlo, la captura "en reposo" saldría con uno en hover.
    await page.mouse.move(2, 2)
    await page.waitForTimeout(600)
    await shot(page, `${nombreVp}/35-postventa`)
    await tiles.nth(1).hover()
    await page.waitForTimeout(700)
    await shot(page, `${nombreVp}/36-postventa-hover`)
    console.log(
      `[shots] ${nombreVp} tile en hover:`,
      await tiles.nth(1).locator('.tile').evaluate((el) => ({
        color: getComputedStyle(el).color,
        barrido: getComputedStyle(el, '::before').transform,
      })),
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

  // Simulador: estado inicial y después de mover los dos sliders y cambiar el
  // plazo, para ver que la cuota se recalcula y que la pista llena acompaña.
  const sliders = page.locator('#plan .slider')
  if (await sliders.count()) {
    await page.evaluate(() => {
      document.getElementById('plan')?.scrollIntoView({ behavior: 'instant' })
    })
    await page.waitForTimeout(500)
    await shot(page, `${nombreVp}/20-simulador`)

    await sliders.nth(0).fill('42000000')
    await sliders.nth(1).fill('15')
    await page.locator('#plan button[aria-pressed]').nth(4).click()
    await page.waitForTimeout(400)
    await shot(page, `${nombreVp}/21-simulador-movido`)
    console.log(
      `[shots] ${nombreVp} cuota simulada:`,
      await page.$eval('#plan [data-cuota]', (e) => e.textContent),
    )
  }

  // Cotizador: vacío, escaneando y con el resultado ya contado.
  const cotizador = page.locator('#cotizador')
  if (await cotizador.count()) {
    await page.evaluate(() => {
      document
        .getElementById('cotizador')
        ?.scrollIntoView({ behavior: 'instant' })
    })
    await page.waitForTimeout(400)
    await shot(page, `${nombreVp}/25-cotizador`)

    const selects = cotizador.locator('select')
    await selects.nth(0).selectOption('fiat')
    await selects.nth(1).selectOption('toro')
    await selects.nth(2).selectOption('2021')
    await page.waitForTimeout(250)
    await cotizador.locator('button[type=button]').last().click()
    // Dos momentos del escaneo: la línea cruza la card dos veces en 1,2 s, y
    // con una sola captura es puro azar dónde cae.
    await page.waitForTimeout(160)
    await shot(page, `${nombreVp}/26a-cotizador-escaneando`)
    // +140 ms cae a mitad de la primera pasada; el segundo tramo espera lo
    // suficiente para agarrar la segunda. Sumar 600 justos volvería a caer en
    // la misma fase y las dos capturas saldrían iguales.
    await page.waitForTimeout(140)
    await shot(page, `${nombreVp}/26b-cotizador-escaneando`)
    await page.waitForTimeout(2400)
    await shot(page, `${nombreVp}/27-cotizador-resultado`)
    console.log(
      `[shots] ${nombreVp} rango cotizado:`,
      await cotizador.locator('[aria-live] .num').first().innerText(),
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
    // Se ignora lo que YA está recortado por un ancestro con overflow oculto.
    // La pista del ticker mide el doble del viewport a propósito —es el
    // mecanismo de la marquesina— y aparecía como culpable en cada corrida,
    // ocho líneas de ruido que tapaban un desborde real si aparecía.
    culpables: Array.from(document.querySelectorAll('body *'))
      .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
      .filter((el) => {
        for (let p = el.parentElement; p; p = p.parentElement) {
          const ov = getComputedStyle(p).overflowX
          if (ov === 'hidden' || ov === 'clip' || ov === 'auto' || ov === 'scroll') return false
        }
        return true
      })
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

/**
 * Pase OFFLINE: se bloquea toda petición que no sea al propio origen y se
 * captura la portada.
 *
 * Existe porque la demo se muestra en una reunión, probablemente con datos
 * móviles. Mientras las fuentes se pedían a fonts.googleapis.com, un fallo de
 * red dibujaba el sitio entero en Arial y la identidad tipográfica desaparecía
 * — pasó de verdad en una corrida de la sesión 2. Ahora las fuentes son
 * propias, y esto lo prueba en vez de suponerlo.
 *
 * Se informan las peticiones bloqueadas: la lista tiene que quedar vacía.
 */
async function capturarOffline(browser, nombreVp) {
  const viewport = VIEWPORTS[nombreVp]
  const { ctx, page } = await nuevaPagina(browser, viewport)

  const bloqueadas = []
  await ctx.route('**/*', (route) => {
    const url = route.request().url()
    if (url.startsWith(BASE) || url.startsWith('data:') || url.startsWith('blob:')) {
      return route.continue()
    }
    bloqueadas.push(url)
    return route.abort()
  })

  await page.goto(BASE, { waitUntil: 'load' })
  await esperarFinDeIntro(page)

  // La misma medición que el pase normal. Si Archivo cargó con todo lo externo
  // cortado, es porque sale del propio origen.
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
      mono: medir("'Martian Mono', monospace"),
      fallback: medir('sans-serif'),
    }
  })

  console.log(
    `[shots] ${nombreVp} OFFLINE fuentes:`,
    JSON.stringify(fuentes),
    fuentes.archivo === fuentes.fallback ? '✗ ARCHIVO NO CARGÓ' : '✓',
  )
  console.log(
    `[shots] ${nombreVp} OFFLINE peticiones externas bloqueadas:`,
    bloqueadas.length === 0 ? 'ninguna ✓' : JSON.stringify(bloqueadas),
  )

  await shot(page, `${nombreVp}/00-offline-fullpage`, { fullPage: true })
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
    await capturarOffline(browser, 'desktop')
    await capturarOffline(browser, 'mobile')

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
