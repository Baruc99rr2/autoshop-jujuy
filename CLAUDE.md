# AUTOSHOP JUJUY — Sitio web

Sitio de **Automotores AutoShop Jujuy**, concesionaria de 0km y usados en San Salvador de Jujuy, Argentina. Está en producción: la dueña quiere la web por el diseño y para mostrar el catálogo. El detalle de cada auto se resuelve por WhatsApp; no hay ficha técnica, cotizador ni financiación.

## Estado actual

> Este bloque lo actualiza Claude Code al terminar cada parte. Reemplazalo entero, no agregues: máximo 10 líneas.

- Rutas: `/`, `/catalogo`, `/vehiculo/:slug`, `/admin` (lazy) y un 404 con
  salida al catálogo. La intro corre solo si la pestaña ENTRÓ por `/`.
- `src/data/repo/` es la única puerta a los datos (mock sobre localStorage;
  `CLAVE` sube de versión cada vez que cambia la semilla, si no gana lo viejo).
- `VehiculoCard` es compartida: riel del home, grilla del catálogo y "otros
  vehículos". El ancho lo pone el contenedor.
- `/catalogo`: chips + buscador EN LA URL (`?condicion=&q=`).
- `/vehiculo/:slug`: galería con DOS layouts (tira con snap en mobile, grande +
  miniaturas en desktop), precio sticky, barra fija de mobile en z-40 (debajo
  del menú), video sin montar hasta el click, etiquetas con barrido. Falta `/admin`.

---

## Stack

| Área | Elección |
|---|---|
| Build | Vite + React 19 + TypeScript |
| Estilos | Tailwind CSS v4 (`@theme` en CSS) |
| Rutas | react-router — `/`, `/catalogo`, `/vehiculo/:slug`, `/admin` (lazy) |
| Scroll | Lenis, en el mismo ticker que GSAP |
| Animación | GSAP + ScrollTrigger + Flip, con `@gsap/react` |
| Datos | Interfaz de repositorio en `src/data/repo/`: mock en localStorage ahora, Supabase después |
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
