import Bevel from './Bevel'
import Icono from './Icono'
import SectionHeader from './SectionHeader'
import { seccion } from '../data/nav'
import { SERVICIOS } from '../data/servicios'
import { formatearPrecio } from '../lib/formato'
import { scrollTo } from '../lib/smooth'

/**
 * Índice y eyebrow salen de `nav.ts`, no escritos acá: al insertar una
 * sección nueva se corren todos los números, y con el índice a mano el riel
 * diría una cosa y el encabezado de la sección otra.
 *
 * El id sigue siendo `postventa` aunque la sección se llame SERVICIOS: es el
 * ancla de `#postventa` y ya circulan links con ese hash. Lo que el visitante
 * lee sale del eyebrow.
 */
const S = seccion('postventa')

/**
 * Servicios: los accesos en grilla.
 *
 * TRES COLUMNAS Y NO CUATRO. Hoy son cinco servicios y falta confirmar un
 * sexto. En cuatro columnas, cinco caen como 4+1 —un tile solo en una fila
 * entera— y seis como 4+2, que es peor. En tres, cinco caen como 3+2 y seis
 * como dos filas llenas: el día que llegue el sexto no hay nada que tocar.
 *
 * Cada tile es un enlace real a la sección de contacto, no un `<div>` con
 * hover. Así el bloque se recorre con Tab, el barrido responde igual al foco
 * que al puntero, y en un teléfono —donde no hay hover— tocarlo hace algo en
 * vez de quedarse quieto.
 *
 * El barrido ámbar de izquierda a derecha es el mismo de la FAQ: un
 * pseudo-elemento con `scaleX` desde `transform-origin: left`, y el color del
 * contenido cambiando con `transition-delay` para que el barrido lo alcance.
 */
export function Servicios() {
  return (
    <section
      id={S.id}
      className="border-b border-graphite/60 py-24 shell md:py-32"
    >
      <SectionHeader
        index={S.indice}
        eyebrow={S.eyebrow}
        title={
          <>
            No termina cuando
            <br />
            te llevás el auto
          </>
        }
        lead="Todo lo que el auto necesita después de la compra, en el mismo lugar donde lo comprás. Escribinos y coordinamos el turno o la contratación."
      />

      <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICIOS.map((s) => (
          <li key={s.id}>
            <Bevel
              as="a"
              variant="outline"
              bevel={16}
              borderClassName="bg-graphite"
              outerClassName="tile-host block h-full transition-colors duration-300 hover:bg-amber focus-visible:bg-amber"
              className="tile flex h-full flex-col p-6 md:p-7"
              href="#contacto"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault()
                scrollTo('#contacto')
              }}
            >
              <Icono name={s.icono} size={30} className="shrink-0" />

              {/* `text-balance` porque hay títulos de una palabra ("Seguros")
                  y de cuatro ("Limpieza de interiores + motor") en la misma
                  fila: sin esto el largo se parte donde cae y deja una palabra
                  suelta en el segundo renglón. */}
              <h3 className="font-display mt-8 text-lg text-balance md:text-xl">
                {s.titulo}
              </h3>

              {/* La línea de abajo se COMPONE: la cifra en Martian Mono y la
                  condición en Archivo. La mono es para cifras y nada más, así
                  que "con débito automático" en mono se leería como un código
                  de error. Y el precio va a opacidad plena mientras que el
                  detalle va al 60%: el número es el dato que se vino a buscar.

                  Se separan con `gap` y no con un `·`: en un tile angosto el
                  detalle baja a su propio renglón y un separador colgando al
                  final del anterior queda huérfano. */}
              <p className="mt-3 flex flex-wrap items-baseline gap-x-2 text-sm/6">
                {s.precio !== null && (
                  <span className="font-hud num text-base">
                    {formatearPrecio(s.precio)}
                  </span>
                )}
                {s.detalle && <span className="opacity-60">{s.detalle}</span>}
              </p>

              <span
                className="font-hud mt-auto pt-8 opacity-45"
                aria-hidden="true"
              >
                Consultar ///
              </span>
            </Bevel>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default Servicios
