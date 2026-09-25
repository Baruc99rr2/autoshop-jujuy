/**
 * Por dónde iba el visitante en el catálogo.
 *
 * EL PROBLEMA. Los filtros del catálogo viven en la URL
 * (`/catalogo?condicion=usado&q=ram`), así que el botón atrás del navegador
 * los devuelve solo. Pero desde una ficha no siempre se puede ir atrás: media
 * visita entra directo por un link pegado en WhatsApp, y ahí "atrás" saca del
 * sitio. Un enlace fijo a `/catalogo` resuelve ese caso y rompe el otro:
 * alguien que filtró por usados, buscó "ram" y entró a una unidad vuelve al
 * stock completo y tiene que filtrar de nuevo.
 *
 * LA SOLUCIÓN. El catálogo anota su query cada vez que cambia y la ficha la
 * usa para armar el enlace de vuelta. Quien nunca pasó por el catálogo no
 * tiene nada anotado y vuelve al catálogo pelado, que es exactamente lo que
 * corresponde.
 *
 * VA EN `sessionStorage` Y NO EN `localStorage`: es por dónde iba ESTA visita.
 * Un filtro guardado de la semana pasada, aplicándose solo al volver de una
 * ficha, se lee como que el catálogo está roto o como que no hay stock.
 */

const CLAVE = 'autoshop.catalogo.consulta'

/** La ruta del catálogo sin nada aplicado. */
const PELADO = '/catalogo'

/**
 * Anota la query actual del catálogo. Se le pasa `location.search` tal cual,
 * con el `?` incluido o vacío.
 *
 * El `try` no es defensivo por las dudas: en Safari en modo privado
 * `sessionStorage` existe y tirar al escribir, y una excepción acá voltearía
 * el catálogo entero por guardar un atajo.
 */
export function recordarCatalogo(busqueda: string): void {
  try {
    sessionStorage.setItem(CLAVE, busqueda)
  } catch {
    /* sin memoria, el enlace de vuelta cae en el catálogo pelado */
  }
}

/**
 * El destino del enlace "volver al catálogo": con los filtros que había, o
 * pelado si esta visita nunca pasó por ahí.
 */
export function linkAlCatalogo(): string {
  try {
    const guardada = sessionStorage.getItem(CLAVE)
    // Se valida que empiece con `?` en vez de confiar: lo guardado lo puede
    // editar cualquiera desde la consola, y `/catalogo` + basura es un 404.
    if (guardada && guardada.startsWith('?')) return PELADO + guardada
  } catch {
    /* ídem */
  }
  return PELADO
}
