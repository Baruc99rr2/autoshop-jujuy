/**
 * Íconos de línea, dibujados a mano en SVG inline.
 *
 * Sin librería de íconos y sin emojis: una librería mete 40 KB para usar seis
 * glifos y viene con su propio grosor de línea y su propia caja, y los emojis
 * cambian de dibujo en cada sistema operativo. Acá todos comparten grilla de
 * 24, trazo de 1.5, extremos redondeados y `currentColor`, así que se ven como
 * una sola familia y se recolorean con el texto que los acompaña.
 */
export type NombreIcono =
  | 'mail'
  | 'telefono'
  | 'ubicacion'
  | 'reloj'
  | 'calendario'
  | 'pieza'
  | 'service'
  | 'accesorio'

const TRAZOS: Record<NombreIcono, React.ReactNode> = {
  mail: (
    <>
      <rect x="2.75" y="5.25" width="18.5" height="13.5" />
      <path d="M2.75 6.5 12 13l9.25-6.5" />
    </>
  ),
  telefono: (
    <path d="M5.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 7 7l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5C10.6 19.6 4.4 13.4 4 5.1A1.5 1.5 0 0 1 5.5 3.5Z" />
  ),
  ubicacion: (
    <>
      <path d="M12 21.5c4.2-4.6 6.3-8 6.3-10.4a6.3 6.3 0 1 0-12.6 0c0 2.4 2.1 5.8 6.3 10.4Z" />
      <circle cx="12" cy="10.8" r="2.4" />
    </>
  ),
  reloj: (
    <>
      <circle cx="12" cy="12" r="8.75" />
      <path d="M12 6.75V12l3.5 2.25" />
    </>
  ),
  // ── Post-venta ───────────────────────────────────────────────────────────
  calendario: (
    <>
      <rect x="3.25" y="5.25" width="17.5" height="15.5" />
      <path d="M3.25 10h17.5M8 3.25v4M16 3.25v4M8.5 14.5l2.25 2.25L15.5 12" />
    </>
  ),
  pieza: (
    <>
      <circle cx="12" cy="12" r="3.25" />
      <path d="M12 2.75v3M12 18.25v3M21.25 12h-3M5.75 12h-3M18.55 5.45l-2.1 2.1M7.55 16.45l-2.1 2.1M18.55 18.55l-2.1-2.1M7.55 7.55l-2.1-2.1" />
    </>
  ),
  service: (
    <>
      <path d="M2.75 16.5v-3l1.9-4.6A2 2 0 0 1 6.5 7.6h11a2 2 0 0 1 1.85 1.3l1.9 4.6v3" />
      <path d="M2.75 13.5h18.5M5.5 16.5v2.25M18.5 16.5v2.25" />
      <circle cx="7" cy="16.5" r="0.6" />
      <circle cx="17" cy="16.5" r="0.6" />
    </>
  ),
  accesorio: (
    <>
      <circle cx="12" cy="12" r="8.75" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.25V9M4.5 16.2l5-2.9M19.5 16.2l-5-2.9" />
    </>
  ),
}

type IconoProps = {
  name: NombreIcono
  /** Tamaño en px. El trazo no escala: se mantiene fino a propósito. */
  size?: number
  className?: string
}

export function Icono({ name, size = 20, className = '' }: IconoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {TRAZOS[name]}
    </svg>
  )
}

export default Icono
