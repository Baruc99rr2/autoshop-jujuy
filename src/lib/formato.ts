import type { Condicion, EstadoVehiculo } from '../types/vehiculo'

/**
 * Cómo se escriben los datos de una unidad en pantalla.
 *
 * Vive en `lib/` y no en un componente porque la card del home, el catálogo,
 * la ficha y el panel tienen que decir lo mismo: si el catálogo redondea el
 * precio y la ficha no, el visitante cree que el precio cambió.
 */

const pesos = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

const enteros = new Intl.NumberFormat('es-AR')

/** Sin precio NO es "$ 0": es una invitación a preguntar. */
export const SIN_PRECIO = 'Consultar precio'

export function formatearPrecio(n: number | null): string {
  return n === null ? SIN_PRECIO : pesos.format(n)
}

/** `null` es "no lo sabemos"; `0` es un 0km y se escribe. */
export function formatearKm(n: number | null): string {
  return n === null ? '—' : enteros.format(n)
}

export function formatearAnio(n: number | null): string {
  return n === null ? '—' : String(n)
}

export const ESTADO_LABEL: Record<EstadoVehiculo, string> = {
  disponible: 'Disponible',
  reservado: 'Reservado',
  vendido: 'Vendido',
}

export const CONDICION_LABEL: Record<Condicion, string> = {
  '0km': '0km',
  usado: 'Usado',
}

/**
 * Un número MIENTRAS SE ESCRIBE en el panel.
 *
 * El precio de un auto son ocho cifras. Sin separador, "12500000" y "1250000"
 * se distinguen contando ceros en la pantalla del celular, que es exactamente
 * cómo se publica un auto a la décima parte de su precio. Por eso el campo se
 * reformatea en cada tecla en vez de esperar al `blur`.
 *
 * El campo guarda TEXTO, no un número: mientras se escribe hay estados que no
 * son ningún número —vacío, a medias— y un `number` obligaría a inventar un 0
 * para representarlos.
 */
export function soloDigitos(texto: string): string {
  return texto.replace(/\D+/g, '')
}

/** Tope de cifras: doce ya es cien mil millones, y frena el pegado accidental. */
const MAX_DIGITOS = 12

/** "12500000" → "12.500.000". Vacío queda vacío: no es 0. */
export function separarMiles(texto: string): string {
  const d = soloDigitos(texto)
    .replace(/^0+(?=\d)/, '')
    .slice(0, MAX_DIGITOS)
  return d ? enteros.format(Number(d)) : ''
}

/** El número detrás de lo escrito, o `null` si no se escribió nada. */
export function leerMiles(texto: string): number | null {
  const d = soloDigitos(texto)
  return d ? Number(d) : null
}
