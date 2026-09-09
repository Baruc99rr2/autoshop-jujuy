import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { prefersReducedMotion } from '../lib/motion-prefs'

type TickerProps = {
  items: string[]
  className?: string
}

/**
 * Marquesina infinita en Martian Mono.
 *
 * El contenido va DUPLICADO y el tween corre de xPercent 0 a -50 sobre el
 * contenedor de las dos copias: cuando la primera copia terminó de salir, la
 * segunda está exactamente donde arrancó la primera, así que el salto al
 * reiniciar cae en un punto donde el dibujo es idéntico y no se ve costura.
 * Por eso el desplazamiento es -50 y no -100.
 *
 * Se anima `transform` sobre un elemento, no `scroll` ni `left`: el tween es
 * infinito y cualquier propiedad que dispare layout costaría un reflow por
 * frame durante toda la visita.
 *
 * Con prefers-reduced-motion no se mueve: los seis textos quedan quietos y
 * legibles, que es lo mismo que dice el ticker andando.
 */
export function Ticker({ items, className = '' }: TickerProps) {
  const pista = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion() || !pista.current) return
      gsap.to(pista.current, {
        xPercent: -50,
        duration: items.length * 4,
        ease: 'none',
        repeat: -1,
      })
    },
    { scope: pista, dependencies: [items.length] },
  )

  const fila = (copia: number) => (
    <div className="flex shrink-0 items-center" aria-hidden={copia === 1}>
      {items.map((t) => (
        <span key={t} className="flex shrink-0 items-center">
          <span className="font-hud num whitespace-nowrap text-bone/55">{t}</span>
          <span aria-hidden="true" className="px-5 text-amber md:px-7">
            ·
          </span>
        </span>
      ))}
    </div>
  )

  return (
    <div className={`overflow-hidden ${className}`}>
      {/* w-max para que la pista mida lo que miden las dos copias juntas y no
          el ancho del contenedor: si se encoge, el -50% deja de coincidir. */}
      <div ref={pista} className="flex w-max">
        {fila(0)}
        {fila(1)}
      </div>
    </div>
  )
}

export default Ticker
