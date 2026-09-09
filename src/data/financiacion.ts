/**
 * Parámetros del simulador de cuota.
 *
 * La tasa es una constante de archivo, inventada y del orden de lo que ofrece
 * una financiación propia en Argentina. **No es una oferta**: el simulador lo
 * dice en pantalla, y eso no es opcional en una simulación financiera.
 */

/** Tasa nominal anual. Se reemplaza acá cuando la concesionaria pase la real. */
export const TNA = 0.59

export const VALOR = {
  min: 8_000_000,
  max: 60_000_000,
  paso: 500_000,
  inicial: 24_000_000,
}

export const ANTICIPO = {
  /** En porcentaje del valor del vehículo. */
  min: 0,
  max: 50,
  paso: 5,
  inicial: 30,
}

export const PLAZOS = [12, 24, 36, 48, 60] as const
export const PLAZO_INICIAL = 48

/**
 * Cuota fija, sistema francés. Con anticipo del 100% —imposible acá, el tope
 * es 50%— o con tasa 0 la fórmula se indefine, así que los dos casos tienen
 * salida propia.
 */
export function cuotaMensual(capital: number, meses: number, tna = TNA) {
  if (capital <= 0 || meses <= 0) return 0
  const i = tna / 12
  if (i === 0) return capital / meses
  return (capital * i) / (1 - Math.pow(1 + i, -meses))
}
