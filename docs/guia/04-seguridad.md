# 04 · Seguridad

La idea central: **lo que protege los datos es la base, no el navegador.** La
ruta protegida del panel, el login y los botones deciden qué pantalla se ve;
quién puede leer un borrador o borrar una unidad lo deciden las políticas de
fila (RLS) de Supabase, y ahí no se llega salteando nada desde la consola.

## Capas

1. **Permisos de tabla** (`grant`/`revoke`): `anon` solo puede leer;
   `authenticated` puede escribir donde corresponde. Primero se revoca todo,
   porque **Supabase da privilegios a `anon` sobre toda tabla nueva** de
   `public` por defecto.
2. **RLS**: con RLS encendido, una tabla sin política no deja pasar nada; cada
   política abre una puerta concreta.
3. **`es_admin()`**: la llave de todas las escrituras.
4. **Registro público apagado**: nadie se crea una cuenta solo.
5. **El cliente**: solo la clave pública; las cuentas de prueba sin `VITE_`.

## La tabla `admins` y `es_admin()`

`admins(email)` en minúsculas. Tener usuario en Supabase Auth **no alcanza**:
hay que estar en esta tabla. Se administra **solo desde el SQL Editor** (no hay
política de escritura: ni un admin puede sumar a otro desde la web).

`es_admin()` busca al usuario por `auth.uid()` en `auth.users`, lo cruza con
`admins` por email y **exige `email_confirmed_at`**: una cuenta registrada con
el email de otra persona, sin confirmar, no pasa. Es `security definer`
(necesita leer `auth.users`) con `search_path = ''` (que nadie le cuele una
tabla homónima en otro esquema). Las políticas la llaman como
`(select public.es_admin())`, entre paréntesis, para que se evalúe una vez por
pedido y no una por fila.

## RLS, política por política

| Tabla | Operación | Quién | Condición | Qué protege |
|---|---|---|---|---|
| `admins` | select | authenticated | `es_admin()` | Nadie de afuera ve quién administra |
| `admins` | escritura | — | sin política | Solo desde el SQL Editor |
| `vehiculos` | select | anon, auth | `publicado or es_admin()` | Los borradores: pedido por id o slug devuelve vacío, como si no existiera |
| `vehiculos` | insert | auth | `with check es_admin()` | Altas falsas |
| `vehiculos` | update | auth | `using` y `with check` `es_admin()` | Precios, textos, publicación. `using` elige qué filas toca; `with check`, cómo quedan |
| `vehiculos` | delete | auth | `es_admin()` | Bajas (y en cascada fotos, video, etiquetas) |
| `fotos`, `videos`, `etiquetas` | select | anon, auth | la unidad está publicada `or es_admin()` | Sin esto, las fotos de un borrador se podrían pedir conociendo el id de la unidad |
| `fotos`, `videos`, `etiquetas` | all | auth | `es_admin()` | Subir, reordenar, borrar |
| `sitio`, `contadores`, `contacto` | select | anon, auth | `true` | Es contenido público |
| `sitio`, `contadores`, `contacto` | update | auth | `es_admin()` | Sin políticas de alta ni baja: filas fijas que no se pueden borrar ni duplicar |
| `servicios`, `preguntas` (y `segmentos`) | select | anon, auth | `true` | |
| `servicios`, `preguntas` (y `segmentos`) | all | auth | `es_admin()` | |

Consecuencias que el código tiene que respetar:

- **Un `update` que la RLS bloquea no da error: devuelve cero filas.** El repo
  pide `.select('id')` en cada update/delete y trata cero filas como "no se
  guardó: la unidad ya no existe o tu cuenta no tiene permiso".
- **Contadores, sitio y contacto se guardan con `UPDATE` fila por fila.** Un
  `upsert` pide permiso de alta, que a propósito no hay, y falla.
- **El filtro `publicado = true` se pide a mano** en el sitio público aunque la
  RLS ya oculte borradores (la dueña logueada los vería en el catálogo).

## El bucket

Uno solo (`vehiculos`), **público**, 25 MB por archivo, tipos permitidos: WebP,
JPEG, PNG, MP4, WebM, MOV. **Sin SVG** (puede llevar código). Carpetas: cada
unidad en `<vehiculo_id>/…`; segmentos en `segmentos/…`.

- **Sin política de lectura a propósito**: en un bucket público los archivos se
  bajan por su URL sin pasar por las políticas; lo que pasaría es *listar*, y
  sin política un visitante no puede listar el bucket para encontrar las fotos
  de un borrador. Las URLs de un borrador solo están en tablas que no puede leer.
- Listar, subir, reemplazar y borrar: solo admins.
- **Los archivos no se borran en cascada.** Supabase no permite borrarlos desde
  SQL: el repo borra el archivo después de borrar la fila (si al revés fallara,
  quedaría una unidad apuntando a fotos que no existen). Al borrar una unidad
  vacía su carpeta entera, así también se van restos de subidas cortadas.
- Nombres de archivo únicos (`foto-<uuid>.webp`), `cacheControl: '31536000'` y
  `upsert: false`: nunca se reescriben, el navegador los guarda para siempre.

## La sesión (`src/data/sesion.ts`)

**Toda la autenticación vive en este archivo.** Las pantallas solo conocen
`iniciarSesion`, `cerrarSesion`, `useSesion`, `avisoDeSalida` y
`marcarSinGuardar`; no saben si del otro lado está Supabase o el acceso de
mentira del modo mock (sin servidor, entra cualquiera: solo existe con
`VITE_DATOS=mock`).

Lo no obvio, recortado:

```ts
// Estado de módulo, no contexto de React: lo tocan el repo (sesión vencida) y el login.
// undefined = "todavía no sé" (con Supabase leer la sesión es asíncrono).
let sesion: Sesion | null | undefined = USA_SUPABASE ? undefined : leerMock()
let aviso: string | null = null       // lo que el login dice al abrirse si la sesión se cerró sola
let verificando = false               // mientras se revisa es_admin, SIGNED_IN no abre el panel
let saliendoAMano = false             // distingue "tocó Salir" de "se cerró sola"

// ¿Había sesión guardada al abrir? Se mira AL CARGAR EL MÓDULO: si el token ya no
// se puede renovar, el cliente lo borra al arrancar y después no se distingue
// "venció" de "nunca entró".
const HABIA_SESION = USA_SUPABASE &&
  Object.keys(localStorage).some((k) => /^sb-.+-auth-token$/.test(k))

async function entrarSupabase(email: string, clave: string) {
  const sb = await cliente()
  verificando = true
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password: clave })
    if (error || !data.user) throw traducirAuth(error ?? {})
    // Tener usuario no alcanza: tiene que estar en `admins`. Si no, se cierra acá
    // y se dice por qué, en vez de abrir un panel donde todo falla.
    const { data: esAdmin, error: e2 } = await sb.rpc('es_admin')
    if (e2 || esAdmin !== true) {
      await sb.auth.signOut({ scope: 'local' })
      throw new ErrorSesion('Esa cuenta existe pero no tiene permiso para usar el panel.')
    }
    poner(aSesion(data.user))
  } finally {
    verificando = false
  }
}

// La sesión como estado de React, sin frame de "sin sesión" antes de saber.
export function useSesion() {
  return useSyncExternalStore(suscribir, sesionActual, sesionActual)
}
```

Reglas:

- `arrancar()` (suscribirse a `onAuthStateChange` y leer `getSession()`) corre
  la primera vez que alguien se suscribe, o sea al abrir el panel: **el sitio
  público no baja la librería de auth**.
- Errores de auth por **código** (`invalid_credentials`,
  `email_not_confirmed`, `over_request_rate_limit`…), nunca por texto.
- `signOut({ scope: 'local' })`: sale aunque no haya conexión.
- Cuando la base dice que el token venció (`PGRST301`/`PGRST303`/"jwt
  expired"), `repo/errores.ts` llama a `sesionVencida()`: cierra local y el
  login muestra "Tu sesión venció. Entrá de nuevo y repetí lo último que
  hiciste."
- La sesión **persiste** a la recarga a propósito (se le va la página por una
  llamada y volver a escribir la contraseña en el celular es donde se abandona
  la carga). El cierre por inactividad compensa ese riesgo.
- `Protegida` (en `routes/Admin.tsx`): con `sesion === undefined` muestra
  "Abriendo el panel…" (mandar al login en ese medio segundo echaría a quien sí
  tiene sesión); sin sesión, `<Navigate to="/admin/login" replace state={{ desde }}>`
  y al entrar vuelve a la página pedida.

## Cierre por inactividad (`src/lib/inactividad.ts`)

A los **30 minutos** sin uso la sesión se cierra; a los **28** aparece un
aviso con cuenta regresiva ("Seguir conectada" / "Salir ahora"). Un celular se
pierde, se presta o queda desbloqueado sobre el mostrador.

```ts
export const LIMITE_MS = 30 * 60_000
export const AVISO_MS = 2 * 60_000
const CLAVE_ACTIVIDAD = '<prefijo>.panel.actividad'
const CADA_MS = 5_000   // escribir en localStorage a lo sumo cada 5 s (despierta a las otras pestañas)
// NO el evento `scroll`: lo dispara también un scroll programático (Lenis, un scrollTo)
// y el panel se mantendría vivo solo.
const EVENTOS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'touchmove'] as const

export function useInactividad() {
  const [restante, setRestante] = useState<number | null>(null)
  useEffect(() => {
    let ultima = Math.max(Date.now(), leerCompartida())
    let escrita = 0
    let cerrando = false
    const marcar = () => {
      const ahora = Date.now()
      ultima = ahora
      if (ahora - escrita < CADA_MS) return
      escrita = ahora
      try { localStorage.setItem(CLAVE_ACTIVIDAD, String(ahora)) } catch {}
    }
    const cerrar = () => { if (!cerrando) { cerrando = true; cerrarPorInactividad() } }
    // UN SOLO RELOJ PARA TODAS LAS PESTAÑAS: trabajar en una mantiene viva la otra.
    const alGuardar = (e: StorageEvent) => {
      if (e.key === CLAVE_ACTIVIDAD) ultima = Math.max(ultima, Number(e.newValue ?? 0))
      else if (e.key === CLAVE_CIERRE && e.newValue) cerrar()   // otra pestaña cerró
    }
    const tic = () => {
      if (subidasEnCurso() > 0) marcar()                 // subir un video no es inactividad
      ultima = Math.max(ultima, leerCompartida())        // por si se perdió un `storage` dormida
      const falta = ultima + LIMITE_MS - Date.now()
      if (falta <= 0) { setRestante(0); cerrar() }
      else setRestante(falta <= AVISO_MS ? falta : null)
    }
    marcar()
    EVENTOS.forEach((ev) => window.addEventListener(ev, marcar, { passive: true, capture: true }))
    window.addEventListener('storage', alGuardar)
    // Celular bloqueado congela los timers: al volver se revisa en el acto.
    document.addEventListener('visibilitychange', tic)
    const intervalo = setInterval(tic, 1000)
    return () => { /* quitar todo lo de arriba */ clearInterval(intervalo) }
  }, [])
  return { restante, seguir: /* marcar forzando la escritura */ }
}
```

`cerrarPorInactividad()` (en `sesion.ts`) escribe una marca
`<prefijo>.panel.cierre` con la hora —las otras pestañas la ven y cierran— y
cierra con un aviso. Si alguna pantalla registró cambios sin guardar
(`marcarSinGuardar(clave, true)`), el aviso del login lo dice: "Lo último que
cambiaste NO se guardó". `AvisoInactividad` se monta dentro de `Protegida`.

## Encabezados (`vercel.json`)

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    { "source": "/(.*)", "headers": [
      { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob: https://*.supabase.co; media-src 'self' blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-src https://www.openstreetmap.org; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests" },
      { "key": "X-Frame-Options", "value": "DENY" },
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
      { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
      { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains" },
      { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" }
    ]},
    { "source": "/admin(.*)", "headers": [
      { "key": "X-Robots-Tag", "value": "noindex, nofollow" },
      { "key": "Cache-Control", "value": "no-store" }
    ]}
  ]
}
```

Por qué cada fuente del CSP:

- `script-src 'self'`: sin scripts externos ni inline. **Nada de Google Fonts,
  analytics ni widgets** sin agregarlos acá a conciencia.
- `style-src 'unsafe-inline'`: React pone estilos inline (`style={{…}}`) y GSAP
  escribe `transform` en línea.
- `img-src`/`media-src` con `blob:` y `data:`: miniaturas de lo que se está
  subiendo, el mock (blobs de IndexedDB), el póster sacado por canvas.
- `connect-src` con `wss://`: Supabase Realtime/Auth.
- `frame-src` solo OpenStreetMap: el mapa del footer.
- `worker-src 'self' blob:`: deja a una librería usar workers desde `blob:`.
  En el original no se auditó cuál lo necesita; si el proyecto nuevo no usa
  workers, se puede quitar y probar.
- `frame-ancestors 'none'` + `X-Frame-Options: DENY`: nadie embebe el sitio.
- **Probar el CSP en un deploy de preview antes de producción**: un recurso que
  falta en la lista falla en silencio (la consola del navegador lo dice).

## Noindex del panel (tres capas)

1. `X-Robots-Tag: noindex, nofollow` y `Cache-Control: no-store` en `/admin*`.
2. `public/robots.txt` con `Disallow: /admin`.
3. `<meta name="robots" content="noindex, nofollow">` que `routes/Admin.tsx`
   agrega al montar (para el buscador que ejecuta JS y no mira encabezados).

## Pasos manuales

### Supabase (una sola vez)

1. **Crear el proyecto**: supabase.com → New project. Región más cercana al
   público. Generar la contraseña de la base y guardarla en un gestor (el sitio
   no la usa).
2. **Tablas**: SQL Editor → New query → pegar [supabase.sql](supabase.sql)
   entero (habiendo reemplazado lo marcado `REEMPLAZAR`) → Run. Debe decir
   "Success. No rows returned". Comprobar en Table Editor las tablas y en
   Storage el bucket `vehiculos` marcado **Public**.
   *Qué se probó de este archivo*: se corrió dos veces seguidas en PGlite
   (Postgres en WebAssembly) con stubs mínimos de `auth.users`, `auth.uid()`,
   `storage` y los roles `anon`/`authenticated`, sin errores, y pasaron 24
   comprobaciones (borradores ocultos para `anon`, escrituras solo de admins,
   email sin confirmar no es admin, tope de 10 fotos, `on delete set null`,
   contenido inicial cargado una sola vez). **No se corrió todavía en un
   proyecto real de Supabase**: el primer proyecto que lo use, que lo verifique
   con `npm run recorrido`.
3. **Cerrar el registro**: Authentication → Sign In / Providers → dejar Email
   habilitado y **apagar "Allow new users to sign up"**. Guardar.
4. **Crear el usuario de la dueña**: Authentication → Users → Add user →
   Create new user, con email y contraseña, **marcando "Auto Confirm User"**
   (sin eso `es_admin()` no la reconoce).
5. **Habilitarla como admin**: en el SQL Editor, la línea comentada del final
   de `supabase.sql` con su email en minúsculas. Repetir 4 y 5 por persona.
6. **Site URL**: Authentication → URL Configuration → Site URL = `<dominio>`
   (la usa Supabase en los mails de recuperar contraseña).
7. **Claves**: Project Settings → Data API → Project URL; API Keys →
   **Publishable key** (`sb_publishable_…`) o la `anon public` de "Legacy API
   Keys". **Nunca** la Secret key ni la `service_role`.

### Local

`.env.local` en la raíz (no se versiona):

```
VITE_SUPABASE_URL=https://<proyecto>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxx
# para los scripts que escriben, sin VITE_:
SUPABASE_PRUEBA_EMAIL=...
SUPABASE_PRUEBA_CLAVE=...
```

Vite lee las variables solo al arrancar: reiniciar `npm run dev`.

### Vercel

1. Importar el repo de GitHub (framework: Vite).
2. Settings → Environment Variables: `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_PUBLISHABLE_KEY`, en Production, Preview y Development.
3. Las variables entran en el **próximo build**: Deployments → ⋯ → Redeploy.
4. Dominio propio: Settings → Domains. Después, actualizar `<dominio>` en los
   cuatro lugares (ver [06](06-sitio-publico.md), SEO).

### Bueno saber

- El plan Free de Supabase **pausa el proyecto tras 7 días sin actividad**; con
  el sitio en uso no pasa, y si pasa se reactiva con "Restore project".
- Los backups automáticos de Supabase **no incluyen los archivos del bucket**.
- Si una cuenta de prueba es aparte de la de la dueña, sacarla de `admins`
  cuando termines: `delete from public.admins where email = '...';`
