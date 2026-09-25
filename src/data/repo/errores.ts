import { sesionVencida } from '../sesion'
import { ErrorRepo } from './tipos'

/**
 * Los errores de Supabase, dichos para la dueña.
 *
 * Todo lo que sale del repositorio de Supabase pasa por acá y sale como
 * `ErrorRepo` con un mensaje que se puede mostrar tal cual: qué pasó y qué
 * hacer. "new row violates row-level security policy" no le dice nada a
 * nadie que esté cargando un auto desde el celular.
 *
 * Se mira el `code` antes que el texto, porque el texto cambia entre
 * versiones; el texto se usa solo donde Supabase no manda código.
 */

type ErrorCrudo = {
  code?: string
  message?: string
  status?: number
  statusCode?: string | number
  name?: string
}

export const SIN_CONEXION =
  'No hay conexión con el servidor. Revisá que tengas internet y probá de nuevo.'

function esDeRed(e: ErrorCrudo): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const m = e.message ?? ''
  return (
    e.name === 'TypeError' ||
    /failed to fetch|networkerror|load failed|network request failed|fetch failed/i.test(m)
  )
}

export function traducir(e: unknown, contexto = 'No se pudo completar'): ErrorRepo {
  if (e instanceof ErrorRepo) return e
  const x = (e ?? {}) as ErrorCrudo
  const m = x.message ?? ''
  const estado = Number(x.status ?? x.statusCode ?? 0)

  if (esDeRed(x)) return new ErrorRepo(SIN_CONEXION)

  // Token vencido que no se pudo renovar: la sesión ya no sirve.
  if (x.code === 'PGRST301' || x.code === 'PGRST303' || /jwt expired|invalid jwt/i.test(m)) {
    sesionVencida()
    return new ErrorRepo('Tu sesión venció. Entrá de nuevo y repetí lo último que hiciste.')
  }

  // RLS o permisos: la cuenta no está en `admins` (o dejó de estarlo).
  if (
    x.code === '42501' ||
    /row-level security|permission denied/i.test(m) ||
    estado === 401 ||
    estado === 403
  ) {
    return new ErrorRepo(
      'Tu cuenta no tiene permiso para hacer esto. Si pensás que es un error, cerrá sesión y volvé a entrar.',
    )
  }

  // Límites del bucket (ver la sección 6 del esquema).
  if (estado === 413 || /exceeded the maximum allowed size|payload too large/i.test(m)) {
    return new ErrorRepo('El archivo pesa más de 25 MB, que es lo máximo que se puede subir.')
  }
  if (estado === 415 || /mime type|invalid_mime_type/i.test(m)) {
    return new ErrorRepo('Ese tipo de archivo no se puede subir. Las fotos van en JPG o WebP y los videos en MP4, WebM o MOV.')
  }

  // Excepciones propias de la base (`raise exception` en los triggers): ya
  // vienen escritas en castellano.
  if (x.code === 'P0001' && m) return new ErrorRepo(m)

  if (x.code === '23505') {
    return new ErrorRepo('Ya hay otra unidad con esos datos. Cambiá la dirección y probá de nuevo.')
  }

  if (estado >= 500 || x.code === 'PGRST000' || x.code === 'PGRST002') {
    return new ErrorRepo('El servidor no está respondiendo. Esperá un momento y probá de nuevo.')
  }

  if (import.meta.env.DEV) console.error('[repo]', e)
  return new ErrorRepo(`${contexto}. Probá de nuevo en un momento.`)
}
