import Bevel from './Bevel'
import HeroVideo from './HeroVideo'
import Ticker from './Ticker'
import { HERO, TICKER } from '../data/hero'
import { seccion } from '../data/nav'
import { scrollTo } from '../lib/smooth'
import { useMedia } from '../lib/use-media'

const S = seccion('hero')

/**
 * EL VIDEO VA DE FONDO, A SANGRE, EN LOS DOS LAYOUTS.
 *
 * El video es vertical (9:16). En mobile es el formato de la pantalla y se ve
 * casi entero. En PC se recorta a horizontal: escalado al ancho se ve una
 * franja de un tercio del alto, y esa franja se baja hasta el auto (ver
 * `ENCUADRE` en `HeroVideo`). Antes iba en un panel vertical a la derecha y
 * en una pantalla ancha se leía como un celular apoyado en el escritorio.
 *
 * El titular va encima, a la izquierda. Lo que cambia entre los dos layouts
 * es el overlay: en mobile tapa parejo, en PC oscurece el lado del texto y
 * deja el auto a la vista.
 */
export function Hero() {
  // Decide solo el overlay: el video es uno y el mismo en los dos layouts.
  // El breakpoint es el mismo `768px` que usa Tailwind para `md`.
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
      {/* ── El video a sangre, detrás de todo ───────────────────── */}
      <HeroVideo
        className="absolute inset-0"
        overlay={esMobile ? 'fuerte' : 'lateral'}
      />

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
      </div>
    </section>
  )
}

export default Hero
