import type { ReactNode } from 'react'
import Bevel from '../Bevel'
import Header from '../Header'
import Rail from '../Rail'
import SectionHeader from '../SectionHeader'
import { cerrarSesion, useSesion } from '../../data/sesion'

/**
 * El marco de todas las pantallas del panel.
 *
 * NO ES `PaginaInterna`. Comparte el riel y el logo —que son lo que mantiene
 * al panel dentro del mismo sistema visual— y deja afuera todo lo demás: la
 * malla, el menú del sitio, el footer y el flotante de WhatsApp. Esto lo usa
 * la dueña para trabajar, casi siempre desde el celular y casi siempre
 * apurada; un menú con "Contacto" y "Preguntas frecuentes" ahí adentro es
 * ruido, y el botón de WhatsApp la mandaría a escribirse a sí misma.
 *
 * Tampoco hay animación de entrada, ni aparición al scrollear, ni barridos
 * decorativos. Lo único que se mueve es lo que responde a un toque.
 */

type MarcoProps = {
  /** Índice de dos dígitos del riel y del encabezado. */
  indice: string
  eyebrow: string
  titulo: ReactNode
  lead?: ReactNode
  /** Entre la barra de sesión y el encabezado: la vuelta al listado. */
  arriba?: ReactNode
  children?: ReactNode
  /**
   * Ancho máximo del contenido. El listado respira hasta 64rem porque es una
   * grilla; el formulario se queda en 46rem, que es lo que se lee de un
   * renglón sin perder el hilo entre la etiqueta y el campo.
   */
  ancho?: 'formulario' | 'listado'
}

const ANCHO = {
  formulario: 'max-w-[46rem]',
  listado: 'max-w-[64rem]',
} as const

export function Marco({
  indice,
  eyebrow,
  titulo,
  lead,
  arriba,
  children,
  ancho = 'listado',
}: MarcoProps) {
  const sesion = useSesion()

  return (
    <>
      <Rail index={indice} label={eyebrow} />
      <Header />

      {/* `svh` y no `vh`: la barra del navegador de WhatsApp cambia el alto al
          scrollear y con `vh` la página entera se empuja. */}
      <main className="min-h-svh pt-24 pb-24 shell md:pt-28">
        <div className={`mx-auto w-full ${ANCHO[ancho]}`}>
          {sesion && (
            <div className="mb-8 flex items-center justify-between gap-4 border-b border-graphite pb-4">
              <p className="font-hud min-w-0 truncate text-bone/40">
                <span aria-hidden="true" className="mr-2 text-amber">
                  \
                </span>
                <span className="normal-case">{sesion.email}</span>
              </p>
              <button
                type="button"
                onClick={() => cerrarSesion()}
                className="font-hud shrink-0 px-2 py-2 text-bone/55 transition-colors duration-200 hover:text-amber focus-visible:text-amber"
              >
                SALIR
              </button>
            </div>
          )}

          {arriba}

          <SectionHeader
            index={indice}
            eyebrow={eyebrow}
            title={titulo}
            lead={lead}
            escala="contenido"
          />

          {children}
        </div>
      </main>
    </>
  )
}

/**
 * La vuelta al listado desde el formulario.
 *
 * Es un botón y no un `<Link>` a propósito: con cambios sin guardar tiene que
 * abrir el aviso antes de irse, y un enlace ya habría navegado. El `\` va al
 * revés —`/`— porque apunta hacia atrás.
 */
export function Volver({ onVolver }: { onVolver: () => void }) {
  return (
    <button
      type="button"
      onClick={onVolver}
      className="font-hud mb-8 inline-flex items-center gap-3 py-2 text-bone/55 transition-colors duration-200 hover:text-amber focus-visible:text-amber"
    >
      <span aria-hidden="true">/</span>
      <span>VOLVER AL LISTADO</span>
    </button>
  )
}

/**
 * Un aviso a toda la pantalla, para cuando el repositorio falla.
 *
 * El mock se queda sin espacio en localStorage con cuatro fotos, así que este
 * caso no es hipotético: pasa, y tiene que decir qué pasó en vez de dejar un
 * botón que no hace nada.
 */
export function AvisoError({ texto }: { texto: string }) {
  return (
    <Bevel
      variant="outline"
      bevel={12}
      borderClassName="bg-flag"
      outerClassName="block"
      className="flex gap-3 p-4"
      role="alert"
    >
      <span aria-hidden="true" className="font-hud text-flag">
        \
      </span>
      <p className="text-bone/80">{texto}</p>
    </Bevel>
  )
}

export default Marco
