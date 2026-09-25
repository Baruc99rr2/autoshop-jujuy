/**
 * Lo que comparten los scripts que hablan con Supabase de verdad
 * (`semilla.mjs` y `recorrido.mjs`): leer `.env.local` y entrar como admin.
 *
 * La cuenta de prueba sale de `SUPABASE_PRUEBA_EMAIL` y
 * `SUPABASE_PRUEBA_CLAVE`, SIN el prefijo `VITE_`: así Vite no las mete nunca
 * en el sitio, y `.env.local` no se sube al repo (`*.local`).
 */
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'

export function leerEntorno() {
  const env = { ...process.env }
  try {
    for (const linea of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
      const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (m && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    /* sin .env.local: vale lo que haya en el entorno */
  }

  // Mismas reglas que `src/data/modo.ts`.
  const url = (env.VITE_SUPABASE_URL ?? '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1$/, '')
  const clave = (env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim()
  const email = env.SUPABASE_PRUEBA_EMAIL
  const contrasenia = env.SUPABASE_PRUEBA_CLAVE

  const faltan = [
    !url && 'VITE_SUPABASE_URL',
    !clave && 'VITE_SUPABASE_ANON_KEY (o VITE_SUPABASE_PUBLISHABLE_KEY)',
    !email && 'SUPABASE_PRUEBA_EMAIL',
    !contrasenia && 'SUPABASE_PRUEBA_CLAVE',
  ].filter(Boolean)
  if (faltan.length) {
    console.error(`Faltan en .env.local: ${faltan.join(', ')}`)
    process.exit(1)
  }
  return { url, clave, email, contrasenia }
}

/** Un cliente sin sesión: lo que ve cualquier visitante. */
export function clienteAnonimo({ url, clave }) {
  return createClient(url, clave, { auth: { persistSession: false } })
}

/** Un cliente con la sesión de la cuenta de prueba, que tiene que ser admin. */
export async function clienteAdmin(e) {
  const sb = createClient(e.url, e.clave, { auth: { persistSession: false } })
  const { error } = await sb.auth.signInWithPassword({ email: e.email, password: e.contrasenia })
  if (error) throw new Error(`No se pudo entrar con la cuenta de prueba: ${error.message}`)
  const { data: esAdmin } = await sb.rpc('es_admin')
  if (esAdmin !== true) {
    throw new Error(`${e.email} entró pero no está en la tabla admins (ver supabase/PASOS.md, paso 10).`)
  }
  return sb
}
