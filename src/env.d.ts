/// <reference types="vite/client" />

/** Las variables de entorno que lee el sitio. Ver `supabase/PASOS.md`. */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  /** Cualquiera de los dos nombres sirve: ver `data/modo.ts`. */
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  /** `mock` fuerza los datos del navegador, para trabajar sin conexión. */
  readonly VITE_DATOS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
