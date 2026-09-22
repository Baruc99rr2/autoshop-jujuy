import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { prefersReducedMotion } from './motion-prefs'

gsap.registerPlugin(ScrollTrigger)

/**
 * `ignoreMobileResize` hace que ScrollTrigger NO refresque cuando en un
 * dispositivo táctil cambia solo el alto del viewport. Sin esto, la barra del
 * navegador interno de WhatsApp —que se contrae y se expande al scrollear—
 * dispara un `refresh()` por cada movimiento: los pin-spacers se recalculan,
 * el alto del documento cambia y la página entera se empuja hacia abajo y
 * vuelve. El giro de pantalla, que cambia el ANCHO, sigue refrescando normal.
 *
 * Va acá, en el módulo que registra el plugin, y no en un componente: tiene
 * que estar aplicado antes de que exista el primer ScrollTrigger.
 */
ScrollTrigger.config({ ignoreMobileResize: true })

let lenis: Lenis | null = null
let rafHandler: ((time: number) => void) | null = null

/**
 * Un solo ticker para GSAP y Lenis. Dos rAF separados producen un frame de
 * desfase entre el scroll y los ScrollTrigger, que se ve como jitter en los
 * elementos pinneados.
 *
 * Con prefers-reduced-motion no se inicializa Lenis: el scroll nativo del
 * navegador es la respuesta correcta, no una versión "más lenta" del suave.
 */
export function initSmooth(): Lenis | null {
  if (lenis) return lenis
  if (typeof window === 'undefined') return null
  if (prefersReducedMotion()) return null

  lenis = new Lenis({
    duration: 1.1,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.6,
  })

  lenis.on('scroll', ScrollTrigger.update)

  rafHandler = (time: number) => {
    lenis?.raf(time * 1000)
  }
  gsap.ticker.add(rafHandler)
  gsap.ticker.lagSmoothing(0)

  return lenis
}

export function destroySmooth(): void {
  if (rafHandler) {
    gsap.ticker.remove(rafHandler)
    rafHandler = null
  }
  lenis?.destroy()
  lenis = null
}

export function getLenis(): Lenis | null {
  return lenis
}

/**
 * Pausa el scroll (intro, menú abierto, modales).
 * `overflow: hidden` en <html> es el fallback para cuando Lenis no existe
 * porque prefers-reduced-motion lo desactivó.
 */
export function stopScroll(): void {
  lenis?.stop()
  document.documentElement.style.overflow = 'hidden'
}

export function startScroll(): void {
  document.documentElement.style.overflow = ''
  lenis?.start()
}

/** scrollTo unificado: usa Lenis si está, y si no cae al nativo. */
export function scrollTo(
  target: string | number | HTMLElement,
  offset = 0,
): void {
  if (lenis) {
    lenis.scrollTo(target, { offset, duration: 1.2 })
    return
  }
  if (typeof target === 'number') {
    window.scrollTo({ top: target + offset })
    return
  }
  const el =
    typeof target === 'string' ? document.querySelector(target) : target
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY + offset
    window.scrollTo({ top })
  }
}
