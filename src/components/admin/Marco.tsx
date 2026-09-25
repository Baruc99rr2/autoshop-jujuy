import type { MouseEvent, ReactNode } from 'react'
import { Link } from 'react-router'
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
   * grilla; el formulario se queda en 46rem en una columna, que es lo que se
   * lee de un renglón sin perder el hilo entre la etiqueta y el campo, y se
   * abre a 80rem desde `lg`, donde va en dos columnas de ese mismo ancho.
   */
  ancho?: 'formulario' | 'listado'
  /**
   * Las dos pantallas de arriba del panel —las unidades y el contenido del
   * sitio— llevan las pestañas para pasar de una a la otra. El formulario de
   * una unidad no: ahí la salida es «volver al listado».
   */
  pestania?: Pestania
  /**
   * Se consulta antes de cambiar de pestaña. Devolver `false` frena la
   * navegación: lo usa el contenido para avisar de cambios sin guardar.
   */
  antesDeIr?: (destino: string) => boolean
}

type Pestania = 'unidades' | 'contenido'

const PESTANIAS: readonly { id: Pestania; label: string; to: string }[] = [
  { id: 'unidades', label: 'UNIDADES', to: '/admin' },
  { id: 'contenido', label: 'CONTENIDO DEL SITIO', to: '/admin/contenido' },
]

const ANCHO = {
  // Desde `lg` el formulario y el contenido del sitio se reparten en dos
  // columnas, y ahí sí usan el ancho: con 46rem en un monitor de 1440 el
  // panel era una tira angosta en el medio de la pantalla.
  formulario: 'max-w-[46rem] lg:max-w-[80rem]',
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
  pestania,
  antesDeIr,
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
                className="font-hud flex min-h-[2.75rem] shrink-0 items-center px-3 text-bone/55 transition-colors duration-200 hover:text-amber focus-visible:text-amber"
              >
                SALIR
              </button>
            </div>
          )}

          {pestania && (
            <nav aria-label="Secciones del panel" className="mb-10 flex gap-2">
              {PESTANIAS.map((p) => {
                const activa = p.id === pestania
                return (
                  <Bevel
                    key={p.id}
                    as={Link}
                    to={p.to}
                    onClick={(e: MouseEvent) => {
                      if (activa) e.preventDefault()
                      else if (antesDeIr && !antesDeIr(p.to)) e.preventDefault()
                    }}
                    aria-current={activa ? 'page' : undefined}
                    variant={activa ? 'solid' : 'outline'}
                    bevel={10}
                    borderClassName="bg-graphite"
                    outerClassName={
                      activa
                        ? 'flex-1'
                        : 'flex-1 transition-colors duration-200 hover:bg-amber focus-visible:bg-amber'
                    }
                    /* La sólida no tiene contenedor de afuera: su `flex-1` va
                       acá, o la pestaña activa se encoge al ancho del texto. */
                    className={`font-hud flex min-h-[3rem] items-center justify-center px-3 text-center leading-tight ${
                      activa ? 'flex-1' : 'text-bone'
                    }`}
                  >
                    {p.label}
                  </Bevel>
                )
              })}
            </nav>
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
      className="font-hud mb-8 inline-flex min-h-[2.75rem] items-center gap-3 pr-3 text-bone/55 transition-colors duration-200 hover:text-amber focus-visible:text-amber"
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
