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

---

## Fase 2 — Intro ✅

**Build:** pasa. **Lint:** limpio. **`npm run check`:** pasa.
**Duración medida con `tl.duration()`: 2.600 s.** Exactamente el techo.

### Cómo se midió sin navegador

No se puede levantar el dev server en esta sesión, así que la timeline se
extrajo a `src/components/intro-timeline.ts`, que recibe los targets y la
fábrica del Flip **por parámetro** en vez de buscarlos en el DOM.

Eso permite que `scripts/check-intro.mjs` construya exactamente la misma
secuencia con objetos planos en lugar de nodos y lea `tl.duration()`. GSAP anima
objetos planos igual que elementos, y la duración total no depende de los
targets. El resultado: **2.600 s**, contra un techo declarado de 2.6 s.

Está en `npm run check` junto con `scripts/check-logo.mjs`, así que el techo se
puede volver a verificar en cualquier momento y en CI.

### El guion, tal cual quedó

| t | paso | dur | ease |
|---|---|---|---|
| 0.15 | láser, barra de 2px, 0 → ancho+140px | 0.55 | `power3.inOut` |
| 0.20 | estela de 140px, misma curva, 0.05 s atrás | 0.55 | `power3.inOut` |
| 0.70 | ambos se apagan al salir por el borde derecho | 0.18 | `power1.out` |
| 0.70 | `#lg-word`: `inset(0 100% 0 0)` → `inset(0)` | 0.45 | `power3.inOut` |
| 0.95 | `#lg-flag > path` ×7, opacidad + scale .9 → 1 | 0.30 | `power2.out`, stagger 0.045 |
| 1.30 | línea ámbar, `scaleX` 0 → 1 desde el centro | 0.35 | `power3.out` |
| 1.55 | respiración: scale 1 → 1.035 → 1 + drop-shadow | 0.45 | `sine.out` / `sine.in` |
| 2.00 | `Flip.fit` al logo del header + la línea se apaga | 0.30 | `power3.inOut` |
| 2.30 | wipe: panel negro `scaleX` 1 → 0, origin right | 0.30 | `power3.inOut` |
| 2.60 | `ScrollTrigger.refresh()` + `lenis.start()` | | |

El láser y el revelado de la palabra comparten `power3.inOut` y dirección
izquierda→derecha: esa coincidencia es la que hace que se lea como que el láser
dibuja la palabra y no como dos animaciones seguidas.

### Decisiones tomadas sin consultar — Fase 2

8. **El logo volador y el que respira son dos nodos distintos.**
   `Flip.fit` y la respiración escriben los dos sobre `transform`. Si compartían
   nodo, el flip pisaba el scale y el logo llegaba al header deformado.
   Quedó `flyer` (el que viaja) envolviendo a `breath` (el que respira).

9. **Todas las búsquedas del logo van scopeadas al contenedor de la intro.**
   Mientras la intro está en pantalla hay **dos** instancias del SVG en el DOM
   —la del intro y la del header— y las dos traen los mismos ids internos.
   `document.querySelector('#lg-word')` agarraría el del header.
   Por eso `Intro.tsx` busca siempre dentro de su propio `<svg>`, y el Flip
   recibe el nodo del header por `ref`, nunca por id.
   Los ids duplicados desaparecen solos cuando la intro se desmonta.
   Si en algún momento hay que tener las dos instancias a la vez de forma
   permanente, hay que namespacear los ids del SVG.

10. **`initSmooth()` se movió a `main.tsx`, antes del primer render.**
    Los layout effects de los hijos corren antes que los efectos del padre, así
    que la intro pedía `stopScroll()` y recién después App creaba Lenis — ya
    arrancado. Ahora Lenis existe antes de que se monte nada.

11. **El anillo de foco sobre el bisel se rehizo con `drop-shadow`.**
    Al implementar el botón SKIP quedó claro que la solución de la fase 1 no
    servía: `clip-path` recorta también el `outline`, y con `outline-offset` el
    anillo queda **entero afuera** del polígono, o sea invisible.
    `drop-shadow` en cambio trabaja sobre la silueta alfa **ya recortada**, así
    que cuatro drop-shadow sin blur (±2px en los dos ejes) dibujan un anillo
    ámbar de 2px que sigue las dos diagonales del bisel. Sigue siendo ámbar de
    2px, como pide el piso de calidad.

12. **`scripts/check-logo.mjs` como guarda permanente.**
    Si alguien prende SVGO o reemplaza el SVG por el vectorial del cliente, los
    ids se pueden ir sin que el build falle y la intro se rompe en silencio.
    El script verifica los 13 ids, que `#lg-flag` tenga 7 paths directos, que
    estén en orden 1→7 y que `#lg-word` venga antes que `#lg-flag`.

13. **El SKIP hace `tl.seek(tl.duration(), false)` y llama al cierre a mano.**
    Literal a la consigna. `seek()` no siempre dispara `onComplete`, así que el
    cierre (`sessionStorage`, `startScroll`, `ScrollTrigger.refresh`, `onDone`)
    se invoca explícitamente y es idempotente por un `useRef` de guarda.

### Pendiente

- **Sin verificación visual.** La intro está verificada por build, por lint, por
  la medición de duración y por la guarda de ids, pero **nadie la vio correr**:
  la consigna pedía no levantar el dev server. Lo primero al retomar es
  `npm run dev` y mirar los 2.6 s. Los puntos más probables de ajuste son el
  aterrizaje del `Flip.fit` y la lectura de la respiración.
- El `console.info` con la duración solo sale en dev (`import.meta.env.DEV`).

### Dudas

- **La respiración anima `filter: drop-shadow`,** que no está en la lista de
  propiedades permitidas (`transform`, `opacity`, `clip-path`). Es un pedido
  explícito de CLAUDE.md para ese paso, es un único ciclo de 0.45 s y no es un
  scrub, así que se dejó. Si en un celular de gama media se nota el costo, se
  cambia por un halo en un pseudo-elemento animado con `opacity`.
- **`Flip.fit` mide el logo del header cuando se construye la timeline**, no
  cuando arranca el viaje. Es estable porque el header es `fixed` y el logo
  tiene alto fijo (`h-8`/`h-10`), independiente de la carga de las fuentes. Si
  al ver la intro el logo aterriza corrido, la causa más probable es esa y la
  solución es construir el tween dentro de un `onStart`.

---

## Fase 3 — Footer (fase 12 del plan) ✅

**Build:** pasa. **Lint:** limpio. **`npm run check`:** pasa.

### Hecho

- **`src/data/contacto.ts`** — dirección, teléfonos, mail, horarios, redes y
  coordenadas. Todo inventado y verosímil para San Salvador de Jujuy. Las fases
  3 (ticker del hero) y 11 (formulario) van a leer de acá.
- **`src/data/nav.ts`** ganó `FOOTER`, con las tres columnas: CONTENIDO,
  UTILIDAD, REDES. El **orden de los ítems ES el escalonado**, así que
  reordenar la lista reordena la diagonal.
- **`src/components/Footer.tsx`** — logotipo a ancho completo en Archivo
  extendido (`clamp(2rem, 11.4vw, 13rem)`), tres columnas escalonadas, barra
  inferior con el © y "Volver arriba", y la nota de sitio de demostración.
- **CSS del escalonado** en `globals.css`: `.stagger-item` con
  `padding-left: calc(var(--i) * .6rem)` y `.stagger-link` con el `\` como
  pseudo-elemento entrando desde `translateX(-10px)` + `opacity: 0`, el link
  corriéndose 8px y pasando a ámbar, todo en 0.25s.

### Decisiones tomadas sin consultar — Fase 3

14. **El `\` del pseudo-elemento va como escape unicode `\005C`, no como `\`.**
    Esto **rompió el build** y costó encontrarlo: el parser CSS de Tailwind v4
    corta en el backslash escapado a mano y tira
    `CssSyntaxError: Unterminated string`. Con `content: "\005C"` compila, y el
    minificador lo emite como `content:"\\"`, que es el escape correcto.
    Si alguien "arregla" esa línea escribiendo `'\'`, el build vuelve a romper.

15. **El logotipo del footer lleva un `\` ámbar como separador:**
    `AUTOSHOP\JUJUY`. Es el mismo marcador del riel y de los eyebrows, así que
    ata el footer al resto de la página en vez de ser un bloque suelto. Va con
    `aria-hidden` para que el lector de pantalla lea "AutoShop Jujuy".

16. **El foco de teclado dispara exactamente el mismo movimiento que el hover.**
    `.stagger-link:focus-visible` repite lo de `:hover`. Sin eso, quien navega
    con Tab por el footer pierde la mitad de la respuesta visual.

17. **"Volver arriba" es un `<button>`, no un `<a href="#">`.** No navega a
    ningún lado: ejecuta `scrollTo(0)`, que usa Lenis si está y cae al scroll
    nativo si `prefers-reduced-motion` lo desactivó.

18. **Los links internos del footer interceptan el click** y llaman a
    `scrollTo(href)` en vez de dejar que el navegador salte. Un salto nativo
    con Lenis andando descoloca la posición interna del scroll suave.
    Los externos (redes) salen con `target="_blank"` y `rel="noreferrer"`.

### Pendiente

- "Política de privacidad" y "Términos y condiciones" apuntan a `#contacto`
  porque no hay páginas. En producción son rutas reales.
- Sin verificación visual, igual que la fase 2.
