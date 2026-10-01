# 08 · Rendimiento

El visitante abre el link desde WhatsApp, con datos móviles y un celular que no
es nuevo. Lo que importa: que la primera pantalla pinte rápido y que el scroll
no tiemble.

## JS: lo que no viaja

- **El panel en su propio chunk**: `const Admin = lazy(() => import('./routes/Admin'))`
  con un `<Suspense>` mínimo. Es lo único que se parte del bundle principal. Se
  verifica después de cada `npm run build` mirando que exista un `Admin-*.js`
  aparte en `dist/assets/`.
- **Supabase en su propio chunk**: el cliente se pide con `import()` dinámico
  (`cliente()` en `data/supabase.ts`) y **nadie importa `cliente.ts`
  directamente**, ni siquiera para una constante (por eso `BUCKET` vive en
  `supabase.ts`). El primer pedido de datos sale con la página ya pintada.
- **La autenticación arranca solo en el panel**: `sesion.ts` se suscribe a
  `onAuthStateChange` la primera vez que alguien usa `useSesion()`.
- **Sin dependencias de animación de más**: `motion` era el 25% del JS (133 KB)
  por una sola animación de `clip-path`; se reemplazó por CSS y el panel del
  menú vive siempre en el DOM, `inert` cuando está cerrado. El bundle bajó de
  543 KB a 433 KB (185 → 149 KB gzip) en ese momento.
- Sin librerías de íconos: SVG dibujados a mano en un componente.

## Pedidos

- **El contenido del inicio es un solo pedido compartido** (`useContenido`):
  home, menú, footer y cada botón de WhatsApp leen del mismo.
- **Filtrar y ordenar lo hace la base**, nunca un `filter` sobre todo el stock
  traído al navegador.
- La ficha se muestra sin esperar el pedido de "otros vehículos".
- Las consultas de unidades traen fotos, video y etiquetas en el mismo `select`
  anidado de PostgREST.

## Fuentes

- **Autoalojadas** en `public/fonts/`. Con Google Fonts, el día que Google no
  respondió el sitio se dibujó entero en Arial (T11). El arnés tiene un pase
  **offline** que exige cero pedidos externos y verifica que la fuente cargó.
- **Un solo archivo**: una familia variable (`wght` 200–800), **solo el
  subconjunto `latin`** (alcanza para todo el español: á é í ó ú ñ ü ¿ ¡ ° · —).
  `scripts/sync-fonts.mjs` lo copia desde `@fontsource-variable/<familia>` con
  un **nombre estable** (si se importa el CSS del paquete, Vite le pone hash y no
  se puede precargar).
- `<link rel="preload" as="font" type="font/woff2" href="/fonts/…" crossorigin>`
  en `index.html`. **`crossorigin` es obligatorio aun siendo del mismo origen**:
  las fuentes se piden en modo CORS y sin el atributo se descargan dos veces.
- `@font-face` con `font-display: swap`, `font-weight: 200 800` y
  `unicode-range` del subconjunto.
- **Fallback con métricas medidas** para que el cambio de fuente no mueva el
  layout:

```css
@font-face {
  font-family: '<Familia> Fallback';
  src: local('Arial');
  size-adjust: 101.3%;        /* medir para la familia nueva */
  ascent-override: 105.2%;
  descent-override: 29.6%;
  line-gap-override: 0%;
}
--font-sans: '<Familia>', '<Familia> Fallback', system-ui, sans-serif;
```

## Imágenes

- **WebP, < 250 KB**, con `width` y `height` reales en cada `<img>` (sin ellos
  hay salto de layout). `loading="lazy"` y `decoding="async"` salvo arriba del
  pliegue.
- **Las fotos de la dueña se comprimen en el navegador antes de subir** (1600 px
  de lado mayor, WebP bajando calidad hasta < 250 KB; ver
  [05](05-panel.md)). Lo que se guarda es lo que se sirve.
- En el bucket: nombre único por archivo y `cacheControl: '31536000'` (un año;
  nunca se reescriben).
- La segunda foto del hover de la card **se monta recién en el primer hover**,
  y solo con puntero fino.
- Los assets del repo se comprimen antes de entrar: en el original, `public/`
  pasó de 74 MB a 4 MB (23 MB de JPG → 1 MB de WebP; videos del hero de 1,4 MB
  y 0,5 MB).

## Video

- **Solo el video del hero lleva `preload`**; tiene póster WebP y una versión
  mobile aparte, más liviana.
- Los demás `preload="none"`, y además **no se montan hasta que el visitante
  muestra intención**: `preload="none"` evita la metadata, pero un `<video>`
  en el DOM puede pedir igual, y el hosting gratuito cobra por transferencia.
  Dos `<video>` montados (uno oculto con CSS) pedían metadata los dos.
- El fundido de foto a video espera al primer cuadro (si no, cruza a negro).

## Pintado y scroll

- Animar solo `transform`, `opacity` y `clip-path`.
- **Sin `backdrop-filter`** en barras fijas que cubren todo el ancho (el velo
  del header, las barras de guardar del panel): es de lo más caro por frame de
  scroll en un teléfono. Un degradado o un fondo opaco resuelve la legibilidad.
- Filtros SVG animados (en el original, una malla con `feTurbulence`): medidos a
  390 px con CPU ×4/×6, no eran los que rompían el scroll pero sumaban cuadros
  largos y su aporte era sutil; quedaron solo con puntero fino y al final se
  sacaron. Decoración animada: medir antes de mantenerla en mobile.
- Un solo ticker para GSAP y Lenis.
- `IntersectionObserver` en vez de escuchar `scroll` para todo lo que depende de
  la posición (riel, header, footer, botón libre).
