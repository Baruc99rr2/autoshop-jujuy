import { useRef, useState } from 'react'
import Bevel from './Bevel'
import { useMedia } from '../lib/use-media'
import type { Foto } from '../types/vehiculo'

/**
 * La galería de la ficha.
 *
 * DOS LAYOUTS DISTINTOS, no uno responsive. En un teléfono el gesto natural
 * es deslizar con el dedo, así que las fotos van en una tira con scroll-snap
 * y un indicador "2 / 5". En desktop no hay dedo: va una foto grande con la
 * tira de miniaturas debajo. Hacer que uno solo sirva para los dos casos
 * terminaba en flechas chiquitas en mobile o en una tira que se arrastra con
 * el mouse en desktop; ninguna de las dos es lo que la gente espera.
 *
 * Se monta UNO SOLO de los dos (`useMedia`), no los dos con `md:hidden`: con
 * los dos en el DOM, las seis fotos se descargan dos veces.
 */

const MD = '(min-width: 768px)'

type GaleriaProps = {
  fotos: Foto[]
  /** Para el `alt` de la primera foto y el `aria-label` de la tira. */
  titulo: string
}

/**
 * El `alt` de la primera foto nombra el auto; el de las demás va vacío.
 *
 * No es pereza: son tomas del MISMO vehículo que el titular de la página ya
 * nombró, y un lector de pantalla leyendo cinco veces "Hyundai Tucson 2.0 GL"
 * no agrega nada. El número de foto sí lo dice el indicador.
 */
function alt(titulo: string, i: number): string {
  return i === 0 ? titulo : ''
}

/** "2 / 5" en la esquina. Visible siempre; el detalle hablado va aparte. */
function Indicador({ i, total }: { i: number; total: number }) {
  return (
    <>
      <Bevel
        variant="ghost"
        bevel={8}
        surfaceClassName="bg-void/80 text-bone"
        className="font-hud num pointer-events-none absolute right-3 bottom-3 px-3 py-1.5"
        aria-hidden="true"
      >
        {i + 1} / {total}
      </Bevel>
      {/* Lo que se anuncia al deslizar. El indicador de arriba se lee
          "dos barra cinco", que no dice nada. */}
      <p className="sr-only" aria-live="polite">
        Foto {i + 1} de {total}
      </p>
    </>
  )
}

/** El hueco de una unidad cargada y todavía sin fotos. Es un estado real. */
function SinFotos() {
  return (
    <Bevel
      variant="outline"
      bevel={16}
      borderClassName="bg-graphite"
      /* La proporción va acá, en el contenedor EXTERIOR: el hijo de la
         variante `outline` ya lleva `h-full`, y un `height: 100%` contra un
         padre de alto automático más un `aspect-ratio` en el mismo elemento
         deja la altura a merced de cómo lo resuelva el navegador. */
      outerClassName="block aspect-4/3 md:aspect-3/2"
      className="grid place-items-center p-0"
    >
      <span className="font-hud text-bone/35">SIN FOTOS TODAVÍA</span>
    </Bevel>
  )
}

export function GaleriaVehiculo({ fotos, titulo }: GaleriaProps) {
  const grande = useMedia(MD)

  if (fotos.length === 0) return <SinFotos />
  if (grande) return <Escritorio fotos={fotos} titulo={titulo} />
  return <Tira fotos={fotos} titulo={titulo} />
}

/**
 * Mobile: una tira con scroll-snap.
 *
 * `mandatory` y no `proximity`, igual que los otros rieles del sitio: con las
 * fotos al 100% del ancho, proximity deja media foto a la vista si el gesto
 * fue corto.
 *
 * El índice se deduce del `scrollLeft`, no de un estado que alguien tenga que
 * mantener sincronizado con el gesto: el scroll es la única verdad, y así
 * también acierta cuando se llega deslizando a mitad de camino y se suelta.
 */
function Tira({ fotos, titulo }: GaleriaProps) {
  const [i, setI] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const sola = fotos.length === 1

  const alScrollear = () => {
    const el = ref.current
    if (!el) return
    const n = Math.round(el.scrollLeft / el.clientWidth)
    setI(Math.min(Math.max(n, 0), fotos.length - 1))
  }

  return (
    <div className="relative">
      <Bevel
        variant="outline"
        bevel={16}
        borderClassName="bg-graphite"
        outerClassName="block"
        className="p-0"
      >
        <div
          ref={ref}
          onScroll={sola ? undefined : alScrollear}
          className={`gal-tira flex ${sola ? '' : 'overflow-x-auto'}`}
          role={sola ? undefined : 'group'}
          aria-label={sola ? undefined : `Fotos de ${titulo}`}
          /* Enfocable a mano: una caja con scroll propio que no recibe foco no
             se puede recorrer con el teclado, y en una ventana angosta de
             escritorio este es el layout que se monta. */
          tabIndex={sola ? undefined : 0}
        >
          {fotos.map((f, k) => (
            <img
              key={f.id}
              src={f.url}
              alt={alt(titulo, k)}
              width={f.ancho}
              height={f.alto}
              /* La primera es lo primero que se ve de la unidad; las demás
                 están fuera de pantalla hasta que alguien deslice. */
              loading={k === 0 ? 'eager' : 'lazy'}
              decoding="async"
              className="gal-slide aspect-4/3 w-full shrink-0 object-cover"
            />
          ))}
        </div>
      </Bevel>

      {!sola && <Indicador i={i} total={fotos.length} />}
    </div>
  )
}

/**
 * Desktop: foto grande y miniaturas.
 *
 * Las fotos van TODAS apiladas en la misma caja y lo que decide cuál se ve es
 * el `clip-path`: la activa y todas las anteriores quedan abiertas, las
 * posteriores recortadas a cero por la izquierda. Al avanzar, la foto nueva
 * barre por encima de la anterior de izquierda a derecha —el mismo gesto de
 * la FAQ y de la card—; al retroceder, la actual se retira y descubre la de
 * abajo, que es el mismo barrido al revés.
 *
 * Está escrito así, y no montando y desmontando la foto activa, porque un
 * elemento recién montado no transiciona desde su valor inicial: entraría de
 * un corte. Acá los seis elementos ya existen y lo único que cambia es una
 * propiedad animable.
 */
function Escritorio({ fotos, titulo }: GaleriaProps) {
  const [i, setI] = useState(0)
  const sola = fotos.length === 1

  return (
    <div>
      <div className="relative">
        <Bevel
          variant="outline"
          bevel={16}
          borderClassName="bg-graphite"
          /* La proporción va en el contenedor exterior, por lo mismo que en
             `SinFotos`. El hijo la llena con el `h-full` de la variante. */
          outerClassName="block aspect-3/2"
          className="relative overflow-hidden p-0"
        >
          {fotos.map((f, k) => (
            <img
              key={f.id}
              src={f.url}
              alt={alt(titulo, k)}
              width={f.ancho}
              height={f.alto}
              loading={k === 0 ? 'eager' : 'lazy'}
              decoding="async"
              className="gal-foto absolute inset-0 h-full w-full object-cover"
              style={{
                zIndex: k,
                clipPath: k <= i ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
              }}
            />
          ))}
        </Bevel>

        {!sola && <Indicador i={i} total={fotos.length} />}
      </div>

      {/* Con una sola foto no hay nada que elegir: la tira no aparece. */}
      {!sola && (
        <ul className="mt-3 flex gap-3">
          {fotos.map((f, k) => (
            <li key={f.id} className="w-24">
              <Bevel
                as="button"
                type="button"
                variant="outline"
                bevel={8}
                borderClassName={k === i ? 'bg-amber' : 'bg-graphite'}
                outerClassName="block w-full transition-colors duration-200 hover:bg-amber"
                className="p-0"
                onClick={() => setI(k)}
                aria-label={`Ver la foto ${k + 1} de ${fotos.length}`}
                aria-current={k === i}
              >
                <img
                  src={f.url}
                  alt=""
                  width={f.ancho}
                  height={f.alto}
                  loading="lazy"
                  decoding="async"
                  className={`aspect-4/3 w-full object-cover transition-opacity duration-200 ${
                    k === i ? 'opacity-100' : 'opacity-55'
                  }`}
                />
              </Bevel>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default GaleriaVehiculo
