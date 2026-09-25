import { useEffect } from 'react'
import { CONTACTO } from '../data/contacto'

/**
 * El `<title>` de la pestaña.
 *
 * Existe porque el sitio es una SPA: `index.html` trae un solo título y sin
 * esto la pestaña dice "0km y usados" estando en la ficha de un auto. Y el
 * título de la pestaña ES el texto que WhatsApp y el historial usan para
 * nombrar el link, que en este negocio es por donde se comparte todo.
 */

/** Lo que dice `index.html`. Se restaura al salir de una página con título propio. */
export const TITULO_BASE = `${CONTACTO.nombreLegal} — 0km y usados`

/** La descripción de `index.html`, leída una vez: es la que vale para el home. */
const DESCRIPCION_BASE =
  typeof document === 'undefined'
    ? ''
    : (document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '')

function ponerDescripcion(texto: string): void {
  document.querySelector('meta[name="description"]')?.setAttribute('content', texto)
}

/**
 * Pone el título —y, si se pasa, la meta description— mientras el componente
 * está montado, y los devuelve al salir.
 *
 * La restauración va en la limpieza y no en la página siguiente: así una ruta
 * que no llame al hook —el home— no se queda con el título del auto anterior.
 *
 * La descripción la leen los buscadores que ejecutan JS; la vista previa de un
 * link pegado en WhatsApp NO ejecuta JS y se queda con la de `index.html`.
 */
export function useTitulo(titulo: string | null, descripcion?: string): void {
  useEffect(() => {
    if (!titulo) return
    document.title = `${titulo} — ${CONTACTO.nombre}`
    if (descripcion) ponerDescripcion(descripcion)
    return () => {
      document.title = TITULO_BASE
      if (descripcion) ponerDescripcion(DESCRIPCION_BASE)
    }
  }, [titulo, descripcion])
}
