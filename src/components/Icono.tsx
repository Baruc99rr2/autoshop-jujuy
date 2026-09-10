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
  | 'chat'

const TRAZOS: Record<NombreIcono, React.ReactNode> = {
  /**
   * Globo de conversación genérico, para el botón flotante de WhatsApp.
   *
   * NO es el logo de WhatsApp. Es el mismo criterio de la decisión 38 y de la
   * sección de marcas: un logo ajeno redibujado a mano se nota, y además es
   * marca registrada. El botón dice "WhatsApp" con todas las letras, que
   * identifica igual de bien y no copia nada.
   */
  chat: (
    <>
      <path d="M20.5 12.4c0 4-3.8 7.2-8.5 7.2a9.9 9.9 0 0 1-3-.45L4.2 20.5l1.4-3.35A6.8 6.8 0 0 1 3.5 12.4c0-4 3.8-7.2 8.5-7.2s8.5 3.2 8.5 7.2Z" />
      <path d="M8.8 12.4h.01M12 12.4h.01M15.2 12.4h.01" />
    </>
  ),
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
  // Filtro de aceite: cilindro con nervaduras y cuello. Antes había un círculo
  // con ocho rayos radiales que se leía como un sol de brillo, no como un
  // repuesto.
  pieza: (
    <>
      <path d="M9.25 7.25V5.5h5.5v1.75" />
      <rect x="6.75" y="7.25" width="10.5" height="11.25" />
      <path d="M6.75 11h10.5M6.75 14.75h10.5" />
    </>
  ),
  // Cuentakilómetros: el mantenimiento programado se cuenta por km, así que la
  // aguja dice más que un auto de frente, que era lo que había antes.
  service: (
    <>
      <path d="M3.75 17.5a8.25 8.25 0 1 1 16.5 0" />
      <path d="M12 17.5 16.25 10" />
      <circle cx="12" cy="17.5" r="1.15" />
    </>
  ),
  // Baúl de techo con las correas. Un volante o una llanta se leerían como
  // "repuesto", que es el tile de al lado.
  accesorio: (
    <>
      <path d="M8.75 8V6.25h6.5V8" />
      <rect x="3.75" y="8" width="16.5" height="9.75" />
      <path d="M9.25 8v9.75M14.75 8v9.75" />
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
