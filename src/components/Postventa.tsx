import Bevel from './Bevel'
import Icono from './Icono'
import SectionHeader from './SectionHeader'
import { seccion } from '../data/nav'
import { POSTVENTA } from '../data/postventa'
import { scrollTo } from '../lib/smooth'

/**
 * Índice y eyebrow salen de `nav.ts`, no escritos acá: al insertar una
 * sección nueva se corren todos los números, y con el índice a mano el riel
 * diría una cosa y el encabezado de la sección otra.
 */
const S = seccion('postventa')

/**
 * Post-venta: cuatro accesos en grilla.
 *
 * Cada tile es un enlace real a la sección de contacto, no un `<div>` con
 * hover. Así el bloque se recorre con Tab, el barrido responde igual al foco
 * que al puntero, y en un teléfono —donde no hay hover— tocarlo hace algo en
 * vez de quedarse quieto. En el sitio real cada uno llevaría a su propio
 * formulario de turno.
 *
 * El barrido ámbar de izquierda a derecha es el mismo de la FAQ: un
 * pseudo-elemento con `scaleX` desde `transform-origin: left`, y el color del
 * contenido cambiando con `transition-delay` para que el barrido lo alcance.
 */
export function Postventa() {
  return (
    <section
      id="postventa"
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
        lead="El taller está a media cuadra del salón. Turnos, repuestos y accesorios en el mismo lugar donde compraste."
      />

      <ul className="mt-14 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {POSTVENTA.map((a) => (
          <li key={a.id}>
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
              <Icono name={a.icono} size={30} className="shrink-0" />

              <h3 className="font-display mt-8 text-xl">{a.titulo}</h3>

              <p className="mt-3 text-sm/6 opacity-60">{a.descripcion}</p>

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

export default Postventa
