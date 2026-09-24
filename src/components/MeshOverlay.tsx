import { useEffect, useState } from 'react'
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
 * Una grilla técnica: verticales y horizontales cada 120 px y una familia de
 * diagonales empinadas (dos de alto por uno de ancho, unos 63°), todas rectas,
 * del mismo trazo y DE BORDE A BORDE. Hubo una versión con tramos que no
 * llegaban al borde y con un `feTurbulence` que ondulaba las líneas: los
 * cortes se leían como errores de dibujo y la ondulación como pulso
 * tembloroso. Las dos cosas se sacaron; no vuelven.
 *
 * Las diagonales van en un solo sentido porque a dos sentidos la trama se lee
 * como enrejado y pierde la referencia vertical del riel. Cruzan cada
 * vértice de las filas pares y el centro exacto del tramo en las impares, así
 * que las intersecciones caen en lugares limpios.
 *
 * NO es un `<pattern>`: el tile recorta los trazos que caen sobre su borde y
 * esas líneas salen a medio grosor. Es un único `<path>` dibujado una vez para
 * el tamaño de la PANTALLA (no de la ventana, que cambia con cada resize):
 * a 1920 px son unas cien líneas, nada.
 *
 * Quieta a propósito. Un desplazamiento lento de pocos píxeles pasa casi
 * todo el tiempo en posiciones fraccionarias: una línea de 1 px se reparte
 * entre dos columnas de pantalla y vuelve, y el trazo "respira" de grosor,
 * que es otra forma del temblor que se quería sacar. Sin filtro, la malla es la misma en
 * mobile y en desktop.
 *
 * `--mx` / `--my` se escriben directo en documentElement desde un pointermove
 * throttleado con rAF, una escritura por frame. Nunca estado de React acá: un
 * setState por pointermove re-renderiza el árbol entero 120 veces por segundo.
 */

/** Separación de la grilla, en px. */
const PASO = 120

/**
 * Los trazos para un cuadrado de `lado` px, en dos grupos: las rectas
 * ortogonales se dibujan con `crispEdges` (caen justas en el píxel y todas
 * pesan igual) y las diagonales con antialiasing, que sin él serían escaleras.
 */
function trazar(lado: number) {
  let rectas = ''
  for (let v = PASO; v < lado; v += PASO) {
    rectas += `M${v} 0V${lado}M0 ${v}H${lado}`
  }
  // x + y/2 = c: bajando `lado`, la recta se corre `lado/2` a la izquierda.
  // Arrancan más allá del borde derecho para cubrir la esquina de abajo.
  let diagonales = ''
  for (let c = PASO; c < lado * 1.5; c += PASO) {
    diagonales += `M${c} 0L${c - lado / 2} ${lado}`
  }
  return { rectas, diagonales }
}

/** El lado mayor de la pantalla, redondeado hacia arriba al paso. */
function ladoDePantalla() {
  const mayor = Math.max(window.screen.width, window.screen.height, 1920)
  return Math.ceil(mayor / PASO) * PASO
}

export function MeshOverlay({ tono = 'oscuro' }: MeshOverlayProps) {
  const [trazo] = useState(() => trazar(ladoDePantalla()))

  // La opacidad se separa del resto porque cambia con la sección activa,
  // mientras que los listeners del puntero se montan una sola vez.
  useEffect(() => {
    if (prefersReducedMotion()) return
    document.documentElement.style.setProperty(
      '--mesh-opacity',
      tono === 'claro' ? '.1' : '.28',
    )
  }, [tono])

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
      <g fill="none" stroke="currentColor" strokeWidth="1">
        <path d={trazo.rectas} shapeRendering="crispEdges" />
        <path d={trazo.diagonales} />
      </g>
    </svg>
  )
}

export default MeshOverlay
