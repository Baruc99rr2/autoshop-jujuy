import { useEffect } from 'react'
import { gsap } from 'gsap'
import { prefersReducedMotion } from '../lib/motion-prefs'

/**
 * Malla ámbar con linterna. Ambiente, no protagonista: opacidad baja y solo
 * se revela bajo el cursor.
 *
 * `--mx` / `--my` se escriben directo en documentElement desde un pointermove
 * throttleado con rAF, una escritura por frame. Nunca estado de React acá: un
 * setState por pointermove re-renderiza el árbol entero 120 veces por segundo.
 */
export function MeshOverlay() {
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

    root.style.setProperty('--mesh-opacity', '.28')
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

  return <div className="mesh" aria-hidden="true" />
}

export default MeshOverlay
