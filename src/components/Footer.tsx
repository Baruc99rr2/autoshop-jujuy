import { useRef, type CSSProperties } from 'react'
import Bevel from './Bevel'
import {
  comoLlegarUrl,
  coordenadasValidas,
  mapaEmbedUrl,
  NEGOCIO,
  whatsappUrl,
} from '../data/contacto'
import { FOOTER, HREF_WHATSAPP } from '../data/nav'
import { useFitText } from '../lib/fit-text'
import { useObservarPie } from '../lib/pie-a-la-vista'
import {
  apuntaAOculta,
  seccionesOcultas,
  useContacto,
  useContenido,
} from '../lib/contenido'
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
  const contacto = useContacto()
  const hayMapa = coordenadasValidas(contacto.lat, contacto.lng)

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
        0km y usados en {NEGOCIO.ciudad}. Financiación propia y toma de tu
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

            <ul className="mt-3">
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
                    href={
                      item.href === HREF_WHATSAPP ? whatsappUrl(contacto.whatsapp) : item.href
                    }
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

      {/* ── Dónde estamos ─────────────────────────────────────────────
          La dirección, los horarios y el mapa salen de lo que carga la
          dueña: si cambia la dirección y las coordenadas en el panel, el mapa
          y el «Cómo llegar» las siguen. */}
      <section
        aria-labelledby="footer-ubicacion"
        className="mt-20 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] md:gap-8"
      >
        <div>
          <h3
            id="footer-ubicacion"
            className="font-hud flex items-center gap-2 text-bone/40"
          >
            <span className="text-amber" aria-hidden="true">
              \
            </span>
            DÓNDE ESTAMOS
          </h3>
          <p className="font-display mt-4 text-xl text-balance text-bone">
            {contacto.direccion}
          </p>
          {contacto.horarios.length > 0 && (
            <ul className="mt-4 space-y-1 text-bone/55">
              {contacto.horarios.map((h) => (
                <li key={`${h.dias}-${h.horas}`}>
                  <span className="text-bone/80">{h.dias}</span> {h.horas}
                </li>
              ))}
            </ul>
          )}
          {hayMapa && (
            <div className="mt-8">
              <Bevel
                as="a"
                variant="solid"
                bevel={12}
                href={comoLlegarUrl(contacto)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-hud inline-flex min-h-[3rem] items-center gap-3 px-6"
              >
                <span>CÓMO LLEGAR</span>
                <span aria-hidden="true">\</span>
              </Bevel>
            </div>
          )}
        </div>

        {hayMapa && (
          <div>
            {/* El embed de OpenStreetMap, sin clave. Detalles:
                - `loading="lazy"`: el iframe (y sus mosaicos) se pide recién
                  cuando el footer se acerca a la pantalla.
                - `.mapa-oscuro` lo invierte y le baja el color: un rectángulo
                  blanco sobre el negro del footer era lo único que se veía.
                - En pantallas táctiles no recibe el dedo: arrastrar el mapa
                  en vez de la página es la trampa clásica de un mapa
                  embebido en un celular. Para moverse está «Cómo llegar».
                - `width`/`height` reservan la caja igual que en una <img>. */}
            <div
              className="bevel relative aspect-4/3 overflow-hidden bg-asphalt md:aspect-video"
              style={{ '--bevel': '16px' } as CSSProperties}
            >
              <iframe
                key={mapaEmbedUrl(contacto)}
                src={mapaEmbedUrl(contacto)}
                title={`Mapa con la ubicación del salón: ${contacto.direccion}`}
                loading="lazy"
                width={800}
                height={450}
                className="mapa-oscuro absolute inset-0 h-full w-full border-0 pointer-coarse:pointer-events-none"
              />
            </div>
            {/* La atribución que pide la licencia de OpenStreetMap (ODbL):
                el embed trae la suya adentro, pero con el filtro queda
                apagada y en el celular no se puede tocar. */}
            <p className="font-hud mt-3 text-bone/40">
              Mapa ©{' '}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noopener noreferrer"
                className="-my-3.5 inline-block py-3.5 underline underline-offset-4 transition-colors duration-200 hover:text-amber focus-visible:text-amber"
              >
                colaboradores de OpenStreetMap
              </a>
            </p>
          </div>
        )}
      </section>

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
            © {año} {NEGOCIO.nombreLegal}
          </p>

          <p className="font-hud text-bone/40">
            Sitio desarrollado por{' '}
            <a
              href="https://skytechnorth.com"
              target="_blank"
              rel="noopener noreferrer"
              /* Alto táctil de 44 px sin agrandar la línea: el padding lo
                 devuelven los márgenes negativos. */
              className="-my-3.5 inline-block py-3.5 underline-offset-4 transition-colors duration-200 hover:text-amber hover:underline focus-visible:text-amber focus-visible:underline"
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
