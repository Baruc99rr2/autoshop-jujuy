import { useSyncExternalStore } from 'react'

/**
 * La sesión del panel.
 *
 * ES DE MENTIRA Y ESTÁ ANUNCIADO: hoy entra cualquier email con cualquier
 * contraseña. Lo único que se comprueba es que los dos campos tengan algo y
 * que el email tenga forma de email, porque un formulario que acepta vacíos
 * se lee como roto aunque "funcione".
 *
 * TODO LO DE AUTENTICACIÓN VIVE ACÁ. Los componentes solo conocen
 * `iniciarSesion`, `cerrarSesion`, `sesionActual` y `useSesion`: el día que
 * entre Supabase Auth se reescribe este archivo —`signInWithPassword`,
 * `signOut`, `getSession` y `onAuthStateChange`— y no se toca ninguna
 * pantalla. Por eso todo devuelve promesas aunque acá resuelva al instante.
 *
 * NO ES SEGURIDAD y no pretende serlo: sin servidor, cualquier cosa que
 * decida el navegador se puede saltear desde la consola. Es la pantalla que
 * ordena el panel y el lugar donde después se enchufa la de verdad.
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

/**
 * Sobrevive a la recarga a propósito: la dueña carga un auto, se le va la
 * página por una llamada y volver a escribir la contraseña en el celular es
 * exactamente el momento en que se abandona la carga.
 */
const CLAVE = 'autoshop.sesion.v1'

function leer(): Sesion | null {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (!crudo) return null
    const s = JSON.parse(crudo) as Sesion
    return typeof s?.email === 'string' ? s : null
  } catch {
    // Incógnito con storage bloqueado, o JSON corrupto: se arranca sin sesión.
    return null
  }
}

function escribir(s: Sesion | null): void {
  try {
    if (s) localStorage.setItem(CLAVE, JSON.stringify(s))
    else localStorage.removeItem(CLAVE)
  } catch {
    /* sin memoria la sesión vale igual, solo que hasta la próxima recarga */
  }
}

// El estado vive en el módulo y no en un contexto de React: así `sesionActual`
// se puede llamar desde cualquier lado —incluido un `loader` el día que lo
// haya— y no solo desde adentro de un componente.
let sesion: Sesion | null = leer()
const oyentes = new Set<() => void>()

function avisar(): void {
  oyentes.forEach((fn) => fn())
}

export function sesionActual(): Sesion | null {
  return sesion
}

const FORMA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function iniciarSesion(
  email: string,
  clave: string,
): Promise<Sesion> {
  const limpio = email.trim()
  if (!limpio) throw new ErrorSesion('Escribí tu email para entrar.')
  if (!FORMA_EMAIL.test(limpio)) {
    throw new ErrorSesion('Ese email está incompleto. Tiene que ser como nombre@dominio.com.')
  }
  if (!clave) throw new ErrorSesion('Escribí tu contraseña para entrar.')

  sesion = { email: limpio, desde: new Date().toISOString() }
  escribir(sesion)
  avisar()
  return sesion
}

export async function cerrarSesion(): Promise<void> {
  sesion = null
  escribir(null)
  avisar()
}

/** Devuelve la función para darse de baja. */
export function suscribir(fn: () => void): () => void {
  oyentes.add(fn)
  return () => oyentes.delete(fn)
}

/**
 * La sesión como estado de React.
 *
 * `useSyncExternalStore` y no un `useState` + efecto: el valor que se lee en
 * el primer render es el de verdad, así que la ruta protegida no pinta un
 * frame de "sin sesión" antes de enterarse de que sí la hay.
 */
export function useSesion(): Sesion | null {
  return useSyncExternalStore(suscribir, sesionActual, sesionActual)
}
