# 02 · Arquitectura

## Stack

Versiones con las que está en producción el original (`package.json`). En un
proyecto nuevo, usá la última compatible y **consultá la documentación antes
de escribir configuración**: Tailwind v4 y React Router 7 cambiaron APIs.

| Área | Elección | Versión |
|---|---|---|
| Build | Vite + `@vitejs/plugin-react` | 8.2 · 6.1 |
| UI | React + React DOM | 19.2 |
| Lenguaje | TypeScript | ~6.0 |
| Estilos | Tailwind CSS v4 con `@tailwindcss/vite` (tokens en `@theme` dentro del CSS) | 4.3 |
| Rutas | `react-router` (`BrowserRouter`, no data router) | 7.18 |
| Datos | `@supabase/supabase-js` (Postgres + Auth + Storage) | 2.117 |
| Animación | GSAP + ScrollTrigger + Flip, con `@gsap/react` | 3.15 · 2.1 |
| Scroll suave | Lenis, en el mismo ticker que GSAP | 1.3 |
| SVG como componente | `vite-plugin-svgr` (SVGO apagado) | 5.2 |
| Fuente | `@fontsource-variable/<familia>` copiada a `public/fonts/` | — |
| Lint | `oxlint` | 1.79 |
| Pruebas en navegador | `playwright` (Chromium) | 1.63 |
| Deploy | Vercel conectado a GitHub | — |
| Node | ≥ 22 (los scripts importan `.ts` directo, Node quita los tipos) | — |

Dependencias que **no** se agregan: `motion`/`framer-motion` (en el original era
el 25% del JS por una sola animación; se sacó, ver T27), librerías de íconos,
librerías de UI.

Solo de desarrollo, si se hace el QR (ver [09](09-pruebas.md)): `qrcode`,
`jsqr`, `@zxing/library`, `fontkit`, `wawoff2`.

## Carpetas

```
index.html                  meta, canonical y Open Graph fijos, preload de la fuente
vercel.json                 reescritura SPA + CSP y encabezados
public/
  fonts/                    el .woff2 variable (lo copia scripts/sync-fonts.mjs)
  img/                      póster del hero, fotos de las unidades de muestra
  video/                    videos del hero
  robots.txt  sitemap.xml   manifest.webmanifest  íconos
supabase/                   SQL (en el proyecto nuevo: el supabase.sql de esta guía) y PASOS.md
scripts/                    verificación (ver 09-pruebas.md)
src/
  main.tsx                  inicia Lenis ANTES del primer render
  App.tsx                   router, transición entre rutas, panel lazy
  styles/globals.css        tokens, @font-face, utilidades, foco, todo el CSS propio
  assets/logo.svg
  types/                    vehiculo.ts, contenido.ts — el contrato de datos
  data/
    modo.ts                 ¿Supabase o mock?
    supabase.ts             cliente() perezoso + nombre del bucket
    cliente.ts              createClient (NADIE lo importa directo)
    sesion.ts               toda la autenticación
    contacto.ts             lo fijo del negocio + armadores de links (WhatsApp, tel, mapa)
    sitio.ts                SITIO_URL (dominio oficial)
    nav.ts                  secciones del inicio, menú, footer
    catalogo.ts             filtros y órdenes del catálogo
    marcas.ts               diccionario de marcas
    hero.ts                 textos del hero
    repo/
      tipos.ts              interfaces RepoVehiculos y RepoContenido, ErrorRepo
      index.ts              elige la implementación y envuelve las subidas
      supabase.ts           repo de unidades sobre Supabase
      supabase-contenido.ts repo de contenido sobre Supabase
      mock.ts  mock-contenido.ts  blobs.ts   mock: localStorage + IndexedDB
      semilla.ts  semilla-contenido.ts       datos de muestra (ids "demo-")
      errores.ts            errores de Supabase → mensajes para la dueña
  lib/                      lógica sin UI (ver abajo)
  routes/                   Home, Catalogo, Vehiculo, Admin, NoEncontrado
  components/               sitio público
  components/admin/         panel
```

`src/lib/`, lo que vale la pena conocer: `archivos.ts` (compresión de fotos,
video, póster), `provisoria.ts`, `inactividad.ts`, `subidas.ts`,
`contenido.ts` (contenido compartido del sitio), `titulo.ts` (título, meta y
canonical), `fit-text.ts` (texto que llena un ancho midiendo), `formato.ts`
(precios, km, miles mientras se escribe), `texto.ts` (`slugificar`, `plano`),
`smooth.ts` (Lenis + ScrollTrigger), `viewport.ts` (ignorar resizes de la barra
del navegador), `pie-a-la-vista.ts`, `ultimo-catalogo.ts`, `ir-a.ts`
(navegar a una sección del home desde otra página), `use-media.ts`,
`motion-prefs.ts`.

## Rutas

| Ruta | Qué es |
|---|---|
| `/` | Inicio. Única ruta con intro. |
| `/catalogo` | Todo el stock publicado. Filtros en la URL: `?condicion=`, `?q=`, `?orden=`. |
| `/vehiculo/:slug` | Ficha. Un slug inexistente **o un borrador** dan el mismo 404. |
| `/admin/*` | Panel, cargado con `lazy()` en su propio chunk. Adentro: `login`, `` (listado), `nuevo`, `editar/:id`, `contenido`. |
| `*` | 404. **Obligatorio**: `vercel.json` sirve `index.html` para cualquier URL, así que sin esto una dirección inventada da 200 y pantalla en blanco. |

`App.tsx` envuelve las rutas en un `TransicionDeRuta` con `key={pathname}`: al
entrar sube arriba de todo sin animación; al salir, en la **limpieza de un
`useLayoutEffect`**, mata todos los ScrollTrigger y suelta el scroll. Tiene
que ser layout effect (ver T14). Después de pintar, `lenis.resize()` y
`ScrollTrigger.refresh()`.

El panel tiene **rutas propias** y no estados de un componente: en el celular
el gesto de volver es el del sistema, y sin rutas sacaría a la dueña del panel.

## La capa de repositorio

**La app habla solo con `repo` y `repoContenido`** de `src/data/repo/index.ts`.
Ningún componente importa `mock.ts`, `supabase.ts` ni el cliente de Supabase.
Cambiar de implementación es una línea.

La interfaz (recortada a lo esencial; `src/data/repo/tipos.ts`):

```ts
export type OrdenVehiculos =
  | 'recientes' | 'actualizados'
  | 'precio-asc' | 'precio-desc' | 'anio-desc' | 'anio-asc' | 'km-asc' | 'km-desc'

export interface FiltrosVehiculos {
  condicion?: Condicion
  estado?: EstadoVehiculo
  texto?: string            // título + descripción, sin acentos ni mayúsculas
  soloPublicados?: boolean  // TRUE por defecto: el que pide borradores es el panel
  orden?: OrdenVehiculos    // 'recientes' = alta; 'actualizados' = último cambio (panel)
  limite?: number
}

export interface NuevoVehiculo {
  titulo: string
  descripcion?: string
  condicion: Condicion
  precio?: number | null
  anio?: number | null
  km?: number | null
  estado?: EstadoVehiculo
  publicado?: boolean
  destacado?: boolean
  etiquetas?: Etiqueta[]
  slug?: string             // si no viene, sale del título y se desempata con -2, -3…
}
export type CambiosVehiculo = Partial<NuevoVehiculo>

/** Todo es async aunque el mock resuelva al instante. */
export interface RepoVehiculos {
  listar(filtros?: FiltrosVehiculos): Promise<Vehiculo[]>
  obtenerPorSlug(slug: string): Promise<Vehiculo | null>
  obtenerPorId(id: string): Promise<Vehiculo | null>   // el panel edita por id: el slug cambia con el título
  listarDestacados(limite?: number): Promise<Vehiculo[]>
  crear(datos: NuevoVehiculo): Promise<Vehiculo>
  actualizar(id: string, cambios: CambiosVehiculo): Promise<Vehiculo>
  eliminar(id: string): Promise<void>
  subirFoto(id: string, archivo: File): Promise<Foto>          // falla al llegar a MAX_FOTOS
  eliminarFoto(id: string, fotoId: string): Promise<void>
  reordenarFotos(id: string, idsEnOrden: string[]): Promise<Foto[]>
  subirVideo(id: string, archivo: File, poster?: File): Promise<Video>  // reemplaza al anterior
  eliminarVideo(id: string): Promise<void>
}

/** Cada bloque se lee y se guarda ENTERO: la lista como quedó, con altas, bajas y orden. */
export interface RepoContenido {
  obtenerContadores(): Promise<Contadores>
  guardarContadores(datos: Contadores): Promise<Contadores>   // exactamente cuatro
  listarServicios(): Promise<Servicio[]>
  guardarServicios(lista: Servicio[]): Promise<Servicio[]>
  listarPreguntas(): Promise<Pregunta[]>
  guardarPreguntas(lista: Pregunta[]): Promise<Pregunta[]>
  obtenerContacto(): Promise<DatosContacto>
  guardarContacto(datos: DatosContacto): Promise<DatosContacto>
  // opcional: listarSegmentos / guardarSegmentos (ver 03)
}

/** Error con un mensaje que se puede mostrar tal cual. */
export class ErrorRepo extends Error {
  constructor(mensaje: string) { super(mensaje); this.name = 'ErrorRepo' }
}
```

`index.ts` elige y **envuelve las subidas** para el cierre por inactividad:

```ts
const vehiculos = USA_SUPABASE ? repoSupabase : repoMock
const contenido = USA_SUPABASE ? contenidoSupabase : contenidoMock

export const repo: RepoVehiculos = {
  ...vehiculos,
  subirFoto: (...a) => conSubida(vehiculos.subirFoto(...a)),
  subirVideo: (...a) => conSubida(vehiculos.subirVideo(...a)),
}
export const repoContenido: RepoContenido = { ...contenido }
```

Se envuelve acá y no en cada componente para que una subida nueva no pueda
olvidarse de avisar.

### Reglas que cumplen las dos implementaciones

- `soloPublicados` va en `true` por defecto. **El repo de Supabase filtra
  `publicado` a mano** aunque la RLS ya oculte los borradores: la RLS se los
  muestra a la dueña logueada, y sin el filtro ella vería sus borradores en el
  catálogo público de la misma pestaña.
- Los órdenes por dato mandan los `null` **al final**, suba o baje ("Consultar
  precio" no es ni el más barato ni el más caro). A igual dato, el más reciente.
- El slug se arma con `slugificar()` de `lib/texto.ts` —el mismo que usa el
  formulario para mostrar la dirección mientras se escribe— y se desempata
  consultando la base (`-2`, `-3`…), reintentando si choca por `23505`.
- Las listas de contenido se renumeran desde 0 según la posición al guardar.
- Todo error sale como `ErrorRepo` con un texto para la dueña
  (`repo/errores.ts`, ver [04](04-seguridad.md)).

### El mock

Para trabajar sin conexión y para las capturas: la ficha de cada unidad en
`localStorage` (clave versionada, ej. `<prefijo>.vehiculos.v4`) y **los
archivos en IndexedDB** (`blobs.ts`), unidos por una referencia `idb:<clave>`
que se convierte en `blob:` URL al leer. Fotos como data URL en localStorage
no entraban ni cuatro (ver T5). La semilla lleva ids `demo-` y casos
deliberados: un borrador, una vendida, una sin precio, una con 10 fotos y
muchas etiquetas, una con una sola foto.

## Modo de datos

`src/data/modo.ts`:

```ts
const env = import.meta.env

// Pegar la dirección con /rest/v1/ es un error común: el cliente armaría /rest/v1/rest/v1/
function limpiarUrl(url?: string) {
  return (url ?? '').trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '')
}
export const SUPABASE_URL = limpiarUrl(env.VITE_SUPABASE_URL)
export const SUPABASE_CLAVE = (env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim()
const configurado = SUPABASE_URL !== '' && SUPABASE_CLAVE !== ''

// VITE_DATOS=mock fuerza el mock. Sin claves: en DESARROLLO cae al mock con aviso;
// en PRODUCCIÓN NO (mostraría las unidades de muestra como stock real).
export const USA_SUPABASE = env.VITE_DATOS !== 'mock' && (configurado || env.PROD)
```

Variables:

| Variable | Dónde | Para qué |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env.local` y Vercel | Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` (o `VITE_SUPABASE_ANON_KEY`) | `.env.local` y Vercel | Clave pública (es pública a propósito; protege la RLS) |
| `VITE_DATOS=mock` | solo local / scripts | Trabajar sin conexión |
| `SUPABASE_PRUEBA_EMAIL`, `SUPABASE_PRUEBA_CLAVE` | solo `.env.local`, **sin `VITE_`** | Cuenta admin de los scripts que escriben. Sin el prefijo, Vite nunca la mete en el sitio |

`.env.local` no se versiona (`*.local` en `.gitignore`). **Nunca** la clave
secreta ni la `service_role` en el sitio.

## El cliente perezoso

```ts
// src/data/supabase.ts
let pedido: Promise<SupabaseClient> | null = null

export function cliente(): Promise<SupabaseClient> {
  pedido ??= import('./cliente')
    .then((m) => m.supabase)
    .catch((e) => { pedido = null; throw e })   // que "reintentar" vuelva a intentar la descarga
  return pedido
}
export const BUCKET = 'vehiculos'   // acá y NO en cliente.ts: importarla de ahí traería la librería
```

`cliente.ts` hace `createClient(URL || 'https://sin-configurar.invalid', ...)`
con `persistSession: true`, `autoRefreshToken: true`,
`detectSessionInUrl: false` (no hay links mágicos). Así la librería viaja en
su propio archivo y no engorda el JS de arranque.

## Contenido compartido del sitio

`src/lib/contenido.ts` expone `useContenido()` y `useContacto()`. El home, el
menú, el footer y **todo botón de WhatsApp** leen de ahí: un único pedido
compartido (`useSyncExternalStore` sobre un estado de módulo) con
`Promise.allSettled` de contadores, servicios, preguntas, marcas y contacto.

- **Cada parte cae por su lado**: si una tabla falla, las otras se muestran.
- Lo que falla se queda con lo último bueno; si nunca hubo nada, con su
  respaldo: listas vacías (la sección no se dibuja) y **el contacto, con la
  semilla** (un WhatsApp con el número de siempre sirve más que uno muerto).
- **Reintenta solo** (4 veces, pausas crecientes de 3 s) y al volver la
  conexión (`online`). Sin cartel de error en la portada; el stock sí lo tiene.
- El panel llama a `olvidarContenido()` después de guardar: panel y sitio
  conviven en la misma pestaña.
