# Guía para replicar el sitio en otro negocio

Esta guía describe un sitio en producción —catálogo de unidades con panel de
carga— para construir otro igual **para otro negocio y con otro diseño**. Está
escrita para una sesión de Claude (o una persona) que **no tiene acceso al repo
original**: todo lo que hace falta saber está acá.

El sitio: vidriera de un negocio que vende unidades (en el original, autos 0km
y usados). Muestra el catálogo con fotos y precio, y el detalle de cada unidad
se resuelve por WhatsApp: no hay carrito, ni cotizador, ni pagos. La dueña
carga y edita todo desde un panel en `/admin`, casi siempre desde el celular.

## Orden de lectura

| # | Archivo | Qué hay |
|---|---|---|
| 1 | [01-reemplazar-y-conservar.md](01-reemplazar-y-conservar.md) | La frontera: qué es estética del original (se reemplaza) y qué es sistema (se conserva). **Leer primero.** |
| 2 | [02-arquitectura.md](02-arquitectura.md) | Stack con versiones, carpetas, rutas, la capa de repositorio y el modo de datos. |
| 3 | [03-modelo-de-datos.md](03-modelo-de-datos.md) | Tipos, tablas, reglas de cada campo. |
| 4 | [supabase.sql](supabase.sql) | El SQL completo, en un solo archivo, listo para pegar. |
| 5 | [04-seguridad.md](04-seguridad.md) | RLS política por política, admins, bucket, sesión, inactividad, CSP, noindex y los pasos manuales en Supabase y Vercel. |
| 6 | [05-panel.md](05-panel.md) | El panel función por función. |
| 7 | [06-sitio-publico.md](06-sitio-publico.md) | Catálogo, ficha, WhatsApp, marcas, precios, mapa, SEO. |
| 8 | [07-responsividad-y-mobile.md](07-responsividad-y-mobile.md) | Anchos, 44 px, foco, `svh`, la barra del navegador de WhatsApp, flotantes. |
| 9 | [08-rendimiento.md](08-rendimiento.md) | Carga diferida, fuentes, imágenes, video. |
| 10 | [09-pruebas.md](09-pruebas.md) | Qué hace cada script de verificación y cómo adaptarlo. |
| 11 | [10-trampas.md](10-trampas.md) | **Lo más valioso**: todo lo que se rompió y por qué. |
| 12 | [11-arranque-plantilla.md](11-arranque-plantilla.md) | Camino A: partir del repo original como plantilla. Fases y prompts. |
| 13 | [12-arranque-desde-cero.md](12-arranque-desde-cero.md) | Camino B: construir desde cero. Orden, fases y prompts. |

Si vas a trabajar ya, el mínimo es: **01 → 10 → el camino que corresponda (11 o
12)**, y consultar el resto a medida que cada fase lo pida.

## Convenciones de esta guía

- **"El negocio"** es el cliente nuevo; **"la dueña"** es quien carga el
  panel (en el original es una mujer, y los textos del panel le hablan en
  femenino: «Seguir conectada». Ajustalo a quien corresponda).
- **"Unidad"** es lo que se vende. En el original es un vehículo y el código
  dice `Vehiculo`, `vehiculos`, `/vehiculo/:slug`. Si el negocio nuevo vende
  otra cosa, ver la sección "Si no son autos" de [03](03-modelo-de-datos.md).
- Placeholders: `<dominio>` (ej. `https://minegocio.com`),
  `<prefijo>` (prefijo de las claves de `localStorage`, ej. `minegocio`),
  `https://<proyecto>.supabase.co`, `tu-email@ejemplo.com`,
  `+54 9 11 0000-0000`. **Ningún dato real del original aparece en la guía.**
- Los nombres de archivo y de función citados son los del original. En el
  camino A existen tal cual; en el camino B son la propuesta.
- Español rioplatense, voseo, y la misma regla para los textos del sitio: frases
  cortas y concretas, botones que dicen qué pasa.

## Reglas de trabajo que vienen con el proyecto

Estas no son técnicas, pero sin ellas el resultado no es el mismo:

1. **Una fase por vez.** Al terminar una fase: build, lint, chequeos, commit,
   y un reporte corto. No se encadenan fases sin OK.
2. **La verificación visual es parte de terminar.** Build y lint en verde no
   alcanzan: en el original, cuatro fases pasaron todo y la intro era invisible
   (un panel negro la tapaba desde el primer frame). Se corre el arnés de
   capturas y **se miran las imágenes**. Lo que se puede medir —desborde,
   solapes, si cargó la fuente— se mide con un script en vez de mirarlo.
3. **Reportar con la forma "lo que esperaba / lo que vi / qué hice"**, y decir
   lo que está mal en vez de maquillarlo.
4. **Un `CLAUDE.md` en la raíz** con un bloque "Estado actual" de máximo 10
   líneas, que se reemplaza entero al terminar cada parte, más las reglas que
   se rompen en silencio (las de [10-trampas.md](10-trampas.md) que apliquen).
