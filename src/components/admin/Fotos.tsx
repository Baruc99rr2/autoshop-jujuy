import { useId, useRef, useState } from 'react'
import Bevel from '../Bevel'
import { BotonChico, Seccion } from './Campos'
import Dialogo from './Dialogo'
import { repo } from '../../data/repo'
import { ErrorArchivo, PESO_OBJETIVO, pesoLegible, prepararFoto } from '../../lib/archivos'
import { MAX_FOTOS } from '../../types/vehiculo'
import type { Foto } from '../../types/vehiculo'

/**
 * Las fotos de una unidad, en el panel.
 *
 * SE GUARDAN AL INSTANTE, no con el botón de guardar del formulario. Las fotos
 * no son un campo: cada una es un archivo que ya viajó, y dejarlas colgando de
 * un "guardar" de más abajo significa que cerrar la pestaña con seis fotos
 * subidas las pierde todas. Lo que el formulario guarda es texto; lo que esta
 * lista guarda son archivos, y por eso van por caminos distintos.
 *
 * EL ORDEN SE CAMBIA CON BOTONES Y NO ARRASTRANDO. Arrastrar en un celular
 * pelea con el scroll de la página: para bajar la cuarta foto hay que mantener
 * apretado sin moverse, esperar, y recién ahí mover sin salirse de la lista.
 * Dos flechas no tienen nada de elegante y se aciertan a la primera con el
 * pulgar, que es el único lugar donde esto se va a usar.
 */

/** Una foto en camino: se achica, se guarda, y desaparece de la cola. */
type Trabajo = {
  id: string
  nombre: string
  /** El original, para poder reintentar sin volver a elegirlo. */
  archivo: File
  etapa: 'espera' | 'achicando' | 'guardando' | 'error'
  /** Qué pasó, si falló. */
  motivo?: string
}

/** El progreso de cada etapa. No es una medición: es en qué paso va. */
const AVANCE: Record<Trabajo['etapa'], number> = {
  espera: 4,
  achicando: 45,
  guardando: 85,
  error: 100,
}

const ETIQUETA: Record<Trabajo['etapa'], string> = {
  espera: 'EN LA FILA',
  achicando: 'ACHICANDO…',
  guardando: 'GUARDANDO…',
  error: 'NO SE PUDO',
}

/**
 * El ámbar significa "activo" en todo el sitio, así que lo lleva SOLO la foto
 * que se está procesando. Pintando de ámbar también las que esperan, las cinco
 * filas parecían estar trabajando a la vez.
 */
const TINTA: Record<Trabajo['etapa'], string> = {
  espera: 'text-bone/40',
  achicando: 'text-amber',
  guardando: 'text-amber',
  error: 'text-flag',
}

type FotosProps = {
  vehiculoId: string
  fotos: Foto[]
  /** La lista nueva, ya guardada. */
  onFotos: (fotos: Foto[]) => void
  /** Una foto que dejó de existir: las etiquetas que la usaban quedan sin fondo. */
  onFotoBorrada: (fotoId: string) => void
}

export function Fotos({ vehiculoId, fotos, onFotos, onFotoBorrada }: FotosProps) {
  const uid = useId()
  const entrada = useRef<HTMLInputElement>(null)

  const [cola, setCola] = useState<Trabajo[]>([])
  const [subiendo, setSubiendo] = useState(false)
  const [moviendo, setMoviendo] = useState(false)
  const [falla, setFalla] = useState<string | null>(null)
  const [aBorrar, setABorrar] = useState<Foto | null>(null)

  // Las que están en vuelo ya ocuparon su lugar aunque todavía no estén
  // guardadas: sin descontarlas, la ayuda decía "quedan 10 lugares" con cinco
  // fotos subiendo en pantalla.
  const enVuelo = cola.filter((t) => t.etapa !== 'error').length
  const libres = Math.max(0, MAX_FOTOS - fotos.length - enVuelo)
  const lleno = MAX_FOTOS - fotos.length <= 0

  const refrescar = async () => {
    const v = await repo.obtenerPorId(vehiculoId)
    if (v) onFotos(v.fotos)
  }

  /**
   * Las fotos se procesan DE A UNA.
   *
   * En paralelo sería más rápido en una notebook y peor en el teléfono, que es
   * donde va a correr: seis canvas de 1600 px a la vez hacen que el navegador
   * se quede sin memoria y mate la pestaña con la carga adentro.
   */
  const elegir = async (archivos: File[]) => {
    setFalla(null)
    if (archivos.length === 0) return

    const entran = archivos.slice(0, libres)
    if (entran.length === 0) {
      setFalla(
        `No queda lugar: son ${MAX_FOTOS} fotos por unidad. Borrá alguna de la lista y volvé a intentar.`,
      )
      return
    }
    if (archivos.length > libres) {
      setFalla(
        `Elegiste ${archivos.length} fotos y ${
          libres === 1 ? 'queda 1 lugar' : `quedan ${libres} lugares`
        }. Se suben las primeras ${entran.length}; el resto, después de borrar alguna.`,
      )
    }

    const trabajos: Trabajo[] = entran.map((f, i) => ({
      id: `${uid}-${Date.now()}-${i}`,
      nombre: f.name,
      archivo: f,
      etapa: 'espera',
    }))
    setCola((prev) => [...prev.filter((t) => t.etapa === 'error'), ...trabajos])
    setSubiendo(true)
    for (const t of trabajos) await procesar(t)
    setSubiendo(false)
    if (entrada.current) entrada.current.value = ''
  }

  const marcar = (id: string, etapa: Trabajo['etapa'], motivo?: string) =>
    setCola((prev) => prev.map((t) => (t.id === id ? { ...t, etapa, motivo } : t)))

  const procesar = async (t: Trabajo) => {
    try {
      marcar(t.id, 'achicando')
      const lista = await prepararFoto(t.archivo)
      marcar(t.id, 'guardando')
      await repo.subirFoto(vehiculoId, lista.archivo)
      // La que salió bien se va de la cola: ya se ve en la lista de abajo, y
      // dejarla acá sería mostrar la misma foto dos veces.
      setCola((prev) => prev.filter((x) => x.id !== t.id))
    } catch (err) {
      marcar(
        t.id,
        'error',
        err instanceof ErrorArchivo || err instanceof Error ? err.message : 'No se pudo subir.',
      )
      return
    }
    // Aparte: si la foto ya se guardó y lo que falla es releer la lista, la
    // foto no volvió a la cola como fallida. Se ve en cuanto la lista se relea.
    await refrescar().catch(() => {})
  }

  /** Una que falló, otra vez, con el mismo archivo. */
  const reintentar = async (t: Trabajo) => {
    setFalla(null)
    setSubiendo(true)
    await procesar(t)
    setSubiendo(false)
  }

  const descartar = (id: string) => setCola((prev) => prev.filter((t) => t.id !== id))

  const mover = async (desde: number, hacia: number) => {
    if (hacia < 0 || hacia >= fotos.length) return
    setFalla(null)
    setMoviendo(true)
    try {
      const ids = fotos.map((f) => f.id)
      const [sacada] = ids.splice(desde, 1)
      ids.splice(hacia, 0, sacada)
      onFotos(await repo.reordenarFotos(vehiculoId, ids))
    } catch (err) {
      setFalla(err instanceof Error ? err.message : 'No se pudo cambiar el orden.')
    } finally {
      setMoviendo(false)
    }
  }

  /** La posición que ocupa en la lista, para nombrarla en el diálogo. */
  const posicion = aBorrar ? fotos.findIndex((f) => f.id === aBorrar.id) : -1

  const borrar = async () => {
    if (!aBorrar) return
    const fotoId = aBorrar.id
    setFalla(null)
    try {
      await repo.eliminarFoto(vehiculoId, fotoId)
      onFotoBorrada(fotoId)
      await refrescar()
    } catch (err) {
      setFalla(err instanceof Error ? err.message : 'No se pudo borrar la foto.')
    } finally {
      setABorrar(null)
    }
  }

  return (
    <Seccion
      titulo="FOTOS"
      contador={`${fotos.length} / ${MAX_FOTOS}`}
      ayuda={
        <>
          La primera es la portada: es la que se ve en el catálogo y en
          WhatsApp. Se achican solas a {pesoLegible(PESO_OBJETIVO)} antes de
          guardarse, así que podés mandarlas tal cual salen del celular.
        </>
      }
    >
      {/* ── Agregar ──────────────────────────────────────────────────── */}
      <div className="mt-5">
        <input
          ref={entrada}
          id={`${uid}-archivos`}
          type="file"
          accept="image/*"
          multiple
          disabled={lleno || subiendo}
          onChange={(e) => elegir([...(e.target.files ?? [])])}
          className="sr-only"
        />

        {lleno ? (
          <Bevel
            variant="outline"
            bevel={12}
            borderClassName="bg-graphite"
            outerClassName="block opacity-50"
            className="font-hud flex min-h-[3.25rem] items-center justify-center px-6 text-bone/50"
            aria-disabled="true"
          >
            YA HAY {MAX_FOTOS} FOTOS
          </Bevel>
        ) : (
          <Bevel
            as="label"
            htmlFor={`${uid}-archivos`}
            variant="outline"
            bevel={12}
            borderClassName="bg-amber"
            outerClassName={`block ${subiendo ? 'opacity-60' : 'cursor-pointer'}`}
            className="font-hud flex min-h-[3.25rem] items-center justify-center gap-3 px-6 text-bone"
          >
            <span>{subiendo ? 'SUBIENDO…' : 'AGREGAR FOTOS'}</span>
            <span aria-hidden="true" className="text-amber">
              \
            </span>
          </Bevel>
        )}

        <p className="font-hud mt-2 text-bone/40 normal-case">
          {lleno
            ? `Llegaste a las ${MAX_FOTOS} fotos, que es el máximo por unidad. Para subir otra, borrá alguna de la lista.`
            : `Podés elegir varias de una vez. Quedan ${libres} ${
                libres === 1 ? 'lugar' : 'lugares'
              }.`}
        </p>
      </div>

      {falla && (
        <p role="alert" className="font-hud mt-4 flex gap-2 text-flag normal-case">
          <span aria-hidden="true">\</span>
          <span>{falla}</span>
        </p>
      )}

      {/* ── En camino ────────────────────────────────────────────────── */}
      {cola.length > 0 && (
        <ul className="mt-5 grid grid-cols-1 gap-2" aria-live="polite">
          {cola.map((t) => (
            <Bevel
              key={t.id}
              as="li"
              variant="outline"
              bevel={10}
              borderClassName={t.etapa === 'error' ? 'bg-flag' : 'bg-graphite'}
              outerClassName="adm-cola block"
              data-etapa={t.etapa}
              className="p-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 flex-1 truncate text-bone/70">{t.nombre}</p>
                <p className={`font-hud shrink-0 ${TINTA[t.etapa]}`}>
                  {ETIQUETA[t.etapa]}
                </p>
              </div>

              {/* Barra de avance por ETAPA, no por byte: comprimir en un canvas
                  no informa progreso, así que un porcentaje fino sería inventado. */}
              <div className="mt-2 h-1 w-full bg-graphite">
                <div
                  className={`h-full transition-[width] duration-300 ${
                    t.etapa === 'error' ? 'bg-flag' : 'bg-amber'
                  }`}
                  style={{ width: `${AVANCE[t.etapa]}%` }}
                />
              </div>

              {t.motivo && (
                <p className="font-hud mt-2 text-flag normal-case">{t.motivo}</p>
              )}

              {t.etapa === 'error' && (
                <div className="mt-3 flex gap-2">
                  <BotonChico
                    onClick={() => reintentar(t)}
                    disabled={subiendo}
                    className="flex-1"
                  >
                    PROBAR DE NUEVO
                  </BotonChico>
                  <BotonChico onClick={() => descartar(t.id)} disabled={subiendo}>
                    DESCARTAR
                  </BotonChico>
                </div>
              )}
            </Bevel>
          ))}
        </ul>
      )}

      {/* ── La lista ─────────────────────────────────────────────────── */}
      {fotos.length > 0 && (
        <ul className="mt-5 grid grid-cols-1 gap-3">
          {fotos.map((f, i) => (
            <Bevel
              key={f.id}
              as="li"
              variant="outline"
              bevel={12}
              borderClassName={i === 0 ? 'bg-amber' : 'bg-graphite'}
              outerClassName="adm-foto block"
              className="flex gap-3 p-3"
            >
              <img
                src={f.url}
                alt=""
                width={f.ancho}
                height={f.alto}
                loading="lazy"
                decoding="async"
                className="h-20 w-24 shrink-0 bg-void object-cover"
              />

              <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="num text-bone/45">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={`font-hud truncate ${
                      i === 0 ? 'text-amber' : 'text-bone/35'
                    }`}
                  >
                    {i === 0 ? 'PORTADA' : `${f.ancho}×${f.alto}`}
                  </span>
                </div>

                <div className="flex gap-2">
                  <BotonChico
                    etiqueta={`Subir la foto ${i + 1}`}
                    onClick={() => mover(i, i - 1)}
                    disabled={i === 0 || moviendo}
                    className="flex-1"
                  >
                    <span aria-hidden="true">↑</span>
                  </BotonChico>
                  <BotonChico
                    etiqueta={`Bajar la foto ${i + 1}`}
                    onClick={() => mover(i, i + 1)}
                    disabled={i === fotos.length - 1 || moviendo}
                    className="flex-1"
                  >
                    <span aria-hidden="true">↓</span>
                  </BotonChico>
                  <BotonChico
                    tono="peligro"
                    onClick={() => setABorrar(f)}
                    className="flex-[2]"
                  >
                    BORRAR
                  </BotonChico>
                </div>
              </div>
            </Bevel>
          ))}
        </ul>
      )}

      <Dialogo
        abierto={aBorrar !== null}
        titulo={
          posicion === 0
            ? 'Vas a borrar la portada'
            : `Vas a borrar la foto ${String(posicion + 1).padStart(2, '0')}`
        }
        confirmar="Borrar la foto"
        onConfirmar={borrar}
        cancelar="No, dejarla"
        onCancelar={() => setABorrar(null)}
        tono="peligro"
      >
        <p>
          {posicion === 0 && fotos.length > 1
            ? 'La que sigue pasa a ser la portada: es la que se va a ver en el catálogo y en WhatsApp.'
            : 'La foto se borra de esta unidad y no se puede recuperar; hay que volver a subirla.'}
        </p>
        {aBorrar && (
          <p className="font-hud text-bone/45 normal-case">
            Si alguna etiqueta la tenía de fondo, esa etiqueta queda sin foto.
            No se borra.
          </p>
        )}
      </Dialogo>
    </Seccion>
  )
}

export default Fotos
