import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import Bevel from './Bevel'
import {
  CONDICION_LABEL,
  ESTADO_LABEL,
  formatearAnio,
  formatearKm,
  formatearPrecio,
} from '../lib/formato'
import { useMedia } from '../lib/use-media'
import { portada } from '../types/vehiculo'
import type { EstadoVehiculo, Vehiculo } from '../types/vehiculo'

/**
 * La card de una unidad.
 *
 * Vive acá y no adentro de una sección porque la usan DOS vistas: el riel de
 * destacados del home y la grilla de `/catalogo`. Duplicada, el día que el
 * precio cambie de lugar cambiaría en una sola de las dos.
 *
 * La card no sabe en cuál de las dos está: lo único que cambia es el ancho, y
 * el ancho lo pone quien la usa con `className`. Tampoco trae márgenes: el
 * espacio entre cards es del contenedor (el `gap` del riel o de la grilla).
 */

/** Chip de estado. El rojo aparece solo acá y en los errores del formulario. */
const CHIP: Record<EstadoVehiculo, string> = {
  disponible: 'bg-amber text-void',
  reservado: 'bg-flag text-bone',
  vendido: 'bg-flag text-bone',
}

/**
 * Las dos celdas de la fila HUD.
 *
 * Eran cuatro —año, km, motor y caja— y quedaron dos cuando el modelo de datos
 * se quedó con lo que la dueña puede cargar desde el celular: no hay ficha
 * técnica, el detalle se resuelve por WhatsApp. Con dos celdas entran en una
 * fila a cualquier ancho y desaparece la grilla 2×2 de mobile.
 *
 * Las clases van escritas celda por celda en este array y no calculadas con
 * condiciones, por la decisión 33: `border-l` junto a `border-l-0` en el mismo
 * atributo lo resuelve el orden en que Tailwind emite las reglas, no el orden
 * en que uno las escribe.
 */
const CELDA = ['flex-1 pr-3', 'flex-1 border-l border-graphite pl-3']

function Dato({ label, valor, i }: { label: string; valor: string; i: number }) {
  return (
    <div className={`min-w-0 ${CELDA[i]}`}>
      <span className="font-hud block text-bone/40">{label}</span>
      <span className="font-hud num mt-1 block truncate text-bone">{valor}</span>
    </div>
  )
}

/** Solo donde hay puntero fino. En táctil el hover no es un estado, es un tap. */
const PUNTERO_FINO = '(hover: hover) and (pointer: fine)'

type VehiculoCardProps = {
  v: Vehiculo
  /** Ancho y comportamiento de caja. Lo pone el contenedor: riel o grilla. */
  className?: string
}

/**
 * La card ENTERA es el link a la ficha. Un botón "ver más" adentro de una card
 * que ya se ve clickeable es un blanco chico al lado de uno grande.
 */
export function VehiculoCard({ v, className = '' }: VehiculoCardProps) {
  const foto = portada(v)
  const segunda = v.fotos.length > 1 ? v.fotos[1] : null
  const fino = useMedia(PUNTERO_FINO)

  // El barrido a la segunda foto existe solo si hay segunda foto Y hay puntero
  // fino. Cuando no, el hover de la card sigue siendo el acercamiento de la
  // portada más la tira "VER FICHA", igual que antes.
  const hayBarrido = Boolean(foto && segunda && fino)

  // `montada` ES la precarga: la segunda foto no entra al DOM —y por lo tanto
  // no se descarga— hasta el primer hover. En una grilla de doce unidades eso
  // son doce imágenes que no se piden en la carga inicial.
  const [montada, setMontada] = useState(false)
  const [abierta, setAbierta] = useState(false)
  const raf = useRef(0)

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const entrar = (tipo?: string) => {
    if (!hayBarrido || tipo === 'touch') return
    if (montada) {
      setAbierta(true)
      return
    }
    setMontada(true)
    // Dos frames entre montar y abrir. Abrir en el mismo frame haría que el
    // clip abierto sea el valor INICIAL del elemento recién montado, y un
    // valor inicial no se transiciona: la foto entraría de un corte.
    raf.current = requestAnimationFrame(() => {
      raf.current = requestAnimationFrame(() => setAbierta(true))
    })
  }

  const salir = () => {
    cancelAnimationFrame(raf.current)
    setAbierta(false)
  }

  return (
    <article
      className={`veh-card ${className}`}
      onPointerEnter={(e) => entrar(e.pointerType)}
      onPointerLeave={salir}
    >
      <Link
        to={`/vehiculo/${v.slug}`}
        className="block h-full"
        aria-label={`${v.titulo} — ver ficha`}
        onFocus={() => entrar()}
        onBlur={salir}
      >
        <Bevel
          variant="outline"
          bevel={16}
          outerClassName="block h-full"
          className="flex h-full flex-col p-0"
        >
          {/* ── Foto ──────────────────────────────────────────────── */}
          <div className="relative aspect-4/3 overflow-hidden bg-void">
            {foto ? (
              <img
                src={foto.url}
                alt={v.titulo}
                width={foto.ancho}
                height={foto.alto}
                loading="lazy"
                decoding="async"
                /* Con segunda foto el acercamiento se saca: el gesto pasa a ser
                   el barrido, y una foto que crece por debajo de otra que entra
                   desde la izquierda deja los dos bordes sin coincidir. */
                className={`absolute inset-0 h-full w-full object-cover ${
                  hayBarrido ? '' : 'veh-foto'
                }`}
              />
            ) : (
              /* Una unidad cargada y todavía sin fotos es un estado REAL del
                 panel, no un error: se dice, no se disimula con un ícono. */
              <div className="absolute inset-0 grid place-items-center bg-asphalt">
                <span className="font-hud text-bone/35">SIN FOTOS TODAVÍA</span>
              </div>
            )}

            {/* La segunda foto entra con el mismo barrido izquierda→derecha de
                la FAQ y de la tira "VER FICHA", dibujado con `clip-path`. Va
                con `alt=""`: es otra toma del mismo auto que ya nombró la
                portada, así que para un lector de pantalla es decoración. */}
            {montada && segunda && (
              <img
                src={segunda.url}
                alt=""
                aria-hidden="true"
                width={segunda.ancho}
                height={segunda.alto}
                decoding="async"
                className="veh-foto-swap absolute inset-0 h-full w-full object-cover"
                style={{
                  clipPath: abierta ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
                }}
              />
            )}

            <Bevel
              variant="ghost"
              bevel={8}
              surfaceClassName={CHIP[v.estado]}
              className="veh-chip font-hud absolute top-3 right-3 px-3 py-1.5"
            >
              {ESTADO_LABEL[v.estado].toUpperCase()}
            </Bevel>
          </div>

          {/* ── Datos ─────────────────────────────────────────────── */}
          <div className="flex flex-1 flex-col p-5 md:p-6">
            <h3 className="font-display text-h2 leading-none text-bone">
              {v.titulo}
            </h3>
            <p className="font-hud mt-2 text-bone/45">
              {CONDICION_LABEL[v.condicion].toUpperCase()}
            </p>

            <div className="mt-5 flex border-y border-graphite py-3">
              <Dato i={0} label="AÑO" valor={formatearAnio(v.anio)} />
              <Dato i={1} label="KM" valor={formatearKm(v.km)} />
            </div>

            <div className="mt-5 mb-5">
              <span className="font-hud block text-bone/40">PRECIO</span>
              {/* "Consultar precio" NO va en Martian Mono: la mono es para
                  cifras, y una frase de dos palabras en mono a 30px se come el
                  ancho de la card y se lee como un error. */}
              {v.precio === null ? (
                <span className="font-display mt-1 block text-xl text-bone">
                  {formatearPrecio(null)}
                </span>
              ) : (
                <span className="font-hud num mt-1 block text-2xl text-bone md:text-3xl">
                  {formatearPrecio(v.precio)}
                </span>
              )}
            </div>

            {/* Barrido ámbar de izquierda a derecha, el mismo gesto de la FAQ y
                de post-venta. Acá además cumple una función: es lo que avisa
                que la card entera es un link a la ficha. Queda también en las
                unidades con segunda foto: es el único aviso de que la card
                lleva a algún lado, y en una grilla no puede haber cards que lo
                tengan y cards que no. */}
            {/* Sin `mt-*`: la separación mínima la pone el `mb-5` del precio y
                el resto lo empuja el `margin-top: auto` de `.veh-ficha`, que
                deja la tira al ras de abajo en todas las cards por igual. */}
            <p className="veh-ficha font-hud flex items-center justify-between px-4 py-3">
              <span>VER FICHA</span>
              <span aria-hidden="true">\</span>
            </p>
          </div>
        </Bevel>
      </Link>
    </article>
  )
}

/**
 * El hueco de una card mientras se cargan los datos.
 *
 * Repite la FORMA —bisel, foto en 4:3, título, fila HUD, precio y tira— y no
 * un spinner centrado: lo que evita el salto es que el hueco mida lo mismo que
 * lo que va a entrar. Con el mock sobre localStorage esto dura un frame, pero
 * Supabase va a tardar lo que tarde una request y ahí se ve.
 */
export function VehiculoCardEsqueleto({
  className = '',
}: {
  className?: string
}) {
  return (
    <div className={className} aria-hidden="true">
      <Bevel
        variant="outline"
        bevel={16}
        borderClassName="bg-graphite"
        outerClassName="block h-full"
        className="flex h-full animate-pulse flex-col p-0"
      >
        <div className="aspect-4/3 bg-graphite/60" />
        <div className="flex flex-1 flex-col p-5 md:p-6">
          <div className="h-7 w-3/4 bg-graphite/60" />
          <div className="mt-3 h-3 w-20 bg-graphite/40" />
          <div className="mt-5 flex gap-3 border-y border-graphite py-3">
            <div className="h-8 flex-1 bg-graphite/40" />
            <div className="h-8 flex-1 bg-graphite/40" />
          </div>
          <div className="mt-5 mb-5 h-9 w-2/3 bg-graphite/60" />
          <div className="mt-auto h-11 bg-graphite/30" />
        </div>
      </Bevel>
    </div>
  )
}

export default VehiculoCard
