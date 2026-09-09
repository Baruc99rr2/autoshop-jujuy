import Bevel from './Bevel'
import HeroVideo from './HeroVideo'
import Ticker from './Ticker'
import { HERO, TICKER } from '../data/hero'
import { seccion } from '../data/nav'
import { scrollTo } from '../lib/smooth'
import { useMedia } from '../lib/use-media'

const S = seccion('hero')

/**
 * HERO PARTIDO EN DESKTOP, FULL-BLEED EN MOBILE.
 *
 * El video es vertical (9:16). En desktop no se puede usar a sangre: escalado
 * a 1920 de ancho el alto pasa a 3413 px y en un viewport de 1080 se vería un
 * tercio del encuadre — o el farol o el auto, nunca los dos. La solución no es
 * recortar sino cambiar el layout: texto a la izquierda sobre negro, panel
 * vertical biselado con el video a la derecha, a altura de viewport.
 *
 * En mobile el 9:16 ES el formato de la pantalla, así que el video vuelve a
 * fondo completo y el titular va encima.
 *
 * Un componente, dos layouts: el mismo `<HeroVideo>` cambia de caja, no de
 * contenido.
 */
export function Hero() {
  // El layout se elige en JS y no con `md:hidden`, porque las dos variantes
  // montan un <video>: con las dos en el DOM había dos elementos con el mismo
  // `src` y el oculto igual pedía la metadata del archivo. El breakpoint es el
  // mismo `768px` que usa Tailwind para `md`.
  const esMobile = useMedia('(max-width: 767px)')

  const salto = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    scrollTo(href)
  }

  return (
    <section
      id={S.id}
      className="relative flex min-h-svh flex-col overflow-hidden"
    >
      {/* ── MOBILE: el video a sangre, detrás de todo ───────────────── */}
      {esMobile && (
        <HeroVideo className="absolute inset-0" overlay="fuerte" />
      )}

      {/* ── TICKER ──────────────────────────────────────────────────
          Arriba del todo y a sangre de borde a borde, POR ENCIMA del riel:
          es la única franja del sitio que lo cruza, y ese cruce es lo que la
          hace leer como un instrumento y no como una línea de texto más.
          Va debajo del header (pt) para no taparse con el logo. */}
      <div className="relative z-10 mt-16 border-y border-graphite/70 bg-void/45 py-2.5 backdrop-blur-sm md:mt-20">
        <Ticker items={TICKER} />
      </div>

      {/* ── CUERPO ──────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-1 items-center gap-8 pt-10 pb-28 shell md:pb-16 lg:gap-12">
        {/* Columna de texto. En md el panel del video es angosto, así que la
            columna necesita más ancho que en lg o el titular se parte. */}
        <div className="w-full md:w-[64%] lg:w-[56%]">
          <p className="font-hud mb-5 flex items-center gap-2 text-bone/45">
            <span aria-hidden="true" className="text-amber md:hidden">
              \
            </span>
            <span className="num text-amber">{S.indice}</span>
            <span aria-hidden="true">—</span>
            <span>{HERO.kicker.toUpperCase()}</span>
          </p>

          {/* NO usa el token `--text-hero` (clamp 11vw). Ese clamp está pensado
              para un hero a sangre; acá el titular vive en una columna del 56%
              y a 1440 px se partía en cuatro renglones que se salían del alto
              del viewport. El clamp de abajo está calculado contra la línea
              más larga ("Tu próximo", 10 caracteres) y verificado con la
              medición `hero titular` del arnés. */}
          <h1 className="hero-titulo font-hero text-bone">
            {HERO.titulo.map((linea, i) => (
              <span key={linea} className="block">
                {linea}
                {i === HERO.titulo.length - 1 && (
                  <span aria-hidden="true" className="text-amber">
                    .
                  </span>
                )}
              </span>
            ))}
          </h1>

          <p className="mt-6 max-w-[46ch] text-body text-bone/70">
            {HERO.bajada}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Bevel
              as="a"
              variant="solid"
              bevel={12}
              href={HERO.accionPrimaria.href}
              onClick={salto(HERO.accionPrimaria.href)}
              className="font-hud px-6 py-4 transition-transform duration-200 hover:-translate-y-0.5"
            >
              {HERO.accionPrimaria.label.toUpperCase()}
            </Bevel>

            <Bevel
              as="a"
              variant="outline"
              bevel={12}
              href={HERO.accionSecundaria.href}
              onClick={salto(HERO.accionSecundaria.href)}
              outerClassName="block transition-colors duration-200 hover:bg-amber"
              className="font-hud px-6 py-4 text-bone"
            >
              {HERO.accionSecundaria.label.toUpperCase()}
            </Bevel>
          </div>
        </div>

        {/* ── DESKTOP: el panel vertical del video ──────────────────
            El tamaño se deriva de la ALTURA, no del ancho: `h-[…]` fija el
            alto disponible y `aspect-9/16` saca el ancho de ahí. Al revés
            —ancho del contenedor y alto por aspecto— el alto depende de un
            ancho que a su vez depende del contenido, y el panel colapsa. */}
        {!esMobile && (
          <div className="flex flex-1 items-center justify-end">
            <Bevel variant="outline" bevel={18} outerClassName="block" className="p-0">
              <HeroVideo className="hero-panel" />
            </Bevel>
          </div>
        )}
      </div>
    </section>
  )
}

export default Hero
