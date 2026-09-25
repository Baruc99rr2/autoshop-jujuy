import { useEffect, useRef } from 'react'
import Bevel from '../Bevel'
import { cerrarSesion } from '../../data/sesion'
import { useInactividad } from '../../lib/inactividad'
import { startScroll, stopScroll } from '../../lib/smooth'

/** "1:59", con la cifra en mono. */
function reloj(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * El aviso de los últimos dos minutos antes del cierre por inactividad.
 *
 * No usa `Dialogo`: ahí el botón grande es el que EJECUTA y el foco va al que
 * no hace nada. Acá es al revés: lo seguro es seguir conectada, así que ese
 * es el botón grande, el que tiene el foco y el que responde a Escape.
 *
 * Lo monta `Protegida`, o sea cualquier pantalla del panel con sesión. El
 * sitio público no lo tiene.
 */
export function AvisoInactividad() {
  const { restante, seguir } = useInactividad()
  const ref = useRef<HTMLDialogElement>(null)
  const abierto = restante !== null && restante > 0

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (abierto && !d.open) {
      d.showModal()
      stopScroll()
    } else if (!abierto && d.open) {
      d.close()
      startScroll()
    }
  }, [abierto])

  useEffect(() => () => startScroll(), [])

  return (
    <dialog
      ref={ref}
      aria-labelledby="inactividad-titulo"
      className="dialogo m-auto w-[calc(100%-2rem)] max-w-[30rem] border-0 bg-transparent p-0 text-bone"
      onCancel={(e) => {
        e.preventDefault()
        seguir()
      }}
    >
      <Bevel variant="outline" bevel={16} outerClassName="block" className="p-6 md:p-8">
        <p className="font-hud text-amber">SESIÓN SIN USO</p>

        {/* El diálogo modal ya se anuncia al abrirse con este título; la
            cuenta no lleva `aria-live` para no leer un número por segundo. */}
        <h2
          id="inactividad-titulo"
          className="font-display mt-3 text-2xl leading-tight text-balance text-bone"
        >
          Por seguridad, tu sesión se va a cerrar en{' '}
          <span className="font-hud num text-amber">{reloj(restante ?? 0)}</span>
        </h2>

        <p className="mt-4 text-bone/70">
          Pasó un rato sin que toques nada. Si seguís trabajando, tocá el botón
          de abajo. Lo que no guardaste se pierde al cerrarse.
        </p>

        <div className="mt-8 grid gap-3">
          <Bevel
            as="button"
            type="button"
            variant="solid"
            bevel={12}
            autoFocus
            onClick={seguir}
            className="font-hud flex min-h-[3.5rem] w-full items-center justify-center gap-3 px-5 text-base"
          >
            <span>SEGUIR CONECTADA</span>
            <span aria-hidden="true">\</span>
          </Bevel>

          <Bevel
            as="button"
            type="button"
            variant="outline"
            bevel={12}
            onClick={() => cerrarSesion()}
            borderClassName="bg-graphite"
            outerClassName="block transition-colors duration-200 hover:bg-amber"
            className="font-hud flex min-h-[3rem] items-center justify-center px-5 text-bone"
          >
            SALIR AHORA
          </Bevel>
        </div>
      </Bevel>
    </dialog>
  )
}

export default AvisoInactividad
