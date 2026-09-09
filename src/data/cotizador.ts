/**
 * Datos del cotizador de usados.
 *
 * Todo inventado: los precios de referencia son de 0km y el modelo de
 * depreciación es una curva simple, no la guía oficial. El componente lo aclara
 * en pantalla. Cuando la concesionaria pase su tabla real, se reemplaza este
 * archivo y no hay que tocar el componente.
 */

export interface ModeloUsado {
  id: string
  nombre: string
  /** Precio de referencia del 0km, en pesos. Base del cálculo. */
  base: number
}

export interface MarcaUsados {
  id: string
  nombre: string
  modelos: ModeloUsado[]
}

export const MARCAS_USADOS: MarcaUsados[] = [
  {
    id: 'fiat',
    nombre: 'Fiat',
    modelos: [
      { id: 'cronos', nombre: 'Cronos', base: 28_500_000 },
      { id: 'argo', nombre: 'Argo', base: 26_000_000 },
      { id: 'pulse', nombre: 'Pulse', base: 38_000_000 },
      { id: 'strada', nombre: 'Strada', base: 44_000_000 },
      { id: 'toro', nombre: 'Toro', base: 52_000_000 },
    ],
  },
  {
    id: 'volkswagen',
    nombre: 'Volkswagen',
    modelos: [
      { id: 'polo', nombre: 'Polo', base: 36_000_000 },
      { id: 't-cross', nombre: 'T-Cross', base: 45_000_000 },
      { id: 'amarok', nombre: 'Amarok', base: 78_000_000 },
    ],
  },
  {
    id: 'toyota',
    nombre: 'Toyota',
    modelos: [
      { id: 'etios', nombre: 'Etios', base: 27_000_000 },
      { id: 'corolla-cross', nombre: 'Corolla Cross', base: 62_000_000 },
      { id: 'hilux', nombre: 'Hilux', base: 85_000_000 },
    ],
  },
  {
    id: 'peugeot',
    nombre: 'Peugeot',
    modelos: [
      { id: '208', nombre: '208', base: 32_000_000 },
      { id: '2008', nombre: '2008', base: 42_000_000 },
      { id: 'partner', nombre: 'Partner', base: 34_000_000 },
    ],
  },
  {
    id: 'chevrolet',
    nombre: 'Chevrolet',
    modelos: [
      { id: 'onix', nombre: 'Onix', base: 31_000_000 },
      { id: 'tracker', nombre: 'Tracker', base: 46_000_000 },
      { id: 's10', nombre: 'S10', base: 74_000_000 },
    ],
  },
  {
    id: 'renault',
    nombre: 'Renault',
    modelos: [
      { id: 'sandero', nombre: 'Sandero', base: 28_000_000 },
      { id: 'duster', nombre: 'Duster', base: 40_000_000 },
      { id: 'kangoo', nombre: 'Kangoo', base: 33_000_000 },
    ],
  },
]

/** Años ofrecidos, del más nuevo al más viejo: es el orden en que se elige. */
export const ANIOS: number[] = Array.from({ length: 10 }, (_, i) => 2025 - i)

/** Cuánto conserva un auto por año. Curva simple, a propósito. */
const RETENCION_ANUAL = 0.93
const ANIO_REFERENCIA = 2026

/**
 * Rango estimado para una unidad. Devuelve mínimo y máximo porque una tasación
 * sin rango se lee como un precio cerrado, y eso es exactamente lo que una
 * concesionaria no puede prometer sin ver el auto.
 */
export function estimar(base: number, anio: number) {
  const antiguedad = Math.max(ANIO_REFERENCIA - anio, 0)
  const valor = base * Math.pow(RETENCION_ANUAL, antiguedad)
  // Se redondea a 100.000 para que no parezca una precisión que no existe.
  const redondear = (n: number) => Math.round(n / 100_000) * 100_000
  return { min: redondear(valor * 0.94), max: redondear(valor * 1.06) }
}
