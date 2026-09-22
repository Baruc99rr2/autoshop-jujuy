import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import Bevel from '../components/Bevel'
import EtiquetasVehiculo from '../components/EtiquetasVehiculo'
import GaleriaVehiculo from '../components/GaleriaVehiculo'
import PaginaInterna from '../components/PaginaInterna'
import VehiculoCard from '../components/VehiculoCard'
import VideoVehiculo from '../components/VideoVehiculo'
import { whatsappCon } from '../data/contacto'
import { repo } from '../data/repo'
import {
  CONDICION_LABEL,
  ESTADO_LABEL,
  formatearAnio,
  formatearKm,
  formatearPrecio,
} from '../lib/formato'
import { getLenis } from '../lib/smooth'
import { useTitulo } from '../lib/titulo'
import type { EstadoVehiculo, Vehiculo as TVehiculo } from '../types/vehiculo'
import NoEncontrado from './NoEncontrado'

/**
 * La ficha de una unidad.
 *
 * NO HAY FICHA TÉCNICA y no es un olvido: en esta concesionaria el detalle
 * —motor, caja, papeles, forma de pago— se cierra por WhatsApp, y una tabla de
 * especificaciones a medio llenar da peor impresión que no tenerla. Lo que la
 * página tiene que lograr es que se entienda qué auto es, que se vea, y que
 * escribir cueste un toque.
 *
 * De ahí el orden: fotos, precio y botón arriba; el texto, el video y las
 * etiquetas después; y en mobile el botón queda fijo abajo para que nunca haya
 * que volver a subir a buscarlo.
 */

/** Cuántas unidades se ofrecen al final. Tres: una fila. */
const OTRAS = 3

const CHIP: Record<EstadoVehiculo, string> = {
  disponible: 'bg-amber text-void',
  reservado: 'bg-flag text-bone',
  vendido: 'bg-flag text-bone',
}

/**
 * Las celdas de la fila HUD. Escritas celda por celda y no calculadas, por la
 * misma razón que en la card: `border-l` junto a `border-l-0` en el mismo
 * atributo lo resuelve el orden en que Tailwind emite las reglas, no el orden
 * en que uno las escribe.
 */
const CELDA = ['flex-1 pr-4', 'flex-1 border-l border-graphite pl-4']

function Dato({ label, valor, i }: { label: string; valor: string; i: number }) {
  return (
    <div className={`min-w-0 ${CELDA[i]}`}>
      <span className="font-hud block text-bone/40">{label}</span>
      <span className="font-hud num mt-1.5 block truncate text-xl text-bone">
        {valor}
      </span>
    </div>
  )
}

function Chip({ children, clase }: { children: string; clase: string }) {
  return (
    <Bevel
      variant="ghost"
      bevel={8}
      surfaceClassName={clase}
      className="font-hud px-3 py-1.5"
    >
      {children}
    </Bevel>
  )
}

/**
 * Título de una sección de la ficha. No usa `SectionHeader`: eso es el
 * encabezado de la PÁGINA, y acá hay tres subtítulos que tienen que pesar
 * menos que el nombre del auto.
 */
function Titulo({ children }: { children: string }) {
  return (
    <h2 className="font-hud flex items-center gap-3 text-bone/45">
      <span aria-hidden="true" className="text-amber">
        \
      </span>
      {children}
    </h2>
  )
}

/**
 * El mensaje que le llega al teléfono de la dueña.
 *
 * Lleva el link de la ficha y no solo el nombre: con veinte unidades
 * publicadas, "me interesa el Corolla" obliga a preguntar cuál, y el link abre
 * exactamente la que el visitante estaba mirando.
 *
 * La URL se arma con `origin` más la ruta y no con `location.href`: así no se
 * cuelan los parámetros de una campaña ni el `#` de un ancla.
 */
function mensaje(v: TVehiculo): string {
  const url = `${window.location.origin}/vehiculo/${v.slug}`
  return `Hola, me interesa el ${v.titulo} que vi en la web: ${url}`
}

/**
 * El orden de "otros vehículos": misma condición primero y los vendidos al
 * fondo. Quien está mirando un 0km es mucho más probable que quiera otro 0km,
 * y ofrecerle primero algo que ya se vendió es ofrecerle nada.
 *
 * `sort` es estable, así que dentro de cada grupo se conserva el orden que
 * trajo el repo, que es el más reciente primero.
 */
function otrasPrimero(actual: TVehiculo) {
  const peso = (v: TVehiculo) =>
    (v.condicion === actual.condicion ? 0 : 2) + (v.estado === 'vendido' ? 1 : 0)
  return (a: TVehiculo, b: TVehiculo) => peso(a) - peso(b)
}

export function Vehiculo() {
  const { slug = '' } = useParams()

  // El resultado se guarda JUNTO CON el slug que lo trajo, igual que en el
  // catálogo: "todavía no sé" se DEDUCE comparando ese slug con el de la URL.
  // La alternativa —un `setV(undefined)` al principio del efecto— es un render
  // de más y, sobre todo, es estado que se limpia en un efecto en vez de
  // derivarse, así que al ir de una ficha a otra queda un frame mostrando el
  // auto anterior con el slug nuevo.
  //
  // `v: null` es "no existe o es un borrador", que NO es lo mismo que "todavía
  // no sé": con un solo valor la página mostraría el 404 por un frame antes de
  // tener los datos.
  const [datos, setDatos] = useState<{
    slug: string
    v: TVehiculo | null
    otras: TVehiculo[]
  }>()

  const listo = datos?.slug === slug
  const v = listo ? datos.v : undefined
  const otras = listo ? datos.otras : []

  useTitulo(v ? v.titulo : null)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      const encontrado = await repo.obtenerPorSlug(slug)
      if (!vivo) return

      // UN BORRADOR SE TRATA COMO INEXISTENTE. El repo lo devuelve igual —el
      // panel necesita poder previsualizarlo— y es la ficha la que decide: una
      // unidad sin publicar no tiene dirección pública.
      if (!encontrado || !encontrado.publicado) {
        setDatos({ slug, v: null, otras: [] })
        return
      }
      // La ficha se muestra sin esperar a "otros vehículos": es un segundo
      // pedido y está al final de la página, así que no puede demorar lo que
      // la persona vino a ver.
      setDatos({ slug, v: encontrado, otras: [] })

      const resto = await repo.listar({ orden: 'recientes' })
      if (!vivo) return
      const sugeridas = resto
        .filter((x) => x.id !== encontrado.id)
        .sort(otrasPrimero(encontrado))
        .slice(0, OTRAS)
      setDatos((d) => (d?.slug === slug ? { ...d, otras: sugeridas } : d))
    })()
    return () => {
      vivo = false
    }
  }, [slug])

  // El alto del documento cambia cuando llegan los datos: la galería, el video
  // y las etiquetas no existían en el primer pintado. Sin esto Lenis sigue
  // creyendo que la página mide lo que medía el esqueleto y el scroll frena
  // antes del footer.
  useEffect(() => {
    if (!v) return
    getLenis()?.resize()
  }, [v])

  if (v === undefined) return <Esqueleto />
  if (v === null) return <NoEncontrado />

  const wa = whatsappCon(mensaje(v))

  return (
    <PaginaInterna
      indice="01"
      eyebrow="VEHÍCULO"
      titulo={v.titulo}
      /* En mobile el botón fijo de abajo ya es el de WhatsApp: con el flotante
         además quedan dos botones ámbar pidiendo lo mismo, uno arriba del otro.
         En desktop el flotante es mueble del sitio y se queda. */
      flotante="desktop"
    >
      <div className="mt-6 flex flex-wrap gap-2">
        <Chip clase="bg-graphite text-bone">
          {CONDICION_LABEL[v.condicion].toUpperCase()}
        </Chip>
        <Chip clase={CHIP[v.estado]}>{ESTADO_LABEL[v.estado].toUpperCase()}</Chip>
      </div>

      <div className="mt-8">
        <GaleriaVehiculo fotos={v.fotos} titulo={v.titulo} />
      </div>

      {/* El precio va ANTES de la descripción en el DOM: en un teléfono es el
          primer dato que se busca. En desktop `order` lo manda a la columna de
          la derecha sin tocar ese orden de lectura. */}
      <div className="mt-8 grid gap-8 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10">
        <aside className="lg:order-2 lg:sticky lg:top-32 lg:self-start">
          <Bevel
            variant="outline"
            bevel={16}
            borderClassName="bg-graphite"
            outerClassName="block"
            className="p-5 md:p-6"
          >
            <span className="font-hud block text-bone/40">PRECIO</span>
            {/* "Consultar precio" NO va en Martian Mono: la mono es para
                cifras, y la frase en mono a este tamaño se lee como un error
                del sistema. Es el mismo criterio que en la card. */}
            {v.precio === null ? (
              <p className="font-display mt-2 text-2xl text-bone">
                {formatearPrecio(null)}
              </p>
            ) : (
              <p className="font-hud num mt-2 text-3xl text-bone md:text-4xl">
                {formatearPrecio(v.precio)}
              </p>
            )}

            <Bevel
              as="a"
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              variant="solid"
              bevel={12}
              className="font-hud mt-6 flex items-center justify-between gap-3 px-5 py-4"
            >
              <span>CONSULTAR POR WHATSAPP</span>
              <span aria-hidden="true">\</span>
            </Bevel>

            <p className="mt-4 text-sm/6 text-bone/55">
              Te contestamos el mismo día. El detalle de la unidad, los papeles
              y la forma de pago los cerramos por ahí.
            </p>
          </Bevel>
        </aside>

        <div className="lg:order-1">
          <div className="flex border-y border-graphite py-4">
            <Dato i={0} label="AÑO" valor={formatearAnio(v.anio)} />
            <Dato i={1} label="KM" valor={formatearKm(v.km)} />
          </div>

          {v.descripcion && (
            <div className="mt-8">
              <Titulo>LA UNIDAD</Titulo>
              {/* `whitespace-pre-line`: la dueña escribe desde el celular y los
                  saltos de línea que pone son su forma de separar ideas. Sin
                  esto queda todo en un párrafo corrido. */}
              <p className="mt-4 max-w-[68ch] whitespace-pre-line text-bone/75">
                {v.descripcion}
              </p>
            </div>
          )}

          {v.video && (
            <div className="mt-10">
              <Titulo>EN VIDEO</Titulo>
              <div className="mt-4">
                <VideoVehiculo video={v.video} titulo={v.titulo} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sin etiquetas la sección NO aparece: un titular sobre una grilla vacía
          se lee como que algo falló. */}
      {v.etiquetas.length > 0 && (
        <section className="mt-14 md:mt-20">
          <Titulo>LO QUE HAY QUE SABER</Titulo>
          <EtiquetasVehiculo etiquetas={v.etiquetas} fotos={v.fotos} />
        </section>
      )}

      {otras.length > 0 && (
        <section className="mt-16 md:mt-24">
          <Titulo>OTROS VEHÍCULOS</Titulo>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {otras.map((o) => (
              <VehiculoCard key={o.id} v={o} className="w-full" />
            ))}
          </div>

          <Bevel
            as={Link}
            to="/catalogo"
            variant="outline"
            bevel={12}
            outerClassName="mt-8 inline-block transition-colors duration-200 hover:bg-amber"
            className="font-hud px-5 py-3 text-bone"
          >
            VER TODO EL CATÁLOGO
          </Bevel>
        </section>
      )}

      {/* ── Barra fija de mobile ─────────────────────────────────────────
          Va POR ENCIMA de la barra MENU, no pegada al borde inferior: MENU es
          fija en `bottom-6` y una barra a `bottom-0` la taparía. Y es el botón
          solo, sin panel de fondo, porque el mueble flotante de este sitio son
          biseles sueltos sobre el contenido.

          `bottom-[5.5rem]` sale de la cuenta y no del ojo: MENU arranca a 24px
          del borde y mide unos 50px de alto, así que su techo queda en 74px.
          Los 88px dejan 14px de aire.

          Y va en z-40, NO en z-60 como el resto del mueble flotante: el overlay
          del menú vive en z-45 y con la barra por encima quedaría un bisel
          ámbar flotando sobre el panel bone con el menú abierto. A z-40 el
          panel la tapa, que es lo que corresponde. El flotante de WhatsApp
          resuelve lo mismo desmontándose, pero eso lo decide `PaginaInterna`,
          que es la que sabe si el menú está abierto. */}
      <div className="fixed inset-x-4 bottom-[5.5rem] z-40 lg:hidden">
        <Bevel
          as="a"
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          variant="solid"
          bevel={12}
          className="font-hud flex items-center justify-between gap-3 px-5 py-4"
        >
          <span>CONSULTAR POR WHATSAPP</span>
          <span aria-hidden="true">\</span>
        </Bevel>
      </div>
      {/* El hueco que reserva la barra fija. Sin esto tapa el final del
          contenido cuando la página está scrolleada hasta abajo. */}
      <div aria-hidden="true" className="h-24 lg:hidden" />
    </PaginaInterna>
  )
}

/**
 * Lo que se ve mientras llegan los datos.
 *
 * Repite la FORMA de la ficha —galería, panel de precio, columna de texto— y
 * no un spinner centrado: con el mock sobre localStorage esto dura un frame,
 * pero Supabase va a tardar lo que tarde una request, y ahí lo que evita el
 * salto es que el hueco mida parecido a lo que va a entrar.
 */
function Esqueleto() {
  return (
    <PaginaInterna
      indice="01"
      eyebrow="VEHÍCULO"
      titulo={
        <span
          aria-hidden="true"
          className="block h-12 w-full max-w-lg animate-pulse bg-graphite/60"
        />
      }
    >
      <p className="font-hud mt-6 text-bone/45" aria-live="polite">
        CARGANDO LA UNIDAD…
      </p>
      <div className="mt-8 animate-pulse" aria-hidden="true">
        <div className="aspect-4/3 bg-graphite/50 md:aspect-3/2" />
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10">
          <div className="h-40 bg-graphite/30 lg:order-1" />
          <div className="h-52 bg-graphite/40 lg:order-2" />
        </div>
      </div>
    </PaginaInterna>
  )
}

export default Vehiculo
