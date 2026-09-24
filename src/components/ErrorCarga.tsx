import { useState } from 'react'
import type { ReactNode } from 'react'
import Bevel from './Bevel'
import { WHATSAPP_URL } from '../data/contacto'

/**
 * Lo que se ve cuando algo no cargó.
 *
 * Desde que los datos viven en Supabase, cada pantalla depende de la red, y
 * en Jujuy la red de un celular se corta en un túnel de la ruta 9. La regla
 * es la misma en todos lados: NUNCA una pantalla en blanco ni un esqueleto
 * eterno. Se dice qué no cargó, y el botón vuelve a pedirlo sin recargar la
 * página (recargar tira la intro, el filtro elegido y el scroll).
 *
 * En el sitio público lleva además la salida por WhatsApp, que es por donde
 * se cierra todo en este negocio: si la ficha no carga, el cliente igual
 * puede preguntar por el auto. En el panel no, porque la dueña se estaría
 * escribiendo a sí misma.
 */
export function ErrorCarga({
  titulo,
  texto,
  onReintentar,
  conWhatsapp = false,
  className = '',
  children,
}: {
  titulo: ReactNode
  texto?: ReactNode
  /** Puede devolver una promesa: mientras dura, el botón dice «PROBANDO…». */
  onReintentar: () => void | Promise<unknown>
  conWhatsapp?: boolean
  className?: string
  children?: ReactNode
}) {
  const [probando, setProbando] = useState(false)

  const reintentar = async () => {
    setProbando(true)
    try {
      await onReintentar()
    } finally {
      setProbando(false)
    }
  }

  return (
    <Bevel
      variant="outline"
      bevel={16}
      borderClassName="bg-graphite"
      outerClassName={`block ${className}`}
      className="p-6 md:p-8"
      role="alert"
    >
      <p className="font-hud flex items-center gap-2 text-flag">
        <span aria-hidden="true">\</span>
        <span>NO SE PUDO CARGAR</span>
      </p>

      <h2 className="font-display mt-4 text-2xl leading-tight text-balance text-bone md:text-3xl">
        {titulo}
      </h2>

      <p className="mt-4 max-w-[52ch] text-bone/65">
        {texto ?? 'Puede ser la conexión. Revisá que tengas internet y probá de nuevo.'}
      </p>

      {children}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Bevel
          as="button"
          type="button"
          onClick={reintentar}
          disabled={probando}
          variant="solid"
          bevel={12}
          className={`font-hud flex min-h-[3rem] items-center justify-center gap-3 px-6 ${
            probando ? 'opacity-60' : ''
          }`}
        >
          <span>{probando ? 'PROBANDO…' : 'PROBAR DE NUEVO'}</span>
          <span aria-hidden="true">\</span>
        </Bevel>

        {conWhatsapp && (
          <Bevel
            as="a"
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            variant="outline"
            bevel={12}
            borderClassName="bg-graphite"
            outerClassName="transition-colors duration-200 hover:bg-amber"
            className="font-hud flex min-h-[3rem] items-center justify-center px-6 text-bone"
          >
            CONSULTAR POR WHATSAPP
          </Bevel>
        )}
      </div>
    </Bevel>
  )
}

export default ErrorCarga
