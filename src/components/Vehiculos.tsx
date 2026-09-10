import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import Bevel from './Bevel'
import SectionHeader from './SectionHeader'
import { seccion } from '../data/nav'
import { scrollTo } from '../lib/smooth'
import {
  CUOTA_DESDE,
  ESTADO_LABEL,
  FILTROS,
  STOCK_TOTAL,
  VEHICULOS,
  cuotaDesde,
  formatearKm,
  formatearPrecio,
} from '../data/vehiculos'
import type { EstadoUnidad, Vehiculo } from '../data/vehiculos'

const S = seccion('vehiculos')

/** Chip de estado. El rojo aparece solo acá y en los errores del formulario. */
const CHIP: Record<EstadoUnidad, string> = {
  disponible: 'bg-amber text-void',
  reservado: 'bg-flag text-bone',
  vendido: 'bg-flag text-bone',
}

/**
 * Las cuatro celdas de la fila HUD.
 *
 * En desktop es UNA FILA de cuatro; en mobile es una GRILLA de 2×2. En una
 * card de 331 px, cuatro columnas dejan 70 px por celda y los valores salían
 * cortados: "48.5…", "2.0 …", "AUT.…". Una ficha técnica truncada no se lee
 * como diseño, se lee como que el sitio está roto.
 *
 * Las clases van escritas celda por celda en este array y no calculadas con
 * condiciones, por la decisión 33: `border-l` junto a `border-l-0` en el mismo
 * atributo lo resuelve el orden en que Tailwind emite las reglas, no el orden
 * en que uno las escribe. Las variantes `md:` sí son seguras porque el
 * breakpoint las emite después.
 */
const CELDA = [
  'pr-3 md:flex-1',
  'border-l border-graphite pl-3 md:flex-1',
  'border-t border-graphite pt-3 pr-3 md:flex-1 md:border-t-0 md:border-l md:pt-0 md:pl-3',
  'border-l border-t border-graphite pt-3 pl-3 md:flex-1 md:border-t-0 md:pt-0',
]

function Dato({
  label,
  valor,
  i,
}: {
  label: string
  valor: string
  i: number
}) {
  return (
    <div className={`min-w-0 ${CELDA[i]}`}>
      <span className="font-hud block text-bone/40">{label}</span>
      <span className="font-hud num mt-1 block truncate text-bone">{valor}</span>
    </div>
  )
}

/**
 * Una card.
 *
 * El ancho está elegido por el ALTO que resulta. Con la foto en 4:3, una card
 * del 46% del contenedor mide 660 px de ancho y 495 solo de foto, así que en
 * un notebook de 900 px no entran la foto y el precio en la misma pantalla —y
 * el precio es el dato de la sección—. Al 40% la card entera entra, y siguen
 * viéndose dos completas más el borde de la tercera, que es lo que hace que el
 * conjunto se lea como riel y no como grilla.
 */
function Card({ v }: { v: Vehiculo }) {
  return (
    <article className="veh-card w-[85vw] shrink-0 md:w-[56%] lg:w-[40%]">
      <Bevel variant="outline" bevel={16} outerClassName="block h-full" className="p-0">
        {/* ── Foto ──────────────────────────────────────────────────
            El recorte de detalle del hover NO es un archivo nuevo: es la
            misma imagen ampliada hacia un punto elegido a mano. El barrido
            es un clip-path de izquierda a derecha sobre una segunda copia,
            así que lo que se anima es clip-path y transform y nada más. */}
        <div className="relative aspect-4/3 overflow-hidden bg-void">
          <img
            src={v.imagen}
            alt={v.alt}
            width={v.ancho}
            height={v.alto}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />

          <img
            src={v.imagen}
            alt=""
            aria-hidden="true"
            width={v.ancho}
            height={v.alto}
            loading="lazy"
            decoding="async"
            className="veh-detalle absolute inset-0 h-full w-full object-cover"
            style={
              {
                '--zoom': v.detalle.zoom,
                transformOrigin: v.detalle.origen,
              } as CSSProperties
            }
          />

          {/* Etiqueta de lo que se está mirando, para que el zoom se lea como
              una decisión y no como un error de escala. */}
          <span className="veh-detalle-label font-hud absolute bottom-3 left-3 bg-void/80 px-2 py-1 text-amber">
            {v.detalle.que.toUpperCase()}
          </span>

          <Bevel
            variant="ghost"
            bevel={8}
            surfaceClassName={CHIP[v.estado]}
            className="veh-chip font-hud absolute top-3 right-3 px-3 py-1.5"
          >
            {ESTADO_LABEL[v.estado].toUpperCase()}
          </Bevel>
        </div>

        {/* ── Datos ─────────────────────────────────────────────────── */}
        <div className="p-5 md:p-6">
          <h3 className="font-display text-h2 leading-none text-bone">
            {v.marca} {v.modelo}
          </h3>
          <p className="font-hud mt-2 text-bone/45">{v.version.toUpperCase()}</p>

          <div className="mt-5 grid grid-cols-2 gap-y-3 border-y border-graphite py-3 md:flex md:gap-y-0">
            <Dato i={0} label="AÑO" valor={String(v.anio)} />
            <Dato i={1} label="KM" valor={formatearKm(v.km)} />
            <Dato i={2} label="MOTOR" valor={v.motor} />
            <Dato i={3} label="CAJA" valor={v.caja} />
          </div>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <span className="font-hud block text-bone/40">PRECIO</span>
              <span className="font-hud num mt-1 block text-2xl text-bone md:text-3xl">
                {formatearPrecio(v.precio)}
              </span>
            </div>
            {/* La cuota va al lado del precio y no debajo: en Argentina es el
                dato que la gente mira primero, y esconderlo en una línea
                secundaria sería mentirle a cómo se compra un auto acá. */}
            <div className="text-right">
              <span className="font-hud block text-bone/40">
                CUOTA DESDE · {CUOTA_DESDE.plazos} MESES
              </span>
              <span className="font-hud num mt-1 block text-xl text-amber">
                {formatearPrecio(cuotaDesde(v.precio))}
              </span>
            </div>
          </div>
        </div>
      </Bevel>
    </article>
  )
}

/**
 * Catálogo.
 *
 * RIEL HORIZONTAL, NO GRILLA. Con tres unidades, una grilla de tres columnas
 * se lee como "no tienen más autos"; tres cards grandes en un riel se leen
 * como una selección. Es la misma cantidad de contenido diciendo otra cosa.
 *
 * El riel se arrastra con el puntero además de scrollearse: en desktop no hay
 * gesto táctil y una barra de scroll horizontal sola no invita a moverla.
 */
export function Vehiculos() {
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]['id']>('todos')
  const riel = useRef<HTMLDivElement>(null)
  const arrastre = useRef<{ x: number; scroll: number } | null>(null)

  const lista =
    filtro === 'todos'
      ? VEHICULOS
      : VEHICULOS.filter((v) => v.condicion === filtro)

  // Arrastre con puntero. Se usa `setPointerCapture` para que soltar fuera del
  // riel también termine el gesto; sin eso el riel queda "pegado" al mouse.
  const alBajar = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !riel.current) return
    arrastre.current = { x: e.clientX, scroll: riel.current.scrollLeft }
    riel.current.setPointerCapture(e.pointerId)
  }
  const alMover = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!arrastre.current || !riel.current) return
    riel.current.scrollLeft = arrastre.current.scroll - (e.clientX - arrastre.current.x)
  }
  const alSoltar = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!arrastre.current || !riel.current) return
    arrastre.current = null
    riel.current.releasePointerCapture(e.pointerId)
  }

  return (
    <section
      id={S.id}
      className="border-b border-graphite/60 py-20 md:py-28"
    >
      <div className="shell">
        <SectionHeader index={S.indice} eyebrow={S.eyebrow} title={S.titulo} />

        <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filtrar por condición">
          {FILTROS.map((f) => {
            const activo = f.id === filtro
            return (
              <Bevel
                key={f.id}
                as="button"
                type="button"
                variant={activo ? 'solid' : 'outline'}
                bevel={10}
                onClick={() => setFiltro(f.id)}
                aria-pressed={activo}
                outerClassName={
                  activo ? undefined : 'block transition-colors duration-200 hover:bg-amber'
                }
                className="font-hud px-5 py-2.5"
              >
                {f.label.toUpperCase()}
              </Bevel>
            )
          })}
        </div>
      </div>

      {/* El riel sangra hasta el borde derecho a propósito: una card cortada
          por el borde es lo que le dice al ojo que hay más para el costado. */}
      <div
        ref={riel}
        className="veh-riel mt-8 flex items-stretch gap-5 overflow-x-auto pb-4"
        onPointerDown={alBajar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
      >
        {lista.map((v) => (
          <Card key={v.slug} v={v} />
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 shell">
        <p className="font-hud text-bone/50">
          MOSTRAMOS{' '}
          <span className="num text-amber">
            {String(lista.length).padStart(2, '0')}
          </span>{' '}
          DE <span className="num text-amber">{STOCK_TOTAL}</span> UNIDADES EN
          STOCK
        </p>
        <Bevel
          as="a"
          variant="outline"
          bevel={12}
          href="#contacto"
          onClick={(e: React.MouseEvent) => {
            e.preventDefault()
            scrollTo('#contacto')
          }}
          outerClassName="block transition-colors duration-200 hover:bg-amber"
          className="font-hud px-5 py-3 text-bone"
        >
          VER CATÁLOGO COMPLETO
        </Bevel>
      </div>
    </section>
  )
}

export default Vehiculos
