import { useLayoutEffect, useRef } from 'react'
import type { ChangeEvent, CSSProperties, ReactNode, Ref } from 'react'
import Bevel from '../Bevel'
import { separarMiles, soloDigitos } from '../../lib/formato'

/**
 * Los campos del panel.
 *
 * VIVEN EN SU PROPIO ARCHIVO, A NIVEL DE MÓDULO, Y NO ADENTRO DEL FORMULARIO.
 * Un componente definido dentro del cuerpo de otro es un tipo NUEVO en cada
 * render: React desmonta el `<input>` viejo y monta uno limpio, así que el
 * foco se pierde después de cada tecla y escribir un título se vuelve
 * imposible. Definirlos afuera es lo único que lo evita.
 *
 * Están dibujados para 390 px y para un dedo: etiqueta arriba —nunca un
 * placeholder haciendo de etiqueta, que desaparece justo cuando se empieza a
 * escribir—, 48 px de alto mínimo y tipografía de 16 px, porque por debajo de
 * eso iOS hace zoom al enfocar y deja la página corrida.
 */

/** Alto cómodo para el pulgar. Lo comparten todos los controles del panel. */
const ALTO = 'min-h-[3rem]'

const CAJA =
  'w-full min-w-0 bg-transparent px-4 py-3.5 text-base text-bone outline-none placeholder:text-bone/25'

type Base = {
  id: string
  label: string
  /** Debajo del campo, en gris: qué se espera. Lo tapa el error si lo hay. */
  ayuda?: ReactNode
  /** Qué pasó y cómo se arregla. Se dibuja en `--color-flag`. */
  error?: string
  className?: string
}

/**
 * El pie del campo: ayuda o error, nunca los dos.
 *
 * El error va con `role="alert"`, así que un lector de pantalla lo anuncia sin
 * que haya que mover el foco, y lleva el `\` del sitio como marca: el color
 * solo no alcanza para quien no lo distingue.
 */
function Pie({
  id,
  ayuda,
  error,
}: {
  id: string
  ayuda?: ReactNode
  error?: string
}) {
  if (error) {
    return (
      <p
        id={`${id}-msj`}
        role="alert"
        className="font-hud mt-2 flex gap-2 text-flag normal-case"
      >
        <span aria-hidden="true">\</span>
        <span>{error}</span>
      </p>
    )
  }
  if (ayuda) {
    return (
      <p id={`${id}-msj`} className="font-hud mt-2 text-bone/40 normal-case">
        {ayuda}
      </p>
    )
  }
  return null
}

function Etiqueta({ id, children }: { id: string; children: ReactNode }) {
  return (
    <label htmlFor={id} className="font-hud block text-bone/55">
      {children}
    </label>
  )
}

/** El marco biselado: gris en reposo, ámbar con el foco adentro, rojo con error. */
function Marco({ error, children }: { error?: string; children: ReactNode }) {
  return (
    <Bevel
      variant="outline"
      bevel={12}
      borderClassName={error ? 'bg-flag' : 'bg-graphite'}
      outerClassName="mt-2 block transition-colors duration-200 focus-within:bg-amber"
      className="flex items-stretch"
    >
      {children}
    </Bevel>
  )
}

// ── Texto ─────────────────────────────────────────────────────────────────

type CampoProps = Base & {
  valor: string
  onCambio: (v: string) => void
  ref?: Ref<HTMLInputElement>
  placeholder?: string
  /** Texto fijo pegado al campo, como el `/vehiculo/` de la dirección. */
  prefijo?: string
  inputMode?: 'text' | 'numeric' | 'email'
  type?: 'text' | 'email' | 'password'
  maxLength?: number
  autoComplete?: string
  /** Solo para el campo de la dirección, que es una cifra de nada. */
  monoespaciado?: boolean
}

export function Campo({
  id,
  label,
  valor,
  onCambio,
  ayuda,
  error,
  className = '',
  ref,
  placeholder,
  prefijo,
  inputMode = 'text',
  type = 'text',
  maxLength,
  autoComplete = 'off',
  monoespaciado = false,
}: CampoProps) {
  return (
    <div className={className}>
      <Etiqueta id={id}>{label}</Etiqueta>
      <Marco error={error}>
        {prefijo && (
          <span
            aria-hidden="true"
            className={`font-hud flex shrink-0 items-center border-r border-graphite bg-void/40 px-3 text-bone/40 ${ALTO}`}
          >
            {prefijo}
          </span>
        )}
        <input
          id={id}
          ref={ref}
          type={type}
          inputMode={inputMode}
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || ayuda ? `${id}-msj` : undefined}
          className={`${CAJA} ${ALTO} ${monoespaciado ? 'num' : ''}`}
        />
      </Marco>
      <Pie id={id} ayuda={ayuda} error={error} />
    </div>
  )
}

// ── Cifras con separador de miles ─────────────────────────────────────────

/**
 * Dónde cae el cursor en `texto` después de `n` cifras.
 *
 * Reformatear en cada tecla manda el cursor al final, y corregir el medio de
 * un precio de ocho cifras se vuelve imposible. La posición no se puede
 * guardar como índice —al entrar un punto todo lo que está a la derecha se
 * corre— así que se guarda CUÁNTAS CIFRAS quedaban a la izquierda, que es lo
 * único que no cambia al reformatear.
 */
function trasCifras(texto: string, n: number): number {
  if (n <= 0) return 0
  let vistas = 0
  for (let i = 0; i < texto.length; i++) {
    if (texto[i] >= '0' && texto[i] <= '9') {
      vistas++
      if (vistas === n) return i + 1
    }
  }
  return texto.length
}

type CampoMilesProps = Base & {
  /** Lo que se ve escrito, ya con los puntos puestos. */
  valor: string
  onCambio: (v: string) => void
  ref?: Ref<HTMLInputElement>
  placeholder?: string
  /** Adentro del campo, a la izquierda. Ej: "$". */
  prefijo?: string
  /** Adentro del campo, a la derecha. Ej: "KM". */
  sufijo?: string
}

export function CampoMiles({
  id,
  label,
  valor,
  onCambio,
  ayuda,
  error,
  className = '',
  ref,
  placeholder,
  prefijo,
  sufijo,
}: CampoMilesProps) {
  const propio = useRef<HTMLInputElement>(null)
  const cursor = useRef<number | null>(null)

  // Después de que React pinta el valor ya formateado, el cursor vuelve a
  // donde estaba. Va sin dependencias —corre en cada render— y no hace nada
  // salvo que el `onChange` haya dejado una posición anotada.
  useLayoutEffect(() => {
    const n = cursor.current
    cursor.current = null
    if (n === null) return
    propio.current?.setSelectionRange(n, n)
  })

  const escribir = (e: ChangeEvent<HTMLInputElement>) => {
    const crudo = e.target.value
    const corte = e.target.selectionStart ?? crudo.length
    const cifras = soloDigitos(crudo.slice(0, corte)).length
    const formateado = separarMiles(crudo)
    cursor.current = trasCifras(formateado, cifras)
    onCambio(formateado)
  }

  return (
    <div className={className}>
      <Etiqueta id={id}>{label}</Etiqueta>
      <Marco error={error}>
        {prefijo && (
          <span
            aria-hidden="true"
            className={`num flex shrink-0 items-center pl-4 text-lg text-bone/40 ${ALTO}`}
          >
            {prefijo}
          </span>
        )}
        <input
          id={id}
          ref={(nodo) => {
            propio.current = nodo
            if (typeof ref === 'function') ref(nodo)
            else if (ref) ref.current = nodo
          }}
          type="text"
          /* `inputMode` numérico sobre un input de TEXTO: el campo guarda
             "12.500.000", que para un `type="number"` no es un número válido
             y se vacía solo. Así se abre el teclado de cifras igual. */
          inputMode="numeric"
          value={valor}
          onChange={escribir}
          placeholder={placeholder}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error || ayuda ? `${id}-msj` : undefined}
          className={`num ${CAJA} ${ALTO} text-lg ${prefijo ? 'pl-2' : ''}`}
        />
        {sufijo && (
          <span
            aria-hidden="true"
            className={`font-hud flex shrink-0 items-center pr-4 text-bone/40 ${ALTO}`}
          >
            {sufijo}
          </span>
        )}
      </Marco>
      <Pie id={id} ayuda={ayuda} error={error} />
    </div>
  )
}

// ── Texto largo ───────────────────────────────────────────────────────────

type AreaProps = Base & {
  valor: string
  onCambio: (v: string) => void
  ref?: Ref<HTMLTextAreaElement>
  placeholder?: string
  filas?: number
  maxLength?: number
}

export function AreaTexto({
  id,
  label,
  valor,
  onCambio,
  ayuda,
  error,
  className = '',
  ref,
  placeholder,
  filas = 5,
  maxLength,
}: AreaProps) {
  return (
    <div className={className}>
      <Etiqueta id={id}>{label}</Etiqueta>
      <Marco error={error}>
        <textarea
          id={id}
          ref={ref}
          rows={filas}
          maxLength={maxLength}
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || ayuda ? `${id}-msj` : undefined}
          className={`${CAJA} resize-y leading-relaxed`}
        />
      </Marco>
      <Pie id={id} ayuda={ayuda} error={error} />
    </div>
  )
}

// ── Elegir una entre pocas ────────────────────────────────────────────────

type OpcionesProps<T extends string> = {
  label: string
  valor: T
  opciones: readonly { id: T; label: string }[]
  onCambio: (v: T) => void
  ayuda?: ReactNode
  className?: string
}

/**
 * Dos o tres opciones excluyentes, como botones grandes en una fila.
 *
 * No es un `<select>`: un desplegable nativo en el celular abre una rueda que
 * tapa media pantalla para elegir entre "0km" y "usado". Con tres opciones o
 * menos, verlas todas cuesta menos que abrirlas.
 */
export function Opciones<T extends string>({
  label,
  valor,
  opciones,
  onCambio,
  ayuda,
  className = '',
}: OpcionesProps<T>) {
  return (
    <div className={className} role="group" aria-label={label}>
      <p className="font-hud text-bone/55">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {opciones.map((o) => {
          const activa = o.id === valor
          return (
            <Bevel
              key={o.id}
              as="button"
              type="button"
              variant={activa ? 'solid' : 'outline'}
              bevel={10}
              onClick={() => onCambio(o.id)}
              aria-pressed={activa}
              outerClassName={
                activa
                  ? 'flex-1'
                  : 'flex-1 transition-colors duration-200 hover:bg-amber'
              }
              className={`font-hud flex min-w-[2.75rem] items-center justify-center px-4 text-center ${ALTO}`}
            >
              {o.label.toUpperCase()}
            </Bevel>
          )
        })}
      </div>
      {ayuda && (
        <p className="font-hud mt-2 text-bone/40 normal-case">{ayuda}</p>
      )}
    </div>
  )
}

// ── Sí o no ───────────────────────────────────────────────────────────────

type InterruptorProps = {
  id: string
  label: string
  /** La consecuencia de prenderlo, en una línea. */
  ayuda: ReactNode
  valor: boolean
  onCambio: (v: boolean) => void
  className?: string
}

/**
 * Una llave de dos estados.
 *
 * TODA LA FILA ES EL BOTÓN: en un celular, apuntarle a una llave de 56 px es
 * bastante peor que apuntarle a la fila entera. Y el estado se dice con
 * palabras arriba de la llave, porque una llave sola obliga a acordarse de
 * qué lado significa qué.
 */
export function Interruptor({
  id,
  label,
  ayuda,
  valor,
  onCambio,
  className = '',
}: InterruptorProps) {
  return (
    <Bevel
      variant="outline"
      bevel={12}
      borderClassName={valor ? 'bg-amber' : 'bg-graphite'}
      outerClassName={`block transition-colors duration-200 ${className}`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={valor}
        aria-describedby={`${id}-ayuda`}
        onClick={() => onCambio(!valor)}
        className="flex w-full items-center gap-4 p-4 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="font-display block text-lg text-bone">{label}</span>
          <span
            id={`${id}-ayuda`}
            className="font-hud mt-1 block text-bone/40 normal-case"
          >
            {ayuda}
          </span>
        </span>

        <span
          aria-hidden="true"
          className={`bevel flex h-8 w-14 shrink-0 items-center p-1 transition-colors duration-200 ${
            valor ? 'bg-amber' : 'bg-graphite'
          }`}
          style={{ '--bevel': '6px' } as CSSProperties}
        >
          <span
            className={`bevel h-6 w-6 transition-transform duration-200 ${
              valor ? 'translate-x-6 bg-void' : 'translate-x-0 bg-bone/50'
            }`}
            style={{ '--bevel': '4px' } as CSSProperties}
          />
        </span>
      </button>
    </Bevel>
  )
}

// ── Bloques del formulario ────────────────────────────────────────────────

/**
 * El título de un tramo del panel, en ámbar.
 *
 * Las etiquetas de los campos van en hueso apagado, y con los títulos del
 * mismo color la dueña no distinguía dónde terminaba un tramo y empezaba el
 * otro: se leía todo como una sola lista de campos. En ámbar, con el `\` del
 * sitio adelante, el corte se ve de un vistazo. Lo usan `Seccion` y los tramos
 * del formulario que no son una `Seccion` (datos, publicación, esta unidad).
 */
export function TituloSeccion({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-hud flex items-center gap-2 text-amber">
      <span aria-hidden="true">\</span>
      <span>{children}</span>
    </h2>
  )
}

/**
 * Un tramo del formulario con su propio título: fotos, video, etiquetas.
 *
 * Los campos de texto no lo necesitan —la etiqueta de cada uno alcanza— pero
 * los tres bloques de medios son listas con sus propios botones, y sin una
 * línea que los separe el formulario se lee como una pila de controles
 * sueltos. La línea de arriba es la misma que corta "ESTA UNIDAD".
 */
export function Seccion({
  titulo,
  contador,
  ayuda,
  children,
  className = '',
}: {
  titulo: string
  /** A la derecha, en cifras: "3 / 10". */
  contador?: ReactNode
  ayuda?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`border-t border-graphite pt-8 ${className}`}>
      <div className="flex items-baseline justify-between gap-4">
        <TituloSeccion>{titulo}</TituloSeccion>
        {contador !== undefined && (
          <p className="font-hud num shrink-0 text-bone/40">{contador}</p>
        )}
      </div>
      {ayuda && (
        <p className="font-hud mt-2 text-bone/40 normal-case">{ayuda}</p>
      )}
      {children}
    </section>
  )
}

/**
 * El botón de una fila: subir, bajar, eliminar.
 *
 * 44 px de alto y no los 48 del resto del panel: van de a tres en una fila de
 * 390 px al lado de una miniatura, y con 48 la fila no entra sin partirse. 44
 * es el piso táctil, no un redondeo hacia abajo cómodo.
 */
export function BotonChico({
  children,
  onClick,
  disabled = false,
  tono = 'normal',
  etiqueta,
  className = '',
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  tono?: 'normal' | 'peligro'
  /** Para los que muestran solo una flecha. */
  etiqueta?: string
  className?: string
}) {
  return (
    <Bevel
      as="button"
      type="button"
      variant="outline"
      bevel={10}
      onClick={onClick}
      disabled={disabled}
      aria-label={etiqueta}
      borderClassName={tono === 'peligro' ? 'bg-flag/50' : 'bg-graphite'}
      outerClassName={`${className} ${
        disabled ? 'opacity-35' : 'transition-colors duration-200 hover:bg-amber'
      }`}
      className={`font-hud flex min-h-[2.75rem] min-w-[2.75rem] items-center justify-center px-3 ${
        tono === 'peligro' ? 'text-flag' : 'text-bone'
      }`}
    >
      {children}
    </Bevel>
  )
}
