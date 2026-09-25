# AUTOSHOP JUJUY — Sitio web

Sitio de **Automotores AutoShop Jujuy**, concesionaria de 0km y usados en San Salvador de Jujuy, Argentina. Está en producción: la dueña quiere la web por el diseño y para mostrar el catálogo. El detalle de cada auto se resuelve por WhatsApp; no hay ficha técnica, cotizador ni financiación.

## Estado actual

> Este bloque lo actualiza Claude Code al terminar cada parte. Reemplazalo entero, no agregues: máximo 10 líneas.

- Rutas: `/`, `/catalogo`, `/vehiculo/:slug`, `/admin/*` (lazy) y 404; la intro corre solo si la pestaña ENTRÓ por `/`. Título y meta description por página con `useTitulo(titulo, descripcion)`.
- Datos: `data/modo.ts` elige Supabase (`VITE_SUPABASE_URL` + clave) o el mock (`VITE_DATOS=mock`); en prod sin claves NO cae al mock. Cliente solo vía `cliente()` de `data/supabase.ts` (nunca `data/cliente.ts` directo). Errores → `repo/errores.ts`.
- Supabase: esquema en `supabase/schema.sql`. El repo filtra `publicado` A MANO; archivos en `<vehiculo_id>/...` y se borran a mano. `data/sesion.ts`: Supabase Auth + `es_admin()`; `useSesion()` es `undefined` mientras lee.
- Datos de prueba: ids `demo-`; `npm run semilla -- borrar` los saca de Supabase. Sus fotos son `public/img/vehiculos/car-*.webp` (borrables cuando no quede ninguna `demo-`).
- Todo lo que carga tiene esqueleto y `ErrorCarga`. `npm run shots` compila en mock a `dist-mock/`; `npm run recorrido` va contra Supabase real. Credenciales `SUPABASE_PRUEBA_*` en `.env.local`.
- Mueble fijo de abajo: el contenedor de MENU apila `encima` (prop `barra` de `PaginaInterna`); la ficha pone ahí su barra de WhatsApp mobile, que solo aparece si el botón del panel de precio no está libre (`useBotonLibre`): UN WhatsApp visible por vez. Escondidos van `inert`.
- Piso táctil: todo control ≥ 44 px, sitio y panel (medido en 360/390/768/1440). Links de texto: padding + margen negativo. `html` tiene `scroll-padding-block` para que el Tab no quede bajo header/MENU. En `Bevel variant="outline"` el TAMAÑO va en `outerClassName`.
- `/admin` listado: lista o grilla (2 col mobile), en localStorage `autoshop.panel.vista`. `/catalogo`: chips + buscador en la URL, vista en `autoshop.catalogo.vista`.
- Íconos: `favicon.svg`/`.ico` (bandera a cuadros geométrica, negro sobre ámbar), `apple-touch-icon.png`, `icon-192/512.png` + `manifest.webmanifest`. El Flip de la intro apunta al `<svg>` del logo, no al enlace.
- Malla quieta de rectas (sin filtro, sin `<pattern>`). Pendiente: en el riel del inicio una card a veces pinta la foto en negro (headless).

---

## Stack

| Área | Elección |
|---|---|
| Build | Vite + React 19 + TypeScript |
| Estilos | Tailwind CSS v4 (`@theme` en CSS) |
| Rutas | react-router — `/`, `/catalogo`, `/vehiculo/:slug`, `/admin` (lazy) |
| Scroll | Lenis, en el mismo ticker que GSAP |
| Animación | GSAP + ScrollTrigger + Flip, con `@gsap/react` |
| Datos | Supabase (Postgres + Auth + Storage) detrás de la interfaz de `src/data/repo/`; mock en localStorage con `VITE_DATOS=mock` |
| Deploy | Vercel, conectado a GitHub. `vercel.json` reescribe todo a `/index.html` |

`motion` se sacó: era el 25% del JS para una sola animación. No se vuelve a agregar.

Reglas que se rompen en silencio:
- `ScrollTrigger.config({ ignoreMobileResize: true })` y altos de pantalla en `svh`, nunca `vh` ni `dvh`: sin eso, la barra del navegador de WhatsApp empuja toda la página.
- Al cambiar de ruta, limpiar Lenis y todos los ScrollTrigger de la página anterior.
- La intro solo corre en `/`.
- `vite-plugin-svgr` con SVGO desactivado: si no, borra los ids del logo.
- El `\` en pseudo-elementos va como `\005C`; escrito a mano rompe el parser de Tailwind v4.

## WhatsApp

Número: `5493884652485` (formato `wa.me`, sin `+` ni espacios). Vive en UNA constante en `src/data/contacto.ts`. Todos los botones y mensajes salen de ahí.

## El logo

`src/assets/logo.svg`, importado como componente. 50 paths, `fill-rule="evenodd"`. Grupos: `#lg-word` (con `#lg-automotores`, `#lg-auto`, `#lg-shop`, `#lg-jujuy`) y `#lg-flag` (7 paths, ordenados de izquierda a derecha). Colores parametrizados con `--logo-white` y `--logo-yellow`. `npm run check` verifica los ids.

---

## Sistema de diseño

### Color

```css
--color-void:     #000000;  /* fondo base */
--color-asphalt:  #0D0E10;  /* superficies y cards */
--color-graphite: #1B1D20;  /* bordes, estados apagados */
--color-amber:    #FDB916;  /* acento único, sampleado del logo */
--color-filament: #FFF0C4;  /* solo dentro de gradientes y glow */
--color-bone:     #FEFDF8;  /* texto sobre oscuro, fondo de secciones claras */
--color-flag:     #FF3B1F;  /* señales: stock reservado/vendido y errores de validación */
```

- Un solo amarillo: `--color-amber`. Significa "activo": hover, foco, elegido.
- `--color-flag` nunca decora; solo avisa.
- Texto sobre ámbar: siempre negro.

### Tipografía

- **Archivo** variable (autoalojada) — todo el texto. Titulares en ancho extendido (`wdth` 112–125, `wght` 700).
- **Martian Mono** — solo cifras: precio, año, km, contadores, índices. Nunca en labels ni texto corrido.

### Layout y forma

- Canvas negro, riel izquierdo fijo (56px desktop, 16px mobile) con el marcador `\` y el índice de sección. Alineación a la izquierda.
- **Todo lo que tenga borde es biselado**: componente `<Bevel variant="solid"|"outline"|"ghost">`. Si aparece un `border-radius`, está mal.
- El gesto compartido es el **barrido ámbar de izquierda a derecha** (`scaleX` desde `transform-origin: left`, 0.45s, `cubic-bezier(.65,0,.35,1)`, texto con `transition-delay: .12s`). Ya está implementado en FAQ y post-venta: reusalo, no lo reinventes.
- Movimiento disparado por el usuario: generoso. Movimiento automático al scrollear: con cuentagotas.

### El panel (/admin)

Lo usa la dueña, probablemente desde el celular. Se diseña primero para 390px. Mismo sistema visual, pero claridad antes que efecto: sin intro, sin malla, sin animaciones decorativas, textos y botones grandes.

---

## Piso de calidad

- Responsive desde 360px. Nada que dependa solo del hover.
- `prefers-reduced-motion` respetado.
- Foco de teclado visible (sobre biseles se dibuja con `drop-shadow`, porque `clip-path` recorta el `outline`).
- Animar solo `transform`, `opacity` y `clip-path`.
- `width` y `height` explícitos en cada `<img>`. Imágenes en WebP, < 250 KB.
- Video con `preload="none"` salvo el del hero.

## Contenido

Español rioplatense, voseo, frases cortas y concretas. Los botones dicen qué pasa. Nada de lorem ipsum. Los vehículos se nombran por lo que realmente son. Los datos de prueba se borran cuando la dueña cargue los reales; que sean fáciles de identificar.
