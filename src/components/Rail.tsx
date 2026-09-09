type RailProps = {
  /** Índice de la sección visible, para el marcador vertical. Ej: "03". */
  index?: string
  /** Nombre de la sección visible, rotado sobre el riel. */
  label?: string
}

/**
 * Riel izquierdo fijo. Es constante en toda la página y es lo que da
 * continuidad entre secciones muy distintas: 56px en desktop, 16px en mobile.
 *
 * En mobile queda solo la línea vertical — el `\` pasa a ser prefijo inline
 * del eyebrow de cada sección (ver SectionHeader).
 */
export function Rail({ index, label }: RailProps) {
  return (
    <div
      className="pointer-events-none fixed inset-y-0 left-0 z-30 w-(--rail-w) border-r border-graphite/80"
      aria-hidden="true"
    >
      <span className="absolute top-6 left-0 hidden w-full text-center text-lg leading-none text-bone/70 md:block">
        \
      </span>

      {(index || label) && (
        <div className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block">
          <span
            className="font-hud block whitespace-nowrap text-bone/35"
            style={{ writingMode: 'vertical-rl' }}
          >
            {index && <span className="num text-amber">{index}</span>}
            {index && label && ' — '}
            {label}
          </span>
        </div>
      )}

      <span className="absolute bottom-6 left-1/2 hidden h-16 w-px -translate-x-1/2 bg-linear-to-b from-transparent to-amber/60 md:block" />
    </div>
  )
}

export default Rail
