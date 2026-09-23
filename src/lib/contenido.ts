import { useEffect, useState } from 'react'
import { repoContenido } from '../data/repo'
import type { Contadores, Pregunta, Servicio } from '../types/contenido'

/**
 * El contenido del inicio, pedido UNA vez por carga y compartido.
 *
 * Lo leen tres lugares a la vez —el home, el menú y el footer, que tienen que
 * saber si Servicios y Preguntas existen para no ofrecer un link a una sección
 * que no está— y con Supabase serían tres viajes iguales. Acá hay uno solo:
 * el primero que lo pide dispara la promesa y el resto se cuelga de ella.
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

let pedido: Promise<ContenidoSitio> | null = null

function cargar(): Promise<ContenidoSitio> {
  pedido ??= Promise.all([
    repoContenido.obtenerContadores(),
    repoContenido.listarServicios(),
    repoContenido.listarPreguntas(),
  ])
    .then(([contadores, servicios, preguntas]) => ({ contadores, servicios, preguntas }))
    .catch(() => {
      // Si el repositorio falla, el sitio sigue: sin cifras, sin servicios y
      // sin preguntas, que es mejor que un inicio que no termina de cargar.
      pedido = null
      return { contadores: null, servicios: [], preguntas: [] }
    })
  return pedido
}

export function olvidarContenido(): void {
  pedido = null
}

/** `null` mientras carga. */
export function useContenido(): ContenidoSitio | null {
  const [c, setC] = useState<ContenidoSitio | null>(null)
  useEffect(() => {
    let vivo = true
    cargar().then((d) => {
      if (vivo) setC(d)
    })
    return () => {
      vivo = false
    }
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
