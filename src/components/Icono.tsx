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
  | 'seguro'
  | 'escaneo'
  | 'garantia'
  | 'limpieza'
  | 'aceite'
  | 'chat'
  | 'play'
  | 'lista'
  | 'grilla'
  | 'cerrar'
  | 'izquierda'
  | 'derecha'
  | 'expandir'

const TRAZOS: Record<NombreIcono, React.ReactNode> = {
  /**
   * Globo de conversación genérico, para el botón flotante de WhatsApp.
   *
   * NO es el logo de WhatsApp. Es el mismo criterio de la decisión 38 y de la
   * sección de marcas: un logo ajeno redibujado a mano se nota, y además es
   * marca registrada. El botón dice "WhatsApp" con todas las letras, que
   * identifica igual de bien y no copia nada.
   */
  // Triángulo de play, con el mismo trazo abierto que el resto. Va SIN círculo
  // alrededor: el botón que lo lleva ya es un bisel ámbar, y un círculo dentro
  // de una forma biselada es la única curva del sitio.
  play: <path d="M8.25 5.5 19 12 8.25 18.5V5.5Z" />,

  /**
   * Los dos estados del catálogo en mobile: una unidad por fila, o dos por
   * fila. Los íconos DIBUJAN el resultado —una columna de fichas anchas contra
   * una grilla de cuatro— y no una metáfora: el control no tiene etiqueta
   * visible, así que el dibujo es todo lo que explica qué hace.
   *
   * Sin `border-radius`, como todo el resto: son rectángulos rectos.
   */
  lista: (
    <>
      <rect x="3.25" y="4.25" width="17.5" height="6" />
      <rect x="3.25" y="13.75" width="17.5" height="6" />
    </>
  ),
  grilla: (
    <>
      <rect x="3.25" y="3.25" width="7.5" height="7.5" />
      <rect x="13.25" y="3.25" width="7.5" height="7.5" />
      <rect x="3.25" y="13.25" width="7.5" height="7.5" />
      <rect x="13.25" y="13.25" width="7.5" height="7.5" />
    </>
  ),

  /* El visor a pantalla completa: cerrar, moverse y la señal de que la foto
     se puede abrir. Las flechas son un solo quiebre, sin asta: al tamaño al
     que se usan (20-24 px sobre una foto) el asta se pierde igual. */
  cerrar: <path d="M6 6 18 18M18 6 6 18" />,
  izquierda: <path d="M14.75 5 7.75 12l7 7" />,
  derecha: <path d="M9.25 5l7 7-7 7" />,
  expandir: <path d="M9.5 3.75H3.75V9.5M14.5 3.75h5.75V9.5M9.5 20.25H3.75V14.5M14.5 20.25h5.75V14.5" />,
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
  /* ── Servicios ─────────────────────────────────────────────────────────
     Los cinco de la sección 06. Reemplazaron a los cuatro de post-venta
     —turnos, repuestos, mantenimiento y accesorios—, que se fueron con los
     servicios que nombraban.

     SEGURO Y GARANTÍA SON LO MÁS DIFÍCIL DE SEPARAR: los dos son "algo que te
     cubre", y el escudo sirve para cualquiera de los dos. Por eso el seguro es
     un paraguas —el símbolo del rubro desde hace un siglo— y la garantía es el
     escudo CON EL TILDE, que es lo que la distingue: algo ya revisado y
     aprobado. Dibujados los dos como escudo, en una fila de tres quedaban dos
     tiles que parecían el mismo servicio. */

  // Paraguas: cúpula cerrada por abajo, mango con el gancho y la punta arriba.
  seguro: (
    <>
      <path d="M3 12a9 9 0 0 1 18 0Z" />
      <path d="M12 12v6.25a2.25 2.25 0 0 0 4.5 0" />
      <path d="M12 1.75V3" />
    </>
  ),

  // Lector de diagnóstico: la pantalla con la traza y el cable al conector
  // OBD. Un auto con una lupa encima se leería como "buscar un auto", que es
  // lo que hace el catálogo.
  escaneo: (
    <>
      <rect x="6.75" y="3.25" width="10.5" height="12" />
      <path d="M8.75 9.5h1.75l1.25-2.5 1.5 4.25 1-1.75h1.5" />
      <path d="M12 15.25v3.5a2 2 0 0 0 2 2h4.75" />
    </>
  ),

  // Escudo con el tilde. Ver la nota de arriba: el tilde NO es decoración, es
  // lo único que lo separa del paraguas del seguro.
  garantia: (
    <>
      <path d="M12 3.25 19.25 6v5.75c0 3.9-2.95 7.05-7.25 8.5-4.3-1.45-7.25-4.6-7.25-8.5V6L12 3.25Z" />
      <path d="M9 11.9l2.3 2.35 4-4.6" />
    </>
  ),

  // Pulverizador: cabezal, pico, cuello y cuerpo con la etiqueta. Unas
  // burbujas sueltas o un brillo se leerían como "limpio" en abstracto; una
  // botella se lee como el trabajo que se contrata.
  limpieza: (
    <>
      <rect x="7.5" y="8.25" width="9" height="12.5" />
      <rect x="9.5" y="3.25" width="4.5" height="3" />
      <path d="M10.75 6.25v2M12.75 6.25v2" />
      <path d="M9.75 12h4.5" />
      <path d="M14 4.25h3" />
      {/* El rociado. Además de decir "esto sale a presión", es lo que le da
          ancho al ícono: la botella sola medía 10 px de los 24 y al lado del
          paraguas y de la aceitera se leía como un ícono más chico. */}
      <path d="M17.75 2.75 19.5 4.25M17.5 4.25h2.75M17.75 5.75 19.5 4.25" />
    </>
  ),

  // Aceitera con la gota cayendo del pico. El filtro de aceite que había antes
  // decía "repuesto"; acá lo que se vende es el service, o sea el acto de
  // cambiarlo.
  aceite: (
    <>
      <rect x="3.25" y="12.25" width="9" height="6.5" />
      <path d="M6 12.25V9.75h4.25v2.5" />
      <path d="M12.25 13.5 18.25 9.25" />
      <path d="M19.4 5.5c1.05 1.35 1.6 2.25 1.6 3a1.6 1.6 0 0 1-3.2 0c0-.75.55-1.65 1.6-3Z" />
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
