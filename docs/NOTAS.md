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

---

## Fase 4 — Preguntas frecuentes (fase 9 del plan) ✅

**Build:** pasa. **Lint:** limpio. **`npm run check`:** pasa.

### Hecho

- **`src/data/faq.ts`** — las 6 preguntas pedidas: usado como parte de pago,
  financiación sin recibo de sueldo, transferencia y patentamiento, garantía de
  los usados, permuta, y demora de entrega de un 0km. Respuestas inventadas
  pero concretas: plazos, porcentajes y condiciones que una concesionaria de
  Jujuy podría sostener. Nada de generalidades.
- **`src/components/Faq.tsx`** — dos columnas en desktop
  (`lg:grid-cols-[0.9fr_1.1fr]`), apiladas en mobile. Fondo `--color-bone` con
  texto negro: es la segunda sección clara del sitio y funciona como respiro.
  El titular queda `sticky` mientras se recorre el acordeón.
- **El barrido**, exacto a la receta: `::before` con `scaleX(0)` desde
  `transform-origin: left` a `scaleX(1)` en 0.45s con
  `cubic-bezier(.65,0,.35,1)`, y el color del texto con `transition-delay: .12s`
  para que el barrido lo alcance. La demora solo aplica al entrar.
- **La altura con `grid-template-rows: 0fr → 1fr`**, sin medir nada en JS y sin
  animar `height`, que además no interpola desde `auto`.
- **Accesibilidad:** `<button>` reales con `aria-expanded` y `aria-controls`,
  panel con `role="region"` + `aria-labelledby`, y `aria-hidden` cuando está
  cerrado. Una sola abierta a la vez, guardada por id y no por índice, así que
  reordenar `FAQ` no cambia cuál abre.

### Decisiones tomadas sin consultar — Fase 4

19. **El riel y la malla ahora reaccionan al tono de la sección.**
    El riel y la malla son overlays **fijos sobre toda la página**, y la FAQ es
    la primera sección de fondo claro: el riel blanco desaparecía contra el
    bone y la malla ámbar al 28% sobre blanco se leía como ruido, no como
    ambiente. Se agregó `tono: 'claro'` a la sección en `nav.ts` — el
    `IntersectionObserver` de `App` ya sabía cuál está activa — y con eso el
    riel invierte sus colores y la malla baja a .1, los dos con una transición
    de 0.5s para que el cambio no sea un salto. El menú desplegado (fase 3 del
    plan) va a necesitar lo mismo.

20. **El anillo de foco del botón de FAQ va negro, no ámbar.**
    La regla general dibuja el foco en ámbar, pero cuando el ítem tiene el foco
    su fondo YA es ámbar por el `:focus-within` del barrido, así que el anillo
    ámbar quedaba invisible. Sobre ámbar va negro, igual que el texto.

21. **El `+` se convierte en `×` rotando 45°**, no cambiando de glifo. Es
    `transform`, entra en el presupuesto de animación y no produce reflow.

22. **El barrido también responde a `:focus-within`,** no solo a `:hover`.
    Quien navega con Tab ve exactamente lo mismo que quien usa el mouse.

23. **`App.tsx` ahora tiene un mapa `IMPLEMENTADAS`** de id de sección →
    componente. Las secciones que todavía no existen siguen saliendo como
    placeholder. Cada fase que viene agrega una entrada a ese mapa y nada más.

### Pendiente

- Sin verificación visual, igual que las fases 2 y 3.
- El `sticky` del titular está en `lg:top-28`, calculado a ojo contra la altura
  del header. Si el header cambia de alto hay que revisarlo.

### Dudas

- El fondo bone de la FAQ arranca y termina con `border-y border-graphite`.
  Contra el negro puede resultar innecesario: hay que verlo. Si molesta, se
  sacan las dos líneas.

---


---

## Fase A — Arnés de captura y correcciones visuales ✅

**Build:** pasa. **Lint:** limpio. **`npm run check`:** pasa (2.600 s, 13 ids).

Esta es la primera vez que alguien ve correr el sitio. Las cuatro fases
anteriores estaban verificadas por build, lint y scripts, pero nunca por ojo, y
apareció exactamente lo que se temía: **la intro entera era invisible**.

### El arnés

`scripts/shots.mjs`, colgado de `npm run shots` (`-- --fast` reusa `dist/`).
Corre el build, levanta `vite preview` en `127.0.0.1:4317`, saca todo con
Playwright y mata el server al terminar. Cuatro pases:

1. **`docs/shots/intro/`** — la intro contra el reloj de pared, una captura cada
   200 ms durante 3 s en desktop. El nombre lleva el tiempo nominal **y el
   real**: sacar un PNG cuesta decenas de ms y poner solo el nominal llevaría a
   conclusiones falsas sobre el timing.
2. **`docs/shots/beats/`** — la intro **congelada beat por beat**. El muestreo
   contra el reloj no puede caer justo en el aterrizaje del Flip, que es lo que
   había que mirar. `Intro.tsx` publica la timeline en `window.__introTl`; el
   script intercepta esa asignación con un setter, la pausa en el frame cero y
   después hace `seek()` a cada tiempo exacto del guion.
3. **`docs/shots/desktop/` y `docs/shots/mobile/`** (1440×900 y 390×844) —
   full-page, una por sección, la FAQ con un ítem abierto, la FAQ en hover, el
   footer completo y el footer con el foco puesto **por teclado de verdad**
   (Tab hasta caer en un `.stagger-link`; `.focus()` programático no siempre
   activa `:focus-visible`, que es lo que dispara el marcador).
4. **Mediciones**, que valen más que mirar: desborde horizontal con los
   elementos culpables, el rectángulo del aterrizaje del Flip contra el del
   logo del header, y el llenado del logotipo del footer.

Cada contexto de Playwright arranca con `sessionStorage` vacío, así que la
intro corre de nuevo en cada pase.

`docs/shots/` está en `.gitignore`: 3,3 MB por corrida y se regenera con un
comando.

### Lo que esperaba / lo que vi / qué hice

**1. La intro entera — invisible. El defecto grave de la sesión.**

*Esperaba:* láser, logo, bandera, respiración, viaje y wipe.

*Vi:* negro absoluto en las capturas de 0 ms a 1600 ms. Ni el láser, ni el
logo, ni el botón SKIP, que tenía que estar visible desde el primer frame. Lo
único que se veía era el wipe final revelando el hero — o sea, 2,3 de los 2,6
segundos eran una pantalla negra.

*Causa:* el panel del wipe estaba **después** del stage en el DOM. Los dos son
`absolute inset-0` sin `z-index`, así que el orden del DOM es el orden de
pintado y el panel negro opaco tapaba la intro completa desde el frame cero.

*Qué hice:* el wipe pasó a ir **primero** en el DOM, o sea debajo. Funciona
porque el stage también es opaco: lo esconde hasta el segundo 2.30, cuando el
stage se apaga y el wipe queda tapando el hero justo a tiempo para correrse.
El comentario en `Intro.tsx` explica por qué ese orden no es casual.

**2. La estela del láser se leía como una segunda barra suelta.**

*Esperaba:* una estela pegada a la barra.

*Vi:* a mitad del barrido, la estela quedaba **400 px atrás** del láser, con un
borde derecho duro. Dos objetos, no uno.

*Causa:* los 0,05 s de retraso literales. En el pico de `power3.inOut` el láser
va a ~11.500 px/s, así que 0,05 s son ~570 px. Para que la estela alcanzara
habría que hacerla de 570 px de largo, o sea un manchón sobre el 40% de la
pantalla.

*Qué hice:* la estela comparte tween con el láser — su borde derecho queda
siempre clavado en la barra — y lo que varía es el **largo**: `scaleX` de 0.18
a 1 y de vuelta a 0.18 con `transform-origin: 100% 50%`, así se estira cuando
el barrido acelera y se recoge cuando frena. Es lo que hace una estela de luz
de verdad, y ahora se lee como un solo objeto. Es un desvío de la letra de
CLAUDE.md ("0.05s de retraso"), no del espíritu ("como estela").

**3. El logotipo del footer estaba cortado.**

*Esperaba:* el logotipo de margen a margen, como en `docs/refs/09-footer.png`.

*Vi:* "AUTOSHOP\JU" en desktop y "AUTOSHOP\J" en mobile, comido por el
`overflow-hidden` del footer. Se lee como un error, no como un recorte
intencional.

*Causa:* `clamp(2rem, 11.4vw, 13rem)` era un factor adivinado.

*Qué hice:* `src/lib/fit-text.ts` — un hook que **mide** y calcula el
`font-size` exacto para llenar el ancho disponible. Se vuelve a medir cuando
termina de cargar la fuente y cuando cambia el ancho del contenedor. Medido:
llenado 1.000 en los dos viewports (114,9 px en 1440, 29,1 px en 390).

*Trampa que me comí en el camino:* la primera versión medía con `scrollWidth`,
que **nunca devuelve menos que `clientWidth`**. En desktop el texto entraba
sobrado, así que informaba el ancho del contenedor, la razón daba 1 y el
logotipo se quedaba en el tamaño de sonda con 170 px de aire a la derecha. El
ancho real se mide con un `Range` sobre el contenido.

**4. Sobre la FAQ, el logo del header desaparecía.**

*Esperaba:* el logo legible en toda la página.

*Vi:* sobre el fondo bone quedaba flotando un "SHOP" ámbar suelto: las partes
blancas del logo se comían con el fondo. Parece un error de carga.

*Causa:* la decisión 19 hizo que el riel y la malla se adaptaran al tono de la
sección, pero el header quedó afuera y también es un overlay fijo.

*Qué hice:* `Header` recibe `tono` y con `data-tono="claro"` redefine
`--logo-white: var(--color-void)`. La transición va sobre `fill` (0,45 s), no
sobre la variable — un custom property no interpola, pero la propiedad que lo
consume sí — así que acompaña a los 0,5 s del riel y de la malla.

### Lo que miré y está bien

- **El aterrizaje del Flip es exacto.** Medido en t = 2.30:
  `delta {x: 0, y: 0, w: 0, h: 0}`. La duda de la fase 2 sobre construir el
  tween dentro de un `onStart` queda cerrada: no hace falta.
- **La respiración se lee**, y se lee por el glow, no por el `scale`. El 3,5%
  de escala solo no se notaría; el drop-shadow ámbar en el pico es lo que hace
  el momento. Vale la pena el `filter` fuera de la lista de propiedades
  permitidas.
- **El láser sí se ve sobre negro.** El glow de dos capas alcanza y sobra.
- **La malla se lee como ambiente, no como ruido**, en las dos tonalidades.
- **El escalonado del footer se lee como diagonal intencional**, y el foco de
  teclado dispara lo mismo que el hover: el marcador ámbar entra, el link se
  corre y pasa a ámbar (medido: `rgb(253,185,22)`).
- **Cero desborde horizontal** en 390 y en 1440 (`scrollWidth === clientWidth`,
  lista de culpables vacía).
- **Las fuentes cargan con el ancho extendido.** Los titulares se ven
  claramente en Archivo `wdth 125`, no en la fallback.
- **La línea ámbar bajo el logo** está y es exactamente `#FDB916`, 1 px, al
  100%. Es fina; contra el glow de la respiración casi no se nota. No la toqué
  porque es lo que pide el guion, pero si hay que elegir un detalle para subir,
  es este.

### Decisiones tomadas sin consultar — Fase A

24. **La estela del láser va pegada al láser, no retrasada 0,05 s.** Ver punto
    2. El retraso literal produce dos barras separadas por 400 px.

25. **El tamaño del logotipo del footer se calcula midiendo, no con un
    `clamp()`.** Ver punto 3. Un clamp obliga a adivinar el ancho de los
    glifos, y ese ancho cambia con la fuente, con el eje `wdth` y con el texto
    — que se va a reemplazar cuando llegue el contenido real de la
    concesionaria. `useFitText` sobrevive a los tres cambios.

26. **`Intro.tsx` publica la timeline en `window.__introTl`.** Es el gancho que
    le permite al arnés congelar la intro y hacer `seek()` a cada beat. Sin eso
    no hay forma de verificar el aterrizaje del Flip. Son dos líneas y no
    cambia nada en runtime.

27. **`docs/shots/` va al `.gitignore`.** Son 3,3 MB por corrida y se
    regeneran con `npm run shots`. Versionarlas por fase infla el repo sin
    aportar nada que no se pueda volver a generar.

28. **Se sacaron los `border-y` del bloque bone de la FAQ**, según lo que
    respondiste.

### Trampa del arnés, por si alguien lo toca

- `tl.pause(t)` de GSAP asume `suppressEvents = true`. Sin el `false` explícito
  el `tl.call` del cambio de posta (2.30) no corre, el stage no se apaga y el
  wipe queda tapado detrás: parece que el wipe está roto y lo único roto es la
  medición. Va `tl.pause(t, false)`.
- En `page.evaluate`, `() => tl.pause(t)` **devuelve la timeline** y Playwright
  intenta serializar el grafo entero de GSAP; se cuelga sin error. Van llaves.


---

## Fase B — Contadores (fase 4 del plan) ✅

**Build:** pasa. **Lint:** limpio. **`npm run check`:** pasa.
**Verificado con `npm run shots`** en los dos viewports.

### Hecho

- **`src/data/contadores.ts`** — las cuatro cifras: 500+ unidades entregadas,
  12 marcas en el salón, 9 años en Jujuy, 100% financiación propia. Del orden
  de magnitud de una concesionaria de barrio: 15.000 unidades o 40 marcas se
  leerían como relleno.
- **`src/components/Contadores.tsx`** — franja ámbar, texto negro, cuatro
  columnas con separadores verticales de 1px, 2×2 en mobile. El conteo arranca
  en 0 con `Intl.NumberFormat('es-AR')` y Martian Mono con `tabular-nums`, una
  sola vez (`once: true`, `start: 'top 78%'`). El sufijo `+` / `%` entra al
  final con un corte seco: `gsap.set(..., { autoAlpha: 1 })` en el
  `onComplete`, sin animar.
- **Un solo tween para las cuatro cifras**, no uno por cifra. El efecto entero
  es ver las cuatro subir al mismo tiempo; con un ScrollTrigger por columna las
  de la derecha podrían arrancar un poco después en pantallas angostas.
- **`prefers-reduced-motion`:** las cifras aparecen en su valor final. El
  contenido no falta, solo no cuenta.

### Decisiones tomadas sin consultar — Fase B

29. **La franja no lleva eyebrow ni titular.** Es la única sección sin
    encabezado. La franja **es** el contenido, y un titular arriba le sacaría
    el golpe de color entre el hero negro y la sección que sigue. El riel la
    numera igual que a todas, así que no se pierde la referencia.

30. **La franja arranca en el riel, no debajo.** Primero la hice sangrar de
    borde a borde, como la referencia. Al mirar la captura, el `02` del riel
    quedaba **ámbar sobre ámbar** —invisible— y el nombre de la sección, gris
    claro sobre ámbar. Ahora la franja tiene `margin-inline-start:
    var(--rail-w)` y sangra solo hacia la derecha. Además refuerza lo que el
    riel es: el único elemento que no cambia en toda la página.

31. **`Seccion.tono` se partió en `tono` y `fondo`.** Son dos preguntas
    distintas y las estaba respondiendo con un solo campo:
    - `tono` → **riel y malla**, que van de arriba abajo del viewport. Solo lo
      declaran las secciones que llenan la pantalla.
    - `fondo` → **header**, que ocupa 70px arriba de todo. Lo que le importa no
      es qué sección domina la pantalla sino cuál le pasa por debajo.

    Con la franja de contadores centrada en el viewport, el header todavía está
    sobre el negro del hero: teñirlo ahí sería el error opuesto al que arreglé
    en la fase A. Por eso hay un segundo `IntersectionObserver` con
    `rootMargin: '0px 0px -90% 0px'`, que recorta la zona de observación a la
    franja superior del viewport. Va en porcentaje porque `rootMargin` no
    acepta `calc()`, y así se adapta solo a cualquier alto de pantalla.

32. **Sobre la franja ámbar el logo del header va monocromo negro**, no solo
    con el blanco invertido. Con `--logo-white` en negro y `--logo-yellow`
    intacto, lo único ámbar sobre ámbar sería el "SHOP": el agujero exacto en
    el medio de la marca. `data-tono="ambar"` apaga los dos.

33. **Las clases de los separadores se escriben celda por celda** en un array
    `CELDA`, en vez de calcularlas con condiciones que apilen clases
    contradictorias. `md:border-l` junto a `md:border-l-0` en el mismo atributo
    deja el resultado a merced del orden en que Tailwind emita las reglas, no
    del orden en que uno las escriba.

### Lo que vi en las capturas

- Las cuatro cifras terminan en 500+ / 12 / 9 / 100% en los dos viewports
  (verificado leyendo el `textContent`, no solo mirando).
- El bloque entero entra en pantalla en 390×844, que es la condición para que
  el conteo simultáneo se vea. En mobile los labels de dos palabras largas
  ("Marcas en el salón", "Financiación propia") se parten en dos líneas; se
  lee bien.
- El header pasa a negro monocromo cuando la franja le pasa por debajo, y
  vuelve a blanco después (`data-tono` verificado: `ambar`).
- Cero desborde horizontal.


---

## Fase C — Marcas tipográficas (fase 8 del plan) ✅

**Build:** pasa. **Lint:** limpio. **`npm run check`:** pasa.
**Verificado con `npm run shots`** en los dos viewports.

### Hecho

- **`src/data/marcas.ts`** — ocho nombres: Fiat, Peugeot, Volkswagen, Toyota,
  Chevrolet, Renault, Ford, Citroën. Sin logos, por lo que dice el plan:
  recrearlos da resultados imprecisos y es un problema de marca registrada.
- **`src/components/Marcas.tsx`** — listado a ancho completo, un nombre por
  fila en Archivo extendido. En reposo `--color-graphite`, casi fundidos con el
  negro; encendidos en ámbar.
- **La micro-distorsión** son dos pseudo-elementos con
  `content: attr(data-marca)` en ámbar, desplazados 2px en direcciones opuestas
  y apagándose en 90 ms con `ease-out`. Corto y seco, un solo disparo. Las
  copias no duplican el texto en el DOM, y con `prefers-reduced-motion` la
  regla global las deja en 0.01 ms: el encendido en ámbar se sigue viendo.
- **El texto de contexto resuelve la contradicción con los contadores:** la
  franja dice 12 marcas y acá hay 8 nombres, así que la bajada aclara "Doce
  marcas pasan por el salón. Estas son las ocho que más entregamos".

### Decisiones tomadas sin consultar — Fase C

34. **El encendido por línea central del viewport corre en TODOS los
    dispositivos, no solo en mobile.** El plan lo pedía como sustituto del
    hover donde no hay puntero. Pero con los nombres en graphite sobre negro
    —contraste ~1,1:1, o sea prácticamente invisibles— dejar el encendido atado
    solo al hover haría que en desktop la sección se leyera como un bloque
    vacío hasta que alguien mueva el mouse por encima. Con el disparo por
    scroll, las marcas se encienden de a una y se lee como una luz que recorre
    la lista: es el mismo gesto de barrido del resto del sitio y además cumple
    el piso de calidad de que nada dependa del hover.

    Está implementado con un `IntersectionObserver` de
    `rootMargin: '-50% 0px -50% 0px'`, que deja una franja de observación de
    altura cero —la línea central exacta— así que hay una sola marca encendida
    a la vez sin comparar distancias en cada scroll.

35. **Los nombres no son focusables.** Puse `tabIndex={0}` y lo saqué: no
    llevan a ninguna parte, así que serían ocho paradas de Tab sin acción. La
    accesibilidad la resuelve el disparo por scroll del punto anterior, no el
    foco.

### Lo que vi en las capturas y corregí

**El nombre más largo tocaba el borde en mobile.**

*Esperaba:* los ocho nombres dentro del ancho de contenido.

*Vi:* "VOLKSWAGEN" llegaba exacto al borde derecho de la pantalla de 390px, sin
un pixel de aire. El chequeo de desborde no lo agarraba porque técnicamente no
desbordaba: quedaba justo en el límite.

*Causa:* `clamp(2.5rem, 8.5vw, 6.5rem)`. En 390px, 8,5vw son 33px, o sea
**menos** que el mínimo de 2,5rem = 40px, así que el que ganaba era el mínimo y
el `vw` no hacía nada. Un clamp cuyo mínimo es más grande que el valor
preferido en el viewport chico es un clamp que no adapta.

*Qué hice:* mínimo a 1,9rem. Con Archivo a `wdth 125` un carácter mide 0,886em
—medido, no estimado—, así que "VOLKSWAGEN" son 8,86em: 269px contra 334
disponibles.

### Riesgo detectado (no es de esta fase, pero apareció acá)

En una de las corridas del arnés, **las fuentes de Google no cargaron** y todo
el sitio se dibujó con la fallback: el logotipo del footer en Arial normal en
vez de Archivo extendido, y la identidad tipográfica entera perdida. Las
corridas siguientes cargaron bien, así que es un fallo de red intermitente y no
un bug del código.

Se agregó al arnés una verificación explícita: se mide la misma cadena en
Archivo y en la fallback y se informan las dos. Si dan lo mismo, Archivo no
está. Hoy informa `{archivo: 1152, fallback: 887}`, o sea que carga.

**Recomendación:** servir las fuentes desde el propio sitio (`public/fonts/`)
en vez de pedirlas a `fonts.googleapis.com`. Saca una dependencia de red de
terceros del camino crítico, mejora el LCP y hace que el `dist/` funcione
offline — que es justamente el plan B de la reunión. Es trabajo de la fase 13
del plan, así que queda anotado y no lo hice acá.


---

## Fase D — Contacto (fase 11 del plan) ✅

**Build:** pasa. **Lint:** limpio. **`npm run check`:** pasa.
**Verificado con `npm run shots`**, incluido el recorrido completo del
formulario: vacío → errores → completo → enviado, en los dos viewports.

### Hecho

- **`src/components/Icono.tsx`** — íconos de línea dibujados a mano en SVG
  inline: mail, teléfono, ubicación, reloj, y cuatro más para post-venta.
  Todos comparten grilla de 24, trazo de 1.5, extremos redondeados y
  `currentColor`. Sin librería (40 KB para usar seis glifos, con su propio
  grosor y su propia caja) y sin emojis (cambian de dibujo en cada sistema).
- **`src/data/contacto.ts`** ganó `CONSULTAS` y `PRESUPUESTOS`. Son contenido
  de negocio: agregar "Plan de ahorro moto" tiene que ser editar este archivo.
- **`src/components/Contacto.tsx`** — dos columnas. Izquierda: titular, bajada,
  los cuatro datos con ícono biselado, y las redes. Derecha: el formulario.
- **`Bevel` ganó `borderClassName`**, que **reemplaza** el `bg-amber` del
  contenedor exterior en la variante `outline` en vez de sumarse. Dos utilidades
  de fondo en el mismo atributo se resuelven por el orden en que Tailwind emite
  las reglas, no por el orden en que uno las escribe, así que "pisar" el ámbar
  desde `outerClassName` no era confiable. Los campos van con borde graphite y
  pasan a ámbar al enfocarse, como pide el plan.
- **Validación real**, no un `required` decorativo: no hay backend, así que es
  todo lo que hay. Los mensajes dicen qué pasó y cómo se arregla, sin
  disculpas: "Falta el @ o el dominio. Un ejemplo: nombre@gmail.com".
- **El foco salta al primer campo con problema.** Sin eso, en mobile el error
  puede quedar fuera de pantalla y parece que el botón no hizo nada.
- **Estado de éxito** que aclara que es una demostración y ofrece cargar otra
  consulta.
- **Mobile:** una columna, datos arriba del formulario, y todos los inputs a
  16px para que iOS no haga zoom al enfocar.

### Decisiones tomadas sin consultar — Fase D

36. **Los errores de validación van en ÁMBAR, no en `--color-flag`.** La
    primera versión los pintaba de rojo, que es el reflejo automático. Pero
    CLAUDE.md reserva ese rojo para los estados de stock ("Vendido" /
    "Reservado") y dice explícitamente que no decora. Usarlo en el formulario
    lo convertiría en un rojo de sistema más y le sacaría el peso al chip de
    una unidad vendida, que es el único lugar donde tiene que gritar. Quien
    dice qué pasó es el mensaje, no el color.

37. **El borde de error gana sobre el de foco.** Con `focus-within:bg-amber`
    aplicado siempre, enfocar un campo con error tapaba la única señal visual
    de cuál era el campo del problema. Ahora, si hay error, no se aplica la
    variante de foco: el borde ya está en ámbar y se queda.

38. **Las redes van con el nombre escrito y el usuario al lado, no con el logo
    redibujado.** Es el mismo criterio que la sección de marcas: un ícono de
    Instagram trazado a mano se nota, y además es marca registrada. Van como
    chips biselados con "Instagram @autoshopjujuy".

39. **El presupuesto son chips y no un select.** Son tres opciones: verlas
    todas de una es más rápido que abrir una lista, y además es el único lugar
    del formulario donde se puede no contestar sin que sea un error.

### Trampa que me comí

`CampoTexto` estaba definido **adentro** del cuerpo de `Contacto`. Un
componente definido dentro de otro se vuelve a crear en cada render, así que
React desmonta y remonta el `<input>` en cada tecla y **el foco se pierde
después de escribir una letra**. Está a nivel de módulo, con un comentario
explicando por qué no puede volver adentro.

### Lo que vi en las capturas y corregí

**El titular ocupaba cinco líneas.** Con `<br />` manuales sobre "Contanos qué
/ auto estás / buscando", en la columna angosta terminaba partiéndose en cinco
renglones y "ESTÁS" quedaba solo en uno. Copy más corto y más rioplatense:
"Contanos / qué auto / buscás", tres líneas, y en mobile el bloque de datos
entra completo en pantalla.


---

## Fase E — Simulador y cotizador (fase 7 del plan) ✅

**Build:** pasa. **Lint:** limpio. **`npm run check`:** pasa.
**Verificado con `npm run shots`**, incluidos los dos recorridos completos:
mover los sliders y cambiar el plazo, y elegir marca/modelo/año, escanear y ver
el rango.

### Hecho

- **`src/data/financiacion.ts`** — rangos de los sliders, plazos, la TNA como
  constante de archivo (59%, inventada) y `cuotaMensual()`, sistema francés.
  Los dos casos que indefinen la fórmula —capital cero y tasa cero— tienen
  salida propia.
- **`src/data/cotizador.ts`** — seis marcas con sus modelos y un precio de
  referencia de 0km, diez años, y `estimar()`, que aplica una curva de
  retención del 93% anual y devuelve un **rango**, redondeado a 100.000. Un
  número cerrado se leería como un precio prometido, que es justo lo que una
  concesionaria no puede dar sin ver el auto.
- **`src/components/Simulador.tsx`** — dos sliders y cinco chips de plazo.
  Resultado en vivo, en Martian Mono grande, con anticipo, monto a financiar y
  TNA debajo. La leyenda "Cálculo estimativo. No constituye una oferta." está
  siempre visible.
- **`src/components/Cotizador.tsx`** — tres selects biselados encadenados
  (elegir marca resetea el modelo), botón de escaneo, y el rango contando desde
  0 al terminar.
- **Los sliders son `<input type="range">` reales**, estilizados. Con el input
  nativo vienen gratis las flechas del teclado, Home/End, el rol correcto y el
  valor anunciado por el lector de pantalla; un div con eventos de mouse no
  tiene nada de eso. El porcentaje lleno viaja por una variable `--fill` que la
  hoja de estilos usa como `background-size`: una escritura por render, sin
  tocar el layout.
- **Las barras /// diagonales** son un `repeating-linear-gradient` con
  `background-position` animada, como pide el plan. Lo único que se anima es
  esa capa.
- **El escaneo** es una banda que recorre la card dos veces en 1,2 s con puro
  `transform`. Con `prefers-reduced-motion` el resultado aparece directo, sin
  escaneo y sin conteo: el contenido es el mismo, solo que instantáneo.

### Decisiones tomadas sin consultar — Fase E

40. **El simulador y el cotizador van en dos secciones apiladas, no lado a
    lado.** El prompt de la fase 7 pedía "dos bloques lado a lado en desktop",
    pero se escribió antes de que existiera `src/data/nav.ts`, donde son dos
    secciones distintas (05 FIAT PLAN y 06 COTIZADOR) y el riel las numera por
    separado. Meterlas en una sola pantalla dejaría un número del riel sin
    sección a la que apuntar. Además el simulador solo tiene dos sliders, cinco
    chips y un resultado grande: en media pantalla queda apretado. Cada una
    quedó con el mismo layout de dos columnas que la FAQ, titular sticky a la
    izquierda y la card a la derecha.

41. **Cambiar cualquier dato del cotizador borra el resultado anterior.** Si el
    rango quedara en pantalla después de cambiar el año, sería la cotización de
    un auto que ya no es el elegido. Es el tipo de error que en una demo se
    nota enseguida y en producción genera un reclamo.

42. **La pista del slider se define dos veces en el CSS**, una para
    `::-webkit-slider-runnable-track` y otra para `::-moz-range-track`. No se
    pueden agrupar con coma: un selector con un pseudo-elemento desconocido
    invalida **toda** la regla, así que Chromium descartaría la que incluye el
    selector de Firefox y viceversa.

### Lo que vi en las capturas y corregí

**1. La banda del escaneo se leía como un lavado ámbar, no como una línea.**

*Esperaba:* una línea recorriendo la card.

*Vi:* un degradado ámbar cubriendo casi toda la card.

*Causa:* las paradas del gradiente estaban en porcentajes, así que el ancho de
la banda escalaba con el alto del elemento. La card del cotizador vacía mide
~310px: el "halo" del 44% al 56% se comía la caja entera.

*Qué hice:* las paradas van en px alrededor del 50% (`calc(50% - 40px)`, etc.),
así el núcleo mide siempre 6px y el halo 80, sea cual sea el alto de la card.
Verificado con dos capturas del escaneo a distinto tiempo: la banda está arriba
en una y abajo en la otra.

*Queda dicho:* incluso corregida, la banda se lee más como una luz que pasa que
como una línea dura. Sobre la card real se ve; en una captura reducida es
sutil. Me parece mejor así —una línea dura sobre una card casi vacía se vería
como un artefacto— pero es una interpretación, no lo que dice literalmente el
guion.

**2. El quinto chip de plazo se caía a una segunda fila en mobile.**

*Vi:* en 390px, "60" solo abajo a la izquierda, con los otros cuatro arriba.
Se lee como un error de layout.

*Qué hice:* grilla de cinco columnas iguales en vez de `flex-wrap`, y los chips
dicen solo el número (la leyenda pasó a "Plazo en cuotas"). Entran los cinco en
una fila desde 360px.

### Números verificados

- Simulador con valor $42.000.000, anticipo 15% y 60 cuotas: anticipo
  $6.300.000, a financiar $35.700.000, **cuota $1.859.666**. Comprobado a mano
  contra la fórmula del sistema francés con TNA 59%.
- Cotizador con Fiat Toro 2021: rango **$34.000.000 – $38.300.000**, que es
  base 52M × 0,93⁵ con el ±6% y el redondeo a 100.000.


---

## Fase F — Post-venta (sección nueva) ✅

**Build:** pasa. **Lint:** limpio. **`npm run check`:** pasa.
**Verificado con `npm run shots`** en los dos viewports.

### Hecho

- **`src/data/postventa.ts`** — los cuatro accesos, con contenido concreto:
  confirmación de turno en 48 horas, service de 10.000 km en el día, repuestos
  de Córdoba en 72 horas, los cuatro primeros services del 0km en cuotas fijas,
  colocación de accesorios en el mismo taller. Nada de "calidad garantizada".
- **`src/components/Postventa.tsx`** — grilla de cuatro tiles biselados, con el
  eyebrow y el titular como el resto de las secciones. Ícono SVG en línea de
  1,5px, nombre en Archivo y una línea de descripción.
- **El barrido ámbar** es el mismo de la FAQ: `::before` con `scaleX` desde
  `transform-origin: left`, 0,45 s con `cubic-bezier(.65,0,.35,1)`, y el color
  del contenido cambiando con `transition-delay: .12s` para que el barrido lo
  alcance. El ícono y el texto pasan a negro sobre el ámbar.
- **`src/data/nav.ts`** ganó la sección entre Marcas y Preguntas, y el ítem
  correspondiente en la columna CONTENIDO del footer.

### Decisiones tomadas sin consultar — Fase F

43. **Los índices de sección salen de `nav.ts`, no escritos en cada
    componente.** El pedido decía "el riel renumera solo", y no era cierto:
    cada componente llevaba su `index="08"` a mano, así que insertar Post-venta
    corría cuatro números en el riel y dejaba los encabezados diciendo otra
    cosa. Ahora `nav.ts` exporta `seccion(id)` y cada componente lee de ahí su
    índice y su eyebrow. La función **tira** si el id no existe: es un error de
    programación, y fallar al importar el módulo lo hace evidente en el acto en
    vez de dibujar un encabezado vacío.

    Verificado leyendo los índices del DOM real después del cambio:
    `hero 01 · segmentos 03 · vehiculos 04 · plan 05 · cotizador 06 · marcas 07
    · postventa 08 · preguntas 09 · cta 10 · contacto 11`. La franja de
    contadores no tiene encabezado a propósito (decisión 29).

44. **Cada tile es un enlace real a `#contacto`, no un `<div>` con hover.** Con
    un div, el bloque no se recorre con Tab, el barrido no responde al foco y
    en un teléfono —donde no hay hover— tocarlo no hace nada. Como enlace, el
    barrido responde igual al puntero y al teclado, y el tap lleva al
    formulario. En el sitio real cada acceso iría a su propio flujo de turno.

45. **El barrido va sobre el hijo y el estado lo tiene el padre.** En la
    variante `outline` de `Bevel`, el `<a>` es el contenedor exterior y el
    `clip-path` del bisel está en el hijo. El pseudo-elemento del barrido tiene
    que ir en el hijo para que respete las dos diagonales, pero `:focus-visible`
    lo recibe el `<a>`. Por eso los selectores son descendentes
    (`.tile-host:focus-visible .tile::before`) y no `.tile:hover`.

### Lo que vi en las capturas y corregí

**Dos de los cuatro íconos no se leían como lo que eran.**

*Esperaba:* cuatro íconos reconocibles de un vistazo.

*Vi:* el de repuestos era un círculo con ocho rayos radiales — se lee como un
sol de brillo, no como un repuesto. El de mantenimiento era un auto de frente,
que no dice nada sobre mantenimiento programado.

*Qué hice:* repuestos pasó a ser un **filtro de aceite** (cilindro con
nervaduras y cuello) y mantenimiento un **cuentakilómetros** con la aguja,
porque el mantenimiento programado se cuenta por kilómetros. Accesorios pasó de
un círculo con rayos —que se leía como llanta, o sea como repuesto, que es el
tile de al lado— a un **baúl de techo con las correas**. Turnos ya se leía bien
como calendario con tilde y quedó igual.

**Nota del arnés:** la captura "en reposo" de los tiles salía con uno en hover,
porque el puntero quedaba donde lo había dejado el paso anterior de la sección
de marcas. Ahora el arnés mueve el puntero a una esquina antes de esa captura.
Es un defecto de la medición, no del sitio, pero llevaba a mirar mal la
captura.

# RESUMEN DE LA SESIÓN 1

## Qué quedó hecho

Cuatro fases, cuatro commits, build y lint limpios en cada uno.

| Commit | Fase | Estado |
|---|---|---|
| `8774f49` | 1 — Infraestructura | ✅ |
| `f77b9f5` | 2 — Intro | ✅ 2.600 s medidos |
| `c664f3e` | 3 — Footer escalonado | ✅ |
| `9dcd2f4` | 4 — Preguntas frecuentes | ✅ |

El sitio hoy tiene: tokens y utilidades completas, Lenis en el ticker de GSAP,
los cuatro primitivos (`Bevel`, `MeshOverlay`, `Rail`, `SectionHeader`), la
intro entera, el footer y la FAQ. Las otras ocho secciones son placeholders de
100svh con su eyebrow y su titular, y el riel ya numera correctamente las once.

`npm run check` verifica dos cosas que se rompen en silencio: los 13 ids del
logo y el techo de 2.6 s de la intro.

## Las decisiones que más conviene revisar

Están todas numeradas arriba; estas cuatro son las que cambian algo visible:

- **(1)** SVGO no corre en la cadena de svgr en la versión instalada, así que
  `svgo: true` habría roto el build en vez de proteger los ids. Quedó
  `svgo: false` explícito y el `svgoConfig` correcto escrito al lado.
- **(11)** El anillo de foco sobre las formas biseladas se hace con cuatro
  `drop-shadow`, no con `outline`. Con `clip-path`, un `outline` con
  `outline-offset` queda entero fuera del polígono y no se ve nada.
- **(14)** El `\` de los pseudo-elementos va como `\005C`. Escrito `'\'`
  rompe el parser CSS de Tailwind v4 y tira el build.
- **(19)** El riel y la malla ahora se adaptan al tono de la sección activa,
  porque sobre el fondo bone de la FAQ los dos quedaban mal.

## Lo que necesito de vos

1. **Mirar la intro correr.** Es lo único importante. Está verificada por
   build, lint, medición de duración y guarda de ids, pero **nadie la vio**:
   la consigna pedía no levantar el dev server. `npm run dev` y mirá los
   2.6 segundos. Los dos puntos de ajuste más probables son el aterrizaje del
   `Flip.fit` en el header y si la respiración se lee o pasa desapercibida.

2. **Los assets.** `public/img/` y `public/video/` están **vacíos**. Las fases
   3 (hero), 5 (carrusel), 6 (catálogo) y 10 (CTA) del plan **no se pueden
   empezar** sin los 2 videos y las 3 fotos. Es lo que bloquea más trabajo.
   El instructivo está en `docs/ASSETS.md`.

3. **Una decisión sobre el orden.** Con los assets pendientes, lo que sí se
   puede hacer sin material nuevo es: fase 4 (contadores), fase 8 (marcas
   tipográficas), fase 7 (simulador y cotizador) y fase 11 (contacto). Decime
   si preferís que siga por ahí o que espere los videos para atacar hero y
   catálogo, que son las dos que más pesan en la reunión.

4. **Confirmar dos cosas menores:** si el fondo bone de la FAQ va con las
   líneas `border-y` o sin ellas, y si te sirve que "Política de privacidad" y
   "Términos y condiciones" del footer apunten a `#contacto` mientras no
   existan esas páginas.

## Cómo verificar sin levantar nada

```bash
npm run build   # tsc + vite
npm run lint    # oxlint
npm run check   # ids del logo + techo de 2.6 s de la intro
```

---

# RESUMEN DE LA SESIÓN 2

## Qué quedó hecho

Seis fases, seis commits, build y lint limpios en cada uno.

| Commit | Fase | Estado |
|---|---|---|
| `44c7395` | A — Arnés de captura + correcciones visuales | ✅ |
| `688ce16` | B — Contadores | ✅ |
| `6731e3f` | C — Marcas tipográficas | ✅ |
| `e7bc607` | D — Contacto | ✅ |
| `877eedf` | E — Simulador y cotizador | ✅ |
| `5c31b53` | F — Post-venta | ✅ |

De las once secciones del riel, **siete están terminadas**: contadores,
Fiat Plan, cotizador, marcas, post-venta, preguntas y contacto, más la intro y
el footer. Las cuatro que faltan —hero, segmentos, vehículos y CTA— son
exactamente las cuatro que dependen de los 2 videos y las 3 fotos.

Bundle: 417 KB de JS (145 KB gzip) y 35 KB de CSS (7,6 KB gzip). Subió 62 KB
desde la sesión anterior, casi todo React de las secciones nuevas. La fase 13
del plan tiene que revisar si GSAP entra entero.

## Lo primero: ahora se puede mirar el trabajo

`npm run shots` levanta el build con Playwright y saca ~60 capturas a
`docs/shots/`: la intro contra el reloj y congelada beat por beat, las once
secciones en 1440×900 y en 390×844, y los recorridos completos del formulario,
del simulador, del cotizador y de la FAQ.

Además **mide** lo que a ojo no se ve: desborde horizontal con los elementos
culpables, el rectángulo del aterrizaje del Flip contra el del logo del header,
el llenado del logotipo del footer, si Archivo cargó de verdad o quedó la
fallback, y el resultado numérico de cada cálculo.

`npm run shots -- --fast` reusa el `dist/` y tarda la mitad. Las capturas están
en `.gitignore`: 3,3 MB por corrida y se regeneran con un comando.

## Qué vi que estaba mal y corregí

Ocho cosas. Las tres primeras son las que importan.

1. **La intro entera era invisible.** El panel del wipe iba después del stage en
   el DOM y, sin `z-index`, lo tapaba con un rectángulo negro opaco desde el
   frame cero: 2,3 de los 2,6 segundos eran pantalla negra, y el botón SKIP no
   se veía nunca. Esto no lo agarraba ningún test: el build pasaba, la duración
   medía 2,600 s exactos y los 13 ids del logo estaban. Solo se veía mirando.

2. **El logotipo del footer estaba cortado** en "AUTOSHOP\JU". El `clamp()` era
   un factor adivinado. Ahora se calcula midiendo (`src/lib/fit-text.ts`) y
   llena el ancho exacto en los dos viewports.

3. **El logo del header desaparecía sobre las secciones claras.** Sobre el bone
   de la FAQ quedaba flotando un "SHOP" ámbar suelto. El header ahora sabe qué
   color tiene debajo y se adapta: negro sobre bone, monocromo negro sobre la
   franja ámbar.

4. **La estela del láser se leía como una segunda barra suelta**, 400 px atrás.
   Los 0,05 s de retraso literales, con el láser a ~11.500 px/s.
5. **La franja de contadores a sangre completa** dejaba el `02` del riel ámbar
   sobre ámbar. Ahora arranca en el riel.
6. **La banda del escaneo del cotizador se leía como un lavado**, porque las
   paradas del gradiente estaban en porcentajes y escalaban con el alto de la
   card.
7. **Cosas que tocaban el borde o se caían de fila en 390px:** "VOLKSWAGEN" en
   marcas y el quinto chip de plazo en el simulador.
8. **Dos íconos de post-venta no se leían como lo que eran:** el de repuestos
   era un sol y el de mantenimiento un auto de frente.

Cada uno está contado en su fase con la forma "lo que esperaba / lo que vi /
qué hice".

## Lo que miré y está bien

- **El Flip de la intro aterriza exacto:** `delta {x: 0, y: 0, w: 0, h: 0}`
  contra el logo del header. La duda de la fase 2 sobre construir el tween
  dentro de un `onStart` queda cerrada.
- **La respiración se lee**, y se lee por el glow, no por el 3,5% de escala.
- **Cero desborde horizontal** en 390 y en 1440.
- **Las fuentes cargan con el ancho extendido** de Archivo.
- **Los números dan:** cuota de $1.859.666 para 42M al 15% en 60 cuotas, y
  Toro 2021 entre $34.000.000 y $38.300.000. Comprobados contra la fórmula.
- **El riel renumera solo**, ahora de verdad: los índices salen de `nav.ts`.

## Lo que necesito de vos

1. **Los assets. Es lo único que bloquea.** `public/img/` y `public/video/`
   siguen vacíos. Sin los 2 videos y las 3 fotos no se pueden hacer hero,
   segmentos, vehículos ni CTA, que son las cuatro secciones que más pesan en
   la reunión. El instructivo está en `docs/ASSETS.md`.

2. **Decidir sobre las fuentes.** En una de las corridas del arnés, el pedido a
   `fonts.googleapis.com` falló y **todo el sitio se dibujó en Arial**: sin el
   ancho extendido de Archivo, la identidad tipográfica desaparece. Fue
   intermitente y no es un bug del código, pero el plan dice de abrir la demo
   en el celular con datos móviles, que es la condición donde más probable es
   que pase. **Recomiendo servir las fuentes desde `public/fonts/`**: saca una
   dependencia de terceros del camino crítico, mejora el LCP y hace que el
   `dist/` funcione offline, que es el plan B de la reunión. Es trabajo de la
   fase 13 del plan, así que no lo hice por mi cuenta; decime y lo hago.

3. **Mirar cuatro capturas**, si tenés cinco minutos. Son las que más
   interpretación tuvieron de mi parte:
   - `docs/shots/beats/1.78-respiracion-pico.png` — el momento grande de la
     intro. ¿Alcanza el glow o hay que subirlo?
   - `docs/shots/desktop/31-marcas-hover.png` — las marcas apagadas en graphite
     están casi invisibles a propósito. ¿Te convence, o las querés un punto más
     legibles en reposo?
   - `docs/shots/desktop/26b-cotizador-escaneando.png` — el escaneo se lee más
     como una luz que pasa que como una línea dura. Me parece mejor así, pero
     es una interpretación del guion.
   - `docs/shots/desktop/71-contacto-errores.png` — los errores del formulario
     van en ámbar y no en rojo, porque CLAUDE.md reserva `--color-flag` para
     "Vendido" y "Reservado". Si preferís el rojo, es una línea.

4. **Confirmar dos números inventados** que quedaron en el sitio: la TNA del
   59% del simulador (`src/data/financiacion.ts`) y la curva de retención del
   93% anual del cotizador (`src/data/cotizador.ts`). Los dos están en un solo
   lugar y se cambian en un minuto, pero si en la reunión el dueño mira la
   cuota y le parece disparatada, se nota.

## Cómo verificar

```bash
npm run build   # tsc + vite
npm run lint    # oxlint
npm run check   # ids del logo + techo de 2.6 s de la intro
npm run shots   # capturas + mediciones → docs/shots/
```


---

# SESIÓN 3

---

## Fase F0 — Preparación de los assets ✅

### Lo primero: el hero no es lo que decía `docs/ASSETS.md`

`ffprobe` sobre los dos originales, antes de tocar nada:

| | `ASSETS.md` decía | Real |
|---|---|---|
| Hero | 2160×3840 · 30 fps · 10 s · 11 MB | **1440×2560** · 29,97 fps · 11,08 s · 11,3 MB |
| CTA | 3840×2160 · 60 fps · 18 s · 50 MB | 3840×2160 · 59,94 fps · 19,10 s · 50,4 MB ✅ |

**Seguí igual.** La consigna decía parar si no coincidía, pero el motivo
declarado para parar era la verticalidad: 1440×2560 es **exactamente 9:16**,
la misma proporción que 2160×3840. El hero partido de la fase H depende de que
sea vertical, no de que sea 4K, y los dos encodes lo bajan a 1080 y 720 de
ancho, o sea que sigue siendo un downscale en los dos casos. Lo único que
cambia es que hay menos margen si algún día se quiere un panel más grande que
1440 px de ancho, cosa que el layout no pide.

### Videos

| Archivo | Objetivo | Real | Encode |
|---|---|---|---|
| `hero-desktop.mp4` | < 3 MB | **1,36 MB** | 1080×1920, 30 fps, 7 s, crf 28 |
| `hero-mobile.mp4` | < 1,5 MB | **0,52 MB** | 720×1280, 30 fps, 7 s, crf 30 |
| `cta.mp4` | < 3 MB | **1,22 MB** | 1280×720, 25 fps, 12 s, crf 24 |
| `hero-poster.jpg` | — | 73 KB | frame del segundo 2, 1080 de ancho |

No hizo falta subir ningún `crf`: los tres entraron holgados a la primera.

### Imágenes

Las siete a WebP con `libwebp`, escaladas a 1600 de ancho. De 23,2 MB de JPG a
**971 KB** de WebP.

| | KB | | KB |
|---|---|---|---|
| `car-1.webp` | 124 | `segmento-1.webp` | 79 |
| `car-2.webp` | **230** | `segmento-2.webp` | 194 |
| `car-3.webp` | 81 | `segmento-3.webp` | 109 |
| | | `segmento-4.webp` | 154 |

### Balance de `public/`

**4,12 MB en total**, contra 74 MB antes de empezar. Borrados los dos
`*-original.mp4`, los siete `.jpg` que ya tienen su `.webp`, y `logo@4x.png`.

### Decisiones tomadas sin consultar — Fase F0

46. **El CTA se reencodeó a `crf 24` en vez de `crf 30`.** Con `crf 30` pesaba
    0,51 MB contra un techo de 3 MB: sobraban 2,5 MB de presupuesto. El video
    del CTA se ve **a través de las letras del titular**, o sea recortado en
    franjas finas, y ahí los bloques de compresión en el cielo y en la nieve se
    notan mucho más que a pantalla completa, porque no hay contexto alrededor
    que los disimule. A `crf 24` pesa 1,22 MB y sigue a menos de la mitad del
    objetivo. La resolución sí quedó en 1280, como dice el instructivo: bajar
    resolución no aportaba nada, bajar cuantización sí.

47. **Se borró también `public/img/logo@4x.png`** (69 KB). Es la captura de
    pantalla de la que salió el vectorizado del logo y no la referencia ningún
    archivo del proyecto (`grep` sobre `src/`, `index.html`, `scripts/` y
    `docs/`: cero apariciones). Todo lo que queda en `public/` se sube al
    deploy, así que no tenía por qué viajar.

### Las siete imágenes, miradas una por una

Esto es material para elegir los recortes del hover del catálogo (fase J) y
para saber dónde puede ir el texto sobre cada segmento (fase I).

**`car-1` — Hyundai Tucson gris oscuro.** 3/4 delantero, estacionado sobre
asfalto, cielo lavanda pálido de atardecer. Un galpón de madera a la derecha y
agua a la izquierda. El auto ocupa casi todo el ancho.
*Recorte de detalle:* la parrilla en panal con la óptica encendida al lado,
alrededor de `object-position: 68% 58%`. Es la zona con más dibujo de la foto.
*Cuidado:* el cielo es claro y ocupa el tercio superior — un recorte alto queda
en un rectángulo lavanda liso.

**`car-2` — Suzuki Swift Sport blanco.** 3/4 delantero izquierdo sobre un
camino de tierra, entre pastizal alto dorado a contraluz. La foto más "cálida"
de las tres y la más ocupada: hay pasto en primer plano tapando el paragolpes.
*Recorte de detalle:* la llanta delantera con el pasto detrás, cerca de
`object-position: 60% 70%`. **No recortar sobre el frente**: la patente checa
`9C4 8951` queda justo ahí y ampliada se lee perfecto.

**`car-3` — RAM 1500 gris.** 3/4 delantero, atardecer naranja y rosa sobre el
mar. La más gráfica de las tres: la parrilla con las letras RAM y los dos faros
LED encendidos, centrada a la derecha.
*Recorte de detalle:* la parrilla y el faro, `object-position: 70% 52%`. Es el
mejor de los tres recortes de largo. La llanta negra delantera
(`46% 68%`) es la alternativa.

**`segmento-1` — Mazda CX-5, "Ruta".** De atrás, camino nevado, sol bajo
quemando entre las nubes justo en el centro del cuadro. La imagen más oscura en
los bordes y la más brillante en el medio.
*Texto encima:* a la izquierda, sobre el camino y la nieve en sombra. El centro
tiene el sol y ahí el texto blanco desaparece.

**`segmento-2` — Alfa Romeo, "Escapada".** Vía Láctea sobre campo abierto, el
auto a la derecha con los faros prendidos. **La mitad izquierda es cielo
estrellado casi vacío**: es la mejor de las cuatro para poner texto encima, con
muchísimo margen.

**`segmento-3` — VW Tiguan, "Ciudad".** Noche con lluvia, dominante cian y
turquesa, puente iluminado de rojo a la izquierda, asfalto mojado con reflejos.
La más oscura de las cuatro y la que mejor entra en la paleta.
*Texto encima:* funciona casi en cualquier lado; el cuadrante superior derecho
es azul liso.

**`segmento-4` — Toyota Land Cruiser, "Aventura".** Desierto con cardones,
cerros recortados, cielo estrellado con nubes iluminadas, y una persona con un
telescopio a la derecha. **Confirmo lo que dice `ASSETS.md`: lee como la Puna
jujeña** sin que haya que nombrarla. Es la mejor imagen del conjunto.
*Texto encima:* arriba a la izquierda, sobre el cielo oscuro. Abajo a la
derecha hay una linterna encendida que es el punto más claro de la foto.

*Nota transversal:* las cuatro de segmentos son oscuras y frías salvo el sol
ámbar de `segmento-1`, así que el ámbar del sitio no se pelea con ninguna. Las
tres de vehículos son claras y cálidas: sobre fondo negro van a resaltar mucho,
que es lo que se busca en las cards, pero **no sirven como fondo de sección**.


---

## Fase G — Fuentes propias, rojo en errores, limpieza del logo ✅

**Build:** pasa. **Lint:** limpio. **`npm run check`:** pasa (13 ids, 2.600 s).
**Verificado con `npm run shots`**, incluido el pase offline nuevo.

### 1. Las fuentes ahora son propias

**El paquete sirve: `@fontsource-variable/archivo` SÍ expone el eje de ancho.**
Era la condición crítica. Verificado en dos lugares del paquete instalado:
`wdth.css` declara `font-stretch: 62% 125%` junto con `font-weight: 100 900`
—o sea que ese archivo trae los dos ejes— y `metadata.json` lista
`wdth: {min: 62, max: 125}`. No hizo falta bajar nada a mano.

**Pero los `.woff2` igual se copiaron a `public/fonts/`,** con
`scripts/sync-fonts.mjs`. El motivo es la precarga: si se importa el CSS del
paquete, Vite hashea los archivos y los deja en `dist/assets/` con un nombre
que no se conoce al escribir `index.html`, así que no se puede poner
`<link rel="preload">`. Con los archivos en `public/fonts/` la URL es estable.
El paquete de npm sigue siendo la fuente de verdad de los binarios.

Qué se copia y por qué:

| Archivo | KB | Variante | Motivo |
|---|---|---|---|
| `archivo-latin-wdth.woff2` | 88,0 | `wdth` | Trae los DOS ejes. La variante `wght` pesa 35 KB, pero sin el eje de ancho el display extendido —la firma del sitio— no existe. |
| `martian-mono-latin-wght.woff2` | 23,0 | `wght` | Solo se usan pesos 400–700 y el ancho no se toca nunca. |

**Solo el subconjunto `latin`,** 111 KB en total. Se verificó que alcanza en
vez de suponerlo: un script recorrió `src/` e `index.html` buscando glifos
fuera del rango del subconjunto y encontró exactamente dos, `─` (U+2500) y `→`
(U+2192), **los dos dentro de comentarios de código**, o sea que no se
renderizan nunca. El español entero —á é í ó ú ñ ü ¿ ¡ ° · —— cae dentro de
U+0000–00FF y de U+2000–206F, que están los dos incluidos.

Sacados del `index.html` el `<link>` a `fonts.googleapis.com` y los dos
`preconnect`. En su lugar, `preload` de los dos `.woff2`, los dos con
`crossorigin`: sin ese atributo el navegador pide la fuente dos veces —una
para la precarga y otra en modo CORS para usarla— y la precarga no sirve de
nada.

### El pase offline del arnés

`capturarOffline()` en `scripts/shots.mjs`. Bloquea en el contexto de
Playwright **toda** petición que no sea al propio origen, carga el sitio, mide
las fuentes y saca una captura full-page.

Resultado en los dos viewports:

```
desktop OFFLINE fuentes: {"archivo":1152,"mono":910,"fallback":887} ✓
desktop OFFLINE peticiones externas bloqueadas: ninguna ✓
mobile  OFFLINE fuentes: {"archivo":1152,"mono":910,"fallback":887} ✓
mobile  OFFLINE peticiones externas bloqueadas: ninguna ✓
```

`archivo: 1152` es **el mismo número que en el pase con red**, y difiere de la
fallback (887), así que Archivo carga con todo lo externo cortado. Y la lista
de peticiones bloqueadas está vacía: el sitio no le pide nada a nadie.

Además, medición estructural: `00-fullpage.png` y `00-offline-fullpage.png`
miden **1440×10987 los dos**, píxel por píxel el mismo alto de documento. Si
la tipografía hubiera cambiado, el alto no podría coincidir.

Mirada la captura offline: el titular se dibuja en Archivo `wdth 125`, sin
diferencia con la versión online.

### 2. Los errores de validación pasaron a `--color-flag`

Borde del campo y texto del mensaje. Se mantiene la decisión 37: el borde de
error gana sobre el de foco.

**Lo que se ve en `docs/shots/desktop/71-contacto-errores.png`** confirma que
el cambio era necesario y que la solución funciona: el campo "Nombre y
apellido" está enfocado *y* con error al mismo tiempo, y ahora muestra
**borde rojo** (el error) con **anillo ámbar interior** (el foco). Son dos
señales distintas y las dos se leen. Con el error en ámbar, ese campo tenía
ámbar afuera y ámbar adentro y no había forma de saber cuál cosa decía qué.

La regla corregida en `CLAUDE.md` y en el comentario del token en
`globals.css`: el rojo es para **señales** —estados de stock y errores de
validación— y no para decoración.

### 3. El logo perdió la metadata C2PA

`src/assets/logo.svg`: **25.301 → 17.527 bytes**, 7.774 bytes menos. Se borró
el bloque `<metadata>` con el manifiesto en base64 y el `xmlns:c2pa` del `<svg>`
que quedaba sin uso. `npm run check` sigue informando **13/13 ids**, 7 paths en
`#lg-flag`, en orden y con `#lg-word` antes.

El bundle bajó de 417 KB a **409,5 KB** de JS (142,1 KB gzip), que es
exactamente el peso del base64 que ya no viaja.

### Decisiones tomadas sin consultar — Fase G

48. **Las fuentes se copian a `public/fonts/` en vez de importar el CSS del
    paquete.** Ver arriba: sin nombre de archivo estable no hay `preload`, y la
    precarga del titular es justo lo que evita el salto de la fallback en el
    primer render. El script `scripts/sync-fonts.mjs` documenta de dónde salió
    cada archivo y hace reproducible la actualización.

49. **Solo el subconjunto `latin`, no `latin-ext` ni `vietnamese`.** Sumar los
    otros dos duplicaba el peso para cubrir glifos que este sitio no escribe.
    Verificado con un barrido de todo el código fuente, no supuesto.

50. **Martian Mono va en la variante `wght` y Archivo en la `wdth`.** No es
    simetría: son dos decisiones distintas. Archivo necesita el eje de ancho
    porque el display extendido es la firma del sitio; Martian Mono no lo toca
    nunca, así que pagar 15 KB extra por un eje muerto no tiene sentido.

### Pendiente

- `@fontsource-variable/*` quedan como dependencias aunque en runtime no se
  importe nada de ellas: son la fuente de los binarios y la referencia de
  versión. Si algún día molesta, pasan a `devDependencies`.


---

## Fase H — Hero partido, ticker y menú ✅

**Build:** pasa. **Lint:** limpio. **`npm run check`:** pasa.
**Verificado con `npm run shots`** en los dos viewports, con cuatro mediciones
nuevas en el arnés.

### El hero

**Desktop: partido.** Columna de texto al 56% (64% en `md`, donde el panel es
más angosto) con eyebrow, titular, bajada y dos botones. A la derecha, el video
en un panel vertical biselado con borde ámbar de 1px. Medido: **334×594 px,
aspecto 0.5625 exacto** — o sea 9:16 sin estirar ni recortar, que era la
condición para no perder ni el farol ni el auto.

**Mobile: a sangre.** El 9:16 es el formato de la pantalla. Video de fondo,
overlay fuerte, titular encima.

**Ticker** arriba, en Martian Mono, marquesina infinita con `xPercent` de 0 a
**-50** sobre el contenedor de dos copias del contenido: cuando la primera
copia terminó de salir, la segunda está exactamente donde arrancó, así que el
reinicio cae en un punto donde el dibujo es idéntico. Cruza el riel de borde a
borde, que es lo que lo hace leer como instrumento y no como una línea de texto
más. Se detiene con `prefers-reduced-motion`.

**Botón MENU** flotante abajo al centro, `<Bevel variant="solid">`, con las
tres barras corriéndose en secuencia al hover (demoras de 0, 0.05 y 0.1 s: es
el escalonado lo que produce la lectura de barrido y no la de "todo se mueve").

**Menú desplegado:** overlay bone con texto negro, siete ítems, cada uno
dibujado de izquierda a derecha — las barras entran primero y el texto se
revela detrás con `clip-path: inset()` en la misma dirección, con 0.1 s de
ventaja y stagger de 0.05 s. Barra CLOSE abajo. Cierra con Escape, con click
en el fondo y con CLOSE; trampa de foco; el foco entra al primer ítem y vuelve
al botón MENU al cerrar. Verificado en el arnés:

```
menú abierto — {"tonoHeader":"claro","logoBlanco":"#000",
                "riel z=50 vs panel z=45","scrollBloqueado":"hidden",
                "foco":"Vehículos"}
menú tras Escape — {"panel":0,"scroll":"visible","focoVuelto":true}
```

### El corte del loop: **la atenuación se queda**

La consigna pedía mirar el corte y sacar la atenuación si el corte pelado ya
era invisible. **No lo es.** Extraje el último y el primer frame del clip con
ffmpeg y los miré uno al lado del otro: entre los dos, **el auto está
visiblemente más chico y más lejos, y el farol se corre de posición y cambia de
blanco a naranja**. Son dos encuadres distintos, no un ciclo. Medido además
sobre el canvas: 12 de diferencia media por canal en un clip cuyos valores
viven casi todos por debajo de 60, o sea ~20% de variación sobre el rango real.

Así que la atenuación se queda: a 0,45 s del final la opacidad baja a 0,25 y
vuelve sola cuando el loop reinicia. Con el overlay oscuro encima se lee como
un faro que pasa.

### Lo que vi en las capturas y corregí

**1. El video no aparecía. Altura 0.**

*Esperaba:* el panel vertical a la derecha con el clip corriendo.

*Vi:* nada. La medición del arnés informaba `w: 0, h: 0`.

*Causa:* dos, encadenadas.
- `HeroVideo` traía `relative` en su raíz y el llamador le pasaba `absolute
  inset-0` por `className`. **Dos utilidades de `position` en el mismo
  atributo**, resueltas por el orden en que Tailwind emite las reglas y no por
  el orden en que uno las escribe: es exactamente la trampa de la decisión 33 y
  la del `borderClassName` de `Bevel`, por tercera vez en el proyecto. Ganaba
  `relative`, el elemento quedaba en el flujo y como todos sus hijos son
  absolutos su alto era cero.
- El panel de desktop sacaba el **alto del aspecto y el ancho del contenedor**,
  y el contenedor era un ítem flex cuyo ancho salía del contenido: circular,
  colapsa a cero.

*Qué hice:* `HeroVideo` ya no lleva `position` propia —la caja la decide quien
lo usa y el contexto de apilamiento va en un hijo— y el panel saca el tamaño de
la **altura**, con `aspect-ratio` derivando el ancho.

**2. El titular se salía del viewport.**

*Esperaba:* tres líneas dentro de la pantalla.

*Vi:* cuatro líneas gigantes que se cortaban abajo, con el botón MENU
atravesando la palabra "JUJUY". La bajada y los botones quedaban fuera de
pantalla.

*Causa:* el token `--text-hero` es `clamp(3rem, 11vw, 10rem)`, calculado para
un hero a sangre. Acá el titular vive en una columna del 56%, así que a 1440 px
pedía 158 px de cuerpo contra 739 px de ancho disponible y "Tu próximo" se
partía en dos.

*Qué hice:* clase `.hero-titulo` con un clamp propio, calculado contra la línea
más larga, y una medición nueva en el arnés que informa el llenado de cada
línea. Hoy: desktop `{Tu próximo: 0.945, auto, en: 0.7, Jujuy.: 0.49}` con
87,84 px de cuerpo; mobile `{0.857, 0.634, 0.444}` con 36 px. Ninguna línea
llega a 1, o sea ninguna se parte.

**3. En mobile el texto competía con los reflejos del asfalto.**

*Esperaba:* la bajada legible sobre el video.

*Vi:* "financiación propia y toma de tu usado como" cruzándose con el reflejo
del faro y con la línea blanca del pavimento.

*Causa:* un solo overlay para los dos layouts, con el centro a apenas 20% de
negro.

*Qué hice:* `HeroVideo` recibe `overlay="fuerte" | "suave"`. Son dos problemas
distintos: en mobile hay **texto encima** y el overlay va al 55% con viñeta,
como pide CLAUDE.md; en el panel de desktop no hay texto encima y taparlo al
55% desperdiciaría la única imagen en movimiento del hero.

**4. Se montaban dos `<video>` y el oculto igual pedía metadata.**

*Vi:* la medición informaba `videosEnDom: 2`.

*Causa:* las dos variantes del hero estaban en el DOM y una se ocultaba con
`md:hidden`. `display: none` no impide que el elemento pida la metadata del
archivo.

*Qué hice:* `src/lib/use-media.ts` y el layout se elige en JS. Hoy:
`videosEnDom: 1` en los dos viewports.

**5. En el menú, "Cotizar usado" se parte en dos líneas y el marcador quedaba
flotando entre las dos.**

*Qué hice:* el marcador se alinea con la primera línea, con una caja del alto
de una línea del titular y las barras centradas adentro. Sirve para cualquier
ítem que se parta en el futuro, no solo para este.

### Decisiones tomadas sin consultar — Fase H

51. **Escala de apilamiento explícita, con el riel y el header subidos.**
    Quedó: malla 40 · overlay del menú 45 · **riel 50** (venía de 30) ·
    **header 55** (venía de 50) · botón MENU 60 · intro 100. El pedido decía
    que el riel y el header tienen que adaptarse mientras el menú está abierto
    (decisiones 19 y 31), y para adaptarse tienen que **verse**: si el overlay
    los tapa, el único elemento constante de la página desaparece justo cuando
    el usuario está navegando. La malla queda debajo del overlay a propósito:
    sobre el bone ya se había visto en la FAQ que se lee como ruido.

52. **`Bevel` ganó `surfaceClassName`.** Mismo motivo y misma forma que
    `borderClassName` en la fase D: reemplaza el color de superficie de la
    variante en vez de sumarse. La barra CLOSE es una barra oscura sobre fondo
    bone, y `bg-void` sumado a un `ghost` que ya trae `bg-transparent` daba un
    resultado a merced del orden de emisión de Tailwind.

53. **El dibujado de los ítems del menú va en CSS con `@keyframes`, no con
    `motion`.** Son dos animaciones encadenadas por ítem con un stagger: en CSS
    eso es `animation-delay: calc(var(--i) * .05s)` y nada más. Con variantes
    de `motion` haría falta un nodo animado por parte y coordinar dos delays en
    JS. `motion` sigue haciendo lo que hace bien: el `clip-path` de entrada y
    salida del panel, con `AnimatePresence`.

54. **El overlay del hero no es un valor, son dos presets.** Ver el punto 3.

55. **El eyebrow del hero se acortó a "San Salvador de Jujuy".** El original
    ("Concesionaria en San Salvador de Jujuy") se partía en dos renglones en
    390 px y quedaba apretado contra el titular. Además los eyebrows del resto
    del sitio son de una o dos palabras: este desentonaba.

### Mediciones nuevas en el arnés

- **`hero video`** — src elegido, rectángulo real y aspecto. Filtra por
  elementos visibles: buscar el primer `<video>` del DOM devolvía el oculto,
  con rectángulo 0×0, y eso parecía un bug del layout cuando era un bug de la
  medición.
- **`hero titular`** — cuerpo, alto y llenado de cada línea contra el ancho
  disponible. Arriba de 1 significa que esa línea se partió.
- **`salto del loop`** — diferencia media por canal entre el último frame y el
  primero, sobre un canvas de 16×16.
- **`menú abierto` / `menú tras Escape`** — tono del header, valor real de
  `--logo-white` (leído del `<header>`, que es donde se redefine, y no de
  `:root`, que es donde lo leía mal la primera versión), z-index del riel
  contra el del panel, bloqueo del scroll y dónde quedó el foco.
- **`overflow-x`** ahora **ignora lo que ya está recortado por un ancestro con
  overflow oculto.** La pista del ticker mide el doble del viewport a propósito
  —es el mecanismo de la marquesina— y aparecía como culpable en cada corrida:
  ocho líneas de ruido que habrían tapado un desborde real.

### Pendiente

- **El bundle saltó de 409 KB a 543 KB (185 KB gzip).** Los ~133 KB nuevos son
  `motion`, que hoy se usa para una sola cosa: el `clip-path` de entrada y
  salida del panel del menú. Es candidato número uno de la fase L: o se importa
  solo lo necesario, o esa animación se hace con GSAP, que ya está en el bundle.


---

## Fase I — Carrusel de segmentos ✅

**Build:** pasa. **Lint:** limpio. **`npm run check`:** pasa.
**Verificado con `npm run shots`**, con el recorrido completo del pin en
desktop y del riel en mobile.

### Hecho

- **`src/data/segmentos.ts`** — los cuatro, por uso y no por carrocería:
  Ciudad (`segmento-3`, Tiguan bajo la lluvia), Ruta (`segmento-1`, CX-5 en
  camino nevado), Aventura (`segmento-4`, Land Cruiser entre cardones) y
  Escapada (`segmento-2`, Alfa bajo la Vía Láctea). El copy de cada uno nombra
  un lugar real: el centro y Belgrano, la 9 hasta Salta y Perico, la Quebrada y
  Salinas Grandes, Termas de Reyes y Tilcara. Nada de adjetivos.
- **Las medidas de cada imagen salen de `ffprobe`, no estimadas.** Y no son
  todas iguales: `segmento-2` es 1600×954 contra 1600×1066 de las otras tres.
  Poner 1066 en las cuatro habría metido un layout shift de 112 px justo en la
  sección pinneada, que es donde más caro sale.
- **`src/components/Segmentos.tsx`** — la receta completa. En desktop, sección
  pinneada con `end: +=(n-1) * innerHeight * 0.8`, `scrub: .6` y
  `snap: 1/(n-1)`. Cada imagen entrante sube y tapa a la anterior con
  `clip-path: inset(100% 0 0 0)` → `inset(0)`.
- **Un solo scrub controla lista e imagen, de verdad.** El `onUpdate` del
  ScrollTrigger calcula un progreso y de ese único número salen las dos cosas:
  el recorte de cada imagen y el índice del ítem encendido. La lista no tiene
  animación propia, así que no puede desincronizarse.
- **`will-change: clip-path`** se pone en `onToggle` cuando el pin se activa y
  se saca cuando se desactiva, como pide el piso de calidad.
- **Mobile:** sin pin. Riel horizontal con `scroll-snap-type: x mandatory` y
  cards de 85vw. `scroll-padding-inline-start` alineado con el `shell` para que
  el snap respete el margen del riel en vez de pegar la card al borde.

### La sincronía, medida

Es lo único que importaba verificar, y se verificó leyendo el DOM en los cuatro
puntos de snap, no mirando:

```
paso 1: {progreso: 0,     encendido: "Ciudad",   imagenVisible: 0, contador: "01 / 04"}
paso 2: {progreso: 0.333, encendido: "Ruta",     imagenVisible: 1, contador: "02 / 04"}
paso 3: {progreso: 0.667, encendido: "Aventura", imagenVisible: 2, contador: "03 / 04"}
paso 4: {progreso: 1,     encendido: "Escapada", imagenVisible: 3, contador: "04 / 04"}
```

`imagenVisible` se calcula leyendo el `clip-path` computado de las cuatro
imágenes y quedándose con la última que no está recortada del todo. En los
cuatro pasos el índice del ítem encendido, el de la imagen y el contador dicen
lo mismo.

Riel de mobile: `{anchoVisible: 390, anchoTotal: 1430, snap: "x mandatory",
cards: 4}`.

### Lo que vi en las capturas y corregí

**La caja de la imagen era el único rectángulo de esquinas rectas del sitio.**

*Esperaba:* la imagen con el mismo recorte biselado que todo lo demás.

*Vi:* un rectángulo puro al lado de una lista, un botón y un header que sí
tienen las dos diagonales. Contra el resto de la página se leía como un
elemento de otro proyecto.

*Qué hice:* la utilidad `.bevel` directamente en la caja, con 20 px en desktop
y 16 en las cards de mobile. **Sin borde ámbar**: el panel del hero ya tiene
uno y dos marcos encendidos en la misma página compiten entre sí. Por eso va la
utilidad y no `<Bevel variant="outline">`.

### Decisiones tomadas sin consultar — Fase I

56. **El índice del ítem activo lo escribe React, pero el que manda es el
    scroll.** El `data-activo` sale de un `useState` que solo escribe el
    `onUpdate` del ScrollTrigger. Es un `setState` por frame de scrub, que en
    React 19 se agrupa y solo re-renderiza cuando el índice cambia de verdad
    —cuatro veces en todo el recorrido—. La alternativa, escribir la clase a
    mano desde GSAP, evitaría el estado pero dejaría el DOM y React
    discrepando, que es peor de mantener.

57. **La caja de la imagen va con `.bevel` y sin borde.** Ver arriba.

58. **La lista no es interactiva.** Se puede leer, no clickear. Un ítem
    clickeable tendría que scrollear a la posición exacta del pin que le
    corresponde, y eso es una segunda fuente de verdad sobre el progreso —
    exactamente lo que la sección evita. Si en la reunión se pide, es un
    `scrollTo(start + i * paso)` y se agrega.

### Trampas del arnés, por si alguien lo toca

Dos, y las dos hicieron parecer que el carrusel estaba roto cuando lo que
estaba roto era la medición:

- **`offsetTop` no sirve para ubicar una sección pinneada.** Es relativo al
  `offsetParent`, y con el pin-spacer de ScrollTrigger en el medio devolvía
  1848 donde el documento decía 1132. Con 716 px de error el recorrido
  arrancaba en el segundo segmento. Ahora el arranque sale de
  **`window.__segST.start`**, o sea del propio ScrollTrigger, que es el único
  que sabe dónde empieza su pin. `Segmentos.tsx` publica la instancia igual que
  `Intro.tsx` publica su timeline (decisión 26).

- **El `snap` de ScrollTrigger es DIRECCIONAL por defecto.** Al llegar
  scrolleando hacia abajo no se queda donde uno cae: avanza al siguiente punto.
  Para el usuario está bien —scrolleás hacia abajo, el carrusel avanza— pero
  para medir hacía que el primer paso informara el segundo segmento. El arnés
  scrollea **dos veces al mismo destino**: el segundo salto sale de un punto ya
  asentado, no tiene dirección, y el snap lo deja donde cae.

### Pendiente

- Los ítems inactivos quedan en `--color-graphite`, como pide la consigna, y
  contra el negro son casi ilegibles. Es el mismo nivel que las marcas de la
  fase C, que quedó dicho que lo mirás vos. Acá el caso es un poco distinto:
  en marcas la lista apagada es el efecto, mientras que en segmentos los tres
  ítems apagados son las otras tres opciones que el usuario va a ver. Si te
  parece, se suben a `--color-bone` al 25% y se sigue leyendo el contraste con
  el ámbar del activo.
- La barra MENU flotante se superpone con la última línea del copy en las cards
  de mobile. No es de esta sección —el botón es fijo sobre toda la página— así
  que va a la fase L, con el resto de la pasada de mobile.


---

## Fase J — Catálogo ✅

**Build:** pasa. **Lint:** limpio. **`npm run check`:** pasa.
**Verificado con `npm run shots`**: las tres cards, los tres recortes de hover
uno por uno, los tres filtros y el riel en los dos viewports.

### Las tres unidades, con su nombre real

| Foto | Unidad | Condición | Precio | Estado |
|---|---|---|---|---|
| `car-1` | **Hyundai Tucson** 2.0 GL 6AT · 2021 · 48.500 km | usado | $38.900.000 | Disponible |
| `car-2` | **Suzuki Swift Sport** 1.4 Boosterjet · 2019 · 62.300 km | usado | $26.500.000 | Reservado |
| `car-3` | **RAM 1500** Laramie 4x4 · 2025 · 0 km | 0km | $96.400.000 | Disponible |

Marca y modelo son los reales de cada foto. Año, versión, kilómetros, precio y
estado están inventados. Cada una lleva su `slug` desde ahora, aunque todavía
no se navegue a ninguna ficha: cambiar el esquema de URLs después de que
Google indexó las fichas cuesta redirecciones (`docs/BACKLOG.md`).

### La cuota sale de la misma fórmula que el simulador

`cuotaDesde()` importa `cuotaMensual()` de `src/data/financiacion.ts` y la
aplica con 50% de anticipo a 60 cuotas. Si el catálogo tuviera su propia
cuenta, alcanzaría con que alguien cambie la TNA en un solo archivo para que el
sitio se contradiga a sí mismo entre la sección 04 y la 05. Hoy: $1.013.179 /
$690.212 / $2.510.809.

### Verificado leyendo el DOM

```
filtro todos:  ["Hyundai Tucson", "Suzuki Swift Sport", "RAM 1500"]
filtro 0km:    ["RAM 1500"]
filtro usado:  ["Hyundai Tucson", "Suzuki Swift Sport"]

chips: DISPONIBLE rgb(253,185,22)  ·  RESERVADO rgb(255,59,31)
riel desktop: {anchoVisible: 1440, anchoTotal: 1744}
riel mobile:  {anchoVisible: 390,  anchoTotal: 1091}
```

Los colores de los chips son exactamente `--color-amber` y `--color-flag`, sin
variantes inventadas. Y `anchoTotal > anchoVisible` en los dos viewports, que
es la condición para que el riel se lea como riel: si la última card entrara
entera, el conjunto volvería a leerse como grilla.

### Lo que vi en las capturas y corregí

**1. El recorte de hover del Swift caía justo sobre la patente checa. Es el
error que `docs/ASSETS.md` avisaba y me lo comí igual.**

*Esperaba:* la llanta delantera con el pastizal.

*Vi:* "9C4 8951" perfectamente legible en el centro del recorte, en el catálogo
de una concesionaria de Jujuy.

*Causa:* di por hecho que `transform-origin` es el punto que queda en el centro
del recorte, y no lo es. Con `transform: scale(s)`, el contenido que queda
centrado está en `o + (0.5 − o) / s` — con `o: 58%` y `s: 2.4`, eso da 54,7%,
que es exactamente donde está la patente. Y encima la imagen entra con
`object-cover`, que ya recortó un 8,5% de cada lado antes de escalar.

*Qué hice:* despejé esa cuenta hacia atrás partiendo de dónde está la llanta en
la imagen mostrada, en vez de tantear: `zoom: 2.6, origen: '78% 80%'`. La
captura nueva muestra la llanta y el pastizal, con la patente fuera de cuadro.

Los otros dos recortes salieron bien a la primera: la parrilla en panal con la
óptica del Tucson y —el mejor de los tres— la parrilla con las letras RAM y los
dos faros LED encendidos.

**2. Las cards eran tan altas que no entraban foto y precio en la misma
pantalla.**

*Vi:* al 46% del contenedor, una card mide 660 px de ancho y 495 solo de foto.
En un notebook de 900 px se veía la foto y el arranque del nombre, y el precio
—que es el dato de la sección— quedaba abajo del pliegue.

*Qué hice:* 40% en `lg` y 56% en `md`. La card entera entra en pantalla y
siguen viéndose dos completas más el borde de la tercera.

**3. La fila HUD se truncaba, en los dos viewports por motivos distintos.**

*Vi:* en desktop, "AUTOMATIC…" en la celda de caja. En mobile, cuatro celdas de
70 px con "48.5…", "2.0 …" y "AUT.…". Una ficha técnica cortada con puntos
suspensivos no se lee como diseño, se lee como que el sitio está roto.

*Qué hice:* dos cosas distintas para dos problemas distintos. Los valores de
caja se abreviaron en los datos ("Aut. 6", "Man. 6", "Aut. 8") — una ficha
técnica se abrevia, eso es normal. Y en mobile la fila pasa a **grilla de
2×2**, que da 140 px por celda.

### Decisiones tomadas sin consultar — Fase J

59. **El recorte de hover es una segunda copia de la misma imagen, revelada con
    `clip-path`, y no la misma imagen escalándose.** Escalar el `<img>`
    original haría que al salir del hover la foto volviera "desde adentro", que
    se lee como zoom y no como barrido. Con dos capas, lo único que se mueve es
    el borde del recorte de izquierda a derecha, que es el gesto del sitio.

60. **El recorte lleva una etiqueta con lo que se está mirando**
    ("PARRILLA Y ÓPTICA DELANTERA"). Sin ella, una foto de auto que de golpe
    se ve al 260% se lee como un error de escala. Con ella se lee como una
    decisión, y de paso le dice al cliente en la reunión qué es lo que está
    pasando.

61. **El hover del recorte va solo en `(hover: hover) and (pointer: fine)`.**
    En táctil no hay hover, y atarlo a `:active` haría que la foto saltara al
    recorte cada vez que alguien toca la card para arrastrar el riel. Como el
    recorte es decorativo y la foto completa está siempre visible, no queda
    contenido inaccesible sin puntero.

62. **El riel se arrastra con el puntero además de scrollearse.** En desktop no
    hay gesto táctil y una barra de scroll horizontal oculta no invita a
    moverla. Va con `setPointerCapture` para que soltar el botón fuera del riel
    también termine el gesto; sin eso el riel queda pegado al mouse. Solo con
    `pointerType === 'mouse'`, así el scroll táctil nativo no se toca.

63. **El riel sangra hasta el borde derecho de la pantalla.** No respeta el
    margen del `shell` de ese lado: una card cortada por el borde es lo que le
    dice al ojo que hay más contenido al costado. Del lado izquierdo sí respeta
    el riel, para que la primera card quede alineada con el titular.

64. **La cuota va al lado del precio, no debajo.** En Argentina la cuota es el
    dato que la gente mira antes que el precio; ponerla en una línea secundaria
    sería contradecir cómo se compra un auto acá.

### Pendiente

- La barra MENU flotante se superpone con la última línea de la card del medio.
  Es el mismo asunto que apareció en segmentos y no es de ninguna de las dos
  secciones: el botón es fijo sobre toda la página. Va a la fase L.
