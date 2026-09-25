/**
 * Cuántas subidas hay en curso en esta pestaña.
 *
 * Lo lee el cierre por inactividad (`lib/inactividad.ts`): subir un video de
 * 25 MB con mala señal puede tardar más que el aviso, y mientras dura la
 * dueña no toca nada. Eso no es inactividad; sacarla a la mitad sería perder
 * la subida. El repositorio envuelve sus métodos que suben archivos con
 * `conSubida` (ver `data/repo/index.ts`), así ningún componente se olvida.
 */
let enCurso = 0

export function subidasEnCurso(): number {
  return enCurso
}

export async function conSubida<T>(p: Promise<T>): Promise<T> {
  enCurso++
  try {
    return await p
  } finally {
    enCurso--
  }
}
