import { createClient } from '@supabase/supabase-js'
import { SUPABASE_CLAVE, SUPABASE_URL } from './modo'

/**
 * El cliente de Supabase. NADIE LO IMPORTA DIRECTO: se pide con `cliente()`
 * de `data/supabase.ts`, que lo trae con un `import()` dinámico.
 *
 * Así la librería (auth, storage, consultas) viaja en su propio archivo y no
 * engorda el JS con el que arranca la intro: el primer pedido de datos sale
 * cuando la página ya está pintada, y para entonces el archivo ya llegó.
 */
export const supabase = createClient(
  // Sin configurar, una dirección que no existe: el cliente se crea igual y
  // cada pedido falla con el cartel de error, que es lo que tiene que pasar
  // en un build de producción sin las variables (ver `modo.ts`).
  SUPABASE_URL || 'https://sin-configurar.invalid',
  SUPABASE_CLAVE || 'sin-configurar',
  {
    auth: {
      // La sesión sobrevive a la recarga a propósito: la dueña carga un auto,
      // se le va la página por una llamada, y volver a escribir la contraseña
      // en el celular es el momento en que se abandona la carga.
      persistSession: true,
      autoRefreshToken: true,
      // El acceso es con email y contraseña: no hay links mágicos que leer
      // de la dirección.
      detectSessionInUrl: false,
    },
  },
)
