# AUTOSHOP JUJUY — Demo Frontend

Sitio de una sola página para **Automotores AutoShop Jujuy**, concesionaria de 0km y usados en San Salvador de Jujuy, Argentina. Esto es una **demo comercial**: el objetivo es impacto visual y fluidez, no un backend.

Audiencia: el dueño de la concesionaria, que la verá primero en celular y después en desktop.

**Todo el contenido es inventado.** No hay datos reales de la concesionaria. Escribí copy plausible en español rioplatense — nunca lorem ipsum, que en un sitio en español se lee como "sin terminar" y arruina el efecto de demo lista.

---

## Stack

| Área | Elección | Por qué |
|---|---|---|
| Build | **Vite + React 19 + TypeScript** | Todo es client-side animado; Next solo agregaría `'use client'` en cada archivo. |
| Estilos | **Tailwind CSS v4** (`@theme` en CSS) | Tokens como CSS vars, sin archivo de config. |
| Scroll | **Lenis** | Inercia suave. Es el 60% de la sensación premium. |
| Scroll anim | **GSAP + ScrollTrigger + Flip** | Gratis para uso comercial desde GSAP 3.13. Flip resuelve el viaje del logo al header. |
| UI anim | **motion** (ex framer-motion) | Menú, acordeones, hover. |
| Hook | **@gsap/react** (`useGSAP`) | Cleanup automático, compatible con StrictMode. |

```bash
npm i tailwindcss @tailwindcss/vite gsap @gsap/react lenis motion
```

Un solo ticker para GSAP y Lenis:
```ts
lenis.on('scroll', ScrollTrigger.update)
gsap.ticker.add((t) => lenis.raf(t * 1000))
gsap.ticker.lagSmoothing(0)
```

---

## El logo

`src/assets/logo.svg` — vectorizado a partir de la única imagen disponible de la marca. `viewBox="0 0 516 222"`, 50 paths, `fill-rule="evenodd"` (los huecos de las letras y la línea del auto son contra-formas, no paths negros: no los toques).

Estructura, ya preparada para animar:

```
<g id="lg-word">          ← el bloque tipográfico completo
   <g id="lg-automotores"> ← condensada blanca, arriba
   <g id="lg-auto">        ← bold blanca
   <g id="lg-shop">        ← bold ámbar
   <g id="lg-jujuy">       ← redondeada blanca, abajo derecha
<g id="lg-flag">          ← bandera a cuadros, 7 paths con id propio
   <path id="lg-flag-1"> … <path id="lg-flag-7">
```

**Los paths dentro de cada grupo están ordenados de izquierda a derecha.** Eso significa que un `stagger` de GSAP en orden del DOM ya produce un barrido izquierda→derecha sin tener que calcular posiciones. Es exactamente lo que necesita el efecto de "semáforo de largada" sobre la bandera.

Los colores están parametrizados: `fill="var(--logo-white, #FEFDF8)"` y `fill="var(--logo-yellow, #FDB916)"`. Se puede recolorear todo el logo desde CSS sin tocar el SVG.

> Este SVG es un trazado de una captura de pantalla, con una fidelidad medida del ~98%. Alcanza y sobra para la demo. Para producción hay que pedirle el archivo vectorial original al cliente.

---

## Sistema de diseño

### Color

El amarillo se sampleó del logo real: **#FDB916**, un ámbar cálido y dorado. No es el verde ácido ni el amarillo limón de las referencias, y eso es una ventaja — el ámbar sobre negro lee como luz de sodio o faro de auto de noche, que es exactamente el mundo del cliente. Es un color más difícil de asociar con una plantilla.

```css
@theme {
  --color-void:     #000000;  /* fondo base. negro real: el glow necesita contraste puro y rinde en OLED */
  --color-asphalt:  #0D0E10;  /* superficies y cards, con una leve deriva fría */
  --color-graphite: #1B1D20;  /* bordes, estados apagados */
  --color-amber:    #FDB916;  /* ACENTO ÚNICO — muestreado del logo */
  --color-filament: #FFF0C4;  /* núcleo caliente del glow, solo dentro de gradientes */
  --color-bone:     #FEFDF8;  /* texto sobre oscuro, y fondo de las 2 secciones claras */
  --color-flag:     #FF3B1F;  /* SEÑALES: estados de stock y errores de validación */
}
```

Reglas duras:
- **Un solo amarillo en todo el sitio: `--color-amber`.** No inventes variantes.
- `--color-filament` no se usa como color plano nunca. Existe solo como parada interna de un gradiente o del glow, para que la luz tenga un núcleo más caliente que su halo. Es lo que hace que el ámbar se lea como luz encendida y no como amarillo plano.
- El glow va con dos capas de sombra, una cerrada y saturada y otra abierta y tenue:
  `filter: drop-shadow(0 0 4px var(--color-amber)) drop-shadow(0 0 22px rgb(253 185 22 / .45))`
- `--color-flag` **no decora nunca**, pero sí señala. Aparece en dos lugares y solo
  en esos dos: el chip de una unidad reservada o vendida, y los errores de
  validación de un formulario (borde del campo y texto del mensaje). Las dos
  cosas son avisos, no adorno. Un error de validación no puede ir en ámbar
  porque el ámbar ya significa "activo" en todo el sitio —hover, foco, chip
  elegido— y un campo con borde ámbar sería ambiguo con un campo enfocado.
- Texto sobre ámbar: **siempre negro**, nunca blanco.

### Tipografía

Dos familias con roles que no se cruzan:

- **Archivo** (variable, eje de ancho 62–125) — todo el texto. Titulares en `wdth: 112–125, wght: 700`, tracking negativo. Ese ancho extendido es la firma del sitio y lo que evita que parezca una plantilla. Además rima con la tipografía condensada y pesada del logo.
- **Martian Mono** — **solo cifras de telemetría**: km, año, cilindrada, precio, cuota, contadores, coordenadas del ticker. No se usa en labels ni en texto corriente. Acá la monoespaciada se gana el lugar porque el sitio muestra datos de tablero; si la ponés en cada label, se convierte en el cliché de landing generada.

```css
--text-hero:  clamp(3rem, 11vw, 10rem);     /* wdth 125, wght 700, tracking -.03em, leading .86 */
--text-h1:    clamp(2.25rem, 6.5vw, 5rem);  /* wdth 118 */
--text-h2:    clamp(1.75rem, 4vw, 3rem);
--text-body:  clamp(1rem, 1.1vw, 1.125rem); /* wdth 100, leading 1.6, máx 68ch */
--text-hud:   0.8125rem;                     /* Martian Mono, tracking .06em */
```

### Layout

Canvas negro a sangre. Grilla de 12 columnas con un **riel izquierdo fijo de 56px** que sostiene el marcador `\` y el índice de sección. Ese riel es constante en toda la página y es lo que da continuidad entre secciones muy distintas.

```
┌──┬────────────────────────────────────────────────┐
│\ │  \ 03 — VEHÍCULOS                              │
│  │                                                │
│  │  TITULAR EN ARCHIVO EXTENDIDO                  │
│  │  A DOS O TRES LÍNEAS                           │
│  │                                                │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │  │ card HUD │ │ card HUD │ │ card HUD │        │
│  │  └──────────┘ └──────────┘ └──────────┘        │
└──┴────────────────────────────────────────────────┘
                  [  MENU ///  ]
```

Alineación izquierda siempre. Nada centrado salvo el logo del intro y la barra MENU. El footer escalonado es la única excepción. En mobile el riel colapsa a 16px y el `\` pasa a ser prefijo inline del eyebrow.

### La forma biselada

Todos los botones, chips, cards y contenedores comparten el mismo recorte: esquina superior izquierda e inferior derecha cortadas en diagonal.

```css
.bevel {
  --bevel: 14px;
  clip-path: polygon(
    var(--bevel) 0, 100% 0,
    100% calc(100% - var(--bevel)), calc(100% - var(--bevel)) 100%,
    0 100%, 0 var(--bevel)
  );
}
```

El `clip-path` recorta el borde CSS, así que para la variante con borde hay que anidar: contenedor exterior con `.bevel` + fondo ámbar + `padding: 1px`, hijo con `.bevel` + fondo asphalt. Hacé un componente `<Bevel variant="solid"|"outline"|"ghost" bevel={n}>` y usalo en todos lados. **Si aparece un `border-radius` en el proyecto, está mal.**

### Principios

1. **Un solo momento de audacia por pantalla.** La intro es el momento grande. Después, cada sección tiene UNA idea de movimiento, no cuatro.
2. **El movimiento no disparado por el usuario va con cuentagotas.** Nada de fade-and-slide-up en cada sección: eso es el default genérico. Los reveals de scroll se reservan para los contadores, el carrusel apilado y el titular del CTA.
3. **El movimiento disparado por el usuario es generoso.** Hover, click, arrastre: siempre hay respuesta visible.
4. **Barrido, no fade.** El gesto compartido del sitio es el barrido izquierda→derecha (`scaleX` con `transform-origin: left`, o `clip-path: inset()`). Aparece en el láser del intro, el revelado del hero, el hover del FAQ, el hover del footer y la barra del simulador. Esa repetición es lo que hace que se sienta diseñado y no improvisado.
5. **La malla ámbar es ambiente, no protagonista.** Opacidad baja, se revela solo bajo el cursor.

---

## Recetas técnicas

### Malla ámbar + linterna

```css
.mesh {
  position: fixed; inset: 0; pointer-events: none; z-index: 40;
  background-image:
    linear-gradient(to right,  var(--color-amber) 1px, transparent 1px),
    linear-gradient(to bottom, var(--color-amber) 1px, transparent 1px);
  background-size: 56px 56px;
  opacity: .28;
  mask-image: radial-gradient(circle 240px at var(--mx,50%) var(--my,50%),
    #000 0%, rgb(0 0 0 / .5) 45%, transparent 72%);
}
```

- `--mx` / `--my` se escriben en `documentElement` desde un `pointermove` **throttleado con rAF**, una escritura por frame. Nunca estado de React en `pointermove`.
- En `(hover: none)`: el foco sigue al `touchmove` y en reposo hace una deriva lenta (tween infinito de 18s, `sine.inOut`) para que no quede muerta.
- `prefers-reduced-motion`: malla fija, opacidad .12, sin máscara.

### Intro (2.6 s techo, es un requisito)

Timeline única de GSAP. `sessionStorage` con clave `intro-seen` para que no se repita en cada recarga durante la demo. Botón `SKIP ///` visible desde el primer frame.

```
0.00  Negro total.
0.15  Láser: barra vertical de 2px con glow ámbar de núcleo cálido, barre 0%→100% del ancho
      en 0.55s (power3.inOut). Un div hermano con gradiente horizontal de ~120px lo sigue
      con 0.05s de retraso, como estela.
0.70  #lg-word se revela con clip-path inset(0 100% 0 0) → inset(0), MISMA curva y dirección
      que el láser. Tiene que leerse como que el láser lo dibuja.
0.95  #lg-flag: los 7 cuadros entran con stagger de 0.045s en orden del DOM (ya vienen
      ordenados de izquierda a derecha) — el semáforo de largada. Cada uno entra con
      opacidad + un scale muy corto desde .9, sin rotación.
1.30  Línea ámbar horizontal bajo el logo: scaleX 0→1 desde el centro, 0.35s.
1.55  Respiración: scale 1 → 1.035 → 1 en 0.5s, con el drop-shadow subiendo y bajando en
      paralelo. UN ciclo, no dos.
2.00  GSAP Flip: el logo viaja al lugar exacto del logo del header. La línea se desvanece.
2.30  Wipe de revelado: un panel negro sobre el hero hace scaleX 1→0 con origin right.
2.60  ScrollTrigger.refresh(). lenis.start().
```

Durante la intro: `lenis.stop()` y `overflow: hidden` en body. Con `prefers-reduced-motion` se saltea entera, el logo aparece ya en el header y el hero está visible.

### Contadores desde 0

```ts
const n = { v: 0 }
gsap.to(n, {
  v: target, duration: 1.8, ease: 'power2.out',
  scrollTrigger: { trigger: el, start: 'top 78%', once: true },
  onUpdate: () => { el.textContent = new Intl.NumberFormat('es-AR').format(Math.round(n.v)) },
})
```
Martian Mono con `font-variant-numeric: tabular-nums` para que no bailen los dígitos.

### Carrusel apilado

Sección pinneada. Izquierda: lista de segmentos. Derecha: imágenes apiladas en absoluto con `clip-path: inset(100% 0 0 0)` salvo la primera.

```ts
ScrollTrigger.create({
  trigger: ref.current, start: 'top top',
  end: () => `+=${(items.length - 1) * innerHeight * 0.8}`,
  pin: true, scrub: .6,
  snap: { snapTo: 1 / (items.length - 1), duration: .3 },
})
```

Cada imagen sube y tapa a la anterior con `inset(100% 0 0 0)` → `inset(0)`. El ítem de lista correspondiente pasa a ámbar con el mismo barrido. **Un solo scrub controla lista e imagen, no dos animaciones separadas.**

En mobile: sin pin. Scroll horizontal con `scroll-snap-type: x mandatory`. El pin en mobile pelea con la barra de URL de Safari y produce saltos.

### Barrido del FAQ

`::before` con `scaleX(0)` / `transform-origin: left` → `scaleX(1)` en 0.45s, `cubic-bezier(.65,0,.35,1)`. El color del texto cambia con `transition-delay: .12s` para que el barrido lo alcance. Altura del contenido con `grid-template-rows: 0fr → 1fr`, sin medir alturas en JS.

### Footer escalonado

Sangría creciente por ítem (`padding-left: calc(var(--i) * .6rem)`). En hover aparece un `\` desde `translateX(-10px)` + `opacity: 0`, el link se corre 8px y pasa a ámbar. 0.25s. El `\` es pseudo-elemento.

### Video

```html
<video autoplay muted loop playsinline preload="metadata" poster="/img/hero-poster.jpg" />
```
El `src` se elige por JS con `matchMedia('(max-width: 768px)')`, no con `<source media>`. Si `navigator.connection?.saveData` es true, solo el poster. En iOS `playsinline` + `muted` es obligatorio o no autoplaya.

---

## Assets: qué hay y qué no

Hay **2 videos y 3 fotos de auto**, y nada más. No se van a conseguir más. El diseño se adapta a eso; no inventes secciones que necesiten material inexistente.

- **Catálogo:** 3 unidades. **No hagas una grilla de 3 cards** — se ve vacía. Hacé un riel horizontal de cards grandes, o una unidad destacada con panel HUD y 3 miniaturas para cambiar. Tres elementos en un riel se leen como decisión; tres en una grilla de 3 columnas se leen como falta de contenido.
- **Detalles y hovers:** recortes cerrados de las mismas 3 fotos (rueda, óptica, insignia). Un recorte al 25% de una foto ancha se lee como plano detalle. Es legítimo y gratis.
- **Carrusel de segmentos y fondos:** frames extraídos de los videos con ffmpeg. Vienen con el mismo grado de color que el hero, así que el sitio se ve coherente en vez de collage.
- **Logos de marcas: NO se usan.** Recrearlos en SVG da resultados imprecisos y es un problema de marca registrada. La sección de marcas es **tipográfica**: los nombres en Archivo extendido, apagados en `--color-graphite`, encendiéndose en ámbar. Encaja mejor con el lenguaje del sitio que una grilla de logos ajenos.

---

## Piso de calidad (no negociable)

- Responsive real desde 360px, probado en celular físico.
- `prefers-reduced-motion: reduce` respetado en todo. Los cambios de estado siguen siendo visibles, solo instantáneos.
- Foco de teclado visible: outline ámbar de 2px con offset sobre la forma biselada. El menú se navega con Tab y cierra con Escape.
- Animar solo `transform`, `opacity` y `clip-path`. Nunca `top`, `left`, `width` ni `height` en un scrub.
- `width` y `height` explícitos en cada `<img>`: el layout shift rompe los cálculos de ScrollTrigger.
- `will-change` solo en elementos pinneados, y removerlo en `onLeave`.
- Objetivo: LCP < 2.5s en 4G, sin jank al scrollear en un celular de gama media.

## Contenido

Modelos que realmente se venden en Jujuy: Fiat Cronos, Toro, Strada, Pulse; VW Amarok; Toyota Hilux; Peugeot 208. Precios en pesos argentinos con separador local, kilometrajes coherentes para usados 2018-2023.

Copy en español rioplatense, voseo, sentence case. Los botones dicen qué pasa: "Reservar test drive", no "Enviar". Nada de "Descubrí la experiencia": frases concretas y cortas.

En el footer, la nota visible: "Sitio de demostración — unidades, precios y datos de contacto son de muestra."

## Preparado para el reemplazo de contenido

Después de la demo hay un mes para cargar contenido real: fotos del stock,
textos definitivos, datos de la concesionaria. Estructurá el proyecto para que
ese reemplazo sea editar archivos de datos, no cazar strings entre componentes.

- TODO el contenido vive en `src/data/`: vehiculos.ts, faq.ts, segmentos.ts,
  marcas.ts, contacto.ts, nav.ts.
- Ningún componente tiene texto de negocio hardcodeado. Los componentes reciben
  datos por props o los importan de `src/data/`.
- Las rutas de imagen también salen de los archivos de datos, nunca escritas
  dentro del JSX.
- Cada tipo lleva su interfaz de TypeScript, así al cargar las 47 unidades
  reales el compilador avisa si falta un campo.


