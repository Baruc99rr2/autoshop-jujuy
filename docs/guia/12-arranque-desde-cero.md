# 12 · Camino B: desde cero

Para cuando no hay acceso al repo original. Esta guía alcanza: los fragmentos
de código de las partes no obvias están en 02, 04, 05, 06 y 07; el SQL completo
en `supabase.sql`; el resto está descripto con sus reglas.

## El orden, y por qué

El original se construyó **diseño primero, datos después**, y pagó por eso:
reescrituras del modelo, la intro invisible detectada recién en la quinta fase
porque no había arnés, el mock que no aguantaba archivos. El orden propuesto
corrige eso:

1. **Andamiaje y arnés de verificación** antes de cualquier pantalla.
2. **Contrato de datos y mock** antes de las pantallas que los usan.
3. **Sitio público** sobre el mock, con un diseño mínimo.
4. **Panel** sobre el mock.
5. **Supabase** reemplazando el mock detrás de la misma interfaz.
6. **Diseño final**, cuando todo funciona.
7. **Seguridad, mobile y auditoría.**

Copiá `docs/guia/` al repo nuevo en la Fase 0: los prompts la citan.

Cada fase termina con: `npm run build`, `npm run lint`, el arnés, **capturas
revisadas**, commit y un reporte corto ("lo que esperaba / lo que vi / qué
hice"). No se arranca la siguiente sin OK.

## Fases y prompts

### Fase 0 · Andamiaje

```text
Leé docs/guia/README.md, 01 y 02 (stack, carpetas, rutas).
Creá el proyecto: Vite + React 19 + TypeScript, Tailwind v4 con @tailwindcss/vite
(tokens en @theme dentro de src/styles/globals.css, sin tailwind.config.js),
react-router 7 con BrowserRouter, oxlint, gsap + @gsap/react, lenis,
vite-plugin-svgr con svgo: false. Consultá la documentación actual de cada uno
antes de configurar.
- Estructura de carpetas de 02-arquitectura.md, vacía donde corresponda.
- Rutas: /, /catalogo, /vehiculo/:slug (o la ruta del rubro), /admin/* con
  lazy() y Suspense, y * (404).
- TransicionDeRuta con key={pathname} y limpieza de ScrollTrigger en
  useLayoutEffect; lib/smooth.ts con ignoreMobileResize, un solo ticker,
  sin Lenis con reduced-motion, initSmooth() en main.tsx antes del render.
- vercel.json con la reescritura y los encabezados de 04-seguridad.md.
- index.html con lang, viewport, theme-color, canonical y OG de placeholder.
- CLAUDE.md con el negocio, el stack, las reglas de 10-trampas.md y un bloque
  "Estado actual" de máximo 10 líneas.
Hacé solo esto y pará. Commit y reporte.
```

### Fase 1 · Arnés de verificación

```text
Leé docs/guia/09-pruebas.md.
Armá scripts/shots.mjs con Playwright: build con VITE_DATOS=mock a dist-mock/,
vite preview en un puerto fijo con --strictPort, capturas de cada ruta en 390 y
1440 a docs/shots/ (ignorada por git), medición de desborde horizontal, y un
pase offline que bloquee pedidos externos. Matar el servidor al final (en
Windows con taskkill /t). Salir con código 1 si algo falla.
Armá también scripts/responsivo.mjs como lo describe 09 (solapes por renglón,
desbordes, textos cortados, renglones largos; 8 anchos; --real en solo lectura
abortando todo lo que no sea GET).
Hacé solo esto y pará.
```

### Fase 2 · Contrato de datos y mock

```text
Leé docs/guia/02-arquitectura.md ("La capa de repositorio", "Modo de datos",
"El mock") y docs/guia/03-modelo-de-datos.md.
1. src/types/: Vehiculo (o la unidad del rubro), Foto, Video, Etiqueta (con
   enTarjeta opcional), contenido (Contadores, Servicio, Pregunta,
   DatosContacto) y las constantes (MAX_FOTOS, MAX_EN_TARJETA).
2. src/data/repo/tipos.ts con RepoVehiculos, RepoContenido, FiltrosVehiculos,
   OrdenVehiculos y ErrorRepo, tal cual la guía.
3. Mock: la ficha en localStorage con clave versionada, los archivos en
   IndexedDB con referencias idb:<clave>; mismas reglas que Supabase
   (soloPublicados por defecto, null al final en los órdenes, slug con
   desempate, renumerar listas).
4. Semilla con ids "demo-" y los casos: borrador, vendida, sin precio, una con
   10 fotos y muchas etiquetas, una con una sola foto. Contenido inicial.
5. data/modo.ts y repo/index.ts (con conSubida en las subidas).
6. lib/texto.ts (slugificar, plano), lib/formato.ts (precios es-AR, km, miles).
Hacé solo esto y pará.
```

### Fase 3 · Sitio público funcional (diseño mínimo)

```text
Leé docs/guia/06-sitio-publico.md entero.
Con un diseño provisorio y sobrio (el definitivo es la Fase 7):
- lib/contenido.ts (useContenido / useContacto: pedido compartido, cada parte
  cae por su lado, reintentos, olvidarContenido) y data/contacto.ts con
  numeroWhatsapp, whatsappUrl, telefonoHref, mapaEmbedUrl, comoLlegarUrl.
- nav.ts con SECCIONES, seccionesVisibles, MENU, FOOTER.
- Catálogo con chips fijos, búsqueda con retardo, orden, todo en la URL con el
  historial como dice la guía; recordarCatalogo en sessionStorage.
- Card, ficha (borrador = 404), galería, visor, video montado con la intención,
  WhatsApp con el link de la ficha, otros vehículos.
- Marcas desde los títulos, "+ gastos", mapa OSM + Cómo llegar.
- useTitulo y useCanonical; robots.txt y sitemap.xml.
- Esqueletos y ErrorCarga con "Probar de nuevo" en todo lo que carga.
`npm run shots` y `npm run responsivo`, mirá las capturas. Hacé solo esto y pará.
```

### Fase 4 · Panel: acceso, listado y formulario

```text
Leé docs/guia/05-panel.md y la sección "La sesión" de 04-seguridad.md.
- data/sesion.ts con la API de la guía (iniciarSesion, cerrarSesion,
  useSesion con useSyncExternalStore, avisoDeSalida, marcarSinGuardar). Por
  ahora solo el modo mock (entra cualquiera), dejando el lugar para Supabase.
- routes/Admin.tsx con rutas propias, Protegida (undefined → "Abriendo…",
  sin sesión → login con el destino en el state) y el meta noindex.
- Login, Marco (pestañas con antesDeIr), Listado (orden por actualizados,
  insignias, buscador, lista/grilla, títulos enteros).
- lib/provisoria.ts y NuevaUnidad con la promesa en un ref; Formulario con los
  campos a nivel de módulo, validación con foco al primer error, slug que sigue
  al título, CampoMiles con el cursor por cifras, cambios sin guardar
  (beforeunload + Dialogo nativo), borrado de la provisoria vacía al salir.
`npm run shots` con un pase del panel en 390. Hacé solo esto y pará.
```

### Fase 5 · Panel: fotos, video, etiquetas y contenido

```text
Leé docs/guia/05-panel.md ("Fotos", "Compresión", "Video", "Etiquetas",
"Contenido del sitio") y lib/subidas en 02.
- lib/archivos.ts: prepararFoto (EXIF, 1600 px, WebP < 250 KB, caída a JPEG),
  revisarVideo (tipo y 25 MB con mensaje), posterDeVideo (no falla: undefined).
- Fotos con cola visible y reintento, reordenar con flechas, guardan al instante.
- Video con reemplazo y póster de respaldo.
- Etiquetas que se guardan con el formulario, sugerencias, foto de fondo
  elegida, «Mostrar en la tarjeta» con tope 2 explicado.
- /admin/contenido con useBloque por bloque, números de sección de la web,
  useEnfocarNueva, contacto validado.
El pase del panel tiene que medir el peso real de cada foto guardada y que
ningún control mida menos de 44 px. Hacé solo esto y pará.
```

### Fase 6 · Supabase

```text
Leé docs/guia/04-seguridad.md, docs/guia/supabase.sql y 02 ("El cliente
perezoso").
1. supabase/supabase.sql (copia del de la guía con el contenido del negocio) y
   supabase/PASOS.md con los pasos manuales. Decime qué tengo que hacer yo;
   NO inventes claves.
2. data/supabase.ts (cliente() con import dinámico) y data/cliente.ts.
3. repo/supabase.ts y repo/supabase-contenido.ts con la misma interfaz que el
   mock y las reglas de la guía: publicado a mano, .select('id') en cada
   update/delete, UPDATE fila por fila en filas fijas, archivos borrados
   después de la fila y por carpeta, póster compartido, tolerancia a una
   columna faltante, slug libre con reintento por 23505.
4. repo/errores.ts (traducir por código) y la sesión real con es_admin,
   HABIA_SESION y sesionVencida.
5. scripts/entorno.mjs, semilla.mjs y recorrido.mjs.
Cuando te confirme los pasos manuales: semilla, recorrido y responsivo --real.
Hacé solo esto y pará.
```

### Fase 7 · Diseño definitivo

```text
Leé docs/guia/01-reemplazar-y-conservar.md y 07 ("Foco visible sobre formas
recortadas").
Diseño: <paleta con roles>, <tipografía variable>, <forma>, <gesto único>,
<referencias en docs/refs/>, <¿intro?>.
Aplicalo al sitio y al panel (el panel: claridad antes que efecto). Fuente
autoalojada con preload y fallback medido. Si la forma recorta, anillo de foco
hacia adentro. Si hay intro: solo si entró por /, una vez por sesión, nunca con
reduced-motion, timeline con targets inyectados y su check de duración.
Conservá todos los comportamientos de 06 y 07.
`npm run shots` y `npm run responsivo`, mirando 360, 390, 1024, 1440 y 2560.
Hacé solo esto y pará.
```

### Fase 8 · Seguridad, mobile y auditoría

```text
Leé docs/guia/04 ("Cierre por inactividad", "Encabezados", "Noindex"), 07 y 09.
1. lib/inactividad.ts + AvisoInactividad en Protegida; cerrarPorInactividad
   con la marca entre pestañas y el aviso de cambios sin guardar.
2. Noindex del panel en tres capas.
3. Auditoría del arnés: reduced-motion, táctil (hover: none), barra del
   navegador (844 → 780 sin que nada se mueva), teclado midiendo el anillo en
   píxeles, offline.
4. Recorré 10-trampas.md y confirmá una por una las que aplican.
Deploy de preview en Vercel: consola sin violaciones del CSP, X-Robots-Tag en
/admin. Reporte por ancho y por trampa. Hacé solo esto y pará.
```
