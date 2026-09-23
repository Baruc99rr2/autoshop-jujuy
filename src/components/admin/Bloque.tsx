import type { ReactNode } from 'react'
import Bevel from '../Bevel'
import { BotonChico } from './Campos'
import { AvisoError } from './Marco'

/**
 * Lo que comparten los tres bloques de «Contenido del sitio»: el borrador con
 * su propio guardado, la barra de guardar y la fila de una lista.
 *
 * CADA BLOQUE GUARDA SOLO LO SUYO. La dueña va a entrar a cambiar el precio
 * de un servicio, no a revisar las seis preguntas; con un solo botón para
 * toda la pantalla, un error en una respuesta que ni tocó le frenaría el
 * precio.
 *
 * Acá van los componentes; el estado y las ayudas, en `estado-bloque.ts`.
 */

/**
 * El pie de un bloque: el error del repositorio si lo hubo, y el botón.
 *
 * PEGADO ABAJO DENTRO DE SU BLOQUE: con diez servicios el bloque mide cinco
 * pantallas en el celular, y el botón al final obliga a bajar a ciegas cada
 * vez que se corrige un precio. Al estar dentro de la `<section>`, se despega
 * cuando el bloque termina y no tapa al siguiente.
 */
export function BarraGuardar({
  etiqueta,
  sucio,
  ocupado,
  guardado,
  falla,
  onGuardar,
}: {
  etiqueta: string
  sucio: boolean
  ocupado: boolean
  guardado: boolean
  falla: string | null
  onGuardar: () => void
}) {
  const quieto = !sucio || ocupado
  return (
    <>
      {falla && (
        <div className="mt-6">
          <AvisoError texto={falla} />
        </div>
      )}
      <div className="sticky bottom-0 z-10 mt-6 border-t border-graphite bg-void/95 py-4 backdrop-blur-sm">
        <Bevel
          as="button"
          type="button"
          variant="solid"
          bevel={12}
          onClick={onGuardar}
          disabled={quieto}
          className={`font-hud flex min-h-[3.25rem] w-full items-center justify-center gap-3 px-6 ${
            quieto ? 'opacity-45' : ''
          }`}
        >
          <span>{ocupado ? 'GUARDANDO…' : etiqueta}</span>
          <span aria-hidden="true">\</span>
        </Bevel>
        <p className="font-hud mt-3 text-bone/40" aria-live="polite">
          {sucio ? 'CAMBIOS SIN GUARDAR' : guardado ? 'GUARDADO: YA SE VE EN EL SITIO' : 'SIN CAMBIOS'}
        </p>
      </div>
    </>
  )
}

/**
 * Una fila de una lista editable: número, subir, bajar y borrar, y los campos
 * abajo. Es la misma cabecera que las etiquetas de una unidad.
 */
export function FilaLista({
  indice,
  total,
  nombre,
  onMover,
  onBorrar,
  children,
}: {
  indice: number
  total: number
  /** "el servicio", "la pregunta": para las etiquetas de las flechas. */
  nombre: string
  onMover: (hacia: number) => void
  onBorrar: () => void
  children: ReactNode
}) {
  return (
    <Bevel
      as="li"
      variant="outline"
      bevel={12}
      borderClassName="bg-graphite"
      outerClassName="block"
      className="p-3"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="num text-bone/45">{String(indice + 1).padStart(2, '0')}</span>
        <div className="flex gap-2">
          <BotonChico
            etiqueta={`Subir ${nombre} ${indice + 1}`}
            onClick={() => onMover(indice - 1)}
            disabled={indice === 0}
          >
            <span aria-hidden="true">↑</span>
          </BotonChico>
          <BotonChico
            etiqueta={`Bajar ${nombre} ${indice + 1}`}
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
      {children}
    </Bevel>
  )
}

/** El botón de alta, al pie de la lista. */
export function BotonAgregar({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <Bevel
      as="button"
      type="button"
      variant="outline"
      bevel={12}
      onClick={onClick}
      borderClassName="bg-amber"
      outerClassName="mt-5 block w-full"
      className="font-hud flex min-h-[3.25rem] items-center justify-center gap-3 px-6 text-bone"
    >
      <span>{children}</span>
      <span aria-hidden="true" className="text-amber">
        \
      </span>
    </Bevel>
  )
}
