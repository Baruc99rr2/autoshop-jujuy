import { useRef, type CSSProperties } from 'react'
import { CONTACTO } from '../data/contacto'
import { FOOTER } from '../data/nav'
import { useFitText } from '../lib/fit-text'
import { useObservarPie } from '../lib/pie-a-la-vista'
import { apuntaAOculta, seccionesOcultas, useContenido } from '../lib/contenido'
import { useIrA } from '../lib/ir-a'
import { scrollTo } from '../lib/smooth'

/**
 * Footer escalonado.
 *
 * La firma del bloque es la sangría creciente por ítem: cada link entra un
 * poco más que el anterior, así que la columna dibuja una diagonal y rima con
 * el `\` del riel. Se mantiene en mobile — sin el escalonado, el bloque es una
 * lista de links cualquiera.
 */
export function Footer() {
  const año = new Date().getFullYear()
  const logotipo = useRef<HTMLHeadingElement>(null)
  useFitText(logotipo)

  // El footer es el que sabe dónde está su franja de abajo, así que es el que
  // la observa; los flotantes solo leen el booleano. Ver `pie-a-la-vista.ts`.
  const pie = useRef<HTMLDivElement>(null)
  useObservarPie(pie)
  const irA = useIrA()
  // Los links a Servicios y Preguntas se van si esas secciones están vacías.
  const ocultas = seccionesOcultas(useContenido())

  return (
    <footer
      id="footer"
      className="relative overflow-hidden border-t border-graphite bg-void pt-24 pb-10 shell"
    >
      {/* El logotipo a ancho completo. `\` en ámbar como separador: es el mismo
          marcador del riel, y ata el footer al resto de la página. */}
      <h2
        ref={logotipo}
        className="font-hero text-bone whitespace-nowrap"
        /* El tamaño real lo pone useFitText midiendo. Este clamp es solo el
           punto de partida del primer frame, antes de la medición. */
        style={{ fontSize: 'clamp(2rem, 8vw, 9rem)' }}
      >
        AutoShop
        <span className="text-amber" aria-hidden="true">
          \
        </span>
        Jujuy
      </h2>

      <p className="mt-8 max-w-[46ch] text-bone/55">
        0km y usados en {CONTACTO.ciudad}. Financiación propia y toma de tu
        usado como parte de pago.
      </p>

      <div className="mt-20 grid gap-14 md:grid-cols-3 md:gap-8">
        {FOOTER.map((col) => (
          <nav key={col.titulo} aria-label={col.titulo}>
            <h3 className="font-hud flex items-center gap-2 text-bone/40">
              <span className="text-amber" aria-hidden="true">
                \
              </span>
              {col.titulo}
            </h3>

            <ul className="mt-6 space-y-1.5">
              {col.items
                .filter((item) => !apuntaAOculta(item.href, ocultas))
                .map((item, i) => (
                <li
                  key={item.label}
                  className="stagger-item"
                  style={{ '--i': i } as CSSProperties}
                >
                  <a
                    className="stagger-link"
                    href={item.href}
                    target={item.externo ? '_blank' : undefined}
                    rel={item.externo ? 'noreferrer noopener' : undefined}
                    onClick={
                      item.externo
                        ? undefined
                        : (e) => {
                            e.preventDefault()
                            irA(item.href)
                          }
                    }
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      {/* Esta franja es la que se observa: cuando aparece, la barra MENU, el
          botón de WhatsApp y la barra fija de la ficha se apartan en vez de
          quedarse encima del © y de la firma. */}
      <div
        ref={pie}
        className="mt-24 flex flex-col gap-5 border-t border-graphite pt-8 md:flex-row md:items-baseline md:justify-between"
      >
        {/* El © del cliente y la firma del estudio, en la misma tinta y en el
            mismo tamaño: la firma acompaña, no compite. Quien lee el pie busca
            el nombre de la concesionaria, y ponerlo a la par de quien hizo el
            sitio sería cobrarse la obra en la fachada del cliente. */}
        <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:gap-6">
          <p className="font-hud text-bone/40">
            © {año} {CONTACTO.nombreLegal}
          </p>

          <p className="font-hud text-bone/40">
            Sitio desarrollado por{' '}
            <a
              href="https://skytechnorth.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-4 transition-colors duration-200 hover:text-amber hover:underline focus-visible:text-amber focus-visible:underline"
            >
              SkyTechNorth
            </a>
          </p>
        </div>

        <button
          type="button"
          className="stagger-link font-hud self-start text-bone/70 md:self-auto"
          onClick={() => scrollTo(0)}
        >
          Volver arriba ↑
        </button>
      </div>
    </footer>
  )
}

export default Footer
