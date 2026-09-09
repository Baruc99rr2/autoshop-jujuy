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

export const CONTADORES: Contador[] = [
  { id: 'entregadas', valor: 500, sufijo: '+', label: 'Unidades entregadas' },
  { id: 'marcas', valor: 12, label: 'Marcas en el salón' },
  { id: 'anios', valor: 9, label: 'Años en Jujuy' },
  { id: 'financiacion', valor: 100, sufijo: '%', label: 'Financiación propia' },
]
