import { gsap } from 'gsap'

/**
 * El guion de la intro, en un solo lugar y en segundos absolutos.
 *
 * El techo de 2.6 s es un requisito, no una aspiración: es el tiempo que un
 * dueño de concesionaria tolera mirando una animación antes de scrollear. Si
 * algo hay que recortar, se recortan duraciones — nunca pasos.
 */
export const INTRO = {
  /** Láser: barra de 2px que barre el ancho de la pantalla. */
  laser: { at: 0.15, dur: 0.55 },
  /** La estela sale 0.05 s más tarde y llega 0.05 s después. */
  trailLag: 0.05,
  /** #lg-word se dibuja con la misma curva y dirección que el láser. */
  word: { at: 0.7, dur: 0.45 },
  /** Los 7 cuadros de la bandera: el semáforo de largada. */
  flag: { at: 0.95, dur: 0.3, stagger: 0.045 },
  /** Línea ámbar bajo el logo, desde el centro. */
  line: { at: 1.3, dur: 0.35 },
  /** Respiración: UN ciclo, no dos. */
  breath: { at: 1.55, dur: 0.45 },
  /** Viaje al header con Flip. */
  flip: { at: 2.0, dur: 0.3 },
  /** Wipe de revelado del hero. */
  wipe: { at: 2.3, dur: 0.3 },
} as const

/** Techo declarado. El test de duración compara contra esto. */
export const INTRO_CEILING = 2.6

/**
 * Los targets se pasan como parámetro (en vez de que la timeline los busque)
 * para que la secuencia se pueda construir y medir sin DOM: el script de
 * `scripts/check-intro.mjs` le pasa objetos planos y lee `tl.duration()`.
 */
export interface IntroTargets {
  laser: gsap.TweenTarget
  trail: gsap.TweenTarget
  word: gsap.TweenTarget
  flagSquares: gsap.TweenTarget
  line: gsap.TweenTarget
  breath: gsap.TweenTarget
  wipe: gsap.TweenTarget
}

export interface IntroOptions {
  /** Ancho a barrer por el láser. Función porque depende del viewport. */
  laserDistance: () => number
  /**
   * Fábrica del Flip. Se inyecta porque Flip.fit necesita DOM real y una
   * medición del logo del header en el momento exacto en que arranca el viaje.
   */
  flip: (dur: number) => gsap.core.Animation | null
  /** Corre cuando el logo ya llegó al header: es el momento del cambio de posta. */
  onFlipEnd?: () => void
  onComplete?: () => void
}

export function buildIntroTimeline(
  t: IntroTargets,
  o: IntroOptions,
): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true, onComplete: o.onComplete })

  // ── 0.15 · el láser ──────────────────────────────────────────────────────
  tl.fromTo(
    t.laser,
    { x: 0, opacity: 1 },
    { x: o.laserDistance, duration: INTRO.laser.dur, ease: 'power3.inOut' },
    INTRO.laser.at,
  )
  tl.fromTo(
    t.trail,
    { x: 0, opacity: 1 },
    { x: o.laserDistance, duration: INTRO.laser.dur, ease: 'power3.inOut' },
    INTRO.laser.at + INTRO.trailLag,
  )
  // Se apagan una vez que salieron por el borde derecho.
  tl.to(
    [t.laser, t.trail],
    { opacity: 0, duration: 0.18, ease: 'power1.out' },
    INTRO.laser.at + INTRO.laser.dur,
  )

  // ── 0.70 · la palabra, dibujada por el láser ─────────────────────────────
  // Misma curva y misma dirección que el barrido: eso es lo que hace que se
  // lea como causa y efecto en vez de como dos animaciones seguidas.
  tl.fromTo(
    t.word,
    { clipPath: 'inset(0% 100% 0% 0%)' },
    {
      clipPath: 'inset(0% 0% 0% 0%)',
      duration: INTRO.word.dur,
      ease: 'power3.inOut',
    },
    INTRO.word.at,
  )

  // ── 0.95 · el semáforo de largada ────────────────────────────────────────
  // Los paths de #lg-flag ya vienen ordenados de izquierda a derecha en el
  // DOM, así que el stagger en orden de documento ya barre en esa dirección.
  // Sin rotación: la bandera viene inclinada desde el SVG.
  tl.fromTo(
    t.flagSquares,
    { opacity: 0, scale: 0.9, transformOrigin: '50% 50%' },
    {
      opacity: 1,
      scale: 1,
      duration: INTRO.flag.dur,
      ease: 'power2.out',
      stagger: INTRO.flag.stagger,
    },
    INTRO.flag.at,
  )

  // ── 1.30 · la línea ──────────────────────────────────────────────────────
  tl.fromTo(
    t.line,
    { scaleX: 0, transformOrigin: '50% 50%' },
    { scaleX: 1, duration: INTRO.line.dur, ease: 'power3.out' },
    INTRO.line.at,
  )

  // ── 1.55 · la respiración ────────────────────────────────────────────────
  // El drop-shadow sube y baja en paralelo al scale: es lo que hace que se lea
  // como luz encendida y no como un zoom.
  tl.to(
    t.breath,
    {
      keyframes: [
        {
          scale: 1.035,
          filter:
            'drop-shadow(0 0 10px rgb(253 185 22 / 0.85)) drop-shadow(0 0 34px rgb(253 185 22 / 0.5))',
          duration: INTRO.breath.dur / 2,
          ease: 'sine.out',
        },
        {
          scale: 1,
          filter:
            'drop-shadow(0 0 0px rgb(253 185 22 / 0)) drop-shadow(0 0 0px rgb(253 185 22 / 0))',
          duration: INTRO.breath.dur / 2,
          ease: 'sine.in',
        },
      ],
    },
    INTRO.breath.at,
  )

  // ── 2.00 · el viaje al header ────────────────────────────────────────────
  const flip = o.flip(INTRO.flip.dur)
  if (flip) tl.add(flip, INTRO.flip.at)

  tl.to(
    t.line,
    { opacity: 0, duration: INTRO.flip.dur, ease: 'power2.in' },
    INTRO.flip.at,
  )

  if (o.onFlipEnd) tl.call(o.onFlipEnd, undefined, INTRO.flip.at + INTRO.flip.dur)

  // ── 2.30 · el wipe ───────────────────────────────────────────────────────
  // origin right + scaleX 1→0: el borde izquierdo del panel corre hacia la
  // derecha, así que el hero se revela de izquierda a derecha. Es el mismo
  // gesto que el láser, cerrando la intro con el barrido que abre el sitio.
  tl.fromTo(
    t.wipe,
    { scaleX: 1, transformOrigin: '100% 50%' },
    { scaleX: 0, duration: INTRO.wipe.dur, ease: 'power3.inOut' },
    INTRO.wipe.at,
  )

  return tl
}
