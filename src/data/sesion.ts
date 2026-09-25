import { useSyncExternalStore } from 'react'
import { USA_SUPABASE } from './modo'
import { cliente } from './supabase'

/**
 * La sesión del panel.
 *
 * TODO LO DE AUTENTICACIÓN VIVE ACÁ. Los componentes solo conocen
 * `iniciarSesion`, `cerrarSesion`, `useSesion` y `avisoDeSalida`, y no saben si
 * del otro lado está Supabase Auth o el acceso de mentira del modo mock.
 *
 * CON SUPABASE, LO QUE PROTEGE LOS DATOS NO ES ESTO: son las políticas de
 * fila de `supabase/schema.sql`. Este módulo decide qué pantalla se muestra;
 * quién puede leer un borrador o borrar una unidad lo decide la base, y ahí
 * no se llega salteando nada desde la consola del navegador.
 *
 * El acceso de mentira sobrevive SOLO en el modo mock (`VITE_DATOS=mock`),
 * que es trabajo sin conexión: sin servidor no hay contra quién validar, así
 * que entra cualquier email con cualquier contraseña.
 */

export interface Sesion {
  email: string
  /** ISO 8601. Cuándo empezó. */
  desde: string
}

/** Error esperable del login, para distinguirlo de un bug al mostrarlo. */
export class ErrorSesion extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'ErrorSesion'
  }
}

// ── Mock ──────────────────────────────────────────────────────────────────
// ARRIBA DEL ESTADO A PROPÓSITO: `let sesion` llama a `leerMock()` al cargar
// el módulo, y si `CLAVE_MOCK` estuviera declarada más abajo la lectura caería
// en la zona muerta de la constante: el `try` se tragaba el error y el modo
// mock arrancaba siempre sin sesión.

const CLAVE_MOCK = 'autoshop.sesion.v1'

function leerMock(): Sesion | null {
  try {
    const crudo = localStorage.getItem(CLAVE_MOCK)
    if (!crudo) return null
    const s = JSON.parse(crudo) as Sesion
    return typeof s?.email === 'string' ? s : null
  } catch {
    return null
  }
}

function escribirMock(s: Sesion | null): void {
  try {
    if (s) localStorage.setItem(CLAVE_MOCK, JSON.stringify(s))
    else localStorage.removeItem(CLAVE_MOCK)
  } catch {
    /* sin memoria la sesión vale igual, solo que hasta la próxima recarga */
  }
}

// ── Estado compartido ─────────────────────────────────────────────────────
// Vive en el módulo y no en un contexto de React: así lo pueden tocar el
// repositorio (cuando la base dice que la sesión venció) y el login por igual.

/** `undefined` es "todavía no sé": con Supabase, leer la sesión es asíncrono. */
let sesion: Sesion | null | undefined = USA_SUPABASE ? undefined : leerMock()
const oyentes = new Set<() => void>()

/**
 * Lo que el login tiene que decir al abrirse, si la sesión se cerró sola.
 * Sin esto la dueña aparecería en el formulario de ingreso sin saber por qué.
 */
let aviso: string | null = null

function poner(s: Sesion | null): void {
  sesion = s
  oyentes.forEach((fn) => fn())
}

export function sesionActual(): Sesion | null | undefined {
  return sesion
}

/**
 * El aviso pendiente. No se borra al leerlo —el modo estricto de React lee
 * dos veces al montar y el segundo lo perdería—: se borra al volver a entrar.
 */
export function avisoDeSalida(): string | null {
  return aviso
}

const FORMA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Lo que se revisa antes de molestar al servidor. */
function revisar(email: string, clave: string): string {
  const limpio = email.trim()
  if (!limpio) throw new ErrorSesion('Escribí tu email para entrar.')
  if (!FORMA_EMAIL.test(limpio)) {
    throw new ErrorSesion('Ese email está incompleto. Tiene que ser como nombre@dominio.com.')
  }
  if (!clave) throw new ErrorSesion('Escribí tu contraseña para entrar.')
  return limpio
}

const SIN_CONEXION =
  'No hay conexión con el servidor. Revisá que el celular tenga internet y probá de nuevo.'

// ── Supabase ──────────────────────────────────────────────────────────────

/** Mientras se revisa si la cuenta es admin, el `SIGNED_IN` no abre el panel. */
let verificando = false
/** Distingue "tocó Salir" de "la sesión se cerró sola". */
let saliendoAMano = false

let arrancado = false

/**
 * ¿Había una sesión guardada en este navegador al abrir la página?
 *
 * Se mira AL CARGAR EL MÓDULO, antes de que exista el cliente: si el token
 * guardado ya no se puede renovar, el cliente lo borra al arrancar, y después
 * no queda forma de distinguir "venció" de "nunca entró". Sin esto, la dueña
 * que vuelve al panel al otro día cae en el login sin que nada le diga por qué.
 */
const HABIA_SESION: boolean = (() => {
  if (!USA_SUPABASE) return false
  try {
    return Object.keys(localStorage).some((k) => /^sb-.+-auth-token$/.test(k))
  } catch {
    return false
  }
})()

const VENCIDA = 'Tu sesión venció. Entrá de nuevo para seguir trabajando.'

/** La primera noticia de la sesión: si no hay y había una guardada, venció. */
function primeraLectura(s: Sesion | null, sinRed = false): void {
  if (!s && HABIA_SESION && !aviso) {
    aviso = sinRed
      ? 'No hay conexión para revisar tu sesión. Cuando vuelva internet, entrá de nuevo.'
      : VENCIDA
  }
  poner(s)
}

/**
 * Lee la sesión guardada y se queda escuchando los cambios. Corre la primera
 * vez que alguien se suscribe, o sea al abrir el panel: el sitio público no
 * necesita saber de sesiones.
 */
function arrancar(): void {
  if (arrancado || !USA_SUPABASE) return
  arrancado = true
  ;(async () => {
    try {
      const sb = await cliente()
      sb.auth.onAuthStateChange((evento, s) => {
        if (verificando) return
        const nueva = s?.user ? aSesion(s.user) : null
        if (sesion === undefined) {
          primeraLectura(nueva)
          return
        }
        if (evento === 'SIGNED_OUT' && sesion && !saliendoAMano) {
          // La otra pestaña la cerró por inactividad: se dice eso, que es
          // lo que pasó, y no un "se cerró" a secas.
          aviso = cierreReciente()
            ? avisoInactividad()
            : 'Tu sesión se cerró. Entrá de nuevo para seguir trabajando.'
        }
        saliendoAMano = false
        poner(nueva)
      })
      const { data, error } = await sb.auth.getSession()
      if (sesion === undefined) {
        primeraLectura(
          data.session?.user ? aSesion(data.session.user) : null,
          error?.name === 'AuthRetryableFetchError',
        )
      }
    } catch {
      // Sin conexión ni para bajar el cliente: al login, que lo va a decir.
      if (sesion === undefined) primeraLectura(null, true)
    }
  })()
}

function aSesion(u: { email?: string; last_sign_in_at?: string }): Sesion {
  return { email: u.email ?? '', desde: u.last_sign_in_at ?? new Date().toISOString() }
}

/**
 * Los errores de Supabase Auth, dichos para quien está del otro lado.
 * Se mira el `code` y no el texto: el texto cambia entre versiones.
 */
function traducirAuth(e: { code?: string; status?: number; name?: string; message?: string }): ErrorSesion {
  if (e.name === 'AuthRetryableFetchError' || e.status === 0 || !navigator.onLine) {
    return new ErrorSesion(SIN_CONEXION)
  }
  switch (e.code) {
    case 'invalid_credentials':
      return new ErrorSesion('El email o la contraseña no coinciden. Revisalos y probá de nuevo.')
    case 'email_not_confirmed':
      return new ErrorSesion('Esa cuenta todavía no está confirmada. Pedile al administrador que la confirme.')
    case 'user_banned':
      return new ErrorSesion('Esa cuenta está suspendida.')
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return new ErrorSesion('Demasiados intentos seguidos. Esperá un minuto y probá de nuevo.')
  }
  if (e.status === 429) {
    return new ErrorSesion('Demasiados intentos seguidos. Esperá un minuto y probá de nuevo.')
  }
  return new ErrorSesion('No se pudo entrar. Probá de nuevo en un momento.')
}

async function entrarSupabase(email: string, clave: string): Promise<Sesion> {
  const sb = await cliente().catch(() => {
    throw new ErrorSesion(SIN_CONEXION)
  })

  verificando = true
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password: clave })
    if (error || !data.user) throw traducirAuth(error ?? {})

    // Tener usuario no alcanza: tiene que estar en `admins`. Si no, se cierra
    // acá mismo y se dice por qué, en vez de abrir un panel en el que cada
    // guardado va a fallar con "no tenés permiso".
    const { data: esAdmin, error: e2 } = await sb.rpc('es_admin')
    if (e2 || esAdmin !== true) {
      // El `SIGNED_OUT` que dispara esto se ignora solo: `verificando` sigue
      // en true hasta el `finally`.
      await sb.auth.signOut({ scope: 'local' })
      if (e2) throw new ErrorSesion(SIN_CONEXION)
      throw new ErrorSesion(
        'Esa cuenta existe pero no tiene permiso para usar el panel. Pedile al administrador que la habilite.',
      )
    }

    const s = aSesion(data.user)
    poner(s)
    return s
  } finally {
    verificando = false
  }
}

// ── Lo que usan las pantallas ─────────────────────────────────────────────

export async function iniciarSesion(email: string, clave: string): Promise<Sesion> {
  const limpio = revisar(email, clave)
  aviso = null
  if (USA_SUPABASE) return entrarSupabase(limpio, clave)

  const s = { email: limpio, desde: new Date().toISOString() }
  escribirMock(s)
  poner(s)
  return s
}

/**
 * Cierra la sesión. Con `motivo`, el login lo muestra al volver (hoy: el cierre
 * por inactividad). Se asigna ANTES de `poner(null)`, porque el login lee el
 * aviso al montarse y se monta apenas la sesión deja de existir.
 */
export async function cerrarSesion(motivo?: string): Promise<void> {
  if (motivo) aviso = motivo
  if (!USA_SUPABASE) {
    escribirMock(null)
    poner(null)
    return
  }
  saliendoAMano = true
  try {
    const sb = await cliente()
    // `local`: cierra este dispositivo y no espera al servidor, así que sin
    // conexión también sale. Las otras sesiones de la cuenta siguen abiertas.
    await sb.auth.signOut({ scope: 'local' })
  } finally {
    saliendoAMano = false
    poner(null)
  }
}

/**
 * La base rechazó un pedido porque la sesión ya no vale (token vencido que no
 * se pudo renovar). Lo llama el repositorio: se cierra la sesión local y el
 * panel vuelve al login con el aviso puesto.
 */
export function sesionVencida(): void {
  if (!USA_SUPABASE || !sesion) return
  aviso = 'Tu sesión venció. Entrá de nuevo y repetí lo último que hiciste.'
  saliendoAMano = true
  cliente()
    .then((sb) => sb.auth.signOut({ scope: 'local' }))
    .catch(() => {})
    .finally(() => {
      saliendoAMano = false
      poner(null)
    })
}

// ── Cierre por inactividad ─────────────────────────────────────────────────
//
// El reloj vive en `lib/inactividad.ts`; acá queda lo que toca a la sesión:
// qué pantallas tienen cambios sin guardar y qué dice el login después.

/** Pantallas con cambios sin guardar en ESTA pestaña, por clave. */
const sinGuardar = new Set<string>()

/** Lo llaman el formulario de una unidad y «Contenido del sitio». */
export function marcarSinGuardar(clave: string, sucio: boolean): void {
  if (sucio) sinGuardar.add(clave)
  else sinGuardar.delete(clave)
}

/** La marca que deja una pestaña al cerrar por inactividad, para las otras. */
export const CLAVE_CIERRE = 'autoshop.panel.cierre'

function cierreReciente(): boolean {
  try {
    return Date.now() - Number(localStorage.getItem(CLAVE_CIERRE) ?? 0) < 15_000
  } catch {
    return false
  }
}

function avisoInactividad(): string {
  return sinGuardar.size > 0
    ? 'Cerramos tu sesión por inactividad: pasaron 30 minutos sin uso. Lo último que cambiaste NO se guardó. Entrá de nuevo y volvé a cargarlo.'
    : 'Cerramos tu sesión por inactividad: pasaron 30 minutos sin uso. Entrá de nuevo para seguir trabajando.'
}

/** Cierra por inactividad y avisa a las otras pestañas del panel. */
export async function cerrarPorInactividad(): Promise<void> {
  if (!sesion) return
  try {
    localStorage.setItem(CLAVE_CIERRE, String(Date.now()))
  } catch {
    /* sin almacenamiento, cada pestaña cierra con su propio reloj */
  }
  await cerrarSesion(avisoInactividad())
}

/** Devuelve la función para darse de baja. */
export function suscribir(fn: () => void): () => void {
  arrancar()
  oyentes.add(fn)
  return () => oyentes.delete(fn)
}

/**
 * La sesión como estado de React: `undefined` mientras se lee, `null` si no
 * hay nadie adentro.
 *
 * `useSyncExternalStore` y no un `useState` + efecto: el valor que se lee en
 * el primer render es el de verdad, así que la ruta protegida no pinta un
 * frame de "sin sesión" antes de enterarse de que sí la hay.
 */
export function useSesion(): Sesion | null | undefined {
  return useSyncExternalStore(suscribir, sesionActual, sesionActual)
}
