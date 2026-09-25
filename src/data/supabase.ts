import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * El cliente, a demanda. El primero que lo pide dispara la descarga y el
 * resto se cuelga de la misma promesa. Ver por qué en `cliente.ts`.
 *
 * Si la descarga falla (sin conexión justo al primer pedido) la promesa se
 * olvida, para que el "reintentar" vuelva a intentar la descarga en vez de
 * repetir el mismo fallo guardado.
 */
let pedido: Promise<SupabaseClient> | null = null

export function cliente(): Promise<SupabaseClient> {
  pedido ??= import('./cliente')
    .then((m) => m.supabase)
    .catch((e) => {
      pedido = null
      throw e
    })
  return pedido
}

/**
 * El bucket de fotos y videos. Ver `supabase/schema.sql`. Vive acá y no en
 * `cliente.ts`: importar una constante de ese archivo metería la librería
 * entera en el JS de arranque.
 */
export const BUCKET = 'vehiculos'
