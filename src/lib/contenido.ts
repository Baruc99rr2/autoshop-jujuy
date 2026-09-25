import { useEffect, useSyncExternalStore } from 'react'
import { repoContenido, SEMILLA_CONTACTO, SEMILLA_SEGMENTOS } from '../data/repo'
import type {
  Contadores,
  DatosContacto,
  Pregunta,
  Segmento,
  Servicio,
} from '../types/contenido'

/**
 * El contenido del sitio, pedido UNA vez por carga y compartido.
 *
 * Lo leen varios lugares a la vez —el home, el menú y el footer, que tienen
 * que saber si una sección existe para no ofrecer un link a algo que no está,
 * y todo botón de WhatsApp, que lee el número de acá— y con Supabase serían
 * varios viajes iguales. Acá hay uno solo: el primero que lo pide dispara el
 * pedido y el resto espera el mismo.
 *
 * CADA PARTE CAE POR SU LADO. Si falla una sola (una tabla que todavía no se
 * creó, por ejemplo), las otras se muestran igual. Lo que falla se queda con
 * lo último bueno, y si nunca hubo nada, con su respaldo:
 * - contadores, servicios y preguntas: nada (la sección no se dibuja);
 * - segmentos y contacto: la semilla. Los segmentos eran fijos hasta que
 *   pasaron al panel y sus fotos son archivos del sitio, así que la semilla
 *   siempre se puede dibujar; y un botón de WhatsApp con el número de
 *   siempre sirve más que uno que no lleva a ningún lado.
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
  segmentos: Segmento[]
  /** Nunca falta: si no llegó, es la semilla. */
  contacto: DatosContacto
}

/** Lo que queda de cada parte que nunca llegó. */
const RESPALDO: ContenidoSitio = {
  contadores: null,
  servicios: [],
  preguntas: [],
  segmentos: SEMILLA_SEGMENTOS,
  contacto: SEMILLA_CONTACTO,
}

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
  Promise.allSettled([
    repoContenido.obtenerContadores(),
    repoContenido.listarServicios(),
    repoContenido.listarPreguntas(),
    repoContenido.listarSegmentos(),
    repoContenido.obtenerContacto(),
  ])
    .then(([contadores, servicios, preguntas, segmentos, contacto]) => {
      const antes = estado ?? RESPALDO
      const tomar = <T,>(r: PromiseSettledResult<T>, previo: T): T =>
        r.status === 'fulfilled' ? r.value : previo
      estado = {
        contadores: tomar(contadores, antes.contadores),
        servicios: tomar(servicios, antes.servicios),
        preguntas: tomar(preguntas, antes.preguntas),
        segmentos: tomar(segmentos, antes.segmentos),
        contacto: tomar(contacto, antes.contacto),
      }
      const fallo = [contadores, servicios, preguntas, segmentos, contacto].some(
        (r) => r.status === 'rejected',
      )
      viejo = fallo
      if (!fallo) {
        reintentos = 0
      } else if (reintentos < REINTENTOS) {
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
 * Los datos de contacto: el número de WhatsApp, el teléfono, la dirección.
 * Mientras llegan (o si no llegan) son los de la semilla, así que un botón
 * de WhatsApp nunca queda sin destino.
 */
export function useContacto(): DatosContacto {
  return useContenido()?.contacto ?? SEMILLA_CONTACTO
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
  if (c.segmentos.length === 0) fuera.push('segmentos')
  if (c.servicios.length === 0) fuera.push('postventa')
  if (c.preguntas.length === 0) fuera.push('preguntas')
  return fuera
}

/** ¿Este href apunta a una sección que hoy no existe? */
export function apuntaAOculta(href: string, ocultas: readonly string[]): boolean {
  return href.startsWith('#') && ocultas.includes(href.slice(1))
}
