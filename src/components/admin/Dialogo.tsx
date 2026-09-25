import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import Bevel from '../Bevel'
import { startScroll, stopScroll } from '../../lib/smooth'

/**
 * El diálogo de confirmar del panel.
 *
 * Es un `<dialog>` de verdad y no un div flotante: el elemento nativo trae la
 * capa superior, la trampa de foco y el cierre con Escape, que son las tres
 * cosas que un modal hecho a mano suele no tener. Y NO ES `confirm()`: un
 * cuadro del navegador no puede decir cuántas fotos se van a borrar, que es
 * justamente lo único que hace falta saber antes de apretar.
 *
 * El botón peligroso NUNCA es el que recibe el foco al abrir: entra enfocado
 * el que cancela, así que un Enter de más no borra nada.
 */

type DialogoProps = {
  abierto: boolean
  /** Titular corto. Dice qué está por pasar, no "¿Estás seguro?". */
  titulo: string
  children: ReactNode
  /** Texto del botón que ejecuta. Dice qué hace: "Borrar la unidad". */
  confirmar: string
  onConfirmar: () => void
  /** Texto del botón que no hace nada. Ej: "Seguir editando". */
  cancelar: string
  onCancelar: () => void
  /** `peligro` pinta el botón de confirmar en `--color-flag`. */
  tono?: 'normal' | 'peligro'
  /** Deshabilita los dos botones mientras la acción está en curso. */
  ocupado?: boolean
}

export function Dialogo({
  abierto,
  titulo,
  children,
  confirmar,
  onConfirmar,
  cancelar,
  onCancelar,
  tono = 'normal',
  ocupado = false,
}: DialogoProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return

    if (abierto) {
      if (!d.open) d.showModal()
      // Lenis scrollea el documento aunque haya un modal encima: sin frenarlo,
      // la página de atrás se mueve mientras se lee el diálogo.
      stopScroll()
    } else if (d.open) {
      d.close()
      startScroll()
    }

    return () => {
      if (abierto) startScroll()
    }
  }, [abierto])

  return (
    <dialog
      ref={ref}
      className="dialogo m-auto w-[calc(100%-2rem)] max-w-[30rem] border-0 bg-transparent p-0 text-bone"
      /* Escape y el botón de atrás del sistema disparan `cancel`. Se avisa
         hacia arriba en vez de dejar que el elemento se cierre solo, para que
         el estado de React no quede diciendo que sigue abierto. */
      onCancel={(e) => {
        e.preventDefault()
        if (!ocupado) onCancelar()
      }}
    >
      <Bevel
        variant="outline"
        bevel={16}
        borderClassName={tono === 'peligro' ? 'bg-flag' : 'bg-amber'}
        outerClassName="block"
        className="p-6 md:p-8"
      >
        <p
          className={`font-hud ${tono === 'peligro' ? 'text-flag' : 'text-amber'}`}
        >
          {tono === 'peligro' ? 'ESTO NO SE PUEDE DESHACER' : 'ANTES DE SEGUIR'}
        </p>

        <h2 className="font-display mt-3 text-2xl leading-tight text-balance text-bone">
          {titulo}
        </h2>

        <div className="mt-4 space-y-3 text-bone/70">{children}</div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row-reverse">
          <Bevel
            as="button"
            type="button"
            variant="solid"
            bevel={12}
            onClick={onConfirmar}
            disabled={ocupado}
            surfaceClassName={
              tono === 'peligro' ? 'bg-flag text-bone' : 'bg-amber text-void'
            }
            className={`font-hud min-h-[3rem] flex-1 px-5 ${
              ocupado ? 'opacity-60' : ''
            }`}
          >
            {confirmar.toUpperCase()}
          </Bevel>

          {/* `autoFocus` en el que NO hace nada: es el que se apreta sin leer. */}
          <Bevel
            as="button"
            type="button"
            variant="outline"
            bevel={12}
            autoFocus
            onClick={onCancelar}
            disabled={ocupado}
            borderClassName="bg-graphite"
            outerClassName="flex-1 transition-colors duration-200 hover:bg-amber"
            className="font-hud flex min-h-[3rem] items-center justify-center px-5 text-bone"
          >
            {cancelar.toUpperCase()}
          </Bevel>
        </div>
      </Bevel>
    </dialog>
  )
}

export default Dialogo
