/**
 * Parámetros de la cuota.
 *
 * La tasa es una constante de archivo, inventada y del orden de lo que ofrece
 * una financiación propia en Argentina. **No es una oferta**: es solo la base
 * del "Cuota desde" de las cards del catálogo, que lo aclara en pantalla.
 *
 * Quedó reducido a esto cuando se sacó el simulador de la sección 05: los
 * rangos de valor, anticipo y plazo se fueron con él.
 */

/** Tasa nominal anual. Se reemplaza acá cuando la concesionaria pase la real. */
export const TNA = 0.59

/**
 * Cuota fija, sistema francés. Con capital 0 o tasa 0 la fórmula se indefine,
 * así que los dos casos tienen salida propia.
 */
export function cuotaMensual(capital: number, meses: number, tna = TNA) {
  if (capital <= 0 || meses <= 0) return 0
  const i = tna / 12
  if (i === 0) return capital / meses
  return (capital * i) / (1 - Math.pow(1 + i, -meses))
}
