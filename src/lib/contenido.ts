import { useEffect, useSyncExternalStore } from 'react'
import { repoContenido } from '../data/repo'
import type { Contadores, Pregunta, Servicio } from '../types/contenido'

/**
 * El contenido del inicio, pedido UNA vez por carga y compartido.
 *
 * Lo leen tres lugares a la vez —el home, el menú y el footer, que tienen que
 * saber si Servicios y Preguntas existen para no ofrecer un link a una sección
 * que no está— y con Supabase serían tres viajes iguales. Acá hay uno solo:
 * el primero que lo pide dispara el pedido y el resto espera el mismo.
 *
 * SI FALLA, REINTENTA SOLO. Mientras tanto el inicio se dibuja sin cifras,
 * sin servicios y sin preguntas —mejor que un inicio que no termina de
 * cargar— y en cuanto vuelve la conexión (o a los pocos segundos) se vuelve a
 * pedir y las secciones aparecen. No lleva un botón de "reintentar": son
 * franjas de una portada, y un cartel de error en medio de la vidriera
 * asusta más de lo que ayuda. Lo que sí tiene cartel es el stock.
 *
 * El panel llama a `olvidarContenido()` después de guardar: el panel y el
 * sitio viven en la misma pestaña, y sin eso volver al inicio mostraría lo de
 * antes de guardar.
 */

export interface ContenidoSitio {
  /** `null` solo si el repositorio falló: la franja se dibuja vacía. */
  contadores: Contadores | null
  servicios: Servicio[]
  preguntas: Pregunta[]
}

const VACIO: ContenidoSitio = { contadores: null, servicios: [], preguntas: [] }

/** `null` mientras llega el primer pedido. */
let estado: ContenidoSitio | null = null
/** Lo que hay en `estado` ya no sirve: hay que volver a pedir. */
let viejo = true
let enVuelo = false
let reintentos = 0
let espera: ReturnType<typeof setTimeout> | undefined
const oyentes = new Set<() => void>()

const avisar = () => oyentes.forEach((fn) => fn())

/** Cuántas veces se reintenta solo, y cada cuánto (se estira de a poco). */
const REINTENTOS = 4
const PAUSA_MS = 3000

function cargar(): void {
  if (enVuelo) return
  enVuelo = true
  clearTimeout(espera)
  Promise.all([
    repoContenido.obtenerContadores(),
    repoContenido.listarServicios(),
    repoContenido.listarPreguntas(),
  ])
    .then(([contadores, servicios, preguntas]) => {
      estado = { contadores, servicios, preguntas }
      viejo = false
      reintentos = 0
    })
    .catch(() => {
      // Lo último bueno se queda; si nunca hubo nada, el inicio va vacío.
      estado ??= VACIO
      viejo = true
      if (reintentos < REINTENTOS) {
        reintentos++
        espera = setTimeout(cargar, PAUSA_MS * reintentos)
      }
    })
    .finally(() => {
      enVuelo = false
      avisar()
    })
}

// Volvió la conexión: si lo que hay es viejo o un vacío por falla, se pide.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (viejo && oyentes.size > 0) {
      reintentos = 0
      cargar()
    }
  })
}

export function olvidarContenido(): void {
  viejo = true
}

function suscribir(fn: () => void): () => void {
  oyentes.add(fn)
  return () => oyentes.delete(fn)
}

const leer = () => estado

/** `null` mientras carga. */
export function useContenido(): ContenidoSitio | null {
  const c = useSyncExternalStore(suscribir, leer, leer)
  useEffect(() => {
    if (viejo) cargar()
  }, [])
  return c
}

/**
 * Los ids de sección que no se dibujan porque su lista está vacía.
 *
 * Mientras carga no se oculta nada: con el mock la respuesta es inmediata, y
 * suponer que están evita que la numeración del riel salte al llegar.
 */
export function seccionesOcultas(c: ContenidoSitio | null): string[] {
  if (!c) return []
  const fuera: string[] = []
  if (c.servicios.length === 0) fuera.push('postventa')
  if (c.preguntas.length === 0) fuera.push('preguntas')
  return fuera
}

/** ¿Este href apunta a una sección que hoy no existe? */
export function apuntaAOculta(href: string, ocultas: readonly string[]): boolean {
  return href.startsWith('#') && ocultas.includes(href.slice(1))
}
