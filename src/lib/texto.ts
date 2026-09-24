/**
 * Texto que se convierte en dirección.
 *
 * `slugificar` vive acá y no adentro del repositorio porque lo necesitan DOS
 * lados: el repositorio, que arma el slug cuando la unidad se crea sin uno, y
 * el formulario del panel, que muestra la dirección mientras se escribe el
 * título. Con una copia en cada lado el panel prometería una dirección y el
 * repositorio guardaría otra.
 */

/**
 * Título → parte visible de la URL de la ficha.
 *
 * Saca los acentos por descomposición (NFD) y borra las marcas combinantes:
 * "Citroën C4" tiene que llegar a `citroen-c4` y no a `citron-c4`. Lo que no
 * es letra ni cifra pasa a ser un guión, y los guiones de los extremos se
 * caen. Un título que después de todo eso queda vacío —"###"— devuelve
 * `vehiculo`, porque un slug vacío haría una URL rota.
 */
export function slugificar(titulo: string): string {
  return (
    titulo
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'vehiculo'
  )
}

/**
 * La forma de un slug ya guardado: minúsculas, cifras y guiones simples, sin
 * guión al principio ni al final. Es lo que valida el campo del panel cuando
 * la dirección se escribe a mano.
 */
export const SLUG_VALIDO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Sin acentos ni mayúsculas, para comparar texto escrito a mano. Es la misma
 * forma que la columna `busqueda` de la base (`lower(unaccent(...))`), así
 * que lo que se busca y donde se busca hablan igual.
 */
export function plano(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}
