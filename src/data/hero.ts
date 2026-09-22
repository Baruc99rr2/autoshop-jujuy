/**
 * Contenido del hero: titular, ticker y rutas de los videos.
 *
 * TODO ESTO ES DE MUESTRA. Cuando lleguen los materiales reales de la
 * concesionaria se reemplaza este archivo y no hay que tocar el componente.
 */
import { CONTACTO } from './contacto'

export interface Hero {
  /** Eyebrow corto sobre el titular. */
  kicker: string
  /**
   * El titular va partido en líneas a mano. Un `text-wrap: balance` sobre un
   * display a `clamp(3rem, 11vw, 10rem)` decide los cortes por ancho, no por
   * sentido, y en la columna angosta del hero partido puede dejar una palabra
   * suelta en un renglón.
   */
  titulo: string[]
  bajada: string
  /** Textos de los dos botones del hero. */
  accionPrimaria: { label: string; href: string }
  accionSecundaria: { label: string; href: string }
}

export const HERO: Hero = {
  kicker: 'San Salvador de Jujuy',
  titulo: ['Tu próximo', 'auto, en', 'Jujuy'],
  bajada:
    'Cero kilómetro y usados con garantía, financiación propia y toma de tu usado como parte de pago. Vení al salón o escribinos y coordinamos.',
  accionPrimaria: { label: 'Ver vehículos', href: '#vehiculos' },
  accionSecundaria: { label: 'Escribinos', href: '#contacto' },
}

/**
 * Ítems del ticker. Se muestran separados por `·` y en Martian Mono, que es la
 * tipografía de las cifras de telemetría: coordenadas y año entran justo en
 * ese registro.
 */
export const TICKER: string[] = [
  CONTACTO.ciudad.toUpperCase(),
  CONTACTO.coordenadas.toUpperCase(),
  '0KM Y USADOS',
  'FINANCIACIÓN PROPIA',
  `EST. ${CONTACTO.desde}`,
]

/**
 * El video del hero es VERTICAL (9:16). No es un detalle de compresión: define
 * el layout entero. En desktop va en un panel vertical a la derecha —estirarlo
 * a 16:9 perdería el farol o perdería el auto, que es lo que hace bueno al
 * encuadre— y en mobile va a sangre, que es su formato natural.
 */
export const VIDEO_HERO = {
  desktop: '/video/hero-desktop.mp4',
  mobile: '/video/hero-mobile.mp4',
  poster: '/img/hero-poster.jpg',
  /** Duración real del recorte, en segundos. La usa la atenuación del corte. */
  duracion: 7,
} as const
