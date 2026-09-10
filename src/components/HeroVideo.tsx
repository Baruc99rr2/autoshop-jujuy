import { useEffect, useRef, useState } from 'react'
import { VIDEO_HERO } from '../data/hero'

/** Cuánto antes del final empieza la atenuación del corte del loop, en segundos. */
const ATENUACION_S = 0.45

type HeroVideoProps = {
  className?: string
  /**
   * Cuánto tapa el overlay. Los dos layouts del hero necesitan cosas
   * distintas y por eso no es un solo valor:
   *
   * - `fuerte` — mobile, video a sangre CON el titular encima. Negro plano al
   *   55% más viñeta radial, como pide CLAUDE.md. El clip tiene un farol
   *   encendido y reflejos en el asfalto mojado, y con un overlay flojo la
   *   bajada se cruza con ellos y deja de leerse.
   * - `suave` — desktop, el video vive en su panel y NO tiene texto encima.
   *   Ahí el overlay solo tiene que asentar el clip en la paleta del sitio;
   *   taparlo al 55% desperdiciaría la única imagen en movimiento del hero.
   */
  overlay?: 'fuerte' | 'suave'
}

const OVERLAY: Record<'fuerte' | 'suave', string> = {
  fuerte:
    'linear-gradient(to bottom, rgb(0 0 0 / .62), rgb(0 0 0 / .55) 45%, rgb(0 0 0 / .82)), radial-gradient(ellipse 110% 70% at 50% 45%, transparent 20%, rgb(0 0 0 / .6) 100%)',
  suave:
    'linear-gradient(to bottom, rgb(0 0 0 / .25), rgb(0 0 0 / .05) 45%, rgb(0 0 0 / .55)), radial-gradient(ellipse 120% 80% at 50% 45%, transparent 35%, rgb(0 0 0 / .45) 100%)',
}

/**
 * El video del hero, con las tres reglas de CLAUDE.md resueltas en JS:
 *
 * 1. **El archivo se elige por matchMedia, no con `<source media>`.** Con dos
 *    `<source>` el navegador elige una sola vez, al parsear, y no vuelve a
 *    mirar: girar el teléfono o abrir las devtools deja el archivo equivocado.
 *    Peor todavía, algunos navegadores empiezan a bajar los dos.
 *
 * 2. **`navigator.connection.saveData` corta el video.** Si el usuario pidió
 *    ahorrar datos, se queda el poster y nada más. Son 1,4 MB que no se bajan.
 *
 * 3. **`playsinline` + `muted` + `autoplay`**, en ese orden de importancia. En
 *    iOS, sin los dos primeros no hay autoplay: el video abre en pantalla
 *    completa o directamente no arranca.
 *
 * ATENUACIÓN DEL CORTE: el clip está recortado a 7 s, pero el auto se mueve,
 * así que al reiniciar hay un salto de posición. Cuando faltan 0,45 s baja la
 * opacidad a 0,25 y vuelve a 1 al reiniciar. Con el overlay oscuro encima se
 * lee como un faro que pasa, no como un glitch.
 */
export function HeroVideo({ className = '', overlay = 'suave' }: HeroVideoProps) {
  const video = useRef<HTMLVideoElement>(null)
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    // saveData no está en el tipo estándar de Navigator.
    const conn = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection
    if (conn?.saveData) return

    const mq = window.matchMedia('(max-width: 768px)')
    const aplicar = () => {
      setSrc(mq.matches ? VIDEO_HERO.mobile : VIDEO_HERO.desktop)
    }
    aplicar()
    mq.addEventListener('change', aplicar)
    return () => mq.removeEventListener('change', aplicar)
  }, [])

  // La atenuación va con `timeupdate` y no con un tween: `timeupdate` dispara
  // ~4 veces por segundo, así que basta para decidir, y el fundido en sí lo
  // hace una transición CSS sobre opacity. Sin JS por frame.
  useEffect(() => {
    const el = video.current
    if (!el || !src) return

    // Un solo handler para bajar y para subir. La primera versión tenía además
    // un `seeked` que devolvía la opacidad a 1 pensando en el reinicio del
    // loop, y era un error doble: el reinicio de un <video loop> no dispara
    // `seeked` de forma confiable, y el handler sí se disparaba con cualquier
    // otro salto —incluido el que hace el arnés para fotografiar el corte—,
    // pisando la atenuación justo cuando había que medirla.
    //
    // Con la resta calculada en cada `timeupdate` la vuelta es automática:
    // apenas el loop reinicia, `resta` vuelve a valer ~7 s y la opacidad a 1.
    const alTiempo = () => {
      const resta = (el.duration || VIDEO_HERO.duracion) - el.currentTime
      el.style.opacity = resta < ATENUACION_S ? '0.25' : '1'
    }

    el.addEventListener('timeupdate', alTiempo)
    el.addEventListener('seeked', alTiempo)
    return () => {
      el.removeEventListener('timeupdate', alTiempo)
      el.removeEventListener('seeked', alTiempo)
    }
  }, [src])

  // El contenedor exterior NO lleva `relative`: la caja y la posición las
  // decide quien lo usa —`absolute inset-0` en mobile, `aspect-9/16 h-[…]` en
  // el panel de desktop— y dos utilidades de `position` en el mismo atributo
  // las resuelve el orden en que Tailwind emite las reglas, no el orden en que
  // uno las escribe. Con `relative` acá, el `absolute` de mobile perdía y el
  // video quedaba de altura 0. El contexto de apilamiento va en el hijo.
  return (
    <div className={className}>
      <div className="relative h-full w-full overflow-hidden bg-void">
      {/* El poster va SIEMPRE de fondo, no solo como atributo del <video>:
          así hay imagen desde el primer frame, mientras el video negocia, y
          también cuando saveData impide cargarlo. width/height explícitos
          porque el layout shift rompe los cálculos de ScrollTrigger. */}
      <img
        src={VIDEO_HERO.poster}
        alt=""
        width={1080}
        height={1920}
        // NO lleva `loading="lazy"`: es lo primero que se ve y el candidato a
        // LCP de la página. Lazy acá retrasaría justamente la métrica que hay
        // que cuidar. `fetchPriority` alto lo pone delante del resto.
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {src && (
        <video
          ref={video}
          src={src}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={VIDEO_HERO.poster}
          width={1080}
          height={1920}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
        />
      )}

      {/* Overlay: negro plano + viñeta radial, en la intensidad que pide el
          layout. Ver el comentario de la prop `overlay`. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: OVERLAY[overlay] }}
        />
      </div>
    </div>
  )
}

export default HeroVideo
