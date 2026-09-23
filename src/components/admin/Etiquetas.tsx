import { useId, useState } from 'react'
import Bevel from '../Bevel'
import { BotonChico, Seccion } from './Campos'
import Dialogo from './Dialogo'
import type { Etiqueta, Foto } from '../../types/vehiculo'

/**
 * Las etiquetas de la ficha, en el panel.
 *
 * A DIFERENCIA DE LAS FOTOS Y DEL VIDEO, ESTO ES TEXTO Y SE GUARDA CON EL
 * BOTÓN DE GUARDAR del formulario. Las etiquetas viajan en `CambiosVehiculo`
 * como el título o el precio, así que escribir una y arrepentirse se deshace
 * saliendo sin guardar, igual que con cualquier otro campo. Un guardado
 * automático acá rompería el aviso de "cambios sin guardar", que es lo único
 * que hoy protege media carga.
 *
 * EL FONDO NO SE SUBE: se elige una de las fotos del mismo auto. Un uploader
 * propio por etiqueta sería un segundo lugar donde perder fotos, y la dueña ya
 * tiene diez por unidad.
 *
 * NO HAY TOPE. Son texto, pesan nada, y son la única parte de la ficha donde
 * se puede contar lo que quiera de la unidad.
 */

const MAX_TITULO = 24
const MAX_TEXTO = 90

/**
 * Las seis de un toque.
 *
 * No son plantillas con texto adentro: son los seis encabezados que aparecen
 * en casi todas las unidades, para no tener que escribir "Transmisión" a mano
 * en cada auto. El texto lo pone la dueña, que es la que sabe si es automática
 * de ocho marchas o manual de cinco.
 */
const SUGERENCIAS = [
  'Motor',
  'Transmisión',
  'Combustible',
  'Tracción',
  'Kilometraje',
  'Equipamiento',
] as const

const CAJA =
  'w-full min-w-0 bg-transparent px-3 py-3 text-base text-bone outline-none placeholder:text-bone/25'

let contador = 0
const nuevoId = () => `etq-nueva-${Date.now().toString(36)}-${contador++}`

/** Reenumera `orden` de 0 en adelante. La ficha ordena por ese campo. */
const renumerar = (lista: Etiqueta[]) => lista.map((e, i) => ({ ...e, orden: i }))

// ── Una fila ──────────────────────────────────────────────────────────────

/**
 * VIVE A NIVEL DE MÓDULO como el resto de los campos del panel: definida
 * adentro de `Etiquetas` sería un tipo nuevo en cada render y el `<input>` del
 * título perdería el foco en cada tecla. Ver la cabecera de `Campos.tsx`.
 */
function FilaEtiqueta({
  etiqueta,
  indice,
  total,
  fotos,
  onCambio,
  onMover,
  onBorrar,
}: {
  etiqueta: Etiqueta
  indice: number
  total: number
  fotos: Foto[]
  onCambio: (cambios: Partial<Etiqueta>) => void
  onMover: (hacia: number) => void
  onBorrar: () => void
}) {
  const uid = useId()

  return (
    <Bevel
      as="li"
      variant="outline"
      bevel={12}
      borderClassName="bg-graphite"
      outerClassName="adm-etq block"
      className="p-3"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="num text-bone/45">
          {String(indice + 1).padStart(2, '0')}
        </span>
        <div className="flex gap-2">
          <BotonChico
            etiqueta={`Subir la etiqueta ${indice + 1}`}
            onClick={() => onMover(indice - 1)}
            disabled={indice === 0}
          >
            <span aria-hidden="true">↑</span>
          </BotonChico>
          <BotonChico
            etiqueta={`Bajar la etiqueta ${indice + 1}`}
            onClick={() => onMover(indice + 1)}
            disabled={indice === total - 1}
          >
            <span aria-hidden="true">↓</span>
          </BotonChico>
          <BotonChico tono="peligro" onClick={onBorrar}>
            BORRAR
          </BotonChico>
        </div>
      </div>

      <label htmlFor={`${uid}-titulo`} className="font-hud mt-3 block text-bone/45">
        TÍTULO
      </label>
      <Bevel
        variant="outline"
        bevel={10}
        borderClassName="bg-graphite"
        outerClassName="mt-1.5 block transition-colors duration-200 focus-within:bg-amber"
      >
        <input
          id={`${uid}-titulo`}
          type="text"
          value={etiqueta.titulo}
          onChange={(e) => onCambio({ titulo: e.target.value })}
          maxLength={MAX_TITULO}
          placeholder="Motor"
          autoComplete="off"
          className={`${CAJA} min-h-[3rem]`}
        />
      </Bevel>

      <label htmlFor={`${uid}-texto`} className="font-hud mt-3 block text-bone/45">
        TEXTO
      </label>
      <Bevel
        variant="outline"
        bevel={10}
        borderClassName="bg-graphite"
        outerClassName="mt-1.5 block transition-colors duration-200 focus-within:bg-amber"
      >
        <textarea
          id={`${uid}-texto`}
          rows={2}
          value={etiqueta.texto}
          onChange={(e) => onCambio({ texto: e.target.value })}
          maxLength={MAX_TEXTO}
          placeholder="2.8 turbodiésel, 204 CV"
          className={`${CAJA} resize-y leading-relaxed`}
        />
      </Bevel>

      {/* ── Foto de fondo ──────────────────────────────────────────────
          Una fila que se scrollea de costado y no una grilla: con diez fotos,
          una grilla de miniaturas mide más que la etiqueta entera y empuja la
          siguiente fuera de la pantalla. */}
      <p className="font-hud mt-3 text-bone/45">FOTO DE FONDO</p>
      {fotos.length === 0 ? (
        <p className="font-hud mt-1.5 text-bone/40 normal-case">
          Esta unidad todavía no tiene fotos. Subí alguna arriba y volvé: la
          etiqueta se puede dibujar sobre cualquiera de ellas.
        </p>
      ) : (
        /* El alto de la fila lo fija el contenedor. Cada opción mide `h-full`
           y NO `h-14`: el tamaño de una variante `outline` tiene que ir en
           `outerClassName`, porque el div de adentro ya trae `h-full w-full` y
           dos alturas en el mismo atributo las resuelve el orden en que
           Tailwind emite las reglas, no el orden en que uno las escribe. Con
           el alto puesto adentro, las miniaturas salían a pantalla completa. */
        <div
          role="radiogroup"
          aria-label="Foto de fondo de la etiqueta"
          className="mt-1.5 flex h-14 min-w-0 gap-2 overflow-x-auto pb-1"
        >
          <Bevel
            as="button"
            type="button"
            variant="outline"
            bevel={8}
            role="radio"
            aria-checked={etiqueta.fotoFondoId === null}
            onClick={() => onCambio({ fotoFondoId: null })}
            borderClassName={
              etiqueta.fotoFondoId === null ? 'bg-amber' : 'bg-graphite'
            }
            outerClassName="h-14 w-20 shrink-0"
            className="font-hud flex h-full w-full items-center justify-center px-1 text-center leading-tight text-bone/50"
          >
            SIN FOTO
          </Bevel>

          {fotos.map((f, i) => {
            const elegida = etiqueta.fotoFondoId === f.id
            return (
              <Bevel
                key={f.id}
                as="button"
                type="button"
                variant="outline"
                bevel={8}
                role="radio"
                aria-checked={elegida}
                aria-label={`Foto ${i + 1}`}
                onClick={() => onCambio({ fotoFondoId: f.id })}
                borderClassName={elegida ? 'bg-amber' : 'bg-graphite'}
                outerClassName="h-14 w-20 shrink-0"
                className="block h-full w-full overflow-hidden"
              >
                <img
                  src={f.url}
                  alt=""
                  width={f.ancho}
                  height={f.alto}
                  loading="lazy"
                  decoding="async"
                  className={`h-full w-full object-cover transition-opacity duration-200 ${
                    elegida ? 'opacity-100' : 'opacity-55'
                  }`}
                />
              </Bevel>
            )
          })}
        </div>
      )}
    </Bevel>
  )
}

// ── El bloque ─────────────────────────────────────────────────────────────

type EtiquetasProps = {
  etiquetas: Etiqueta[]
  fotos: Foto[]
  onCambio: (etiquetas: Etiqueta[]) => void
}

export function Etiquetas({ etiquetas, fotos, onCambio }: EtiquetasProps) {
  const [aBorrar, setABorrar] = useState<Etiqueta | null>(null)

  const agregar = (titulo: string) => {
    onCambio(
      renumerar([
        ...etiquetas,
        { id: nuevoId(), titulo, texto: '', fotoFondoId: null, orden: 0 },
      ]),
    )
  }

  const editar = (id: string, cambios: Partial<Etiqueta>) => {
    onCambio(etiquetas.map((e) => (e.id === id ? { ...e, ...cambios } : e)))
  }

  const mover = (desde: number, hacia: number) => {
    if (hacia < 0 || hacia >= etiquetas.length) return
    const lista = [...etiquetas]
    const [sacada] = lista.splice(desde, 1)
    lista.splice(hacia, 0, sacada)
    onCambio(renumerar(lista))
  }

  const quitar = (id: string) => {
    onCambio(renumerar(etiquetas.filter((e) => e.id !== id)))
    setABorrar(null)
  }

  /** Una etiqueta vacía se va sin preguntar: no hay nada que perder. */
  const pedirBorrar = (e: Etiqueta) => {
    if (!e.titulo.trim() && !e.texto.trim()) quitar(e.id)
    else setABorrar(e)
  }

  const usados = new Set(etiquetas.map((e) => e.titulo.trim().toLowerCase()))

  return (
    <Seccion
      titulo="ETIQUETAS"
      contador={String(etiquetas.length)}
      ayuda="Lo que quieras destacar de esta unidad, en bloques cortos. No hay límite. Se guardan con el botón de abajo, junto con el resto de los datos."
    >
      {/* ── Las seis de un toque ─────────────────────────────────────── */}
      <p className="font-hud mt-5 text-bone/45">EMPEZAR CON</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {SUGERENCIAS.map((s) => {
          const ya = usados.has(s.toLowerCase())
          return (
            <Bevel
              key={s}
              as="button"
              type="button"
              variant="outline"
              bevel={10}
              onClick={() => agregar(s)}
              disabled={ya}
              borderClassName="bg-graphite"
              outerClassName={
                ya ? 'opacity-35' : 'transition-colors duration-200 hover:bg-amber'
              }
              className="font-hud flex min-h-[2.75rem] items-center px-3 text-bone"
            >
              {ya ? s.toUpperCase() : `+ ${s.toUpperCase()}`}
            </Bevel>
          )
        })}
      </div>

      {/* `grid-cols-1` y no `grid` a secas: una grilla sin columnas declaradas
          arma UNA columna `auto`, y `auto` crece hasta el contenido más ancho
          que haya adentro. El carril de miniaturas estiraba esa columna a
          583 px, el documento se iba de los 390 y el navegador móvil se alejaba
          para que entrara: todos los campos del panel quedaban diminutos y los
          toques caían al lado del botón. `grid-cols-1` es `minmax(0, 1fr)`, que
          no se pasa del ancho disponible. */}
      {etiquetas.length > 0 && (
        <ul className="mt-5 grid grid-cols-1 gap-3">
          {etiquetas.map((e, i) => (
            <FilaEtiqueta
              key={e.id}
              etiqueta={e}
              indice={i}
              total={etiquetas.length}
              fotos={fotos}
              onCambio={(cambios) => editar(e.id, cambios)}
              onMover={(hacia) => mover(i, hacia)}
              onBorrar={() => pedirBorrar(e)}
            />
          ))}
        </ul>
      )}

      <Bevel
        as="button"
        type="button"
        variant="outline"
        bevel={12}
        onClick={() => agregar('')}
        borderClassName="bg-amber"
        outerClassName="mt-5 block w-full transition-colors duration-200"
        className="font-hud flex min-h-[3.25rem] items-center justify-center gap-3 px-6 text-bone"
      >
        <span>AGREGAR UNA ETIQUETA VACÍA</span>
        <span aria-hidden="true" className="text-amber">
          \
        </span>
      </Bevel>

      <Dialogo
        abierto={aBorrar !== null}
        titulo={
          aBorrar?.titulo.trim()
            ? `Vas a borrar «${aBorrar.titulo.trim()}»`
            : 'Vas a borrar una etiqueta'
        }
        confirmar="Borrar la etiqueta"
        onConfirmar={() => aBorrar && quitar(aBorrar.id)}
        cancelar="No, dejarla"
        onCancelar={() => setABorrar(null)}
        tono="peligro"
      >
        <p>
          Se borra el texto que escribiste. La foto de fondo no se toca: sigue
          en la galería de la unidad.
        </p>
      </Dialogo>
    </Seccion>
  )
}

export default Etiquetas
