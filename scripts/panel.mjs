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
 *   npm run shots -- --panel --fast   # solo esto, reusando dist-mock/
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

  await capturarContenido(browser, page, BASE, shot)

  console.log(
    '[panel] errores de consola:',
    consola.length === 0 ? 'ninguno ✓' : JSON.stringify(consola.slice(0, 6)),
  )

  await ctx.close()
}

/**
 * «Contenido del sitio», y lo que produce en el inicio.
 *
 * Se lleva a propósito a los dos bordes que pidió el encargo: la lista de
 * servicios a NUEVE (tres filas llenas en la compu) más una fila vacía que
 * tiene que descartarse sola, y las preguntas a CERO, que tiene que sacar la
 * sección del inicio, su link del footer y correr el número de Contacto.
 */
async function capturarContenido(browser, page, BASE, shot) {
  const foto = (n, o) => shot(page, `panel/${n}`, o)
  const bloque = (t) =>
    page
      .locator('main section')
      .filter({ has: page.getByRole('heading', { name: t, exact: true }) })

  // ── 20 · La pantalla ─────────────────────────────────────────────────
  await page.goto(`${BASE}/admin/contenido`, { waitUntil: 'load' })
  await page.waitForSelector('text=GUARDAR LOS NÚMEROS')
  await page.waitForTimeout(500)
  await foto('20-contenido-arriba')

  // ── 21 · Números: primero con un error, después bien ─────────────────
  const numeros = bloque('NÚMEROS')
  await numeros.getByLabel('CIFRA').first().fill('650')
  await numeros.getByLabel('AÑO DE APERTURA').fill('2022')
  await numeros.getByLabel('TEXTO').nth(1).fill('')
  await tocar(page, numeros.getByRole('button', { name: 'GUARDAR LOS NÚMEROS' }))
  await asentar(page)
  await foto('21-numeros-con-error')
  await numeros.getByLabel('TEXTO').nth(1).fill('Marcas en el salón')
  await tocar(page, numeros.getByRole('button', { name: 'GUARDAR LOS NÚMEROS' }))
  await page.waitForTimeout(400)
  await foto('22-numeros-guardados')

  // ── 23 · Servicios: precio nuevo, cinco altas y una vacía ────────────
  const servicios = bloque('SERVICIOS')
  await servicios.getByLabel('PRECIO').nth(1).fill('38000')
  const nuevos = [
    ['Alineación y balanceo', 'Llave', '45000', 'Con turno previo'],
    ['Gestoría del 08', 'Escudo', '', 'Transferencia y patentamiento'],
    ['Polarizado de vidrios', 'Pulverizador', '90000', ''],
    ['Tasación de tu usado', 'Escáner', '', 'Sin cargo'],
    ['Lavado premium', 'Pulverizador', '30000', 'Reservá tu turno'],
  ]
  for (const [titulo, icono, precio, detalle] of nuevos) {
    await tocar(page, servicios.getByRole('button', { name: 'AGREGAR UN SERVICIO' }))
    await page.waitForTimeout(200)
    const fila = servicios.locator('li').last()
    await fila.getByLabel('TÍTULO').fill(titulo)
    await tocar(page, fila.getByRole('radio', { name: icono, exact: true }))
    if (precio) await fila.getByLabel('PRECIO').fill(precio)
    if (detalle) await fila.getByLabel('DETALLE').fill(detalle)
  }
  // La que se agrega y no se llena: al guardar tiene que desaparecer sola.
  await tocar(page, servicios.getByRole('button', { name: 'AGREGAR UN SERVICIO' }))
  await page.waitForTimeout(300)
  await foto('23-servicio-nuevo-enfocado')
  console.log(
    '[panel] foco tras agregar:',
    await page.evaluate(() => document.activeElement?.closest('li') ? `${document.activeElement.tagName} en la fila nueva ✓` : '✗ el foco no fue a la fila nueva'),
  )

  // Medida con la lista en su punto más largo y desde arriba, quieta.
  await page.evaluate(() => window.scrollTo(0, 0))
  await asentar(page)
  console.log('[panel] contenido:', JSON.stringify(await auditarPantalla(page), null, 1))

  // ── 24 · Reordenar y borrar ──────────────────────────────────────────
  await tocar(page, page.getByLabel('Subir el servicio 10'))
  await tocar(page, servicios.locator('li').nth(2).getByRole('button', { name: 'BORRAR' }))
  await page.waitForTimeout(400)
  await foto('24-borrar-servicio-dialogo')
  await boton(page, 'BORRAR EL SERVICIO').click()
  await page.waitForTimeout(300)
  await tocar(page, servicios.getByRole('button', { name: 'GUARDAR LOS SERVICIOS' }))
  await page.waitForTimeout(400)
  await foto('25-servicios-guardados')
  console.log(
    '[panel] servicios tras guardar:',
    await servicios.locator('li').count(),
    '(esperado 9: 5 + 5 − 1, y la vacía descartada)',
  )

  // ── 26 · Cero preguntas ──────────────────────────────────────────────
  const preguntas = bloque('PREGUNTAS FRECUENTES')
  for (let i = 0; i < 6; i++) {
    await tocar(page, preguntas.locator('li').first().getByRole('button', { name: 'BORRAR' }))
    await page.waitForTimeout(250)
    await boton(page, 'BORRAR LA PREGUNTA').click()
    await page.waitForTimeout(250)
  }
  await tocar(page, preguntas.getByRole('button', { name: 'GUARDAR LAS PREGUNTAS' }))
  await page.waitForTimeout(400)
  await foto('26-sin-preguntas')
  await foto('27-contenido-entero', { fullPage: true })

  // ── 28 · El inicio con lo guardado ───────────────────────────────────
  const guardado = await page.evaluate(() => localStorage.getItem('autoshop.contenido.v1'))
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('intro-seen', '1')
    } catch {
      /* storage bloqueado */
    }
  })

  const mirarInicio = async (p, nombre) => {
    await p.goto(`${BASE}/`, { waitUntil: 'load' })
    await p.waitForTimeout(900)
    const datos = await p.evaluate(() => ({
      tiles: document.querySelectorAll('#postventa li').length,
      hayPreguntas: Boolean(document.getElementById('preguntas')),
      cifras: [...document.querySelectorAll('#contadores [data-cifra]')].map((n) => n.dataset.cifra),
      indiceContacto: document.getElementById('contacto')?.textContent.match(/\b0\d\b/)?.[0],
      linkAPreguntas: [...document.querySelectorAll('a')].some((a) => a.getAttribute('href') === '#preguntas'),
      scrollHorizontal: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      // Tiles que se salen de su columna o títulos que se salen del tile.
      desbordan: [...document.querySelectorAll('#postventa li')].filter((li) => {
        const r = li.getBoundingClientRect()
        const h = li.querySelector('h3')
        return r.right > document.documentElement.clientWidth || (h && h.scrollWidth > h.clientWidth + 1)
      }).length,
    }))
    console.log(`[panel] inicio ${nombre}:`, JSON.stringify(datos))
    const lista = p.locator('#postventa ul')
    await lista.scrollIntoViewIfNeeded()
    await asentar(p)
    await lista.screenshot({ path: `docs/shots/panel/${nombre}-servicios.png` })
  }

  await mirarInicio(page, '28-inicio-390')

  const escritorio = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  })
  const pc = await escritorio.newPage()
  await pc.addInitScript((d) => {
    try {
      localStorage.setItem('autoshop.contenido.v1', d)
      sessionStorage.setItem('intro-seen', '1')
    } catch {
      /* storage bloqueado */
    }
  }, guardado)
  await mirarInicio(pc, '29-inicio-1440')
  await escritorio.close()
}
