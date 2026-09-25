/**
 * De dónde salen los datos: Supabase o el mock del navegador.
 *
 * - `VITE_DATOS=mock` fuerza el mock, para trabajar sin conexión. Es lo que
 *   usa `npm run shots`: las capturas no pueden depender de la red ni tocar
 *   la base de verdad.
 * - Si no, con la dirección y la clave de Supabase puestas, es Supabase.
 * - Sin las dos, en DESARROLLO se cae al mock con un aviso en la consola.
 *   En PRODUCCIÓN NO: un build sin claves sigue apuntando a Supabase y falla
 *   con los carteles de error. Caerse al mock en el sitio publicado mostraría
 *   los autos de muestra como si fueran stock real.
 */

const env = import.meta.env

/**
 * La dirección sin nada detrás. En el panel de Supabase la dirección de la
 * API aparece también como `https://xxxx.supabase.co/rest/v1/`, y si se pega
 * esa el cliente arma `/rest/v1/rest/v1/...` y todo da 404.
 */
function limpiarUrl(url: string | undefined): string {
  return (url ?? '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1$/, '')
}

export const SUPABASE_URL = limpiarUrl(env.VITE_SUPABASE_URL)

/** La clave pública. Acepta los dos nombres: el viejo (`anon`) y el nuevo. */
export const SUPABASE_CLAVE = (
  env.VITE_SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  ''
).trim()

const configurado = SUPABASE_URL !== '' && SUPABASE_CLAVE !== ''

export const USA_SUPABASE =
  env.VITE_DATOS !== 'mock' && (configurado || env.PROD)

if (env.DEV && env.VITE_DATOS !== 'mock' && !configurado) {
  console.warn(
    '[datos] Faltan VITE_SUPABASE_URL y la clave: se usan los datos de muestra del navegador.',
  )
}
