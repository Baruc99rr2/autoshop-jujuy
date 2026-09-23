import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import Bevel from '../components/Bevel'
import EtiquetasVehiculo from '../components/EtiquetasVehiculo'
import GaleriaVehiculo from '../components/GaleriaVehiculo'
import PaginaInterna from '../components/PaginaInterna'
import VehiculoCard from '../components/VehiculoCard'
import VideoVehiculo from '../components/VideoVehiculo'
import { whatsappCon } from '../data/contacto'
import { repo } from '../data/repo'
import { useFitText } from '../lib/fit-text'
import {
  CONDICION_LABEL,
  ESTADO_LABEL,
  formatearAnio,
  formatearKm,
  formatearPrecio,
} from '../lib/formato'
import { usePieALaVista } from '../lib/pie-a-la-vista'
import { getLenis } from '../lib/smooth'
import { useTitulo } from '../lib/titulo'
import { linkAlCatalogo } from '../lib/ultimo-catalogo'
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
 * ES UNA PÁGINA DE CONTENIDO, NO UNA PORTADA. El titular va en la escala
 * `'contenido'` y la galería tiene techo, porque lo que tiene que entrar en la
 * primera pantalla de un escritorio son tres cosas juntas: qué auto es, cómo
 * es y cuánto sale. Con el nombre a 80 px y la foto en 3:2 a todo el ancho, el
 * precio quedaba abajo del pliegue en la única página del sitio que existe
 * para mostrar un precio.
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
 * El precio, ajustado al ancho del panel.
 *
 * Es el mismo `useFitText` del logotipo del footer y por el mismo motivo: acá
 * el ancho disponible es fijo (el panel mide 21rem en desktop y lo que mida la
 * pantalla en mobile) pero el texto no, y la diferencia entre "$ 9.900.000" y
 * "$ 123.400.000" es de cuatro caracteres en una tipografía monoespaciada.
 * Con un tamaño fijo, el segundo tocaba los dos bordes del bisel.
 *
 * El caso peor realista son nueve dígitos —un utilitario importado pasa
 * holgado los cien millones— y con el piso de 20 px el ajuste lo resuelve
 * midiendo, sin que nadie tenga que adivinar un `clamp` por cantidad de
 * cifras.
 *
 * "Consultar precio" pasa por el mismo ajuste pero NO en Martian Mono: la mono
 * es para cifras, y la frase en mono a este tamaño se lee como un error del
 * sistema. Es el mismo criterio que en la card.
 */
function Precio({ valor }: { valor: number | null }) {
  const ref = useRef<HTMLParagraphElement>(null)
  // 44 px de techo y 20 de piso. El techo es lo que mide el precio de una
  // unidad corriente en el panel de 21rem: sin él, "$ 9.900.000" crecería
  // hasta llenar el ancho y quedaría más grande que el nombre del auto.
  useFitText(ref, 44, 20)

  return (
    <p
      ref={ref}
      className={`mt-2 whitespace-nowrap text-bone ${
        valor === null ? 'font-display' : 'font-hud num'
      }`}
      /* El punto de partida del primer frame, antes de que el hook mida. */
      style={{ fontSize: '2rem' }}
    >
      {formatearPrecio(valor)}
    </p>
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

/**
 * El enlace de vuelta, arriba del todo.
 *
 * VUELVE A LOS FILTROS QUE HABÍA, no al catálogo pelado: quien vino filtrando
 * por usados y buscando "ram" espera encontrarse de nuevo donde estaba. Lo
 * resuelve `lib/ultimo-catalogo.ts`; quien entró directo por un link de
 * WhatsApp no tiene nada anotado y cae en `/catalogo` limpio, que también es
 * lo correcto.
 *
 * NO es un "atrás" del navegador: media visita a esta página entra por un link
 * pegado en un chat, y ahí `history.back()` saca del sitio.
 */
function Volver({ a }: { a: string }) {
  return (
    <Bevel
      as={Link}
      to={a}
      variant="ghost"
      bevel={10}
      /* El `-ml-3` compensa el padding propio del bisel: sin eso el texto
         arranca tres píxeles adentro y rompe la alineación izquierda con el
         eyebrow y el titular, que es la única alineación del sitio. */
      surfaceClassName="bg-transparent text-bone/60 hover:bg-graphite hover:text-amber focus-visible:bg-graphite focus-visible:text-amber"
      className="font-hud -ml-3 mb-5 inline-flex items-center gap-2 px-3 py-2 transition-colors duration-200"
    >
      <span aria-hidden="true">←</span>
      VOLVER AL CATÁLOGO
    </Bevel>
  )
}

export function Vehiculo() {
  const { slug = '' } = useParams()

  // El destino de la vuelta se decide UNA VEZ, al montar: si se leyera en cada
  // render, bastaría con que algo más escribiera en `sessionStorage` para que
  // el enlace cambiara de destino abajo del dedo.
  const [volver] = useState(linkAlCatalogo)

  // La barra fija de mobile es mueble flotante como la barra MENU, así que se
  // aparta igual al llegar al footer: si no, tapa el © y la firma con dos
  // biseles a todo el ancho, que es peor que lo que tapaba el flotante.
  const enElPie = usePieALaVista()

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

  if (v === undefined) return <Esqueleto volver={volver} />
  if (v === null) return <NoEncontrado />

  const wa = whatsappCon(mensaje(v))

  return (
    <PaginaInterna
      indice="01"
      eyebrow="VEHÍCULO"
      titulo={v.titulo}
      escala="contenido"
      arriba={<Volver a={volver} />}
      /* El flotante de WhatsApp NO va acá, en ningún viewport: en desktop
         quedaba junto al botón del panel de precio y en mobile junto al de la
         barra fija, dos biseles ámbar pidiendo lo mismo. */
      flotante="nunca"
    >
      {/* ── El bloque de arriba ──────────────────────────────────────
          Tres piezas y no dos columnas de contenido corrido, porque el orden
          de lectura en mobile no es el mismo que el reparto en desktop: el
          precio va SEGUNDO en el DOM —en un teléfono es lo que se busca
          apenas se termina de mirar la foto— y en desktop se coloca a la
          derecha con `col-start`/`row-start`, sin tocar ese orden.

          Con `order` no alcanzaba: hay dos bloques que van a la izquierda y
          uno a la derecha, y eso es una grilla de dos filas, no una
          reordenación. */}
      <div className="mt-8 grid gap-8 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-10">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <div className="flex flex-wrap gap-2">
            <Chip clase="bg-graphite text-bone">
              {CONDICION_LABEL[v.condicion].toUpperCase()}
            </Chip>
            <Chip clase={CHIP[v.estado]}>
              {ESTADO_LABEL[v.estado].toUpperCase()}
            </Chip>
          </div>

          <div className="mt-5">
            <GaleriaVehiculo fotos={v.fotos} titulo={v.titulo} />
          </div>
        </div>

        <aside className="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-28 lg:self-start">
          <Bevel
            variant="outline"
            bevel={16}
            borderClassName="bg-graphite"
            outerClassName="block"
            className="p-5 md:p-6"
          >
            <span className="font-hud block text-bone/40">PRECIO</span>
            <Precio valor={v.precio} />

            <Bevel
              as="a"
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              variant="solid"
              bevel={12}
              className="font-hud mt-5 flex items-center justify-between gap-3 px-5 py-4"
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

        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
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
            to={volver}
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
          fija en `bottom-6` y una barra a `bottom-0` la taparía. Y son biseles
          sueltos sobre el contenido, sin panel de fondo, porque ese es el
          mueble flotante de este sitio.

          LLEVA LAS DOS SALIDAS: escribir y volver al catálogo. El enlace de
          arriba se pierde apenas se scrollea, y en un teléfono la ficha es
          larga —galería, texto, video, etiquetas y tres unidades más—: sin
          esto, volver al stock es subir toda la página.

          `bottom-[5.5rem]` sale de la cuenta y no del ojo: MENU arranca a 24px
          del borde y mide unos 50px de alto, así que su techo queda en 74px.
          Los 88px dejan 14px de aire.

          Y va en z-40, NO en z-60 como el resto del mueble flotante: el overlay
          del menú vive en z-45 y con la barra por encima quedaría un bisel
          ámbar flotando sobre el panel bone con el menú abierto. A z-40 el
          panel la tapa, que es lo que corresponde. */}
      <div
        className={`fixed inset-x-4 bottom-[5.5rem] z-40 flex gap-2 transition-[opacity,transform] duration-300 lg:hidden ${
          enElPie ? 'pointer-events-none translate-y-4 opacity-0' : 'opacity-100'
        }`}
      >
        <Bevel
          as={Link}
          to={volver}
          variant="outline"
          bevel={12}
          borderClassName="bg-graphite"
          outerClassName="block shrink-0"
          className="font-hud flex items-center px-4 py-4 text-bone"
          aria-label="Volver al catálogo"
        >
          <span aria-hidden="true">←</span>
        </Bevel>

        <Bevel
          as="a"
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          variant="solid"
          bevel={12}
          className="font-hud flex flex-1 items-center justify-between gap-3 px-5 py-4"
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
function Esqueleto({ volver }: { volver: string }) {
  return (
    <PaginaInterna
      indice="01"
      eyebrow="VEHÍCULO"
      escala="contenido"
      arriba={<Volver a={volver} />}
      flotante="nunca"
      titulo={
        <span
          aria-hidden="true"
          className="block h-10 w-full max-w-lg animate-pulse bg-graphite/60"
        />
      }
    >
      <p className="font-hud mt-6 text-bone/45" aria-live="polite">
        CARGANDO LA UNIDAD…
      </p>
      <div className="mt-6 animate-pulse" aria-hidden="true">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-10">
          <div className="aspect-4/3 bg-graphite/50 lg:col-start-1 lg:row-start-1 lg:aspect-16/10" />
          <div className="h-52 bg-graphite/40 lg:col-start-2 lg:row-start-1" />
          <div className="h-40 bg-graphite/30 lg:col-start-1 lg:row-start-2" />
        </div>
      </div>
    </PaginaInterna>
  )
}

export default Vehiculo
