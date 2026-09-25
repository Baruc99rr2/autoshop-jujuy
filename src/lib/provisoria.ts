import type { Vehiculo } from '../types/vehiculo'

/**
 * La unidad PROVISORIA: la que se crea en el acto al tocar «Nueva unidad».
 *
 * Existe para que la dueña pueda empezar por las fotos. Una foto se sube
 * contra el id de una unidad, así que la unidad tiene que existir antes de
 * que ella escriba nada: nace como borrador, con un título que no es un
 * título y una dirección de relleno, y deja de ser provisoria la primera vez
 * que se guarda con el título de verdad.
 *
 * El formulario la reconoce por el TÍTULO, que es lo que no puede quedar así
 * al guardar (la validación pide el nombre real). La dirección lleva un
 * sufijo al azar para que dos pestañas abriendo «nueva» a la vez no pidan la
 * misma; igual el repositorio desempata si chocara.
 */
export const TITULO_PROVISORIO = 'Unidad sin título'

const PREFIJO = 'borrador-'

export function slugProvisorio(): string {
  return PREFIJO + Math.random().toString(36).slice(2, 10)
}

export function esProvisoria(v: Pick<Vehiculo, 'titulo'>): boolean {
  return v.titulo === TITULO_PROVISORIO
}

/**
 * Provisoria y sin nada cargado: ni fotos ni video. Es la que se borra sola
 * si la dueña sale sin tocar nada. El texto no cuenta porque una provisoria no
 * se puede guardar con texto: guardarla la convierte en una unidad normal.
 */
export function estaVacia(v: Vehiculo): boolean {
  return esProvisoria(v) && v.fotos.length === 0 && !v.video
}
