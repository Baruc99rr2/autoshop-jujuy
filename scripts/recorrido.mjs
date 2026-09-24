/**
 * El recorrido completo CONTRA SUPABASE DE VERDAD.
 *
 *   npm run recorrido            # build (modo Supabase) + recorrido
 *   npm run recorrido -- --fast  # reusa dist/
 *
 * A diferencia de `npm run shots` —que va siempre contra el mock— esto
 * escribe en la base y en el bucket de producción: crea una unidad de prueba,
 * le sube fotos y video, la publica, la mira como visitante, la despublica,
 * la borra, y comprueba que no quedó ni un archivo. Si algo falla a la mitad,
 * al final igual se borra lo que haya creado.
 *
 * Además mide lo que NO se ve si está mal: que un borrador no se pueda leer
 * sin sesión ni conociendo su id, y que cada pantalla que carga tenga su
 * cartel de error con "probar de nuevo" cuando la red se corta.
 *
 * Capturas en docs/shots/recorrido/. Entra con la cuenta de prueba de
 * `.env.local` (ver `entorno.mjs`).
 */
import { execSync, spawn } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright'
import { clienteAdmin, clienteAnonimo, leerEntorno } from './entorno.mjs'

const OUT = path.resolve('docs/shots/recorrido')
const PORT = 4319
const BASE = `http://127.0.0.1:${PORT}`
const FAST = process.argv.includes('--fast')
const MOVIL = { width: 390, height: 844 }
const BUCKET = 'vehiculos'

const env = leerEntorno()
const admin = await clienteAdmin(env)
const anonimo = clienteAnonimo(env)

// ── Resultado ─────────────────────────────────────────────────────────────

let bien = 0
const males = []
function chequear(nombre, ok, detalle = '') {
  if (ok) {
    bien++
    console.log(`  ok   ${nombre}${detalle ? ` — ${detalle}` : ''}`)
  } else {
    males.push(nombre)
    console.log(`  MAL  ${nombre}${detalle ? ` — ${detalle}` : ''}`)
  }
}

// ── Servidor ──────────────────────────────────────────────────────────────

function correr(cmd, args) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' })
    p.on('exit', (c) => (c === 0 ? res() : rej(new Error(`${cmd} salió con ${c}`))))
  })
}

async function esperarServidor() {
  const limite = Date.now() + 30_000
  while (Date.now() < limite) {
    try {
      if ((await fetch(BASE)).ok) return
    } catch {
      /* todavía no */
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('El preview no levantó')
}

// ── Ayudas del navegador ──────────────────────────────────────────────────

const shot = (page, nombre, opts = {}) =>
  page.screenshot({ path: path.join(OUT, `${nombre}.png`), ...opts })

async function contexto(browser, viewport = MOVIL) {
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    hasTouch: viewport.width < 800,
    isMobile: viewport.width < 800,
  })
  const page = await ctx.newPage()
  const errores = []
  page.on('pageerror', (e) => errores.push(e.message))
  return { ctx, page, errores }
}

/** Lo mismo que en panel.mjs: Lenis deshace los scrollIntoView. */
async function tocar(page, loc) {
  for (let i = 0; i < 6; i++) {
    const dy = await loc.evaluate((n) => {
      const r = n.getBoundingClientRect()
      return Math.round(r.top + r.height / 2 - window.innerHeight / 2)
    })
    if (Math.abs(dy) < 30) break
    await page.mouse.wheel(0, dy)
    await page.waitForTimeout(350)
  }
  await loc.click()
}

/**
 * El "GUARDADO" que se ve: hay dos (uno al lado del botón en la compu y otro
 * abajo en el celular) y el de la compu está oculto a 390 px.
 */
const guardado = (page) => page.getByText('GUARDADO', { exact: true }).filter({ visible: true })

/** Espera a que las imágenes del selector que están en pantalla terminen de bajar. */
async function esperarImagenes(page, selector) {
  await page
    .waitForFunction(
      (sel) => {
        const enPantalla = [...document.querySelectorAll(sel)].filter((i) => {
          const r = i.getBoundingClientRect()
          // Por el CENTRO: la diapositiva siguiente del carrusel asoma un píxel
          // por el borde pero la recorta el carril, y con `lazy` no baja.
          const cx = r.left + r.width / 2
          const cy = r.top + r.height / 2
          return r.width > 0 && cx > 0 && cx < innerWidth && cy > 0 && cy < innerHeight
        })
        return enPantalla.length > 0 && enPantalla.every((i) => i.complete && i.naturalWidth > 0)
      },
      selector,
      { timeout: 30_000 },
    )
    .catch(() => {})
}

/** ¿Todas las imágenes visibles de la página cargaron de verdad? */
function imagenes(page, selector = 'main img') {
  return page.$$eval(selector, (imgs) =>
    imgs.map((i) => ({ src: i.currentSrc || i.src, ok: i.complete && i.naturalWidth > 0 })),
  )
}

async function archivosEnCarpeta(id) {
  const { data, error } = await admin.storage.from(BUCKET).list(id, { limit: 1000 })
  if (error) throw error
  return (data ?? []).map((o) => o.name)
}

/** Corta la red hacia Supabase (no el sitio): así se ve el cartel de error. */
const cortarRed = (page) =>
  page.route(`${env.url}/**`, (r) => r.abort('internetdisconnected'))
const volverRed = (page) => page.unroute(`${env.url}/**`)

/**
 * Lo que haya quedado de una corrida anterior que se cortó sin llegar a su
 * `finally` (un error de Playwright puede tirar el proceso entero). Se
 * reconocen por el título, que ninguna unidad real va a tener.
 */
async function barrerRestos() {
  const { data } = await admin
    .from('vehiculos')
    .select('id')
    .like('titulo', 'Prueba del recorrido %')
  for (const { id } of data ?? []) {
    const archivos = await archivosEnCarpeta(id).catch(() => [])
    await admin.from('vehiculos').delete().eq('id', id)
    if (archivos.length) await admin.storage.from(BUCKET).remove(archivos.map((a) => `${id}/${a}`))
    console.log(`(se barrió una unidad de prueba vieja: ${id}, ${archivos.length} archivos)`)
  }
}

// ── Recorrido ─────────────────────────────────────────────────────────────

async function main() {
  await barrerRestos()
  await rm(OUT, { recursive: true, force: true })
  await mkdir(OUT, { recursive: true })
  if (!FAST) await correr('npm', ['run', 'build'])

  const server = spawn(
    'npx',
    ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'],
    { stdio: 'ignore', shell: process.platform === 'win32' },
  )
  const browser = await chromium.launch()
  let idPrueba = null

  try {
    await esperarServidor()

    // ── 1. Borrador sin sesión ───────────────────────────────────────────
    console.log('\n1 · Un borrador, sin sesión')
    const { data: borrador } = await admin
      .from('vehiculos')
      .select('id, slug, fotos(id)')
      .eq('publicado', false)
      .limit(1)
      .maybeSingle()
    if (!borrador) {
      chequear('hay un borrador para probar (npm run semilla -- subir)', false)
    } else {
      const fotoId = borrador.fotos[0]?.id ?? 'sin-fotos'
      const pedidos = {
        'por id': anonimo.from('vehiculos').select('*').eq('id', borrador.id),
        'por slug': anonimo.from('vehiculos').select('*').eq('slug', borrador.slug),
        'sus fotos': anonimo.from('fotos').select('*').eq('vehiculo_id', borrador.id),
        'una foto por id': anonimo.from('fotos').select('*').eq('id', fotoId),
        'sus etiquetas': anonimo.from('etiquetas').select('*').eq('vehiculo_id', borrador.id),
        'su video': anonimo.from('videos').select('*').eq('vehiculo_id', borrador.id),
        'todos los no publicados': anonimo.from('vehiculos').select('id').eq('publicado', false),
      }
      for (const [nombre, q] of Object.entries(pedidos)) {
        const { data, error } = await q
        chequear(`API sin sesión, ${nombre}: nada`, !error && data.length === 0, error?.message ?? `${data.length} filas`)
      }

      // Y desde un navegador de verdad, con la clave pública del sitio.
      const { ctx, page } = await contexto(browser)
      await page.goto(`${BASE}/vehiculo/${borrador.slug}`)
      await page.getByText('Esta página no existe').waitFor({ timeout: 15_000 }).catch(() => {})
      chequear(
        'la ficha del borrador da 404 en el navegador',
        await page.getByText('Esta página no existe').isVisible(),
      )
      const desdeElNavegador = await page.evaluate(
        async ({ url, clave, id }) => {
          const r = await fetch(`${url}/rest/v1/vehiculos?id=eq.${id}&select=*,fotos(*)`, {
            headers: { apikey: clave },
          })
          return r.json()
        },
        { url: env.url, clave: env.clave, id: borrador.id },
      )
      chequear(
        'fetch desde el navegador al borrador por id: []',
        Array.isArray(desdeElNavegador) && desdeElNavegador.length === 0,
        JSON.stringify(desdeElNavegador).slice(0, 80),
      )
      await shot(page, '01-borrador-sin-sesion')
      await ctx.close()
    }

    // ── 2. Login ─────────────────────────────────────────────────────────
    console.log('\n2 · Login')
    const panel = await contexto(browser)
    const p = panel.page
    await p.goto(`${BASE}/admin`)
    await p.waitForURL(/\/admin\/login/, { timeout: 15_000 })
    await p.getByLabel('EMAIL').waitFor()
    chequear('sin el cartel de acceso de prueba', !(await p.getByText('ACCESO DE PRUEBA').count()))
    await shot(p, '02-login')

    await p.getByLabel('EMAIL').fill(env.email)
    await p.getByLabel('CONTRASEÑA').fill('una-clave-equivocada')
    await p.getByRole('button', { name: 'ENTRAR' }).click()
    await p.getByText('no coinciden').waitFor({ timeout: 15_000 }).catch(() => {})
    chequear('clave equivocada: lo dice', await p.getByText('no coinciden').isVisible())
    await shot(p, '03-login-clave-equivocada')

    await cortarRed(p)
    await p.getByLabel('CONTRASEÑA').fill(env.contrasenia)
    await p.getByRole('button', { name: 'ENTRAR' }).click()
    await p.getByText('No hay conexión').waitFor({ timeout: 15_000 }).catch(() => {})
    chequear('sin conexión: lo dice', await p.getByText('No hay conexión').isVisible())
    await shot(p, '04-login-sin-conexion')
    await volverRed(p)

    // Listado con la red lenta, para ver los esqueletos.
    await p.route(`${env.url}/rest/v1/vehiculos*`, async (r) => {
      await new Promise((res) => setTimeout(res, 1500))
      await r.continue().catch(() => {})
    })
    await p.getByRole('button', { name: 'ENTRAR' }).click()
    await p.waitForURL(/\/admin$/, { timeout: 15_000 })
    await p.waitForTimeout(400)
    await shot(p, '05-listado-cargando')
    await p.unroute(`${env.url}/rest/v1/vehiculos*`)
    await p.getByRole('link', { name: /Tucson/ }).first().waitFor({ timeout: 15_000 })
    await shot(p, '06-listado')
    chequear('el listado del panel muestra los borradores', await p.getByText('BORRADOR').first().isVisible())

    // ── 3. Crear ─────────────────────────────────────────────────────────
    console.log('\n3 · Crear, fotos, video, etiquetas')
    const titulo = `Prueba del recorrido ${Date.now().toString(36)}`
    await p.goto(`${BASE}/admin/nuevo`)
    await p.getByLabel('TÍTULO').fill(titulo)
    await p.getByLabel('PRECIO').fill('18900000')
    await p.getByLabel('AÑO').fill('2020')
    await p.getByLabel('KILÓMETROS').fill('61000')
    await p.getByLabel('DESCRIPCIÓN').fill('DATO DE PRUEBA del recorrido automático. Se borra solo.')
    await p.getByRole('button', { name: 'CREAR UNIDAD' }).click()
    await p.waitForURL(/\/admin\/editar\//, { timeout: 20_000 })
    idPrueba = decodeURIComponent(p.url().split('/editar/')[1])
    chequear('creada', Boolean(idPrueba), idPrueba)

    const fotos = ['car-1', 'car-2', 'car-3'].map((n) => path.resolve(`public/img/vehiculos/${n}.webp`))
    await p.locator('input[type=file][accept="image/*"]').setInputFiles(fotos)
    await p
      .waitForFunction(() => document.querySelectorAll('.adm-foto').length === 3, null, {
        timeout: 90_000,
      })
      .catch(() => {})
    await p.locator('.adm-foto').first().scrollIntoViewIfNeeded()
    await p
      .waitForFunction(
        () => [...document.querySelectorAll('.adm-foto img')].every((i) => i.complete && i.naturalWidth > 0),
        null,
        { timeout: 30_000 },
      )
      .catch(() => {})
    const miniaturas = await imagenes(p, '.adm-foto img')
    chequear(
      '3 fotos subidas al bucket y visibles',
      miniaturas.length === 3 && miniaturas.every((m) => m.ok && m.src.includes('/storage/v1/object/public/vehiculos/')),
      `${miniaturas.filter((m) => m.ok).length}/3`,
    )

    await p.locator('input[type=file][accept*="video"]').setInputFiles(path.resolve('public/video/hero-mobile.mp4'))
    await p.waitForSelector('.adm-video', { timeout: 90_000 }).catch(() => {})
    chequear('video subido', (await p.locator('.adm-video').count()) === 1)

    await tocar(p, p.getByRole('button', { name: '+ MOTOR' }))
    await p.locator('.adm-etq').first().locator('textarea').fill('Dato de prueba')
    await tocar(p, p.getByRole('button', { name: 'GUARDAR CAMBIOS' }))
    await guardado(p).waitFor({ timeout: 20_000 }).catch(() => {})
    chequear('etiqueta guardada', await guardado(p).isVisible())
    await shot(p, '07-unidad-con-fotos-y-video', { fullPage: true })

    let enBucket = await archivosEnCarpeta(idPrueba)
    chequear('en el bucket: 3 fotos + video + póster', enBucket.length === 5, enBucket.join(', '))

    // Borrar una foto borra su archivo.
    await tocar(p, p.locator('.adm-foto').nth(2).getByRole('button', { name: 'BORRAR' }))
    await p.locator('dialog[open]').getByRole('button', { name: 'BORRAR LA FOTO' }).click()
    await p
      .waitForFunction(() => document.querySelectorAll('.adm-foto').length === 2, null, { timeout: 20_000 })
      .catch(() => {})
    enBucket = await archivosEnCarpeta(idPrueba)
    chequear('borrar una foto borra su archivo', enBucket.length === 4, enBucket.join(', '))

    // ── 4. Publicar y verla como visitante ───────────────────────────────
    console.log('\n4 · Publicar, ver, despublicar')
    await p.reload()
    await p.getByRole('switch').first().waitFor({ timeout: 20_000 })
    await tocar(p, p.getByRole('switch').first())
    await tocar(p, p.getByRole('button', { name: 'GUARDAR CAMBIOS' }))
    await guardado(p).waitFor({ timeout: 20_000 }).catch(() => {})
    const { data: fila } = await admin.from('vehiculos').select('slug, publicado').eq('id', idPrueba).single()
    chequear('quedó publicada en la base', fila.publicado === true)

    const visita = await contexto(browser)
    await visita.page.goto(`${BASE}/vehiculo/${fila.slug}`)
    await visita.page.getByRole('heading', { name: titulo }).waitFor({ timeout: 20_000 }).catch(() => {})
    chequear('la ficha pública la muestra', await visita.page.getByRole('heading', { name: titulo }).isVisible())
    // Las que están en pantalla: las de más abajo van con `loading="lazy"` y
    // no bajan hasta que se scrollea, que es justamente lo que tienen que hacer.
    await esperarImagenes(visita.page, 'main img')
    const deLaFicha = await visita.page.$$eval('main img', (imgs) =>
      imgs
        .filter((i) => {
          const r = i.getBoundingClientRect()
          // Por el CENTRO: la diapositiva siguiente del carrusel asoma un píxel
          // por el borde pero la recorta el carril, y con `lazy` no baja.
          const cx = r.left + r.width / 2
          const cy = r.top + r.height / 2
          return r.width > 0 && cx > 0 && cx < innerWidth && cy > 0 && cy < innerHeight
        })
        .map((i) => ({ src: i.currentSrc || i.src, ok: i.complete && i.naturalWidth > 0 })),
    )
    chequear(
      'las fotos de la ficha salen del bucket y cargan',
      deLaFicha.length > 0 && deLaFicha.every((i) => i.ok && i.src.includes('/storage/v1/object/public/vehiculos/')),
      deLaFicha.map((i) => `${i.ok ? 'ok' : 'rota'} ${i.src.split('/').pop()}`).join(', '),
    )
    // La barra fija de mobile entra con una animación: la captura, quieta.
    await visita.page.waitForTimeout(2000)
    await shot(visita.page, '08-ficha-publica')

    await visita.page.goto(`${BASE}/catalogo`)
    await visita.page.getByText(titulo).first().waitFor({ timeout: 20_000 }).catch(() => {})
    chequear('aparece en el catálogo', await visita.page.getByText(titulo).first().isVisible())
    await shot(visita.page, '09-catalogo-con-la-unidad')

    // Despublicar.
    await tocar(p, p.getByRole('switch').first())
    await tocar(p, p.getByRole('button', { name: 'GUARDAR CAMBIOS' }))
    await guardado(p).waitFor({ timeout: 20_000 }).catch(() => {})
    await visita.page.goto(`${BASE}/vehiculo/${fila.slug}`)
    await visita.page.getByText('Esta página no existe').waitFor({ timeout: 20_000 }).catch(() => {})
    chequear('despublicada: la ficha da 404', await visita.page.getByText('Esta página no existe').isVisible())
    await visita.page.goto(`${BASE}/catalogo`)
    await visita.page.waitForSelector('main a[href^="/vehiculo/"]', { timeout: 20_000 }).catch(() => {})
    chequear('despublicada: ya no está en el catálogo', (await visita.page.getByText(titulo).count()) === 0)
    for (const [nombre, q] of Object.entries({
      'la unidad por id': anonimo.from('vehiculos').select('id').eq('id', idPrueba),
      'sus fotos': anonimo.from('fotos').select('id').eq('vehiculo_id', idPrueba),
      'su video': anonimo.from('videos').select('url').eq('vehiculo_id', idPrueba),
      'sus etiquetas': anonimo.from('etiquetas').select('id').eq('vehiculo_id', idPrueba),
    })) {
      const { data } = await q
      chequear(`despublicada, API sin sesión, ${nombre}: nada`, data?.length === 0)
    }
    await visita.ctx.close()

    // ── 5. Borrar ────────────────────────────────────────────────────────
    console.log('\n5 · Borrar la unidad')
    const { data: urlFoto } = await admin.from('fotos').select('url').eq('vehiculo_id', idPrueba).limit(1).single()
    chequear('antes de borrar, la foto se descarga', (await fetch(urlFoto.url)).ok)
    await tocar(p, p.getByRole('button', { name: 'ELIMINAR ESTA UNIDAD' }))
    await p.locator('dialog[open]').getByRole('button', { name: 'BORRAR LA UNIDAD' }).click()
    await p.waitForURL(/\/admin$/, { timeout: 20_000 })
    const { data: queda } = await admin.from('vehiculos').select('id').eq('id', idPrueba)
    chequear('la unidad ya no está en la base', queda.length === 0)
    enBucket = await archivosEnCarpeta(idPrueba)
    chequear('el bucket quedó sin sus archivos', enBucket.length === 0, enBucket.join(', ') || 'carpeta vacía')
    const r = await fetch(`${urlFoto.url}?despues=${Date.now()}`)
    chequear('la dirección de la foto ya no descarga nada', !r.ok, `HTTP ${r.status}`)
    if (queda.length === 0) idPrueba = null

    // ── 6. Sin conexión: cada pantalla con su cartel ─────────────────────
    console.log('\n6 · Sin conexión')
    await cortarRed(p)
    await p.goto(`${BASE}/admin`)
    await p.getByText('PROBAR DE NUEVO').first().waitFor({ timeout: 20_000 }).catch(() => {})
    chequear('panel, listado: cartel con reintentar', await p.getByText('PROBAR DE NUEVO').first().isVisible())
    await shot(p, '10-panel-listado-sin-conexion')
    await volverRed(p)
    await p.getByRole('button', { name: 'PROBAR DE NUEVO' }).click()
    await p.getByRole('link', { name: /Tucson/ }).first().waitFor({ timeout: 20_000 }).catch(() => {})
    chequear('panel, listado: reintentar trae el stock', await p.getByRole('link', { name: /Tucson/ }).first().isVisible())

    await cortarRed(p)
    await p.goto(`${BASE}/admin/editar/demo-tucson`)
    await p.getByText('PROBAR DE NUEVO').first().waitFor({ timeout: 20_000 }).catch(() => {})
    chequear('panel, unidad: cartel con reintentar', await p.getByText('No pude abrir esta unidad').isVisible())
    await shot(p, '11-panel-unidad-sin-conexion')
    await volverRed(p)
    await p.getByRole('button', { name: 'PROBAR DE NUEVO' }).click()
    await p.getByLabel('TÍTULO').first().waitFor({ timeout: 20_000 }).catch(() => {})
    chequear('panel, unidad: reintentar la abre', await p.getByLabel('TÍTULO').first().isVisible())

    await cortarRed(p)
    await p.goto(`${BASE}/admin/contenido`)
    await p.getByText('PROBAR DE NUEVO').first().waitFor({ timeout: 20_000 }).catch(() => {})
    chequear('panel, contenido: cartel con reintentar', await p.getByText('No pude traer el contenido').isVisible())
    await shot(p, '12-panel-contenido-sin-conexion')
    await volverRed(p)
    await p.getByRole('button', { name: 'PROBAR DE NUEVO' }).click()
    await p.getByText('SERVICIOS').first().waitFor({ timeout: 20_000 }).catch(() => {})
    chequear('panel, contenido: reintentar lo trae', await p.getByText('SERVICIOS').first().isVisible())
    await shot(p, '13-panel-contenido')

    const publico = await contexto(browser)
    const v = publico.page
    await cortarRed(v)
    await v.goto(`${BASE}/catalogo`)
    await v.getByText('No pudimos traer las unidades').waitFor({ timeout: 20_000 }).catch(() => {})
    chequear('catálogo: cartel con reintentar', await v.getByText('No pudimos traer las unidades').isVisible())
    await shot(v, '14-catalogo-sin-conexion')
    await volverRed(v)
    await v.getByRole('button', { name: 'PROBAR DE NUEVO' }).click()
    await v.waitForSelector('main a[href^="/vehiculo/"]', { timeout: 20_000 }).catch(() => {})
    chequear('catálogo: reintentar trae las unidades', (await v.locator('main a[href^="/vehiculo/"]').count()) > 0)

    await cortarRed(v)
    await v.goto(`${BASE}/vehiculo/hyundai-tucson-2021-2-0-gl`)
    await v.getByText('No pudimos abrir esta unidad').waitFor({ timeout: 20_000 }).catch(() => {})
    chequear('ficha: cartel con reintentar', await v.getByText('No pudimos abrir esta unidad').isVisible())
    await shot(v, '15-ficha-sin-conexion')
    await volverRed(v)
    await v.getByRole('button', { name: 'PROBAR DE NUEVO' }).click()
    await v.getByRole('heading', { name: /Tucson/ }).waitFor({ timeout: 20_000 }).catch(() => {})
    chequear('ficha: reintentar la abre', await v.getByRole('heading', { name: /Tucson/ }).isVisible())
    await shot(v, '16-ficha-demo')
    await publico.ctx.close()

    // ── 7. Sesión vencida ────────────────────────────────────────────────
    console.log('\n7 · Sesión vencida')
    // Se arruina la sesión guardada como la arruinaría el tiempo: token
    // vencido y un refresh que el servidor ya no acepta.
    await p.evaluate(() => {
      const clave = Object.keys(localStorage).find((k) => k.endsWith('-auth-token'))
      const s = JSON.parse(localStorage.getItem(clave))
      s.expires_at = Math.floor(Date.now() / 1000) - 60
      s.refresh_token = 'vencido'
      localStorage.setItem(clave, JSON.stringify(s))
    })
    await p.goto(`${BASE}/admin/editar/demo-tucson`)
    await p.waitForURL(/\/admin\/login/, { timeout: 20_000 }).catch(() => {})
    chequear('sesión vencida: vuelve al login', p.url().includes('/admin/login'))
    await p.getByText('Tu sesión venció').waitFor({ timeout: 10_000 }).catch(() => {})
    chequear('sesión vencida: el login dice por qué', await p.getByText('Tu sesión venció').isVisible())
    await shot(p, '17-sesion-vencida')
    await p.getByLabel('EMAIL').fill(env.email)
    await p.getByLabel('CONTRASEÑA').fill(env.contrasenia)
    await p.getByRole('button', { name: 'ENTRAR' }).click()
    await p.waitForURL(/\/admin\/editar\/demo-tucson/, { timeout: 20_000 }).catch(() => {})
    chequear('al volver a entrar, vuelve a la unidad que tenía abierta', p.url().includes('/admin/editar/demo-tucson'))

    chequear('sin errores de JS en el panel', panel.errores.length === 0, panel.errores.slice(0, 3).join(' | '))
    await panel.ctx.close()

    // ── 8. Inicio ────────────────────────────────────────────────────────
    console.log('\n8 · Inicio')
    for (const [nombre, vp] of [
      ['movil', MOVIL],
      ['compu', { width: 1440, height: 900 }],
    ]) {
      const inicio = await contexto(browser, vp)
      await inicio.page.addInitScript(() => sessionStorage.setItem('intro-seen', '1'))
      await inicio.page.goto(`${BASE}/#vehiculos`)
      await inicio.page.waitForSelector('#vehiculos a[href^="/vehiculo/"]', { timeout: 20_000 }).catch(() => {})
      chequear(`inicio (${nombre}): los destacados llegan de la base`, (await inicio.page.locator('#vehiculos a[href^="/vehiculo/"]').count()) > 0)
      await inicio.page.waitForTimeout(1500)
      await shot(inicio.page, `18-inicio-vehiculos-${nombre}`)
      await inicio.ctx.close()
    }
  } finally {
    // Lo que se haya creado, se va, aunque el recorrido se haya cortado.
    if (idPrueba) {
      console.log(`\nlimpiando la unidad de prueba ${idPrueba}`)
      const archivos = await archivosEnCarpeta(idPrueba).catch(() => [])
      await admin.from('vehiculos').delete().eq('id', idPrueba)
      if (archivos.length) await admin.storage.from(BUCKET).remove(archivos.map((a) => `${idPrueba}/${a}`))
    }
    await browser.close()
    // En Windows el preview corre detrás de un shell: matar solo al shell
    // deja a Vite escuchando el puerto. `/T` se lleva el árbol entero, y es
    // sincrónico para que no quede nada colgado cuando el proceso termina.
    if (process.platform === 'win32') {
      try {
        execSync(`taskkill /F /T /PID ${server.pid}`, { stdio: 'ignore' })
      } catch {
        /* ya no estaba */
      }
    } else {
      server.kill()
    }
    await admin.auth.signOut()
  }

  console.log(`\n${bien} bien, ${males.length} mal`)
  if (males.length) {
    console.log(males.map((m) => `  - ${m}`).join('\n'))
    process.exitCode = 1
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
