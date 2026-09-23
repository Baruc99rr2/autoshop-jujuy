/**
 * Las capturas del panel de carga, en 390 px.
 *
 * Va aparte del pase del sitio porque no es lo mismo: el sitio se mira, el
 * panel se USA. Acá no alcanza con cargar una ruta y sacar la foto; hay que
 * recorrer el camino entero de la dueña —crear, subir seis fotos, cambiar el
 * orden, borrar una, subir un video, escribir etiquetas, guardar y borrar la
 * unidad— porque cada uno de esos pasos tiene un estado propio que no se ve de
 * ninguna otra forma.
 *
 *   npm run shots -- --panel          # solo esto, con build
 *   npm run shots -- --panel --fast   # solo esto, reusando dist/
 *
 * Las fotos de prueba se DIBUJAN en un canvas de 2400x1600: hacen falta más
 * grandes que el tope de 1600 px para que la compresión del panel tenga algo
 * que hacer, y con ruido para que el WebP no las reduzca a nada y el peso que
 * se mide después sea de mentira.
 */
import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const VP = { width: 390, height: 844 }

/** Sesión abierta y datos de muestra limpios antes del primer render. */
const ARRANQUE = () => {
  try {
    localStorage.setItem(
      'autoshop.sesion.v1',
      JSON.stringify({ email: 'dueña@autoshopjujuy.com', desde: new Date().toISOString() }),
    )
  } catch {
    /* storage bloqueado */
  }
}

/** Dibuja `n` fotos de prueba y las devuelve como buffers PNG. */
async function fotosDePrueba(page, n) {
  const base64 = await page.evaluate((cantidad) => {
    const salida = []
    for (let i = 0; i < cantidad; i++) {
      const c = document.createElement('canvas')
      c.width = 2400
      c.height = 1600
      const ctx = c.getContext('2d')
      const tono = (i * 47) % 360
      ctx.fillStyle = `hsl(${tono} 45% 28%)`
      ctx.fillRect(0, 0, c.width, c.height)
      // Ruido grueso: sin esto el WebP la deja en 4 KB y el peso medido no
      // dice nada sobre lo que va a pasar con una foto de verdad.
      for (let k = 0; k < 9000; k++) {
        ctx.fillStyle = `hsl(${(tono + Math.random() * 90) | 0} ${
          30 + Math.random() * 50
        }% ${15 + Math.random() * 60}%)`
        ctx.fillRect(Math.random() * 2400, Math.random() * 1600, 40, 40)
      }
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 420px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(i + 1), 1200, 800)
      salida.push(c.toDataURL('image/png').split(',')[1])
    }
    return salida
  }, n)

  return base64.map((b64, i) => ({
    name: `IMG_${String(4120 + i)}.png`,
    mimeType: 'image/png',
    buffer: Buffer.from(b64, 'base64'),
  }))
}

/** Lo que pesa de verdad cada archivo guardado, leído de IndexedDB. */
function medirArchivos(page) {
  return page.evaluate(
    () =>
      new Promise((res) => {
        const p = indexedDB.open('autoshop-archivos', 1)
        p.onerror = () => res({ error: 'no abrió IndexedDB' })
        p.onsuccess = () => {
          const tx = p.result.transaction('blobs', 'readonly').objectStore('blobs')
          const claves = tx.getAllKeys()
          const valores = tx.getAll()
          valores.onsuccess = () => {
            res({
              archivos: claves.result.map((k, i) => ({
                clave: String(k).split('-')[0],
                tipo: valores.result[i]?.type,
                kb: Math.round((valores.result[i]?.size ?? 0) / 1024),
              })),
            })
          }
          valores.onerror = () => res({ error: 'no se pudo leer' })
        }
      }),
  )
}

/**
 * Desborde horizontal y botones más chicos que el dedo.
 *
 * Lo que está DENTRO de un carril que se scrollea de costado —la fila de
 * miniaturas de las etiquetas— no cuenta como desborde: sobresalir es
 * justamente lo que tiene que hacer. La primera versión de esta medición las
 * denunciaba a todas y el número dejaba de querer decir nada.
 *
 * Los 44 px se miden solo sobre CONTROLES: una `<label>` de texto arriba de un
 * campo no es un blanco táctil, y contarla tapaba los dos botones que sí están
 * por debajo del piso.
 */
function auditarPantalla(page) {
  return page.evaluate(() => {
    const doc = document.documentElement
    const enCarril = (n) => {
      for (let p = n.parentElement; p; p = p.parentElement) {
        const ox = getComputedStyle(p).overflowX
        if (ox === 'auto' || ox === 'scroll') return true
      }
      return false
    }

    // Se ordena por PROFUNDIDAD, del más hondo al más alto: los anchos de los
    // ancestros son consecuencia, y listarlos primero esconde al culpable.
    const hondura = (n) => {
      let d = 0
      for (let p = n.parentElement; p; p = p.parentElement) d++
      return d
    }
    const anchos = [...document.querySelectorAll('main *')]
      .filter((n) => !enCarril(n))
      .map((n) => ({ n, r: n.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && r.right > doc.clientWidth + 1)
      .sort((a, z) => hondura(z.n) - hondura(a.n))
      .slice(0, 6)
      .map(({ n, r }) => `${hondura(n)} ${n.tagName}.${String(n.className).slice(0, 40)} → ${Math.round(r.width)}w ${Math.round(r.right)}r`)

    const chicos = [
      ...document.querySelectorAll('main button, main a[href], main label[for], main [role=switch]'),
    ]
      .filter((n) => {
        const cs = getComputedStyle(n)
        if (cs.display === 'none' || cs.visibility === 'hidden') return false
        // Una `<label>` que solo nombra un campo no es un blanco: las del panel
        // que SÍ lo son envuelven un `<input type=file>` y están biseladas.
        if (n.tagName === 'LABEL' && !n.className.includes('bevel')) return false
        const r = n.getBoundingClientRect()
        return r.height > 0 && r.height < 44
      })
      .slice(0, 8)
      .map((n) => `${n.tagName} "${(n.textContent || '').trim().slice(0, 18)}" ${Math.round(n.getBoundingClientRect().height)}px`)

    const controles = document.querySelectorAll(
      'main button, main a[href], main label[for], main [role=switch]',
    ).length

    return {
      controlesMedidos: controles,
      scrollHorizontal: doc.scrollWidth > doc.clientWidth ? `${doc.scrollWidth} > ${doc.clientWidth}` : 'no ✓',
      desbordan: anchos.length ? anchos : 'ninguno ✓',
      bajoDe44px: chicos.length ? chicos : 'ninguno ✓',
    }
  })
}

/** Las fotos de la lista, ¿pintaron o quedó el alt? */
function auditarMiniaturas(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('.adm-foto img')].map((n) =>
      n.naturalWidth > 0 ? `${n.naturalWidth}x${n.naturalHeight} ✓` : '✗ NO CARGÓ',
    ),
  )
}

/**
 * El diálogo que está abierto. Se piden BOTONES por rol y no por texto:
 * `getByText` hace coincidencia parcial y SIN distinguir mayúsculas, así que
 * "BORRAR LA FOTO" también encontraba el titular «Vas a borrar la foto 03» y
 * el click se caía por ambigüedad.
 */
const boton = (page, nombre) =>
  page.locator('dialog[open]').getByRole('button', { name: nombre })

/** Espera a que la página deje de moverse de verdad, no un rato fijo. */
async function asentar(page, intentos = 30) {
  let anterior = null
  let quietos = 0
  for (let i = 0; i < intentos; i++) {
    const y = await page.evaluate(() => Math.round(window.scrollY))
    quietos = y === anterior ? quietos + 1 : 0
    anterior = y
    if (quietos >= 3) return y
    await page.waitForTimeout(100)
  }
  return anterior
}

/**
 * Centrar y recién después tocar.
 *
 * `main.tsx` arranca Lenis PARA TODO EL SITIO, panel incluido, y Lenis tiene
 * su propia idea de dónde está el scroll: pide un frame sí y otro también que
 * la página vuelva a su posición, así que un `scrollIntoView` se deshace solo.
 * Playwright medía el botón, la página se corría debajo, y el toque terminaba
 * cayendo en el borde de la tarjeta o en el hueco entre dos. Se leía como si
 * el botón no respondiera, y lo único que no respondía era el reloj.
 *
 * Por eso se scrollea como scrollea una persona —con la rueda, que es lo que
 * Lenis escucha— y se espera a que se detenga antes de tocar. Es más lento y
 * es lo único que mide lo que pasa de verdad.
 */
async function tocar(page, loc) {
  for (let i = 0; i < 6; i++) {
    const dy = await loc.evaluate((n) => {
      const r = n.getBoundingClientRect()
      return Math.round(r.top + r.height / 2 - window.innerHeight / 2)
    })
    if (Math.abs(dy) < 30) break
    await page.mouse.wheel(0, dy)
    await asentar(page)
  }
  await loc.click()
}

export async function capturarPanel(browser, BASE, shot) {
  const ctx = await browser.newContext({
    viewport: VP,
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'no-preference',
  })
  const page = await ctx.newPage()
  await page.addInitScript(ARRANQUE)
  const consola = []
  page.on('pageerror', (e) => consola.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') consola.push(`console: ${m.text().slice(0, 160)}`)
  })

  const foto = (n) => shot(page, `panel/${n}`)

  // ── 01 · El listado ──────────────────────────────────────────────────
  await page.goto(`${BASE}/admin`, { waitUntil: 'load' })
  await page.waitForSelector('main')
  await page.waitForTimeout(600)
  await foto('01-listado')

  // ── 02 · Alta ────────────────────────────────────────────────────────
  await page.goto(`${BASE}/admin/nuevo`, { waitUntil: 'load' })
  await page.waitForTimeout(500)
  await foto('02-nuevo-vacio')

  await page.getByLabel('TÍTULO').fill('Chevrolet Tracker Premier 2023')
  await page.getByLabel('PRECIO').fill('28500000')
  await page.getByLabel('AÑO').fill('2023')
  await page.getByLabel('KILÓMETROS').fill('31000')
  await page
    .getByLabel('DESCRIPCIÓN')
    .fill('Única dueña, service oficial al día, cubiertas nuevas. DATO DE PRUEBA.')
  await page.waitForTimeout(300)
  await foto('03-nuevo-cargado')

  await page.getByRole('button', { name: 'CREAR UNIDAD' }).click()
  await page.waitForURL(/\/admin\/editar\//, { timeout: 8000 })
  await page.waitForTimeout(700)
  await foto('04-creada-con-bloques')
  console.log('[panel] la unidad quedó en', page.url().replace(BASE, ''))

  // ── 05 · Seis fotos ──────────────────────────────────────────────────
  const entradaFotos = page.locator('input[type=file][accept="image/*"]')
  await entradaFotos.setInputFiles(await fotosDePrueba(page, 6))

  // La cola en movimiento dura lo que tarda el primer canvas: se busca el
  // primer render con una fila en vuelo en vez de dormir a ciegas.
  await page.waitForSelector('.adm-cola', { timeout: 10_000 }).catch(() => {})
  await page.waitForTimeout(150)
  await page.locator('.adm-cola').first().scrollIntoViewIfNeeded().catch(() => {})
  await foto('05-fotos-subiendo')

  await page
    .waitForFunction(() => document.querySelectorAll('.adm-foto').length === 6, null, {
      timeout: 60_000,
    })
    .catch(() => {})
  await page.waitForTimeout(500)
  await page.locator('.adm-foto').first().scrollIntoViewIfNeeded()
  await foto('06-seis-fotos')
  console.log('[panel] miniaturas:', JSON.stringify(await auditarMiniaturas(page)))
  console.log('[panel] archivos guardados:', JSON.stringify(await medirArchivos(page)))

  // ── 07 · Reordenar: la primera se va al segundo lugar ────────────────
  await tocar(page, page.getByLabel('Bajar la foto 1'))
  await page.waitForTimeout(600)
  await page.locator('.adm-foto').first().scrollIntoViewIfNeeded()
  await foto('07-reordenadas')

  // ── 08 · Borrar una foto ─────────────────────────────────────────────
  await tocar(page, page.locator('.adm-foto').nth(2).getByRole('button', { name: 'BORRAR' }))
  await page.waitForTimeout(400)
  await foto('08-borrar-foto-dialogo')
  await boton(page, 'BORRAR LA FOTO').click()
  await page
    .waitForFunction(() => document.querySelectorAll('.adm-foto').length === 5, null, {
      timeout: 10_000,
    })
    .catch(() => {})
  await page.waitForTimeout(400)
  await page.locator('.adm-foto').first().scrollIntoViewIfNeeded()
  await foto('09-cinco-fotos')

  // ── 10 · Un video que no entra ───────────────────────────────────────
  // Por RUTA y no por buffer: un archivo de 48 MB en el mensaje del protocolo
  // hace que `setInputFiles` se quede esperando hasta el timeout. Con una ruta
  // local, el navegador lo abre él mismo y no viaja nada.
  const temp = await mkdtemp(path.join(os.tmpdir(), 'autoshop-panel-'))
  const pesado = path.join(temp, 'recorrida-larga.mp4')
  await writeFile(pesado, Buffer.alloc(48 * 1024 * 1024))

  const entradaVideo = page.locator('input[type=file][accept*="video"]')
  await entradaVideo.setInputFiles(pesado)
  await page.waitForTimeout(600)
  await page.getByText('SUBIR UN VIDEO').first().scrollIntoViewIfNeeded()
  await foto('10-video-demasiado-pesado')

  // ── 11 · Uno que sí ──────────────────────────────────────────────────
  await entradaVideo.setInputFiles(path.resolve('public/video/hero-desktop.mp4'))
  await page.waitForSelector('.adm-video', { timeout: 30_000 }).catch(() => {})
  await page.waitForTimeout(900)
  await page.locator('.adm-video').scrollIntoViewIfNeeded().catch(() => {})
  await foto('11-video-cargado')
  console.log(
    '[panel] póster del video:',
    await page
      .locator('.adm-video video')
      .evaluate((v) => (v.poster.startsWith('blob:') ? 'cuadro propio ✓' : v.poster))
      .catch(() => 'sin video'),
  )

  // ── 12 · Etiquetas ───────────────────────────────────────────────────
  await tocar(page, page.getByRole('button', { name: '+ MOTOR' }))
  await tocar(page, page.getByRole('button', { name: '+ TRANSMISIÓN' }))
  await tocar(page, page.getByRole('button', { name: '+ KILOMETRAJE' }))
  await page.waitForTimeout(400)
  await page.locator('.adm-etq').first().scrollIntoViewIfNeeded()
  await foto('12-etiquetas-de-un-toque')

  const primera = page.locator('.adm-etq').first()
  await primera.locator('textarea').fill('1.2 turbo nafta, 132 CV')
  await tocar(page, primera.getByLabel('Foto 2'))
  await page.locator('.adm-etq').nth(1).locator('textarea').fill('Automática de 6 marchas')
  await page.waitForTimeout(400)
  await primera.scrollIntoViewIfNeeded()
  await foto('13-etiquetas-escritas')

  // Reordenar etiquetas: la tercera sube al segundo lugar.
  await tocar(page, page.getByLabel('Subir la etiqueta 3'))
  await page.waitForTimeout(400)
  await foto('14-etiquetas-reordenadas')

  // Desde arriba y con la página quieta: medida a mitad de scroll, la lista de
  // controles por debajo de los 44 px cambiaba de una corrida a la otra, y una
  // medición que no repite no sirve para decidir nada.
  await page.evaluate(() => window.scrollTo(0, 0))
  await asentar(page)
  console.log('[panel] pantalla:', JSON.stringify(await auditarPantalla(page), null, 1))

  // ── 15 · Guardar ─────────────────────────────────────────────────────
  await tocar(page, page.getByRole('button', { name: 'GUARDAR CAMBIOS' }))
  await page.waitForTimeout(900)
  await foto('15-guardado')
  await shot(page, 'panel/16-formulario-entero', { fullPage: true })

  // ── 17 · Lo que quedó publicado ──────────────────────────────────────
  await page.goto(`${BASE}/admin`, { waitUntil: 'load' })
  await page.waitForTimeout(800)
  await foto('17-listado-con-la-unidad')

  // ── 18 · Borrar la unidad ────────────────────────────────────────────
  await page.goBack()
  await page.waitForTimeout(700)
  await tocar(page, page.getByRole('button', { name: 'ELIMINAR ESTA UNIDAD' }))
  await page.waitForTimeout(500)
  await foto('18-borrar-unidad-dialogo')
  await boton(page, 'BORRAR LA UNIDAD').click()
  await page.waitForURL(/\/admin$/, { timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(800)
  await foto('19-listado-final')
  console.log(
    '[panel] archivos tras borrar la unidad:',
    JSON.stringify(await medirArchivos(page)),
  )

  console.log(
    '[panel] errores de consola:',
    consola.length === 0 ? 'ninguno ✓' : JSON.stringify(consola.slice(0, 6)),
  )

  await ctx.close()
}
