import { useEffect, useRef, useState } from 'react'
import { VIDEO_HERO } from '../data/hero'

/**
 * Dónde se para el recorte cuando el video vertical cubre una caja apaisada.
 *
 * En PC el 9:16 se escala al ancho de la pantalla y se ve apenas una franja
 * de un tercio del alto: centrada, esa franja es el poste y el cielo. El auto
 * está al 58% del alto del cuadro, así que el recorte se baja hasta ahí. En
 * mobile el cuadro y la pantalla tienen casi la misma forma y el recorte es
 * de los costados, así que el alto no importa y queda centrado.
 */
const ENCUADRE = 'md:object-[50%_58%]'

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
   * - `lateral` — desktop, video a sangre recortado a horizontal, con el
   *   titular encima a la IZQUIERDA. Oscurece fuerte de ese lado, donde va el
   *   texto, y deja respirar el auto a la derecha; arriba y abajo cierra
   *   contra el ticker y la barra MENU.
   */
  overlay?: 'fuerte' | 'lateral'
}

const OVERLAY: Record<'fuerte' | 'lateral', string> = {
  fuerte:
    'linear-gradient(to bottom, rgb(0 0 0 / .62), rgb(0 0 0 / .55) 45%, rgb(0 0 0 / .82)), radial-gradient(ellipse 110% 70% at 50% 45%, transparent 20%, rgb(0 0 0 / .6) 100%)',
  lateral:
    'linear-gradient(to right, rgb(0 0 0 / .88), rgb(0 0 0 / .66) 40%, rgb(0 0 0 / .22) 75%, rgb(0 0 0 / .3)), linear-gradient(to bottom, rgb(0 0 0 / .45), transparent 28%, transparent 68%, rgb(0 0 0 / .85))',
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
export function HeroVideo({ className = '', overlay = 'fuerte' }: HeroVideoProps) {
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
  // decide quien lo usa —hoy `absolute inset-0` en los dos layouts— y dos utilidades de `position` en el mismo atributo
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
        className={`absolute inset-0 h-full w-full object-cover ${ENCUADRE}`}
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
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${ENCUADRE}`}
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
