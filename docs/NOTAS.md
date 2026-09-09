# Notas de trabajo

Bitácora de la sesión autónoma. Una entrada por fase.

---

## Decisiones tomadas sin consultar

Todo lo de esta sección se decidió sin poder preguntar. Está separado a
propósito para que se pueda revertir rápido lo que no convenza.

### Fase 1

1. **SVGO no corre en la cadena de svgr, y `svgo: true` la rompería.**
   La instrucción era configurar `svgoConfig` desactivando `cleanupIds`.
   Al inspeccionar `node_modules/vite-plugin-svgr/dist/index.js` resulta que
   v5.2.0 carga únicamente `@svgr/plugin-jsx`; ni `@svgr/plugin-svgo` ni `svgo`
   están instalados. Prender `svgo: true` haría que `@svgr/core` intente cargar
   un plugin inexistente y el build falle. Así que quedó `svgo: false` explícito
   más el `svgoConfig` correcto escrito al lado, para el día que alguien instale
   el plugin. **Los 13 ids sobreviven, verificado dos veces** (ver abajo).

2. **`--font-display` salió del bloque `@theme`.**
   Un token `--font-display` dentro de `@theme` hace que Tailwind v4 genere una
   utilidad `font-display`, que choca de nombre con la nuestra (la del display
   extendido). Quedó como variable suelta en `:root`: se sigue usando igual con
   `var(--font-display)` y ya no genera utilidad.

3. **Se agregó una familia `Archivo Fallback` con métricas ajustadas.**
   `size-adjust` + `ascent-override` sobre Arial local. Con `display: swap` y un
   titular a `clamp(3rem, 11vw, 10rem)`, el salto de la fuente fallback a Archivo
   produce un layout shift enorme, y el layout shift rompe los cálculos de
   ScrollTrigger. Las métricas son aproximadas, no medidas con precisión.

4. **`src/data/nav.ts` define el orden y la numeración de las secciones.**
   El riel y los eyebrows leen de ahí. Reordenar secciones se hace en ese archivo.

5. **El header es solo el logo.** No hay navegación en el header porque la barra
   MENU flotante (fase 3) cumple ese rol, y dos navegaciones simultáneas compiten
   con el hero. El `id="header-logo"` es el destino del Flip de la intro.

6. **El anillo de foco cambia de técnica dentro de un `.bevel`.**
   Un `outline` con offset queda recortado por el `clip-path` justo en las dos
   esquinas cortadas, que es donde más se nota. Adentro de un biselado el foco se
   dibuja con `box-shadow: inset`, que el clip no come. Sigue siendo ámbar de 2px.

7. **El bloque `<metadata>` de C2PA del logo quedó como está.**
   Son ~8 KB de base64 de procedencia que viajan al bundle sin aportar nada.
   La consigna decía no tocar `logo.svg`, así que no lo toqué. Borrar ese bloque
   es una optimización de un minuto para la fase 13.

---

## Fase 1 — Infraestructura ✅

**Build:** pasa, sin warnings. `tsc -b && vite build` → 355 KB JS (121 KB gzip),
16.7 KB CSS (4.2 KB gzip). El JS es casi todo GSAP + React; la fase 13 tiene que
revisar si GSAP entra entero.
**Lint:** `oxlint` limpio.

### Hecho

- **Limpieza.** Borrados `src/App.css`, `src/assets/react.svg`,
  `src/assets/vite.svg`, `src/assets/hero.png`, `public/icons.svg`.
  `src/index.css` eliminado y reemplazado por `src/styles/globals.css` escrito
  desde cero. `src/assets/logo.svg` intacto.
- **`vite.config.ts`** con `@tailwindcss/vite` y `vite-plugin-svgr`
  (ver decisión 1).
- **Fuentes.** El eje de ancho de Archivo **sí existe en Google Fonts** — se
  verificó pidiendo la CSS de la API v2 y confirmando que el `@font-face` vuelve
  con `font-stretch: 62% 125%`:

  ```
  family=Archivo:wdth,wght@62..125,100..900
  ```

  Así que **no hizo falta cambiar de familia ni simular el ancho con
  `scaleX()`**. El display extendido se resuelve con `font-variation-settings`
  en tres utilidades: `font-hero` (wdth 125 / wght 700), `font-display-xl`
  (wdth 118) y `font-display` (wdth 112). Martian Mono se pide con
  `wght@400..700`.
- **`src/styles/globals.css`.** Bloque `@theme` con los 7 colores exactos de
  CLAUDE.md y las escalas de texto. Utilidades: `bevel`, `font-hero`,
  `font-display-xl`, `font-display`, `font-hud`, `num`, `glow-amber`, `shell`.
  Reset base, reglas de Lenis y bloque de `prefers-reduced-motion`.
- **`src/lib/motion-prefs.ts`.** Una sola fuente de verdad para
  `prefers-reduced-motion`, con suscripción a cambios en vivo.
- **`src/lib/smooth.ts`.** Lenis en el ticker de GSAP, un solo rAF.
  Exporta `initSmooth`, `destroySmooth`, `getLenis`, `stopScroll`,
  `startScroll`, `scrollTo`. Con reduced-motion no inicializa Lenis y
  `stopScroll` cae a `overflow: hidden`, así que el menú y la intro siguen
  bloqueando el scroll igual.
- **`src/components/Bevel.tsx`.** `variant` / `bevel` / `as` / `className`.
  La variante `outline` usa el doble contenedor con `padding: 1px`, y el bisel
  interior va 1px más chico para que las diagonales queden paralelas.
- **`src/components/MeshOverlay.tsx`.** rAF-throttled, escritura directa de
  `--mx` / `--my` en `documentElement`, cero estado de React en el pointermove.
  En `(hover: none)` hace la deriva de 18s con `sine.inOut` y la cancela apenas
  hay un `touchmove`. Con reduced-motion queda fija a opacidad .12 y sin máscara.
- **`src/components/Rail.tsx`.** Riel fijo, 56px desktop / 16px mobile vía
  `--rail-w`. Muestra el índice y el nombre de la sección activa en vertical.
- **`src/components/SectionHeader.tsx`.** Eyebrow + titular, con prop `tone`
  para las dos secciones claras. En mobile el `\` vuelve como prefijo inline.
- **`src/components/Logo.tsx` y `Header.tsx`.** El logo entra como componente
  React (`logo.svg?react`), no como `<img>`.
- **`src/App.tsx`.** Fondo negro, malla, riel con índice activo por
  `IntersectionObserver`, header, y 10 secciones placeholder de 100svh más el
  footer.

### Verificación de los ids del logo

Doble chequeo, porque de esto depende toda la fase 2:

1. Sobre el bundle: `grep -o "lg-[a-z0-9-]*" dist/assets/index-*.js` devuelve
   los **13** ids (`lg-word`, `lg-automotores`, `lg-auto`, `lg-shop`,
   `lg-jujuy`, `lg-flag`, `lg-flag-1..7`).
2. Sobre el DOM real: se renderizó `<Logo>` con `renderToStaticMarkup` en un
   build SSR descartable. Salida: **50 paths, 0 ids faltantes**, incluido el
   `id="header-logo"` que necesita el Flip.

### Pendiente

- El riel muestra el índice de sección pero todavía no anima la transición.
- Las métricas de `Archivo Fallback` son estimadas, no medidas.
- El bundle de 355 KB no se tocó todavía (fase 13).

### Dudas

- Los tokens `--text-hero` / `--text-h2` están definidos pero sin usar hasta la
  fase 3. Si el hero termina necesitando otro clamp, se toca ahí.
- `public/img/` y `public/video/` están **vacíos**. Las fases 3, 5, 6 y 10
  dependen de los 2 videos y las 3 fotos que todavía no están.
