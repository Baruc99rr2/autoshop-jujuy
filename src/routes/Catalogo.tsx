import { useEffect, useId, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import Bevel from '../components/Bevel'
import PaginaInterna from '../components/PaginaInterna'
import VehiculoCard, {
  VehiculoCardEsqueleto,
} from '../components/VehiculoCard'
import { FILTROS } from '../data/catalogo'
import { WHATSAPP_URL } from '../data/contacto'
import { repo } from '../data/repo'
import type { Condicion, Vehiculo } from '../types/vehiculo'

/**
 * El catálogo completo.
 *
 * ACÁ SÍ VA GRILLA. El riel del home es una selección de tres unidades y por
 * eso se lee de a una; esto es el stock, y el stock se recorre de un vistazo.
 * La card es exactamente la misma en los dos lados (`VehiculoCard`): lo único
 * que cambia es el ancho que le da el contenedor.
 *
 * EL FILTRO Y LA BÚSQUEDA VIVEN EN LA URL, no en el estado del componente.
 * `/catalogo?condicion=usado&q=ram` se copia y se pega en WhatsApp —que es
 * como se mueve todo en este negocio— y el que lo abre ve lo mismo. De paso,
 * el botón atrás deshace un filtro en vez de sacarte de la página.
 */

type IdFiltro = (typeof FILTROS)[number]['id']

const ES_FILTRO = new Set<string>(FILTROS.map((f) => f.id))

/** Un `?condicion=` inventado a mano no rompe nada: cae en "todos". */
function leerCondicion(valor: string | null): IdFiltro {
  return valor && ES_FILTRO.has(valor) ? (valor as IdFiltro) : 'todos'
}

/** Cuántos esqueletos se dibujan en la primera carga: una fila de la grilla. */
const ESQUELETOS = 3

/** Clase de ancho de la card dentro de la grilla. */
const EN_GRILLA = 'w-full'

const GRILLA = 'mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3'

/**
 * Los vendidos al fondo.
 *
 * `sort` es estable, así que el resto conserva el orden que trajo el repo (más
 * reciente primero). Un reservado NO se manda al fondo: sigue siendo una
 * unidad que puede liberarse, y el chip rojo ya avisa.
 */
function vendidosAlFinal(lista: Vehiculo[]): Vehiculo[] {
  const peso = (v: Vehiculo) => (v.estado === 'vendido' ? 1 : 0)
  return [...lista].sort((a, b) => peso(a) - peso(b))
}

function contar(n: number): string {
  return n === 1 ? '1 UNIDAD' : `${n} UNIDADES`
}

export function Catalogo() {
  const [params, setParams] = useSearchParams()
  const uid = useId()

  const condicion = leerCondicion(params.get('condicion'))
  const q = params.get('q') ?? ''

  // El resultado se guarda JUNTO CON la consulta que lo trajo, y "cargando" se
  // deduce comparando esa consulta con la actual. La alternativa —un
  // `setCargando(true)` al principio del efecto— es un render de más por cada
  // tecla y deja el estado mintiendo durante un frame: dice "listo" con el
  // filtro nuevo y la lista vieja.
  const consulta = `${condicion}|${q}`
  const [datos, setDatos] = useState<{ consulta: string; lista: Vehiculo[] }>()
  const lista = datos?.lista ?? []
  const cargando = datos?.consulta !== consulta

  // Lo que se ve tipeado. Es estado local y no la URL directamente: escribir
  // "ram" contra la URL son tres entradas en el historial y tres navegaciones,
  // y el botón atrás pasaría a borrar letra por letra.
  const [texto, setTexto] = useState(q)
  const ultimoEscrito = useRef(q)

  // URL → campo. Solo cuando el cambio vino de AFUERA (botón atrás, link
  // pegado): si vino de lo que acabamos de escribir nosotros, pisar el campo
  // mientras alguien tipea le mueve el cursor.
  useEffect(() => {
    if (q === ultimoEscrito.current) return
    ultimoEscrito.current = q
    setTexto(q)
  }, [q])

  // Campo → URL, con retardo.
  //
  // EMPEZAR a buscar empuja una entrada al historial; corregir lo escrito
  // reemplaza la que ya está. Así atrás deshace "la búsqueda" de una vez, en
  // vez de borrar letra por letra (si todo empujara) o de tragarse también el
  // chip que estaba puesto antes (si todo reemplazara).
  useEffect(() => {
    const limpio = texto.trim()
    if (limpio === q) return
    const id = setTimeout(() => {
      ultimoEscrito.current = limpio
      setParams(
        (p) => {
          const n = new URLSearchParams(p)
          if (limpio) n.set('q', limpio)
          else n.delete('q')
          return n
        },
        { replace: q !== '' },
      )
    }, 300)
    return () => clearTimeout(id)
  }, [texto, q, setParams])

  // Los chips SÍ empujan una entrada al historial: cambiar de filtro es una
  // decisión, y atrás tiene que devolver el filtro anterior.
  const elegir = (id: IdFiltro) => {
    setParams((p) => {
      const n = new URLSearchParams(p)
      if (id === 'todos') n.delete('condicion')
      else n.set('condicion', id)
      return n
    })
  }

  const limpiarTodo = () => {
    ultimoEscrito.current = ''
    setTexto('')
    setParams(new URLSearchParams())
  }

  // El filtrado lo hace el REPO, no el componente: el día que sea Supabase, la
  // condición y el texto van a viajar como `where` y no como un `filter` sobre
  // todo el stock traído al navegador.
  useEffect(() => {
    let vivo = true
    ;(async () => {
      const encontrados = await repo.listar({
        condicion: condicion === 'todos' ? undefined : (condicion as Condicion),
        texto: q,
        orden: 'recientes',
      })
      if (!vivo) return
      setDatos({ consulta, lista: vendidosAlFinal(encontrados) })
    })()
    return () => {
      vivo = false
    }
  }, [condicion, q, consulta])

  const hayFiltro = condicion !== 'todos' || q !== ''
  // Los esqueletos son para la PRIMERA carga, cuando no hay nada que mostrar.
  // Al cambiar de filtro con resultados en pantalla se atenúa la grilla y se
  // reemplaza cuando llegan los nuevos: parpadear a esqueletos en cada tecla
  // es más ruidoso que esperar.
  const esqueletos = cargando && lista.length === 0

  return (
    <PaginaInterna
      indice="01"
      eyebrow="CATÁLOGO"
      titulo="Todas las unidades"
      lead="Todo lo que hay en el salón, con foto y precio. El detalle de cada unidad lo cerramos por WhatsApp."
    >
      {/* ── Filtros ─────────────────────────────────────────────────── */}
      <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-stretch lg:justify-between">
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filtrar por condición"
        >
          {FILTROS.map((f) => {
            const activo = f.id === condicion
            return (
              <Bevel
                key={f.id}
                as="button"
                type="button"
                variant={activo ? 'solid' : 'outline'}
                bevel={10}
                onClick={() => elegir(f.id)}
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

        {/* `role="search"` y no un `<form>` que envía: no hay a dónde enviar,
            el resultado se actualiza mientras se escribe. El Enter no recarga
            porque no hay submit. */}
        <div role="search" className="lg:w-[22rem]">
          <Bevel
            variant="outline"
            bevel={12}
            borderClassName="bg-graphite"
            outerClassName="block transition-colors duration-200 focus-within:bg-amber"
            className="flex items-center gap-3 px-4 py-2.5"
          >
            <label htmlFor={`${uid}-q`} className="font-hud text-bone/45">
              BUSCAR
            </label>
            {/* 16px como mínimo: por debajo de eso iOS hace zoom al enfocar y
                la página queda corrida. */}
            <input
              id={`${uid}-q`}
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Marca, modelo, detalle…"
              autoComplete="off"
              className="w-full min-w-0 bg-transparent text-base text-bone outline-none placeholder:text-bone/30"
            />
            {texto && (
              <button
                type="button"
                onClick={() => setTexto('')}
                className="font-hud shrink-0 text-bone/45 transition-colors duration-200 hover:text-amber focus-visible:text-amber"
              >
                <span aria-hidden="true">×</span>
                <span className="sr-only">Borrar la búsqueda</span>
              </button>
            )}
          </Bevel>
        </div>
      </div>

      {/* ── Cuenta ──────────────────────────────────────────────────── */}
      <p
        className="font-hud mt-6 flex items-center gap-3 text-bone/45"
        aria-live="polite"
      >
        <span aria-hidden="true" className="text-amber">
          \
        </span>
        <span className="num">{esqueletos ? 'BUSCANDO…' : contar(lista.length)}</span>
        {hayFiltro && !esqueletos && (
          <button
            type="button"
            onClick={limpiarTodo}
            className="font-hud text-amber underline-offset-4 hover:underline focus-visible:underline"
          >
            VER TODAS
          </button>
        )}
      </p>

      {/* ── Grilla ──────────────────────────────────────────────────── */}
      {esqueletos ? (
        <div className={GRILLA}>
          {Array.from({ length: ESQUELETOS }, (_, i) => (
            <VehiculoCardEsqueleto key={i} className={EN_GRILLA} />
          ))}
        </div>
      ) : lista.length > 0 ? (
        <div
          className={`${GRILLA} transition-opacity duration-200 ${
            cargando ? 'opacity-50' : 'opacity-100'
          }`}
          aria-busy={cargando}
        >
          {lista.map((v) => (
            <VehiculoCard key={v.id} v={v} className={EN_GRILLA} />
          ))}
        </div>
      ) : (
        <Vacio q={q} condicion={condicion} onLimpiar={limpiarTodo} />
      )}
    </PaginaInterna>
  )
}

/**
 * El estado vacío.
 *
 * No dice "sin resultados" y se calla: dice qué se buscó, por qué puede no
 * estar y qué hacer ahora. En una concesionaria el stock rota cada semana, así
 * que "no está hoy" casi siempre significa "preguntá", y preguntar es
 * exactamente lo que hay que ofrecer.
 */
function Vacio({
  q,
  condicion,
  onLimpiar,
}: {
  q: string
  condicion: IdFiltro
  onLimpiar: () => void
}) {
  const etiqueta = FILTROS.find((f) => f.id === condicion)?.label.toLowerCase()

  return (
    <Bevel
      variant="outline"
      bevel={16}
      borderClassName="bg-graphite"
      outerClassName="mt-8 block"
      className="p-6 md:p-10"
    >
      <p className="font-hud text-amber">SIN UNIDADES QUE MOSTRAR</p>

      <h2 className="font-display mt-4 text-h2 leading-tight text-balance text-bone">
        {q ? (
          <>
            No tenemos nada cargado con «{q}»
            {condicion !== 'todos' ? ` en ${etiqueta}` : ''}
          </>
        ) : condicion !== 'todos' ? (
          <>Ahora mismo no hay unidades {etiqueta}</>
        ) : (
          <>Todavía no hay unidades publicadas</>
        )}
      </h2>

      <p className="mt-4 max-w-[60ch] text-bone/65">
        El stock rota todas las semanas y muchas unidades se venden antes de que
        lleguemos a publicarlas. Decinos qué estás buscando y te avisamos apenas
        entre algo así.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Bevel
          as="a"
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          variant="solid"
          bevel={12}
          className="font-hud px-5 py-3"
        >
          PEDIRLO POR WHATSAPP
        </Bevel>

        <Bevel
          as="button"
          type="button"
          onClick={onLimpiar}
          variant="outline"
          bevel={12}
          outerClassName="inline-block transition-colors duration-200 hover:bg-amber"
          className="font-hud px-5 py-3 text-bone"
        >
          VER TODO EL CATÁLOGO
        </Bevel>
      </div>
    </Bevel>
  )
}

export default Catalogo
