/**
 * Las cifras de la franja ámbar. Inventadas, pero del orden de magnitud de una
 * concesionaria de barrio de San Salvador de Jujuy: no 15.000 unidades ni 40
 * marcas, que se leerían como relleno.
 */
export interface Contador {
  /** Clave estable. La animación se ancla acá, no al índice. */
  id: string
  /** Valor final. El conteo arranca siempre en 0. */
  valor: number
  /**
   * Sufijo que entra al final con un corte seco, sin animar. Animarlo lo
   * volvería un segundo efecto compitiendo con el conteo.
   */
  sufijo?: string
  /** Texto debajo de la cifra, en Martian Mono. Corto: dos o tres palabras. */
  label: string
}

/**
 * El año en que abrió el salón.
 *
 * El contador de años se CALCULA a partir de acá en vez de estar escrito: un
 * número a mano en un dato que crece solo queda viejo el 1 de enero, y nadie
 * se acuerda de volver a tocarlo. Se evalúa al importar el módulo, así que
 * cada carga de la página trae el número del día.
 */
const APERTURA = 2023

function aniosEnJujuy(): number {
  return new Date().getFullYear() - APERTURA
}

export const CONTADORES: Contador[] = [
  { id: 'entregadas', valor: 500, sufijo: '+', label: 'Unidades entregadas' },
  { id: 'marcas', valor: 12, label: 'Marcas en el salón' },
  { id: 'anios', valor: aniosEnJujuy(), label: 'Años en Jujuy' },
  { id: 'financiacion', valor: 100, sufijo: '%', label: 'Financiación propia' },
]
