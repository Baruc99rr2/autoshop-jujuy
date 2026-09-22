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
