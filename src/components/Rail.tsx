type RailProps = {
  /** Índice de la sección visible, para el marcador vertical. Ej: "03". */
  index?: string
  /** Nombre de la sección visible, rotado sobre el riel. */
  label?: string
  /**
   * El riel es un overlay fijo sobre toda la página. Sobre las secciones de
   * fondo claro sus colores se invierten con una transición, porque si no
   * desaparece contra el bone justo cuando el resto del sitio está más limpio.
   */
  tono?: 'oscuro' | 'claro'
}

/**
 * Riel izquierdo fijo. Es constante en toda la página y es lo que da
 * continuidad entre secciones muy distintas: 56px en desktop, 16px en mobile.
 *
 * En mobile queda solo la línea vertical — el `\` pasa a ser prefijo inline
 * del eyebrow de cada sección (ver SectionHeader).
 */
export function Rail({ index, label, tono = 'oscuro' }: RailProps) {
  const claro = tono === 'claro'

  return (
    <div
      className={`pointer-events-none fixed inset-y-0 left-0 z-30 w-(--rail-w) border-r transition-colors duration-500 ${
        claro ? 'border-void/15' : 'border-graphite/80'
      }`}
      aria-hidden="true"
    >
      <span
        className={`absolute top-6 left-0 hidden w-full text-center text-lg leading-none transition-colors duration-500 md:block ${
          claro ? 'text-void/60' : 'text-bone/70'
        }`}
      >
        \
      </span>

      {(index || label) && (
        <div className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block">
          <span
            className={`font-hud block whitespace-nowrap transition-colors duration-500 ${
              claro ? 'text-void/45' : 'text-bone/35'
            }`}
            style={{ writingMode: 'vertical-rl' }}
          >
            {index && <span className="num text-amber">{index}</span>}
            {index && label && ' — '}
            {label}
          </span>
        </div>
      )}

      <span
        className={`absolute bottom-6 left-1/2 hidden h-16 w-px -translate-x-1/2 md:block ${
          claro
            ? 'bg-linear-to-b from-transparent to-void/40'
            : 'bg-linear-to-b from-transparent to-amber/60'
        }`}
      />
    </div>
  )
}

export default Rail
