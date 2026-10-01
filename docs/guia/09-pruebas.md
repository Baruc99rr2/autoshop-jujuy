# 09 · Pruebas

No hay tests unitarios: hay **scripts que levantan el sitio en un navegador real
y miden**. La regla del proyecto: si algo se puede medir (desborde, solapes, si
cargó la fuente, si el foco se ve, cuánto pesa una foto subida), se mide; y lo
que no, se captura y **se mira**.

Patrón común a todos los que usan navegador: compilan (`tsc -b` + `vite build`
a una carpeta propia), levantan `vite preview` en un puerto fijo con
`--strictPort`, manejan Chromium con Playwright, y al terminar matan el servidor
(en Windows con `taskkill /pid … /f /t`, porque matar `npx` no mata al hijo que
escucha el puerto). Salen con código 1 si algo obligatorio falla.

## Los scripts

| Comando | Qué hace | Contra qué |
|---|---|---|
| `npm run check` | `check-logo.mjs` + `check-intro.mjs` | Archivos |
| `npm run shots` | Arnés de capturas + auditoría | Mock (`dist-mock/`) |
| `npm run shots -- --panel` | Solo el recorrido del panel en 390 px | Mock |
| `npm run responsivo` | Solapes, desbordes y textos cortados en 8 anchos | Mock + unidad "estresada" |
| `npm run responsivo -- --real` | Lo mismo con los datos reales, **solo lectura** | Supabase (`dist-real/`) |
| `npm run recorrido` | Alta → fotos → video → publicar → ver como visitante → borrar | **Supabase real** (escribe) |
| `npm run semilla -- subir \| borrar` | Carga o borra las unidades de muestra (`demo-`) | **Supabase real** (escribe) |
| `npm run fonts` | Copia el `.woff2` a `public/fonts/` | — |
| `npm run qr` | QR del sitio + verificación con dos lectores (opcional) | — |
| `npm run lint` / `npm run build` | `oxlint` / `tsc -b && vite build` | — |

### `check-logo.mjs`

Si el logo se anima por ids, verifica que estén todos (y en el orden que la
animación asume). Si alguien prende SVGO o reemplaza el SVG por el que manda el
cliente, los ids se pueden ir **sin que el build falle**. Adaptar: la lista de
ids del logo nuevo, o borrar si no se anima.

### `check-intro.mjs`

Mide la **duración real de la timeline de la intro sin navegador**: GSAP anima
objetos planos igual que nodos, y la duración solo depende de posiciones y
duraciones. La timeline se escribe como función que **recibe los targets y el
paso de Flip inyectados** (`buildIntroTimeline(targets, { flip, laserDistance })`),
así el script la construye con `{}` y lee `tl.duration()` contra un techo.
Node ≥ 22 importa el `.ts` directo. Adaptar: a la intro nueva, o borrar.

### `shots.mjs` (+ `auditoria.mjs`, `panel.mjs`)

Siempre **contra el mock** (`VITE_DATOS=mock`), en `dist-mock/`: las capturas
no pueden depender de la red ni escribir en la base. `--fast` reusa el build.
Todo va a `docs/shots/` (ignorada por git).

- **Intro** muestreada cada 200 ms durante 3 s, con el tiempo **real** en el
  nombre del archivo (sacar un PNG cuesta decenas de ms; el nombre nominal
  mentiría), con un disparo en vacío antes para calentar la captura. Y
  "congelada" en momentos clave (beats).
- **Páginas** en 390 y 1440: secciones, catálogo, ficha, 404, panel.
- **Pase offline**: bloquea todo pedido externo y exige que no haya ninguno y
  que la fuente cargue igual.
- **Auditoría**:
  - *anchos*: desborde horizontal y elementos al filo;
  - *reduced-motion*: recorre todo con el flag y comprueba que el contenido
    esté (logo en el header, contadores en su valor final, marquesina legible);
  - *táctil*: contexto `hasTouch` (pone `hover: none`) y verifica que nada
    quede inaccesible por depender del hover;
  - *barra del navegador*: achica el alto de 844 a 780 en tres puntos y exige
    que scroll, alto del documento y un elemento de referencia no se muevan;
  - *teclado*: Tab desde el principio, anota la secuencia de foco y **mide el
    anillo en píxeles** (captura con y sin foco).
- **Panel** (`panel.mjs`, 390 px): el camino entero de la dueña con sesión
  inyectada en `localStorage`: nueva unidad, **subir seis fotos dibujadas en un
  canvas de 2400×1600 con ruido** (más grandes que el tope para que la
  compresión trabaje, y con ruido para que el peso medido sea realista),
  reordenar, borrar, video, etiquetas, guardar, borrar la unidad; contenido del
  sitio. Mide el **peso real** de cada archivo guardado (leyendo IndexedDB), si
  pintaron las miniaturas, desborde y **controles por debajo de 44 px**.

### `responsivo.mjs`

Ocho anchos (360 a 2560×1440), cada página: inicio, catálogo (lista y grilla),
**todas las fichas**, 404, login, y con el mock también el panel (listado,
contenido, edición). Mide **dentro de la página**:

1. **Solapes**: renglón por renglón (`Range.getClientRects()` de cada nodo de
   texto), recortado por cada ancestro que recorta (incluido el propio
   elemento: un `sr-only` o un `line-clamp` se recortan a sí mismos), achicado
   a la zona de la tinta (la caja de la fuente es más alta que las letras), y
   comparando textos de **bloques distintos**. Lo fijo contra el flujo solo
   cuenta arriba (el mueble de abajo tapa contenido por diseño); las barras
   `sticky` cuentan como fijas.
2. **Desborde**: página más ancha que el viewport o un elemento que se sale sin
   nadie que lo recorte.
3. **Textos cortados**: un renglón recortado a medias, un `text-overflow:
   ellipsis` que se come letras, un `line-clamp` que esconde renglones (los
   carruseles que se scrollean no cuentan).
4. **Renglones largos**: más de ~100 caracteres por línea.

Con el mock inyecta una **unidad estresada**: título real largo, precio de nueve
cifras y las dos etiquetas de tarjeta con rótulos largos (la zona más apretada
de la card). Con `--real` usa los datos reales y **aborta todo pedido a Supabase
que no sea GET/HEAD/OPTIONS** (no puede escribir aunque una página lo intente).
Por defecto mide con `reducedMotion: 'reduce'` (estado final, sin animaciones a
mitad); `--movimiento` mide con movimiento normal. `--shots` guarda una captura
por página y ancho; `--solo=<texto>` filtra.

### `recorrido.mjs`

**Escribe en la base y el bucket de verdad** con la cuenta de prueba
(`SUPABASE_PRUEBA_*`, ver `entorno.mjs`). Crea una unidad, sube fotos y video, la
publica, la mira como visitante, la despublica, la borra y **comprueba que no
quedó ningún archivo** en su carpeta; si falla a la mitad, igual barre lo que
creó. Además mide lo que no se ve si está mal: **que un borrador no se pueda
leer sin sesión ni conociendo su id**, y que cada pantalla que carga tenga su
cartel de error con "probar de nuevo" cuando se corta la red. Contra un
proyecto de pruebas si existe; si es el de producción, saber que escribe.

### `semilla.mjs`

`subir` borra las de muestra y vuelve a cargar las de `src/data/repo/semilla.ts`
(las mismas del mock); `borrar` saca exactamente las `demo-` con todo lo suyo
(en cascada) y vacía sus carpetas del bucket. Lo cargado por la dueña tiene
uuid y no se toca. Las fotos de muestra apuntan a archivos del sitio
(`/img/vehiculos/…`), no al bucket.

### `qr.mjs` (opcional)

Genera el QR del dominio en SVG (todo en curvas, el texto incluido) y PNG de
4096 px, y **lo decodifica con dos lectores** (jsQR y ZXing) limpio y castigado
(200 px, desenfoque, velo de sol, reflejo, despintado). Lecciones en T35.

## Cómo adaptarlos

Buscar y cambiar en `scripts/`:

- **Rutas**: `/vehiculo/` si la ruta pública cambia.
- **Ids de sección** que se usan como paradas (`contadores`, `vehiculos`,
  `contacto`, `marcas`…), con los de `nav.ts` nuevo.
- **Claves de `localStorage`/`sessionStorage`**: `<prefijo>.sesion.v1`,
  `<prefijo>.vehiculos.v4` (y su versión), `<prefijo>.catalogo.vista`,
  `<prefijo>.panel.vista`, `<prefijo>.panel.actividad`, `intro-seen`; la base de
  IndexedDB `<prefijo>-archivos`.
- **Textos de botones** que el recorrido del panel toca ("Nueva unidad",
  "Guardar", "Borrar la unidad"…): Playwright los encuentra por rol y nombre.
- **Selectores de la estética vieja** (clases `bevel`, `veh-card`, `.num`): si el
  diseño cambia, preferí `data-*` o roles.
- **La intro**: si no hay, sacar `capturarIntro`, `capturarBeats`,
  `esperarFinDeIntro` y la marca `intro-seen`.
- **Puertos** (4317, 4318, 4319…) si chocan con algo.

## Cuándo se corre cada uno

| Momento | Qué |
|---|---|
| Cada cambio | `npm run lint`, `npm run build` |
| Al cerrar una fase | `npm run shots` **y mirar las capturas**; `npm run check` |
| Cambios de layout, textos largos, CSS | `npm run responsivo` (y `-- --real` si hay datos reales) |
| Cambios en el repo de Supabase, SQL o sesión | `npm run recorrido` |
| Antes de entregar a la dueña | `npm run semilla -- borrar` |
