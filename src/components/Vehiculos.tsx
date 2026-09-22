import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import Bevel from './Bevel'
import SectionHeader from './SectionHeader'
import { FILTROS } from '../data/catalogo'
import { seccion } from '../data/nav'
import { repo } from '../data/repo'
import {
  CONDICION_LABEL,
  ESTADO_LABEL,
  formatearAnio,
  formatearKm,
  formatearPrecio,
} from '../lib/formato'
import { portada } from '../types/vehiculo'
import type { EstadoVehiculo, Vehiculo } from '../types/vehiculo'

const S = seccion('vehiculos')

/** Cuántas unidades muestra el home. El stock completo vive en `/catalogo`. */
const CUANTAS = 3

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

/**
 * Una card.
 *
 * El ancho está elegido por el ALTO que resulta. Con la foto en 4:3, una card
 * del 46% del contenedor mide 660 px de ancho y 495 solo de foto, así que en
 * un notebook de 900 px no entran la foto y el precio en la misma pantalla —y
 * el precio es el dato de la sección—. Al 40% la card entera entra, y siguen
 * viéndose dos completas más el borde de la tercera, que es lo que hace que el
 * conjunto se lea como riel y no como grilla.
 *
 * La card ENTERA es el link a la ficha. Un botón "ver más" adentro de una card
 * que ya se ve clickeable es un blanco chico al lado de uno grande.
 */
function Card({ v }: { v: Vehiculo }) {
  const foto = portada(v)

  return (
    <article className="veh-card w-[85vw] shrink-0 md:w-[56%] lg:w-[40%]">
      <Link
        to={`/vehiculo/${v.slug}`}
        className="block h-full"
        aria-label={`${v.titulo} — ver ficha`}
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
                className="veh-foto absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              /* Una unidad cargada y todavía sin fotos es un estado REAL del
                 panel, no un error: se dice, no se disimula con un ícono. */
              <div className="absolute inset-0 grid place-items-center bg-asphalt">
                <span className="font-hud text-bone/35">SIN FOTOS TODAVÍA</span>
              </div>
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
                que la card entera es un link a la ficha. */}
            {/* Sin `mt-*`: la separación mínima la pone el `mb-5` del precio y
                el resto lo empuja el `margin-top: auto` de `.veh-ficha`, que
                deja la tira al ras de abajo en las tres cards por igual. */}
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
 * Vehículos destacados.
 *
 * RIEL HORIZONTAL, NO GRILLA. Con tres unidades, una grilla de tres columnas
 * se lee como "no tienen más autos"; tres cards grandes en un riel se leen
 * como una selección. Es la misma cantidad de contenido diciendo otra cosa.
 *
 * Los datos salen del repositorio, nunca de un array escrito en el código: hoy
 * el repo es el mock sobre localStorage y mañana es Supabase, y esta sección
 * no se entera.
 */
export function Vehiculos() {
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]['id']>('todos')
  const [lista, setLista] = useState<Vehiculo[]>([])
  const [cargando, setCargando] = useState(true)
  const riel = useRef<HTMLDivElement>(null)
  const arrastre = useRef<{
    x: number
    scroll: number
    id: number
    capturado: boolean
  } | null>(null)
  const ultimoFueArrastre = useRef(false)

  // Destacados; si la dueña todavía no marcó ninguno, los más recientes. El
  // home nunca puede quedar sin autos por un campo que nadie tildó.
  useEffect(() => {
    let vivo = true
    ;(async () => {
      const destacados = await repo.listarDestacados(CUANTAS)
      const final =
        destacados.length > 0
          ? destacados
          : await repo.listar({ orden: 'recientes', limite: CUANTAS })
      if (!vivo) return
      setLista(final)
      setCargando(false)
    })()
    return () => {
      vivo = false
    }
  }, [])

  const visibles =
    filtro === 'todos' ? lista : lista.filter((v) => v.condicion === filtro)

  // Arrastre con puntero.
  //
  // La captura NO se pide en el `pointerdown` sino recién cuando el gesto
  // superó el umbral. Pedirla antes rompía la navegación entera: con
  // `setPointerCapture` puesto, Chrome dispara el `click` sobre el elemento
  // que capturó —el riel— y no sobre el link de la card, así que un click
  // limpio en una card no abría nada. Estando puesta solo durante un arrastre
  // real, se sigue ganando lo que la captura da: soltar el mouse fuera del
  // riel termina el gesto en vez de dejarlo pegado.
  const UMBRAL = 6

  const alBajar = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !riel.current) return
    arrastre.current = {
      x: e.clientX,
      scroll: riel.current.scrollLeft,
      id: e.pointerId,
      capturado: false,
    }
  }

  const alMover = (e: React.PointerEvent<HTMLDivElement>) => {
    const a = arrastre.current
    if (!a || !riel.current) return
    const dx = e.clientX - a.x
    if (!a.capturado) {
      if (Math.abs(dx) < UMBRAL) return
      a.capturado = true
      riel.current.setPointerCapture(a.id)
    }
    riel.current.scrollLeft = a.scroll - dx
  }

  const alSoltar = () => {
    const a = arrastre.current
    if (!a || !riel.current) return
    if (a.capturado) riel.current.releasePointerCapture(a.id)
    arrastre.current = null
    // Se recuerda hasta el `click`, que llega justo después del `pointerup`.
    ultimoFueArrastre.current = a.capturado
  }

  // Arrastrar el riel terminaba abriendo la ficha de la card donde se soltó el
  // mouse. Se cancela el click cuando el gesto movió el riel; un click limpio
  // pasa igual que antes.
  const alClickear = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ultimoFueArrastre.current) return
    e.preventDefault()
    e.stopPropagation()
    ultimoFueArrastre.current = false
  }

  return (
    <section id={S.id} className="border-b border-graphite/60 py-20 md:py-28">
      <div className="shell">
        <SectionHeader index={S.indice} eyebrow={S.eyebrow} title={S.titulo} />

        <div
          className="mt-8 flex flex-wrap gap-2"
          role="group"
          aria-label="Filtrar por condición"
        >
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
                  activo
                    ? undefined
                    : 'block transition-colors duration-200 hover:bg-amber'
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
        onClickCapture={alClickear}
        // El navegador arrastra links e imágenes por su cuenta, y eso pisa el
        // gesto del riel con el fantasma del link colgando del mouse.
        onDragStart={(e) => e.preventDefault()}
      >
        {visibles.map((v) => (
          <Card key={v.id} v={v} />
        ))}
      </div>

      {!cargando && visibles.length === 0 && (
        <p className="mt-2 text-bone/55 shell">
          No hay unidades cargadas con esa condición. Escribinos y te avisamos
          apenas entre alguna.
        </p>
      )}

      <div className="mt-8 shell">
        <Bevel
          as={Link}
          variant="outline"
          bevel={12}
          to="/catalogo"
          outerClassName="inline-block transition-colors duration-200 hover:bg-amber"
          className="font-hud px-5 py-3 text-bone"
        >
          VER CATÁLOGO COMPLETO
        </Bevel>
      </div>
    </section>
  )
}

export default Vehiculos
