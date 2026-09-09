import type { CSSProperties, ElementType, ReactNode } from 'react'

export type BevelVariant = 'solid' | 'outline' | 'ghost'

type BevelProps = {
  children?: ReactNode
  /** solid: relleno ámbar · outline: borde ámbar de 1px · ghost: solo la forma */
  variant?: BevelVariant
  /** Tamaño del corte diagonal, en px. */
  bevel?: number
  as?: ElementType
  className?: string
  /** Clases del contenedor exterior en la variante outline. */
  outerClassName?: string
  /**
   * Color del borde en la variante `outline`. **Reemplaza** a `bg-amber` en
   * vez de sumarse: dos utilidades de fondo en el mismo atributo se resuelven
   * por el orden en que Tailwind emite las reglas, no por el orden en que uno
   * las escribe, así que "pisar" el ámbar desde `outerClassName` no es
   * confiable. Lo usan los campos del formulario, que van con borde graphite
   * y pasan a ámbar al enfocarse.
   */
  borderClassName?: string
  /**
   * Reemplaza el color de superficie que trae la variante, por el mismo
   * motivo que `borderClassName`: dos utilidades de `background-color` en el
   * mismo atributo las resuelve el orden en que Tailwind emite las reglas, no
   * el orden en que uno las escribe, así que sumar `bg-void` a un `ghost` que
   * ya trae `bg-transparent` da un resultado a merced del build. Lo usa la
   * barra CLOSE del menú, que es una barra oscura sobre el fondo bone.
   */
  surfaceClassName?: string
  style?: CSSProperties
} & Record<string, unknown>

const SURFACE: Record<BevelVariant, string> = {
  solid: 'bg-amber text-void',
  outline: 'bg-asphalt text-bone',
  ghost: 'bg-transparent text-bone',
}

/**
 * La forma compartida de todo el sitio: esquina superior izquierda e inferior
 * derecha cortadas en diagonal. Si aparece un border-radius en el proyecto,
 * está mal.
 *
 * El clip-path recorta el borde CSS, así que la variante `outline` no puede
 * usar `border`: se resuelve con dos contenedores biselados, el de afuera con
 * fondo ámbar y 1px de padding, el de adentro con fondo asphalt. El píxel de
 * ámbar que asoma ES el borde, y sigue la diagonal.
 */
export function Bevel({
  children,
  variant = 'ghost',
  bevel = 14,
  as: Tag = 'div',
  className = '',
  outerClassName = '',
  borderClassName = 'bg-amber',
  surfaceClassName,
  style,
  ...rest
}: BevelProps) {
  const shape = { '--bevel': `${bevel}px`, ...style } as CSSProperties

  if (variant === 'outline') {
    // El bisel interior va 1px más chico para que la diagonal quede paralela.
    const inner = { '--bevel': `${Math.max(bevel - 1, 0)}px` } as CSSProperties
    return (
      <Tag
        className={`bevel ${borderClassName} p-px ${outerClassName}`}
        style={shape}
        {...rest}
      >
        <div className={`bevel h-full w-full ${SURFACE.outline} ${className}`} style={inner}>
          {children}
        </div>
      </Tag>
    )
  }

  return (
    <Tag
      className={`bevel ${surfaceClassName ?? SURFACE[variant]} ${className}`}
      style={shape}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export default Bevel
