import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { Flip } from 'gsap/Flip'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Bevel from './Bevel'
import Logo from './Logo'
import { buildIntroTimeline } from './intro-timeline'
import { startScroll, stopScroll } from '../lib/smooth'

gsap.registerPlugin(useGSAP, Flip, ScrollTrigger)

export const INTRO_SEEN_KEY = 'intro-seen'

type IntroProps = {
  /** El logo del header: destino real del Flip, medido, nunca hardcodeado. */
  headerLogoRef: React.RefObject<HTMLElement | null>
  /** Se llama una sola vez, cuando la intro terminó o se salteó. */
  onDone: () => void
}

export function Intro({ headerLogoRef, onDone }: IntroProps) {
  const root = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const laser = useRef<HTMLDivElement>(null)
  const trail = useRef<HTMLDivElement>(null)
  const flyer = useRef<HTMLDivElement>(null)
  const breath = useRef<HTMLDivElement>(null)
  const line = useRef<HTMLSpanElement>(null)
  const wipe = useRef<HTMLDivElement>(null)
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const done = useRef(false)

  useGSAP(
    () => {
      const el = root.current
      const logoSvg = breath.current?.querySelector('svg')
      if (!el || !logoSvg) return

      // Los ids del logo son los mismos en las dos instancias (intro y header),
      // así que TODAS las búsquedas van scopeadas al contenedor. Nunca
      // document.querySelector('#lg-word'): agarraría el del header.
      const word = logoSvg.querySelector('#lg-word')
      const flagSquares = Array.from(
        logoSvg.querySelectorAll('#lg-flag > path'),
      )
      if (!word || flagSquares.length === 0) return

      stopScroll()

      // Estado inicial explícito: si la primera pintura ocurre antes de que
      // corra la timeline, el logo tiene que estar ya oculto.
      gsap.set(word, { clipPath: 'inset(0% 100% 0% 0%)' })
      gsap.set(flagSquares, { opacity: 0 })
      gsap.set(line.current, { scaleX: 0 })

      const finish = () => {
        if (done.current) return
        done.current = true
        try {
          sessionStorage.setItem(INTRO_SEEN_KEY, '1')
        } catch {
          // Modo incógnito con storage bloqueado: la intro se repite y ya.
        }
        startScroll()
        ScrollTrigger.refresh()
        onDone()
      }

      const tl = buildIntroTimeline(
        {
          laser: laser.current!,
          trail: trail.current!,
          word,
          flagSquares,
          line: line.current!,
          breath: breath.current!,
          wipe: wipe.current!,
        },
        {
          laserDistance: () => window.innerWidth + 140,

          // Flip.fit mide el logo del header en el momento en que se construye
          // el tween y lleva al volador hasta ahí con transform + scale. Nada
          // de coordenadas hardcodeadas, y nada de animar width/height.
          //
          // El destino es el <svg> y no el enlace que lo envuelve: el enlace
          // lleva padding para medir 44 px de alto al tacto, y encajar el
          // volador en esa caja lo estiraría.
          flip: (dur) => {
            const link = headerLogoRef.current
            const target = link?.querySelector('svg') ?? link
            if (!target || !flyer.current) return null
            return Flip.fit(flyer.current, target, {
              duration: dur,
              ease: 'power3.inOut',
              scale: true,
            }) as gsap.core.Tween
          },

          // Cambio de posta: el volador desaparece y el logo del header se
          // enciende en el mismo lugar y al mismo tamaño, así que no se ve.
          onFlipEnd: () => {
            gsap.set(headerLogoRef.current, { autoAlpha: 1 })
            gsap.set(stage.current, { autoAlpha: 0 })
          },

          onComplete: finish,
        },
      )

      tlRef.current = tl
      gsap.set(headerLogoRef.current, { autoAlpha: 0 })

      // Gancho para el arnés de captura (scripts/shots.mjs): con la timeline
      // expuesta se puede pausar y hacer seek a cada beat exacto, en vez de
      // muestrear contra el reloj de pared y errarle por 40 ms. Escribir la
      // propiedad es lo que le da la oportunidad al harness de pausarla en el
      // frame cero, así que va ANTES del play().
      ;(window as unknown as { __introTl?: gsap.core.Timeline }).__introTl = tl

      tl.play()

      if (import.meta.env.DEV) {
        console.info(`[intro] tl.duration() = ${tl.duration().toFixed(3)}s`)
      }

      return () => {
        startScroll()
      }
    },
    { scope: root },
  )

  // "seek() al final, no un corte": la timeline renderiza su estado final en
  // vez de que el componente se desmonte de golpe, así que el logo queda donde
  // corresponde y el scroll se libera por el mismo camino de siempre.
  const skip = () => {
    const tl = tlRef.current
    if (!tl) return
    tl.seek(tl.duration(), false)
    tl.pause()
    // seek() no siempre dispara onComplete, así que el cierre se llama a mano.
    // finish() es idempotente.
    tl.vars.onComplete?.()
  }

  return (
    // El root no captura clicks: durante los 0.3 s del wipe la pantalla ya es
    // el sitio, y solo el stage (con el SKIP adentro) tiene que ser clickeable.
    <div ref={root} data-intro className="pointer-events-none fixed inset-0 z-100">
      {/* El wipe va PRIMERO en el DOM, o sea DEBAJO del stage.
          Los dos son `absolute inset-0` sin z-index, así que el orden del DOM
          es el orden de pintado: si el wipe va después, tapa la intro entera
          con un panel negro opaco y no se ve ni el láser ni el logo ni el
          SKIP — solo el wipe final revelando el hero.
          Abajo funciona porque el stage también es opaco: lo esconde hasta el
          segundo 2.30, cuando el stage se apaga y el wipe queda tapando el
          hero justo para correrse. */}
      <div
        ref={wipe}
        className="pointer-events-none absolute inset-0 bg-void"
        aria-hidden="true"
      />

      <div
        ref={stage}
        className="pointer-events-auto absolute inset-0 grid place-items-center overflow-hidden bg-void"
      >
        {/* El láser y su estela. Dos divs, nada de canvas. */}
        <div
          ref={trail}
          className="intro-trail pointer-events-none absolute inset-y-0 left-[-220px] w-[220px]"
          aria-hidden="true"
        />
        <div
          ref={laser}
          className="intro-laser pointer-events-none absolute inset-y-0 left-0 w-0.5"
          aria-hidden="true"
        />

        <div className="relative flex flex-col items-center gap-7 px-8">
          {/* flyer = lo que viaja al header · breath = lo que respira.
              Separados a propósito: si el Flip y la respiración escribieran
              transform sobre el mismo nodo, se pisarían. */}
          <div ref={flyer}>
            <div ref={breath}>
              <Logo className="w-[min(72vw,34rem)]" decorative />
            </div>
          </div>

          <span
            ref={line}
            className="block h-px w-[min(72vw,34rem)] bg-amber"
            aria-hidden="true"
          />
        </div>

        <Bevel
          as="button"
          variant="outline"
          bevel={10}
          outerClassName="absolute right-5 bottom-5 md:right-8 md:bottom-8"
          className="font-hud px-4 py-2.5 text-bone/80 transition-colors hover:text-amber"
          type="button"
          onClick={skip}
        >
          SKIP ///
        </Bevel>
      </div>

    </div>
  )
}

export default Intro
