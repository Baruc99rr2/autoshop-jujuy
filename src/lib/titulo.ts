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

/**
 * Pone el título mientras el componente está montado y lo devuelve al salir.
 *
 * La restauración va en la limpieza y no en la página siguiente: así una ruta
 * que no llame al hook —el home— no se queda con el título del auto anterior.
 */
export function useTitulo(titulo: string | null): void {
  useEffect(() => {
    if (!titulo) return
    document.title = `${titulo} — ${CONTACTO.nombre}`
    return () => {
      document.title = TITULO_BASE
    }
  }, [titulo])
}
