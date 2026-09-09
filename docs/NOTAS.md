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

# RESUMEN DE LA SESIÓN

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
