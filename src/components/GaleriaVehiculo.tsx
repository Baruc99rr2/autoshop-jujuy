import { useRef, useState } from 'react'
import Bevel from './Bevel'
import Icono from './Icono'
import VisorFotos from './VisorFotos'
import { useMedia } from '../lib/use-media'
import type { Foto } from '../types/vehiculo'

/**
 * La galería de la ficha.
 *
 * DOS LAYOUTS DISTINTOS, no uno responsive. En un teléfono el gesto natural
 * es deslizar con el dedo, así que las fotos van en una tira con scroll-snap
 * y un indicador "3 / 10". En desktop no hay dedo: va una foto grande con la
 * tira de miniaturas debajo. Hacer que uno solo sirva para los dos casos
 * terminaba en flechas chiquitas en mobile o en una tira que se arrastra con
 * el mouse en desktop; ninguna de las dos es lo que la gente espera.
 *
 * Se monta UNO SOLO de los dos (`useMedia`), no los dos con `md:hidden`: con
 * los dos en el DOM, las diez fotos se descargan dos veces.
 *
 * LAS DOS ABREN EL VISOR. Tocar una foto —o hacerle click a la grande— la
 * lleva a pantalla completa (`VisorFotos`). Acá la galería es una vista
 * previa que tiene que convivir con el precio y el botón sin empujarlos fuera
 * de pantalla; mirar el auto de verdad se hace en el visor.
 */

const MD = '(min-width: 768px)'

type GaleriaProps = {
  fotos: Foto[]
  /** Para el `alt` de la primera foto y el `aria-label` de la tira. */
  titulo: string
}

type LayoutProps = GaleriaProps & {
  /** Abre el visor a pantalla completa en la foto que se tocó. */
  onAbrir: (i: number) => void
}

/**
 * El `alt` de la primera foto nombra el auto; el de las demás va vacío.
 *
 * No es pereza: son tomas del MISMO vehículo que el titular de la página ya
 * nombró, y un lector de pantalla leyendo diez veces "Hyundai Tucson 2.0 GL"
 * no agrega nada. El número de foto sí lo dice el indicador.
 */
function alt(titulo: string, i: number): string {
  return i === 0 ? titulo : ''
}

/** "3 / 10" en la esquina. Visible siempre; el detalle hablado va aparte. */
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
          "tres barra diez", que no dice nada. */}
      <p className="sr-only" aria-live="polite">
        Foto {i + 1} de {total}
      </p>
    </>
  )
}

/**
 * La señal de que la foto se abre a pantalla completa.
 *
 * Va siempre visible y no en hover: en un teléfono no hay hover, y es
 * justamente ahí donde la foto chica es el problema. `pointer-events-none`
 * porque quien recibe el toque es el botón que hay debajo, que ocupa la foto
 * entera.
 */
function Lupa() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-3 left-3 bg-void/80 p-2 text-bone"
    >
      <Icono name="expandir" className="h-4 w-4" />
    </span>
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
      outerClassName="block aspect-4/3 md:aspect-16/10"
      className="grid place-items-center p-0"
    >
      <span className="font-hud text-bone/35">SIN FOTOS TODAVÍA</span>
    </Bevel>
  )
}

export function GaleriaVehiculo({ fotos, titulo }: GaleriaProps) {
  const grande = useMedia(MD)
  /** Índice abierto a pantalla completa, o `null` si el visor está cerrado. */
  const [visor, setVisor] = useState<number | null>(null)

  if (fotos.length === 0) return <SinFotos />

  return (
    <>
      {grande ? (
        <Escritorio fotos={fotos} titulo={titulo} onAbrir={setVisor} />
      ) : (
        <Tira fotos={fotos} titulo={titulo} onAbrir={setVisor} />
      )}

      {visor !== null && (
        <VisorFotos
          fotos={fotos}
          titulo={titulo}
          inicial={visor}
          onCerrar={() => setVisor(null)}
        />
      )}
    </>
  )
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
function Tira({ fotos, titulo, onAbrir }: LayoutProps) {
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
          {/* Cada foto es un BOTÓN, no una imagen suelta: el toque tiene que
              abrir el visor, y un `onClick` sobre un `<img>` no existe para el
              teclado ni para un lector de pantalla. El navegador no dispara el
              click si el dedo arrastró, así que deslizar sigue siendo
              deslizar. */}
          {fotos.map((f, k) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onAbrir(k)}
              className="gal-slide relative block w-full shrink-0"
            >
              <img
                src={f.url}
                alt={alt(titulo, k)}
                width={f.ancho}
                height={f.alto}
                /* La primera es lo primero que se ve de la unidad; las demás
                   están fuera de pantalla hasta que alguien deslice. */
                loading={k === 0 ? 'eager' : 'lazy'}
                decoding="async"
                className="aspect-4/3 w-full object-cover"
              />
              <span className="sr-only">
                Ver la foto {k + 1} a pantalla completa
              </span>
            </button>
          ))}
        </div>
      </Bevel>

      <Lupa />
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
 * un corte. Acá los diez elementos ya existen y lo único que cambia es una
 * propiedad animable.
 *
 * LA CAJA GRANDE TIENE TECHO. Era `aspect-3/2` a todo el ancho de la columna
 * y en 1440 eso son más de 600 px de foto: el precio quedaba abajo del pliegue
 * en una página que existe para mostrar un precio. Ahora es 16:10 con
 * `max-h`, y la foto completa se mira en el visor.
 */
function Escritorio({ fotos, titulo, onAbrir }: LayoutProps) {
  const [i, setI] = useState(0)
  const sola = fotos.length === 1

  return (
    <div>
      <div className="relative @container">
        <Bevel
          variant="outline"
          bevel={16}
          borderClassName="bg-graphite"
          /* La proporción va en el contenedor exterior, por lo mismo que en
             `SinFotos`. El hijo la llena con el `h-full` de la variante. */
          /* Doble techo: 30rem en un monitor alto y medio viewport en uno
             bajo. Sin el segundo, en una pantalla de 768 px de alto la foto
             sola se comía la pantalla y el precio volvía a caer abajo del
             pliegue, que es el problema que esto viene a resolver. `svh` y no
             `vh`, como todo alto del sitio.

             EN PC (`lg`) LA FOTO LLENA LA COLUMNA. Ahí el precio ya va a la
             derecha, así que el techo no protegía nada: solo achicaba la foto
             —con el `aspect-ratio` el ancho seguía al alto— y dejaba un hueco
             negro de 300 px entre la foto y el panel del precio. Ahora el
             ancho es siempre el de la columna y lo que se ajusta es el alto:
             16:10 si entra, y si no lo que deja la pantalla debajo del
             titular (los 26rem son header, titular, chips y miniaturas), con
             piso en 2:1 para no recortar el auto de más. `cqw` es el ancho de
             la columna: ver el `@container` de arriba. */
          outerClassName="block aspect-16/10 max-h-[min(30rem,50svh)] lg:aspect-auto lg:h-[min(62.5cqw,max(100svh-26rem,50cqw))] lg:max-h-none"
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

          {/* El click sobre la foto grande abre el visor. Es un botón que la
              cubre entera y va POR ENCIMA de las diez imágenes apiladas, que
              llevan `z-index` propio: de ahí el `z-20`. */}
          <button
            type="button"
            onClick={() => onAbrir(i)}
            className="absolute inset-0 z-20 block h-full w-full cursor-zoom-in"
          >
            <span className="sr-only">
              Ver la foto {i + 1} a pantalla completa
            </span>
          </button>
        </Bevel>

        <Lupa />
        {!sola && <Indicador i={i} total={fotos.length} />}
      </div>

      {/* Con una sola foto no hay nada que elegir: la tira no aparece.
          La tira SCROLLEA en lugar de envolverse: con diez miniaturas de 80 px
          una grilla que envuelve suma una segunda fila y vuelve a empujar el
          precio, que es el problema que veníamos de resolver. */}
      {!sola && (
        <ul className="gal-miniaturas mt-3 flex gap-2 overflow-x-auto">
          {fotos.map((f, k) => (
            <li key={f.id} className="w-20 shrink-0">
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
