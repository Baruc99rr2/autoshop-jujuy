import { useEffect, type RefObject } from 'react'
import { anchoCambio } from './viewport'

/** Tamaño de sonda con el que se mide. Cualquiera sirve: la relación es lineal. */
const SONDA = 100

/**
 * Ajusta el `font-size` de una línea para que ocupe EXACTAMENTE el ancho
 * disponible, sin desbordar ni dejar aire.
 *
 * Por qué no un `clamp()` en vw: el logotipo del footer es una sola línea que
 * tiene que llegar de margen a margen, como en la referencia. Con un clamp hay
 * que adivinar un factor a partir del ancho de los glifos, y ese ancho cambia
 * con la fuente (Archivo vs. el fallback mientras carga), con el eje `wdth` y
 * con el texto — que se va a reemplazar cuando llegue el contenido real. El
 * primer intento con `clamp(2rem, 11.4vw, 13rem)` cortaba el logotipo en
 * "AUTOSHOP\JU" tanto en 1440 como en 390.
 *
 * Medir resuelve las tres cosas de una vez. El elemento va con `nowrap`, así
 * que `clientWidth` es el ancho disponible y `scrollWidth` el que el texto
 * pide: la razón entre los dos es el factor de escala exacto, y como el
 * tracking está en `em`, escala linealmente y una sola pasada alcanza.
 */
export function useFitText(
  ref: RefObject<HTMLElement | null>,
  /** Tope duro, en px. Evita que en un monitor ancho el texto se vuelva absurdo. */
  max = 320,
  /**
   * Piso duro, en px. Por debajo de esto el texto deja de achicarse y prefiere
   * desbordar: un precio de nueve dígitos metido a la fuerza en un panel
   * angosto termina en cifras de 9 px que nadie lee, y un precio ilegible es
   * peor que uno que roza el borde. Por defecto es 0, que es el
   * comportamiento del logotipo del footer: ahí achicar siempre está bien.
   */
  min = 0,
) {
  useEffect(() => {
    const el = ref.current
    if (!el) return

    const rango = document.createRange()

    let frame = 0
    const ajustar = () => {
      const disponible = el.clientWidth
      if (!disponible) return
      // Se parte siempre del mismo tamaño de referencia: si se midiera sobre
      // el tamaño ya ajustado, los errores de redondeo se acumularían en cada
      // resize hasta correr el texto.
      el.style.fontSize = `${SONDA}px`

      // El ancho real del texto se mide con un Range, no con `scrollWidth`:
      // `scrollWidth` nunca devuelve menos que `clientWidth`, así que cuando
      // el texto entra sobrado informa el ancho del contenedor y el ajuste
      // solo puede achicar, nunca agrandar. Con eso el logotipo quedaba en el
      // tamaño de sonda y le sobraban 170 px a la derecha en desktop.
      rango.selectNodeContents(el)
      const pedido = rango.getBoundingClientRect().width
      if (!pedido) return

      const exacto = (SONDA * disponible) / pedido
      el.style.fontSize = `${Math.max(Math.min(exacto, max), min)}px`
    }

    const programar = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(ajustar)
    }

    programar()

    // La fuente cambia el ancho de los glifos al terminar de cargar, así que
    // hay que volver a medir: sin esto el ajuste queda hecho con el fallback.
    document.fonts?.ready.then(programar).catch(() => {})

    // Se observa el ancho del contenedor, no el del propio elemento: cambiarle
    // el font-size le cambia el alto, y observarse a sí mismo sería un bucle.
    //
    // Y se recalcula SOLO si cambió el ancho. El ajuste pasa por poner el
    // texto en el tamaño de sonda (100 px) antes de medir, así que cada
    // recálculo es un salto de layout de un frame. Con la barra del navegador
    // de WhatsApp contrayéndose y expandiéndose al scrollear, el alto del
    // contenedor cambia todo el tiempo y el logotipo del footer parpadeaba de
    // tamaño en cada movimiento. El alto no aporta nada acá: lo único que
    // decide el font-size es cuánto ancho hay.
    let anchoPrevio = el.parentElement?.clientWidth ?? 0
    const ro = new ResizeObserver((entradas) => {
      const w = entradas[0]?.contentRect.width ?? 0
      if (!anchoCambio(anchoPrevio, w)) return
      anchoPrevio = w
      programar()
    })
    if (el.parentElement) ro.observe(el.parentElement)

    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
    }
  }, [ref, max, min])
}
