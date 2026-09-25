/**
 * Contenido del hero: titular, ticker y rutas de los videos.
 *
 * TODO ESTO ES DE MUESTRA. Cuando lleguen los materiales reales de la
 * concesionaria se reemplaza este archivo y no hay que tocar el componente.
 */
import { NEGOCIO } from './contacto'

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
  /* CUATRO LÍNEAS. El titular tiene nueve palabras y la escala del hero es
     extendida y en mayúsculas: un carácter mide unos 0.74 em, así que en la
     columna del 56% de 1440 entran doce caracteres por renglón y no veinte.
     Cortado en cuatro, la línea más larga es "que te lleva" y ninguna queda
     con una palabra sola, que es el corte que hay que evitar. El punto ámbar
     lo agrega el componente, al final de la última. */
  titulo: ['La ruta', 'que te lleva', 'a cumplir', 'tu sueño'],
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
  NEGOCIO.ciudad.toUpperCase(),
  NEGOCIO.coordenadas.toUpperCase(),
  '0KM Y USADOS',
  'FINANCIACIÓN PROPIA',
  `EST. ${NEGOCIO.desde}`,
]

/**
 * El video del hero es VERTICAL (9:16). Va a sangre en los dos layouts: en
 * mobile es su formato natural, y en desktop se recorta a horizontal con el
 * encuadre bajado hasta el auto (ver `ENCUADRE` en `HeroVideo`).
 */
export const VIDEO_HERO = {
  desktop: '/video/hero-desktop.mp4',
  mobile: '/video/hero-mobile.mp4',
  poster: '/img/hero-poster.webp',
  /** Duración real del recorte, en segundos. La usa la atenuación del corte. */
  duracion: 7,
} as const
