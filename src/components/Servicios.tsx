import Bevel from './Bevel'
import Icono from './Icono'
import SectionHeader from './SectionHeader'
import type { Seccion } from '../data/nav'
import { formatearPrecio } from '../lib/formato'
import { scrollTo } from '../lib/smooth'
import type { Servicio } from '../types/contenido'

/**
 * Servicios: los accesos en grilla.
 *
 * La lista la carga la dueña desde el panel y NO TIENE TOPE. Con cero
 * servicios la sección no se dibuja (lo decide `Home`, que además saca su
 * número del riel); con diez, la grilla simplemente suma filas.
 *
 * Índice y eyebrow llegan de `Home` y no de `seccion()`: si una sección de
 * arriba desaparece por estar vacía, los números de las de abajo se corren.
 * El id sigue siendo `postventa` aunque la sección se llame SERVICIOS: es el
 * ancla de `#postventa` y ya circulan links con ese hash.
 *
 * TRES COLUMNAS Y NO CUATRO. En cuatro, cinco servicios caen como 4+1 —un
 * tile solo en una fila entera— y seis como 4+2. En tres, cualquier cantidad
 * deja como mucho una fila a medias al final.
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
export function Servicios({ s: S, servicios }: { s: Seccion; servicios: Servicio[] }) {
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

      <ul className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {servicios.map((s) => (
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
