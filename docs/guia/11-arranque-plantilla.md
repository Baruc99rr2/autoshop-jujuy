# 11 · Camino A: el repo original como plantilla

Para cuando se tiene una copia del repo original. Es el camino más corto:
todo el sistema (datos, panel, seguridad, pruebas) ya funciona, y el trabajo es
**cambiar la identidad y el diseño sin tocar la lógica**.

## Qué se conserva, qué se vacía, qué se reemplaza

| Ruta | Acción |
|---|---|
| `src/data/repo/`, `src/data/modo.ts`, `supabase.ts`, `cliente.ts`, `sesion.ts` | **Conservar** |
| `src/lib/` | **Conservar** (salvo lo de la intro si se saca) |
| `src/types/` | **Conservar**; ajustar `ICONOS_SERVICIO` a los íconos nuevos |
| `src/routes/` | **Conservar** la lógica; adaptar textos y markup al diseño |
| `src/components/admin/` | **Conservar** la lógica; restyling con los tokens nuevos |
| `src/components/` (sitio) | **Reestilizar o reemplazar** según [01](01-reemplazar-y-conservar.md); conservar comportamientos |
| `src/styles/globals.css` | **Reescribir** tokens, `@font-face`, utilidades, forma; **conservar** foco, reduced-motion, `shell` con tope, `.mapa-oscuro` (ajustado) |
| `src/assets/logo.svg` | **Reemplazar** |
| `src/data/hero.ts`, `nav.ts`, `contacto.ts`, `marcas.ts`, `catalogo.ts`, `sitio.ts` | **Reemplazar el contenido**, conservar la forma |
| `src/data/repo/semilla.ts`, `semilla-contenido.ts` | **Reemplazar** con datos de muestra del negocio nuevo (ids `demo-`) |
| `public/img/`, `public/video/`, `public/fonts/` | **Vaciar** y cargar lo del negocio nuevo |
| `public/*.png`, `favicon.*`, `manifest.webmanifest`, `robots.txt`, `sitemap.xml` | **Reemplazar** |
| `index.html` | **Reemplazar** textos, dominio, OG, preload de la fuente |
| `vercel.json` | **Conservar** (revisar el CSP si se agrega algún servicio) |
| `supabase/` | **Reemplazar** por `docs/guia/supabase.sql` (y un `PASOS.md` con [04](04-seguridad.md)) |
| `scripts/` | **Conservar** y adaptar ([09](09-pruebas.md)) |
| `docs/refs/`, `docs/shots/`, `docs/qr/`, `docs/ASSETS.md`, `NOTAS.md`, `docs/BACKLOG.md` | **Borrar** (son del original) |
| `docs/guia/` | **Conservar** (es esta guía) |
| `CLAUDE.md` | **Reescribir** para el negocio nuevo |

## Buscar y reemplazar

Correr una búsqueda sin distinguir mayúsculas de cada término y revisar **cada**
resultado (no reemplazar a ciegas: algunos están en comentarios que explican una
decisión y conviene reescribirlos).

| Buscar | Por | Dónde suele aparecer |
|---|---|---|
| el nombre comercial del original (y su nombre legal) | el del negocio nuevo | `contacto.ts` (`NEGOCIO`), `index.html`, `manifest`, `titulo.ts`, `Header`, `Footer`, `Logo`, scripts |
| la ciudad y provincia del original | las nuevas | `contacto.ts`, `hero.ts`, `nav.ts`, semillas, textos de ayuda del panel |
| el dominio del original | `<dominio>` | `sitio.ts`, `index.html`, `robots.txt`, `sitemap.xml` (**los cuatro**) |
| el prefijo de las claves de storage (`<viejo>.`) | `<prefijo>.` | `sesion.ts`, `inactividad.ts`, `ultimo-catalogo.ts`, `Catalogo.tsx`, `Listado.tsx`, `mock*.ts`, `blobs.ts` (nombre de la base de IndexedDB), scripts |
| el teléfono / WhatsApp / mail del original | placeholders | `semilla-contenido.ts`, `types/contenido.ts` (comentarios), ayudas de `BloqueContacto.tsx` |
| las redes sociales del original | las nuevas | `REDES` en `contacto.ts` |
| `"name"` en `package.json` | el del proyecto | `package.json` |
| ids del logo (`lg-…`) | los del logo nuevo, o borrar | `check-logo.mjs`, `Intro.tsx`, `intro-timeline.ts`, `Logo.tsx` |
| textos en femenino para la dueña ("conectada") | lo que corresponda | `AvisoInactividad.tsx`, `Login.tsx`, mensajes de `sesion.ts` |
| "+ gastos" | lo que corresponda al negocio (o nada) | `MAS_GASTOS` en `lib/formato.ts` |
| la normalización de celulares argentinos | la del país | `numeroWhatsapp()` en `contacto.ts` |

Al terminar, una última búsqueda de cada término del original tiene que dar
**cero** resultados fuera de `docs/guia/`.

## Fases

Una fase por vez. Cada una termina con: `npm run build`, `npm run lint`, los
chequeos que correspondan, **capturas revisadas**, commit, y un reporte corto
("lo que esperaba / lo que vi / qué hice"). No se arranca la siguiente sin OK.

### Fase 0 · Copia limpia

```text
Copiá el repo original a un repo nuevo SIN su historial: es otro cliente.
1. Clon superficial, borrá .git, `git init`, primer commit "plantilla".
2. Borrá docs/refs, docs/shots, docs/qr, docs/ASSETS.md, NOTAS.md, docs/BACKLOG.md
   (lo que exista). Conservá docs/guia.
3. `npm install`, `npm run build`, `VITE_DATOS=mock npm run dev`: tiene que andar
   igual que el original con el mock.
4. Reescribí CLAUDE.md: qué es el negocio nuevo, el stack, las reglas de
   docs/guia/10-trampas.md que aplican, y un bloque "Estado actual" de máximo
   10 líneas. Sin datos del cliente anterior.
Hacé solo esto y pará. Commit y reporte corto.
```

### Fase 1 · Identidad del negocio (sin tocar el diseño)

```text
Leé docs/guia/11-arranque-plantilla.md (tabla "Buscar y reemplazar") y
docs/guia/06-sitio-publico.md (SEO y WhatsApp).
Datos del negocio nuevo: <nombre>, <nombre legal>, <ciudad>, <provincia>,
<dominio>, <redes>, <prefijo de storage>.
1. Reemplazá cada término de la tabla, revisando resultado por resultado.
2. Dominio en los cuatro lugares (sitio.ts, index.html, robots.txt, sitemap.xml).
3. Semillas: reemplazá las unidades de muestra (ids "demo-", casos: un borrador,
   una vendida, una sin precio, una con 10 fotos, una con una sola foto) y el
   contenido inicial, con placeholders verosímiles del rubro. Nada de lorem ipsum.
4. Subí la versión de la clave del mock (…vehiculos.vN) porque cambió la semilla.
5. Si el país no es Argentina, reescribí numeroWhatsapp() y su validación.
Al final, una búsqueda de cada término del original tiene que dar cero
resultados fuera de docs/guia/. Build, lint, `npm run shots`, mirá las
capturas. Hacé solo esto y pará. Commit y reporte.
```

### Fase 2 · Supabase propio

```text
Leé docs/guia/04-seguridad.md y docs/guia/supabase.sql.
1. Reemplazá supabase/ por: supabase.sql (copia de docs/guia/supabase.sql con
   el contenido inicial del negocio en los REEMPLAZAR) y un PASOS.md con los
   pasos manuales de 04-seguridad.md (Supabase, local, Vercel).
2. Si los íconos de servicio van a cambiar, que la lista del check del SQL y
   ICONOS_SERVICIO coincidan.
3. Decime qué pasos manuales tengo que hacer yo (crear proyecto, correr el SQL,
   apagar el registro, crear mi usuario con Auto Confirm, insertarme en admins,
   copiar URL y publishable key a .env.local). NO inventes claves.
Cuando te confirme que están hechos: `npm run semilla -- subir`,
`npm run recorrido` (contra el proyecto nuevo) y `npm run responsivo -- --real`.
Reportá los resultados tal cual. Hacé solo esto y pará.
```

### Fase 3 · Sistema de diseño

```text
Leé docs/guia/01-reemplazar-y-conservar.md y la sección "Foco visible sobre
formas recortadas" de docs/guia/07-responsividad-y-mobile.md.
Diseño nuevo: <paleta con roles: fondo, superficie, borde, acento=activo,
señal=vendido/errores, texto>, <tipografía: familia variable>, <forma de las
cajas>, <gesto de interacción único>, <referencias en docs/refs/>.
1. Reescribí los tokens de @theme, @font-face (autoalojada con sync-fonts,
   preload con crossorigin, fallback con métricas MEDIDAS) y las utilidades
   tipográficas, conservando los nombres de rol si podés (font-hud, num…).
2. Reemplazá el componente de forma (Bevel) por el del diseño nuevo, con la misma
   API de variantes; si recorta, adaptá el anillo de foco hacia adentro.
3. Decidí con el diseño: ¿intro?, ¿riel?, ¿malla? Lo que no va, se borra entero
   (componente, CSS, scripts, marcas de sessionStorage).
4. Conservá: reduced-motion con 0s, shell con tope, scroll-padding, 44 px.
Build, lint, `npm run shots`, mirá las capturas. Hacé solo esto y pará.
```

### Fase 4 · El inicio

```text
Leé docs/guia/06-sitio-publico.md ("Inicio") y docs/guia/07 entero.
Rehacé con el diseño nuevo: header, hero (video a sangre con póster y versión
mobile aparte, o lo que defina el diseño), las secciones de nav.ts, menú,
flotante de WhatsApp y footer (mapa OSM + Cómo llegar).
Conservá los comportamientos: numeración desde nav.ts y secciones vacías que se
ocultan y renumeran, sección activa por la mitad del viewport, useContenido/
useContacto, un solo WhatsApp visible, flotantes que se apartan del footer,
menú y header inert, nada solo con hover.
Build, lint, `npm run shots` y `npm run responsivo`; mirá 360, 390, 1440 y 2560.
Hacé solo esto y pará.
```

### Fase 5 · Catálogo y ficha

```text
Leé docs/guia/06-sitio-publico.md ("Catálogo", "La card", "Ficha", "Precios").
Rehacé con el diseño nuevo la card, el catálogo, la ficha, la galería, el visor y
el video. No toques: filtros/búsqueda/orden en la URL y su historial, vendidos al
final, volver al catálogo con los filtros, borrador = 404, video montado recién
con la intención, precio con fit-text, mensaje de WhatsApp con el link de la
ficha, botón libre/barra de mobile.
Probá con títulos LARGOS reales. Build, lint, `npm run responsivo` (mock y
--real), `npm run shots`. Hacé solo esto y pará.
```

### Fase 6 · Panel

```text
Leé docs/guia/05-panel.md.
Aplicá el diseño nuevo al panel SIN tocar su lógica: claridad antes que efecto,
390 px primero, 44 px, sin decoración, barras de guardar opacas, títulos enteros.
Revisá textos dirigidos a la usuaria (género, tono).
Build, lint, `npm run shots -- --panel` (mirá cada paso), `npm run recorrido`.
Hacé solo esto y pará.
```

### Fase 7 · Auditoría y entrega

```text
Leé docs/guia/09-pruebas.md y docs/guia/10-trampas.md.
1. `npm run responsivo` (mock, --real, --movimiento), `npm run shots` completo
   (anchos, reduced-motion, táctil, barra del navegador, teclado, offline).
   Arreglá lo que aparezca y volvé a medir.
2. Deploy de preview en Vercel con las variables: revisá la consola por
   violaciones del CSP y que /admin tenga X-Robots-Tag.
3. Opcional: `npm run qr` para el dominio nuevo.
4. `npm run semilla -- borrar` cuando la dueña tenga cargadas las reales.
Reporte: qué había en cada ancho, qué cambiaste, qué queda pendiente.
```
