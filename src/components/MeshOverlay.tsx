import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { prefersReducedMotion } from '../lib/motion-prefs'

type MeshOverlayProps = {
  /** Tono de la sección visible: sobre fondo claro la malla se apaga. */
  tono?: 'oscuro' | 'claro'
}

/**
 * Malla ámbar con linterna. Ambiente, no protagonista: opacidad baja y solo
 * se revela bajo el cursor.
 *
 * ── LA TRAMA ────────────────────────────────────────────────────────────
 *
 * Era una cuadrícula de dos degradados CSS a 56 px y se leía como lo que era:
 * un fondo generado. La de ahora suma DIAGONALES empinadas y, sobre todo,
 * LÍNEAS QUE NO LLEGAN AL BORDE. Eso último es lo que hace la diferencia: una
 * grilla donde todo cierra parece salida de una fórmula, y una donde hay
 * tramos cortados parece dibujada.
 *
 * El tile mide 240 y no 120, o sea que lleva CUATRO celdas de 120 con juegos
 * de diagonales distintos en cada una. Con un tile de una celda, la misma
 * diagonal cae cada 120 px y el ojo encuentra la repetición enseguida; con
 * cuatro variantes el patrón se repite cada 240 px y la linterna —que revela
 * un círculo de 240 px de radio— casi nunca muestra dos copias iguales juntas.
 *
 * ── EL LÍQUIDO ──────────────────────────────────────────────────────────
 *
 * Un `feTurbulence` que alimenta un `feDisplacementMap`: cada píxel de la
 * malla se corre según el ruido, así que las rectas se curvan. Animando la
 * frecuencia del ruido y la amplitud del desplazamiento, la curvatura viaja y
 * la grilla parece flotar sobre agua.
 *
 * Los dos ciclos duran DISTINTO a propósito (17 s y 11 s, ida y vuelta): si
 * duraran lo mismo, la combinación volvería al mismo estado cada 17 s y el ojo
 * lo agarraría. Con esos dos números el patrón conjunto tarda minutos en
 * repetirse.
 *
 * ── RENDIMIENTO ─────────────────────────────────────────────────────────
 *
 * Un filtro SVG a pantalla completa obliga al navegador a rasterizar la malla,
 * generar el ruido y volver a muestrear píxel por píxel EN CADA FRAME, porque
 * los atributos del filtro están cambiando.
 *
 * LO QUE DIO LA MEDICIÓN, en una ventana de 390 px scrolleando el home, con el
 * filtro forzado y sin él:
 *
 *     cpu 1×   58 fps con filtro   ·   57 sin filtro
 *     cpu 4×   24 fps, p50 33 ms   ·   26 fps, p50 17 ms
 *     cpu 6×   15 fps              ·   16 fps
 *
 * O sea: el filtro no es el que rompe el scroll —a 4× y 6× la página ya venía
 * a 24 y 16 fps sin él, por el video del hero y por los ScrollTrigger—, pero
 * suma cuadros largos (36 contra 28 por encima de 50 ms a 4×) y su aporte
 * visual, a 0.28 de opacidad y bajo una linterna de 240 px, es sutil.
 *
 * Por eso el filtro se aplica SOLO donde hay puntero fino. En `(hover: none)`
 * la malla queda estática: mismas diagonales, mismos cortes, sin ondulación.
 * Y la medición es de un Chromium headless, que rasteriza por software: no es
 * la GPU de un teléfono, así que el número de allá puede ser mejor o peor. Ante
 * esa duda, en el dispositivo desde el que se va a ver el sitio casi siempre,
 * conviene la malla quieta.
 *
 * `--mx` / `--my` se escriben directo en documentElement desde un pointermove
 * throttleado con rAF, una escritura por frame. Nunca estado de React acá: un
 * setState por pointermove re-renderiza el árbol entero 120 veces por segundo.
 */

/** Sólo hay una malla montada a la vez, así que los ids pueden ser fijos. */
const ID_TRAMA = 'malla-trama'
const ID_FILTRO = 'malla-liquido'

/**
 * El dibujo de un tile de 240×240.
 *
 * Las verticales y horizontales de 120 son la grilla; el resto es lo que la
 * saca de la fórmula. Los tramos marcados como "corte" terminan en el aire a
 * propósito, y las diagonales van empinadas (−48 en x por cada +112 en y, unos
 * 67°) porque a 45° la trama se lee como un enrejado y pierde la referencia
 * vertical del riel.
 */
const TRAMA = [
  // Grilla completa
  'M0 0V240M120 0V240',
  'M0 0H240M0 120H240',
  // Cortes: tramos que no llegan al borde
  'M60 0V62',
  'M180 120V196',
  'M0 66H78',
  'M120 190H212',
  'M196 0V44',
  // Diagonales, una pareja por celda y alguna corta
  'M104 6L56 118',
  'M56 34L32 90',
  'M212 6L164 118',
  'M176 6L128 118',
  'M92 126L44 238',
  'M44 126L20 182',
  'M224 126L176 238',
  'M164 150L140 206',
]

export function MeshOverlay({ tono = 'oscuro' }: MeshOverlayProps) {
  const turbulencia = useRef<SVGFETurbulenceElement>(null)
  const desplazamiento = useRef<SVGFEDisplacementMapElement>(null)
  const rect = useRef<SVGRectElement>(null)

  // La opacidad se separa del resto porque cambia con la sección activa,
  // mientras que los listeners del puntero se montan una sola vez.
  useEffect(() => {
    if (prefersReducedMotion()) return
    document.documentElement.style.setProperty(
      '--mesh-opacity',
      tono === 'claro' ? '.1' : '.28',
    )
  }, [tono])

  // ── La ondulación ──────────────────────────────────────────────────────
  useEffect(() => {
    // Sin puntero fino NO se filtra. Ver la nota de rendimiento de arriba.
    const grueso = window.matchMedia('(hover: none)').matches
    if (prefersReducedMotion() || grueso) return

    const t = turbulencia.current
    const d = desplazamiento.current
    // El nodo se copia a una variable local y no se lee de la ref en la
    // limpieza: para cuando la limpieza corre, la ref ya puede apuntar a otra
    // cosa y se le sacaría el filtro al elemento equivocado.
    const caja = rect.current
    if (!t || !d || !caja) return

    // El filtro se engancha recién acá, no en el marcado: así el caso estático
    // —mobile y reduced-motion— nunca llega a crear la cadena de filtros, que
    // es cara aunque no se anime.
    caja.setAttribute('filter', `url(#${ID_FILTRO})`)

    const tweens = [
      gsap.to(t, {
        attr: { baseFrequency: '0.0075 0.0042' },
        duration: 17,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      }),
      gsap.to(d, {
        attr: { scale: 18 },
        duration: 11,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      }),
    ]

    return () => {
      tweens.forEach((x) => x.kill())
      caja.removeAttribute('filter')
    }
  }, [])

  // ── La linterna ────────────────────────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement
    const reduced = prefersReducedMotion()

    // Malla fija, sin máscara y más apagada. La textura sigue estando; lo que
    // se va es el movimiento.
    if (reduced) {
      root.style.setProperty('--mesh-opacity', '.12')
      root.style.setProperty('--mesh-mask', 'none')
      return
    }

    root.style.removeProperty('--mesh-mask')

    let x = window.innerWidth / 2
    let y = window.innerHeight * 0.4
    let frame = 0
    let drift: gsap.core.Tween | null = null

    const write = () => {
      frame = 0
      root.style.setProperty('--mx', `${x}px`)
      root.style.setProperty('--my', `${y}px`)
    }

    const schedule = () => {
      if (frame) return
      frame = requestAnimationFrame(write)
    }

    const onPointer = (e: PointerEvent) => {
      drift?.kill()
      drift = null
      x = e.clientX
      y = e.clientY
      schedule()
    }

    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) return
      drift?.kill()
      drift = null
      x = t.clientX
      y = t.clientY
      schedule()
    }

    // Sin puntero fino la linterna quedaría muerta en el centro, así que
    // deriva lenta e infinita hasta que alguien toque la pantalla.
    const coarse = window.matchMedia('(hover: none)').matches
    const startDrift = () => {
      if (!coarse || drift) return
      const p = { x, y }
      drift = gsap.to(p, {
        duration: 18,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        x: window.innerWidth * 0.78,
        y: window.innerHeight * 0.68,
        onUpdate: () => {
          x = p.x
          y = p.y
          schedule()
        },
      })
    }
    startDrift()

    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })

    return () => {
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('touchmove', onTouch)
      if (frame) cancelAnimationFrame(frame)
      drift?.kill()
    }
  }, [])

  return (
    <svg className="mesh" aria-hidden="true" focusable="false">
      <defs>
        <pattern
          id={ID_TRAMA}
          width="240"
          height="240"
          patternUnits="userSpaceOnUse"
        >
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth="1.1"
          >
            {TRAMA.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
        </pattern>

        {/* `fractalNoise` y no `turbulence`: el segundo tiene el contraste
            cargado y deforma a los tirones, con nudos donde el ruido pica.

            UNA SOLA OCTAVA, y esto se vio mirando la captura. Con dos, la
            segunda octava mete detalle fino en el mapa de desplazamiento y
            dos píxeles vecinos de una línea de 1 px se van para lados
            distintos: las diagonales salían picadas, como punteadas. Con una
            octava el ruido es suave, la línea entera se dobla junta y se
            mantiene continua, que es lo que hay que lograr. Por lo mismo la
            amplitud baja de 13–26 a 8–18 y el trazo sube a 1.1. */}
        <filter
          id={ID_FILTRO}
          x="-6%"
          y="-6%"
          width="112%"
          height="112%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            ref={turbulencia}
            type="fractalNoise"
            baseFrequency="0.0035 0.0068"
            numOctaves={1}
            seed={7}
            result="ruido"
          />
          <feDisplacementMap
            ref={desplazamiento}
            in="SourceGraphic"
            in2="ruido"
            scale={8}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>

      {/* El rectángulo se sale del viewport por los cuatro lados: el
          desplazamiento tira de los píxeles hasta 26 px y, con el rectángulo
          al ras, el borde de la malla se despegaría del borde de la pantalla. */}
      <rect
        ref={rect}
        x="-5%"
        y="-5%"
        width="110%"
        height="110%"
        fill={`url(#${ID_TRAMA})`}
      />
    </svg>
  )
}

export default MeshOverlay
