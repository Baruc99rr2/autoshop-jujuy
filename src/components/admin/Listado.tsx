import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router'
import Bevel from '../Bevel'
import Marco, { AvisoError } from './Marco'
import { repo } from '../../data/repo'
import { formatearPrecio } from '../../lib/formato'
import { portada } from '../../types/vehiculo'
import type { Vehiculo } from '../../types/vehiculo'

/**
 * Todo el stock, borradores incluidos.
 *
 * ES LA PANTALLA DE TRABAJO, no una vitrina: acá la dueña busca la unidad que
 * acaba de vender para marcarla, o la que cargó a medias ayer para terminarla.
 * Por eso el orden es POR ÚLTIMO CAMBIO y no por fecha de alta: lo que se
 * estuvo tocando es lo que se va a volver a tocar.
 *
 * Y por eso cada fila grita su estado. En el sitio público un borrador
 * simplemente no existe; acá tiene que verse de un vistazo cuál está publicada
 * y cuál no, porque el error caro es creer que una unidad está online cuando
 * sigue siendo un borrador.
 */

/** Los avisos de una fila, en orden de importancia. */
function insignias(v: Vehiculo): { texto: string; clase: string }[] {
  const lista: { texto: string; clase: string }[] = []
  if (!v.publicado) lista.push({ texto: 'BORRADOR', clase: 'bg-graphite text-bone/75' })
  if (v.estado !== 'disponible') {
    lista.push({
      texto: v.estado === 'reservado' ? 'RESERVADA' : 'VENDIDA',
      clase: 'bg-flag text-bone',
    })
  }
  if (v.destacado) lista.push({ texto: 'DESTACADA', clase: 'bg-amber text-void' })
  return lista
}

function contar(n: number): string {
  return n === 1 ? '1 UNIDAD' : `${n} UNIDADES`
}

/** Con cuántas letras ya vale la pena molestar al repositorio. */
const MINIMO = 2

export function Listado() {
  const uid = useId()
  const [texto, setTexto] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [lista, setLista] = useState<Vehiculo[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Lo escrito llega a la consulta con retardo: el mock responde al instante,
  // pero Supabase va a ser un viaje de red por tecla si esto no está.
  useEffect(() => {
    const limpio = texto.trim()
    const id = setTimeout(
      () => setBusqueda(limpio.length >= MINIMO ? limpio : ''),
      250,
    )
    return () => clearTimeout(id)
  }, [texto])

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const encontrados = await repo.listar({
          // LO IMPORTANTE DE ESTA PANTALLA: sin esto el panel mostraría lo
          // mismo que el sitio y los borradores serían invisibles para la
          // única persona que puede terminarlos.
          soloPublicados: false,
          texto: busqueda,
          orden: 'actualizados',
        })
        if (vivo) setLista(encontrados)
      } catch (e) {
        if (vivo) setError(e instanceof Error ? e.message : 'No se pudo leer el stock.')
      }
    })()
    return () => {
      vivo = false
    }
  }, [busqueda])

  const cargando = lista === null
  const borradores = lista?.filter((v) => !v.publicado).length ?? 0
  const buscando = busqueda !== ''

  return (
    <Marco
      indice="01"
      eyebrow="PANEL"
      titulo="Tus unidades"
      lead="Todo lo que está cargado, publicado o no. Tocá una unidad para editarla."
      pestania="unidades"
    >
      {/* ── Buscar y crear ──────────────────────────────────────────── */}
      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div role="search" className="min-w-0 flex-1">
          <Bevel
            variant="outline"
            bevel={12}
            borderClassName="bg-graphite"
            outerClassName="block transition-colors duration-200 focus-within:bg-amber"
            className="flex min-h-[3rem] items-center gap-3 px-4"
          >
            <label htmlFor={`${uid}-q`} className="font-hud shrink-0 text-bone/45">
              BUSCAR
            </label>
            <input
              id={`${uid}-q`}
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Marca, modelo, detalle…"
              autoComplete="off"
              className="w-full min-w-0 bg-transparent py-3 text-base text-bone outline-none placeholder:text-bone/25"
            />
            {texto && (
              <button
                type="button"
                onClick={() => setTexto('')}
                className="font-hud shrink-0 px-2 text-bone/45 transition-colors duration-200 hover:text-amber focus-visible:text-amber"
              >
                <span aria-hidden="true">×</span>
                <span className="sr-only">Borrar la búsqueda</span>
              </button>
            )}
          </Bevel>
        </div>

        <Bevel
          as={Link}
          to="/admin/nuevo"
          variant="solid"
          bevel={12}
          className="font-hud flex min-h-[3rem] shrink-0 items-center justify-center gap-3 px-6"
        >
          <span>NUEVA UNIDAD</span>
          <span aria-hidden="true">\</span>
        </Bevel>
      </div>

      {/* ── Cuenta ──────────────────────────────────────────────────── */}
      <p className="font-hud mt-6 flex flex-wrap items-center gap-3 text-bone/45" aria-live="polite">
        <span aria-hidden="true" className="text-amber">
          \
        </span>
        <span className="num">{cargando ? 'CARGANDO…' : contar(lista.length)}</span>
        {!cargando && borradores > 0 && (
          <span className="num text-bone/35">
            — {borradores} SIN PUBLICAR
          </span>
        )}
      </p>

      {error && (
        <div className="mt-6">
          <AvisoError texto={error} />
        </div>
      )}

      {/* ── Filas ───────────────────────────────────────────────────── */}
      {!cargando &&
        (lista.length > 0 ? (
          <ul className="mt-6 grid gap-3">
            {lista.map((v) => (
              <li key={v.id}>
                <Fila v={v} />
              </li>
            ))}
          </ul>
        ) : (
          <Vacio buscando={buscando} q={busqueda} onLimpiar={() => setTexto('')} />
        ))}
    </Marco>
  )
}

/**
 * Una unidad en el listado.
 *
 * LA FILA ENTERA ES EL ENLACE. En un celular, un botón "editar" de 40 px al
 * final de la fila se falla; la fila mide 96 px de alto y no se falla nunca.
 * El borrar no está acá a propósito: vive adentro del formulario, detrás de
 * un diálogo, porque un borrar al alcance del pulgar en una lista es un
 * borrado accidental esperando su turno.
 */
function Fila({ v }: { v: Vehiculo }) {
  const foto = portada(v)
  const avisos = insignias(v)

  return (
    <Bevel
      as={Link}
      to={`/admin/editar/${v.id}`}
      variant="outline"
      bevel={12}
      borderClassName="bg-graphite"
      outerClassName="block transition-colors duration-200 hover:bg-amber focus-visible:bg-amber"
      className="flex items-stretch gap-4 p-3"
    >
      <div className="relative w-24 shrink-0 self-stretch overflow-hidden bg-void sm:w-32">
        {foto ? (
          <img
            src={foto.url}
            alt=""
            width={foto.ancho}
            height={foto.alto}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full min-h-[4.5rem] place-items-center bg-asphalt px-2 text-center">
            <span className="font-hud text-bone/35">SIN FOTOS</span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center py-1">
        <h2 className="font-display truncate text-lg text-bone sm:text-xl">
          {v.titulo}
        </h2>

        <p className="font-hud num mt-1.5 text-bone/70">
          {formatearPrecio(v.precio)}
        </p>

        {avisos.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {avisos.map((a) => (
              <Bevel
                key={a.texto}
                variant="ghost"
                bevel={6}
                surfaceClassName={a.clase}
                className="font-hud px-2.5 py-1"
              >
                {a.texto}
              </Bevel>
            ))}
          </div>
        )}
      </div>

      <span aria-hidden="true" className="font-hud self-center pr-1 text-bone/30">
        \
      </span>
    </Bevel>
  )
}

/**
 * Cuando no hay nada que mostrar.
 *
 * Son DOS situaciones distintas y no se dicen igual: un panel recién estrenado
 * necesita que le digan por dónde empezar, y una búsqueda sin resultados
 * necesita que le digan que lo buscado no está, no que el stock está vacío.
 */
function Vacio({
  buscando,
  q,
  onLimpiar,
}: {
  buscando: boolean
  q: string
  onLimpiar: () => void
}) {
  return (
    <Bevel
      variant="outline"
      bevel={16}
      borderClassName="bg-graphite"
      outerClassName="mt-6 block"
      className="p-6 md:p-8"
    >
      <p className="font-hud text-amber">
        {buscando ? 'SIN RESULTADOS' : 'TODAVÍA NO HAY NADA CARGADO'}
      </p>

      <h2 className="font-display mt-4 text-2xl leading-tight text-balance text-bone">
        {buscando ? <>No encontré nada con «{q}»</> : <>Empezá por la primera unidad</>}
      </h2>

      <p className="mt-4 max-w-[52ch] text-bone/65">
        {buscando ? (
          <>
            La búsqueda mira el título y la descripción de todas las unidades,
            publicadas y borradores. Probá con menos palabras: con la marca o
            con el modelo suele alcanzar.
          </>
        ) : (
          <>
            Cargá el auto con el título, el precio y los datos básicos. Podés
            guardarlo como borrador y publicarlo más tarde, cuando le tengas
            las fotos.
          </>
        )}
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Bevel
          as={Link}
          to="/admin/nuevo"
          variant="solid"
          bevel={12}
          className="font-hud flex min-h-[3rem] items-center justify-center gap-3 px-6"
        >
          <span>CARGAR UNA UNIDAD</span>
          <span aria-hidden="true">\</span>
        </Bevel>

        {buscando && (
          <Bevel
            as="button"
            type="button"
            onClick={onLimpiar}
            variant="outline"
            bevel={12}
            borderClassName="bg-graphite"
            outerClassName="transition-colors duration-200 hover:bg-amber"
            className="font-hud flex min-h-[3rem] items-center justify-center px-6 text-bone"
          >
            VER TODAS
          </Bevel>
        )}
      </div>
    </Bevel>
  )
}

export default Listado
