import type { ReactNode } from 'react'

type SectionHeaderProps = {
  /** Índice de sección de dos dígitos. Ej: "03". */
  index: string
  /** Nombre corto de la sección, en mayúsculas. */
  eyebrow: string
  /** Titular. Se acepta ReactNode para poder cortar líneas con <br />. */
  title: ReactNode
  /** Bajada opcional, máx 68ch. */
  lead?: ReactNode
  /** Invierte los colores para las secciones claras (FAQ, menú). */
  tone?: 'dark' | 'light'
  /**
   * Cuánto pesa el titular.
   *
   * `'portada'` es la escala de siempre (`--text-h1`): el home y el catálogo,
   * donde el titular ES la entrada a la sección. `'contenido'` la baja a
   * `--text-h1-ficha` —la misma con techo— para las páginas que vienen a
   * mostrar otra cosa: en la ficha de un auto lo que importa es la foto y el
   * precio, y un nombre de modelo a 80 px los empuja fuera de pantalla.
   */
  escala?: 'portada' | 'contenido'
  className?: string
  id?: string
}

/**
 * Eyebrow (índice + nombre) sobre titular en Archivo extendido, alineado a la
 * izquierda. Alineación izquierda siempre: nada centrado salvo el logo del
 * intro y la barra MENU.
 */
export function SectionHeader({
  index,
  eyebrow,
  title,
  lead,
  tone = 'dark',
  escala = 'portada',
  className = '',
  id,
}: SectionHeaderProps) {
  const light = tone === 'light'

  return (
    <header className={className} id={id}>
      <p
        className={`font-hud mb-6 flex items-center gap-2 ${
          light ? 'text-void/55' : 'text-bone/45'
        }`}
      >
        {/* En mobile el riel colapsa, así que el `\` vuelve acá como prefijo. */}
        <span aria-hidden="true" className="text-amber md:hidden">
          \
        </span>
        <span className="num text-amber">{index}</span>
        <span aria-hidden="true">—</span>
        <span>{eyebrow}</span>
      </p>

      <h2
        className={`font-display-xl text-balance ${
          escala === 'contenido' ? 'text-h1-ficha' : 'text-h1'
        } ${light ? 'text-void' : 'text-bone'}`}
      >
        {title}
      </h2>

      {lead && (
        <p
          className={`mt-6 max-w-[68ch] ${light ? 'text-void/70' : 'text-bone/65'}`}
        >
          {lead}
        </p>
      )}
    </header>
  )
}

export default SectionHeader
