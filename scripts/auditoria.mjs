/**
 * AUDITORÍA DE LA FASE L.
 *
 * Tres pases que no sacan capturas bonitas sino números:
 *
 *  1. Cinco anchos, buscando desborde horizontal y elementos que toquen el
 *     borde. El desborde es lo único que rompe un sitio en un celular real de
 *     forma irreversible: aparece una barra horizontal y todo el layout se
 *     corre.
 *  2. `prefers-reduced-motion`, recorriendo el sitio entero con el flag puesto
 *     y comprobando que el CONTENIDO siga estando: la intro salteada pero el
 *     logo en el header, los contadores en su valor final, el ticker quieto
 *     pero legible.
 *  3. Teclado: Tab desde el principio, anotando la secuencia de foco y si el
 *     anillo se ve de verdad.
 */

/** Anchos probados. 360 es el piso declarado en el piso de calidad. */
export const ANCHOS = [
  { w: 360, h: 800 },
  { w: 390, h: 844 },
  { w: 768, h: 1024 },
  { w: 1024, h: 768 },
  { w: 1440, h: 900 },
]

export async function auditarAnchos(browser, BASE, shot, nuevaPagina, esperarFinDeIntro) {
  for (const { w, h } of ANCHOS) {
    const { ctx, page } = await nuevaPagina(browser, { width: w, height: h })
    await page.goto(BASE, { waitUntil: 'load' })
    await esperarFinDeIntro(page)

    // Se recorre la página entera antes de medir: hay secciones que solo
    // montan su contenido al entrar en viewport, y el desborde de una card que
    // todavía no se dibujó no lo ve nadie.
    await page.evaluate(async () => {
      const paso = window.innerHeight * 0.8
      for (let y = 0; y < document.body.scrollHeight; y += paso) {
        window.scrollTo({ top: y, behavior: 'instant' })
        await new Promise((r) => setTimeout(r, 120))
      }
      window.scrollTo({ top: 0, behavior: 'instant' })
    })
    await page.waitForTimeout(600)

    const medida = await page.evaluate(() => {
      const clip = (el) => {
        for (let p = el.parentElement; p; p = p.parentElement) {
          const ov = getComputedStyle(p).overflowX
          if (ov === 'hidden' || ov === 'clip' || ov === 'auto' || ov === 'scroll') return true
        }
        return false
      }
      const todos = [...document.querySelectorAll('body *')]
      const desborda = todos
        .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
        .filter((el) => !clip(el))
      // "Al filo": entra, pero sin un solo píxel de aire. Es el caso que el
      // chequeo de desborde no agarra y que en pantalla se lee como error.
      const alFilo = todos
        .filter((el) => {
          const r = el.getBoundingClientRect()
          const d = window.innerWidth - r.right
          return r.width > 40 && d >= -1 && d < 4 && !clip(el)
        })
        .slice(0, 6)
        .map((el) => `${el.tagName.toLowerCase()}.${el.className}`.slice(0, 70))

      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        desborde: desborda.slice(0, 6).map((el) =>
          `${el.tagName.toLowerCase()}.${el.className}`.slice(0, 70),
        ),
        alFilo,
      }
    })

    const ok = medida.scrollWidth === medida.clientWidth && medida.desborde.length === 0
    console.log(
      `[shots] ancho ${w}:`,
      ok ? 'sin desborde ✓' : '✗ DESBORDA',
      JSON.stringify(medida),
    )

    await shot(page, `audit/ancho-${w}`, { fullPage: false })
    await ctx.close()
  }
}

export async function auditarReducedMotion(browser, BASE, shot) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    try {
      sessionStorage.clear()
    } catch {
      /* storage bloqueado */
    }
  })
  await page.goto(BASE, { waitUntil: 'load' })
  await page.waitForTimeout(1200)

  // Con reduced-motion la intro NO corre: el logo tiene que estar ya en el
  // header y el hero visible desde el primer frame.
  const arranque = await page.evaluate(() => ({
    introEnPantalla: Boolean(document.querySelector('[data-intro]')),
    logoDelHeader: Boolean(document.querySelector('#header-logo')),
    heroVisible: (document.querySelector('#hero')?.getBoundingClientRect().top ?? 99) < 10,
  }))
  console.log('[shots] reduced-motion arranque:', JSON.stringify(arranque))
  await shot(page, 'audit/rm-01-hero')

  // Recorrido completo, sección por sección. Lo que se comprueba en cada una
  // es que el contenido ESTÉ, no que se mueva.
  const ids = await page.$$eval('main section[id]', (ns) => ns.map((n) => n.id))
  for (const id of ids) {
    await page.evaluate((s) => {
      document.getElementById(s)?.scrollIntoView({ behavior: 'instant', block: 'start' })
    }, id)
    await page.waitForTimeout(500)
    await shot(page, `audit/rm-${id}`)
  }

  const contenido = await page.evaluate(() => {
    const num = (sel) => [...document.querySelectorAll(sel)].map((n) => n.textContent?.trim())
    return {
      // Los contadores tienen que estar en su valor final, no en 0.
      contadores: num('#contadores .num'),
      // El ticker quieto pero con su texto.
      tickerTexto: document.querySelector('#hero .font-hud')?.textContent?.trim().slice(0, 30),
      // El carrusel sin pin: las cuatro imágenes tienen que ser alcanzables.
      segmentosVisibles: [...document.querySelectorAll('#segmentos img')].filter(
        (n) => n.getBoundingClientRect().width > 0,
      ).length,
    }
  })
  console.log('[shots] reduced-motion contenido:', JSON.stringify(contenido))

  await ctx.close()
}

/**
 * Pase TÁCTIL: contexto con `hasTouch`, que en Chromium pone
 * `(hover: none)` y `(pointer: coarse)`.
 *
 * Lo que hay que comprobar no es que el hover no pase —eso ya se sabe— sino
 * que NO QUEDE CONTENIDO INACCESIBLE por depender de él. Cada cosa del sitio
 * que responde al hover tiene que tener una salida sin puntero, y acá se
 * verifica una por una.
 */
export async function auditarTactil(browser, BASE, shot) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
  })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('intro-seen', '1')
    } catch {
      /* storage bloqueado */
    }
  })
  await page.goto(BASE, { waitUntil: 'load' })
  await page.waitForTimeout(1200)

  const medios = await page.evaluate(() => ({
    hoverNone: matchMedia('(hover: none)').matches,
    punteroGrueso: matchMedia('(pointer: coarse)').matches,
  }))

  // Recorrido para que todo se monte y los observadores disparen.
  await page.evaluate(async () => {
    const paso = window.innerHeight * 0.8
    for (let y = 0; y < document.body.scrollHeight; y += paso) {
      window.scrollTo({ top: y, behavior: 'instant' })
      await new Promise((r) => setTimeout(r, 150))
    }
  })
  await page.waitForTimeout(400)

  // Marcas se enciende por la línea CENTRAL del viewport, así que hay que
  // estar parado sobre la sección para medirlo: leerlo desde el pie de la
  // página da siempre `null` y parece que la función no anda.
  await page.evaluate(() => {
    document.getElementById('marcas')?.scrollIntoView({ behavior: 'instant', block: 'center' })
  })
  await page.waitForTimeout(700)

  const accesible = await page.evaluate(() => {
    const vis = (el) => {
      if (!el) return false
      const cs = getComputedStyle(el)
      return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05
    }
    return {
      // Catálogo: la foto BASE tiene que verse siempre. El recorte de detalle
      // es decorativo y puede no existir sin puntero.
      fotoBaseVisible: vis(document.querySelector('#vehiculos .veh-card img')),
      // Marcas: se encienden por scroll, no por hover (decisión 34).
      marcaEncendida:
        document.querySelector('#marcas [data-encendida="true"]')?.textContent ?? null,
      // Segmentos: sin pin, riel horizontal con las cuatro cards.
      segmentosCards: document.querySelectorAll('#segmentos .seg-card').length,
      // Post-venta: cada tile es un <a> real, así que el tap lleva a algún lado.
      tilesConEnlace: [...document.querySelectorAll('#postventa .tile-host')].filter(
        (n) => n.tagName === 'A' && n.getAttribute('href'),
      ).length,
      // El botón flotante colapsado y el MENU, los dos alcanzables con el dedo.
      anchoWhatsApp: Math.round(
        document.querySelector('.wa-btn')?.getBoundingClientRect().width ?? 0,
      ),
      anchoMenu: Math.round(
        document.querySelector('.menu-btn')?.getBoundingClientRect().width ?? 0,
      ),
    }
  })

  // La FAQ tiene que abrirse con un tap, no con hover.
  await page.evaluate(() => {
    document.getElementById('preguntas')?.scrollIntoView({ behavior: 'instant', block: 'start' })
  })
  await page.waitForTimeout(600)
  // Se comprueba que el tap CAMBIE el estado, no que lo deje en `true`.
  // La FAQ arranca con la primera pregunta abierta, así que el primer tap la
  // cierra: leer "false" y concluir que el tap no funciona fue exactamente el
  // error que cometió la primera versión de esta comprobación.
  const leerFaq = () =>
    page.evaluate(() => document.querySelector('#preguntas .faq-item')?.dataset.open)

  const antes = await leerFaq()
  await page.locator('#preguntas .faq-button').first().tap()
  await page.waitForTimeout(700)
  const despues = await leerFaq()
  const faqAbierta =
    antes !== despues
      ? `responde al tap ✓ (${antes} → ${despues})`
      : `✗ EL TAP NO CAMBIA NADA (${antes})`

  console.log('[shots] táctil medios:', JSON.stringify(medios))
  console.log(
    '[shots] táctil accesible:',
    JSON.stringify({ ...accesible, faqAbreConTap: faqAbierta }),
  )

  await page.evaluate(() => {
    document.getElementById('vehiculos')?.scrollIntoView({ behavior: 'instant', block: 'start' })
  })
  await page.waitForTimeout(500)
  await shot(page, 'audit/tactil-catalogo')
  await ctx.close()
}

export async function auditarTeclado(browser, BASE, shot, nuevaPagina, esperarFinDeIntro) {
  const { ctx, page } = await nuevaPagina(browser, { width: 1440, height: 900 })
  await page.goto(BASE, { waitUntil: 'load' })
  await esperarFinDeIntro(page)

  const recorrido = []
  let sinAnillo = 0
  for (let i = 0; i < 40; i += 1) {
    await page.keyboard.press('Tab')
    const paso = await page.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body) return null
      const cs = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      return {
        que: `${el.tagName.toLowerCase()}:${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 22)}`,
        // El anillo del sitio se dibuja con outline en unos lados y con
        // drop-shadow adentro de las formas biseladas (decisión 11), así que
        // se aceptan los dos.
        anillo:
          (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) ||
          cs.filter.includes('drop-shadow') ||
          cs.boxShadow !== 'none',
        enPantalla: r.top > -5 && r.bottom < window.innerHeight + 5,
      }
    })
    if (!paso) break
    if (!paso.anillo) sinAnillo += 1
    recorrido.push(paso.que)
  }
  console.log(`[shots] teclado — ${recorrido.length} paradas, ${sinAnillo} sin anillo visible`)
  console.log('[shots] teclado recorrido:', JSON.stringify(recorrido.slice(0, 24)))

  // Una captura con el foco puesto en un botón biselado, para mirar el anillo.
  await shot(page, 'audit/teclado-foco')
  await ctx.close()
}

/**
 * Pase de LA BARRA DEL NAVEGADOR.
 *
 * Reproduce lo que hace el navegador interno de WhatsApp en Android: la barra
 * superior se contrae y se expande al scrollear, y en cada movimiento cambia
 * SOLO el alto del viewport. Si algo del sitio recalcula layout ahí, la página
 * entera se empuja hacia abajo y vuelve.
 *
 * El pase va con `hasTouch`, que es la condición que mira
 * `ScrollTrigger.config({ ignoreMobileResize: true })` para saber si tiene que
 * ignorar el resize: sin táctil, ScrollTrigger refresca igual y la prueba no
 * mide lo que pasa en un teléfono.
 *
 * Se mide, en tres puntos distintos de la página:
 *   - cuánto se movió la POSICIÓN DE SCROLL,
 *   - cuánto cambió el ALTO DEL DOCUMENTO,
 *   - cuánto se movió un elemento de referencia respecto del documento.
 *
 * Los tres tienen que quedar en cero. El alto del documento es el más
 * revelador: si cambia, es que un pin-spacer se recalculó.
 */
export async function auditarBarraDelNavegador(browser, BASE, esperarFinDeIntro) {
  const ALTO_NORMAL = 844
  const ALTO_CONTRAIDO = 780 // ~64 px de barra, lo que mide la de WhatsApp

  const ctx = await browser.newContext({
    viewport: { width: 390, height: ALTO_NORMAL },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
  })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('intro-seen', '1')
    } catch {
      /* storage bloqueado */
    }
  })
  await page.goto(BASE, { waitUntil: 'load' })
  await esperarFinDeIntro(page)
  await page.waitForTimeout(800)

  // Tres paradas: antes del carrusel pinneado, dentro de él, y después.
  const paradas = ['contadores', 'segmentos', 'contacto']
  const resultados = []

  for (const id of paradas) {
    await page.evaluate((s) => {
      document.getElementById(s)?.scrollIntoView({ behavior: 'instant', block: 'start' })
    }, id)
    await page.waitForTimeout(900)

    const leer = (s) => {
      const el = document.getElementById(s)
      const st = window.__segST
      return {
        scrollY: Math.round(window.scrollY),
        altoDoc: document.documentElement.scrollHeight,
        // Posición del elemento en el DOCUMENTO, no en el viewport: la del
        // viewport cambia legítimamente al cambiar el alto de la ventana.
        topEnDoc: Math.round(el.getBoundingClientRect().top + window.scrollY),
        // El largo del pin del carrusel: es lo que ScrollTrigger recalcula si
        // refresca, y lo que hace crecer o encoger el documento entero.
        largoPin: st ? Math.round(st.end - st.start) : null,
      }
    }
    const antes = await page.evaluate(leer, id)

    // La barra se contrae…
    await page.setViewportSize({ width: 390, height: ALTO_CONTRAIDO })
    await page.waitForTimeout(700)
    // …y se vuelve a desplegar.
    await page.setViewportSize({ width: 390, height: ALTO_NORMAL })
    await page.waitForTimeout(700)

    const despues = await page.evaluate(leer, id)

    resultados.push({
      en: id,
      scrollY: despues.scrollY - antes.scrollY,
      altoDoc: despues.altoDoc - antes.altoDoc,
      topEnDoc: despues.topEnDoc - antes.topEnDoc,
      largoPin:
        antes.largoPin === null ? null : despues.largoPin - antes.largoPin,
    })
  }

  const quieto = resultados.every(
    (r) =>
      r.scrollY === 0 &&
      r.altoDoc === 0 &&
      r.topEnDoc === 0 &&
      (r.largoPin === null || r.largoPin === 0),
  )
  console.log(
    '[shots] barra del navegador:',
    quieto ? 'la página no se mueve ✓' : '✗ LA PÁGINA SE MUEVE',
    JSON.stringify(resultados),
  )

  await ctx.close()
  return quieto
}
