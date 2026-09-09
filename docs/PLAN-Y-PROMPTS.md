# Plan de 24 h + prompts para Claude Code

## Setup

```bash
mkdir autoshop-jujuy && cd autoshop-jujuy
npm create vite@latest . -- --template react-ts
npm i tailwindcss @tailwindcss/vite gsap @gsap/react lenis motion
mkdir -p docs/refs public/video public/img/{vehiculos,segmentos} src/assets
git init && git add -A && git commit -m "init"
```

1. `CLAUDE.md` va en la raíz del repo. Claude Code lo lee solo en cada sesión.
2. `logo.svg` va en `src/assets/logo.svg`.
3. Las 12 capturas de referencia van en `docs/refs/` con nombres descriptivos:
   `01-carrusel-apilado.png`, `02-contadores.png`, `03-faq-barrido.png`, `04-formulario.png`, `06-cta-video.png`, `09-footer.png`, `10-lista-escalonada.png`, `11-hero-ticker.png`, `12-menu-desplegado.png`
4. **Commit al final de cada fase.** Con animaciones esto no es opcional: una fase que rompe el scroll te puede costar dos horas si no podés volver atrás.

**Regla de trabajo:** una fase = una sesión = un commit. No le pases dos fases juntas. Mirá el resultado en el navegador antes de seguir.

---

## Cronograma

| # | Fase | Tiempo | Prioridad |
|---|---|---|---|
| 0 | Setup + bajar 2 videos y 3 fotos | 0:30 | 🔴 |
| 1 | Base: tokens, riel, Lenis, malla, `<Bevel>` | 1:30 | 🔴 |
| 2 | Intro con el logo | 2:00 | 🔴 |
| 3 | Hero + ticker + botón MENU + menú | 2:00 | 🔴 |
| 4 | Contadores | 0:45 | 🟡 |
| 5 | Carrusel apilado | 1:45 | 🔴 |
| 6 | Catálogo (3 unidades, riel) | 1:45 | 🔴 |
| 7 | Simulador + cotizador | 1:30 | 🟡 |
| 8 | Marcas tipográficas | 0:30 | 🟢 |
| 9 | FAQ con barrido | 0:45 | 🟡 |
| 10 | CTA con texto-máscara | 1:00 | 🟡 |
| 11 | Formulario de contacto | 1:00 | 🔴 |
| 12 | Footer escalonado | 0:45 | 🟡 |
| 13 | **Pasada mobile + performance** | 2:00 | 🔴 |
| 14 | Deploy | 1:00 | 🔴 |

Si vas atrasado, cortá en este orden: hotspots sobre el auto → cotizador con escaneo → marcas → simulador. Todo eso lo contás de palabra en la reunión. Lo que no se puede cortar: intro, hero, menú, carrusel, catálogo, contacto y la fase 13. Seis secciones impecables ganan contra doce que se traban en el celular del cliente.

Dormí. Una demo hecha a las 5 AM sin dormir se nota en la presentación, no en el código.

---

# PROMPTS

## FASE 1 — Base

```
Leé CLAUDE.md completo antes de empezar. Referencias visuales en docs/refs/.

Armá solo la infraestructura, sin secciones de contenido:

1. Tailwind v4 con el bloque @theme de CLAUDE.md en src/styles/globals.css.
   Archivo (variable, con eje de ancho) y Martian Mono desde Google Fonts con
   preconnect y display: swap. Definí las utilidades del display extendido vía
   font-variation-settings.

2. src/lib/smooth.ts — Lenis integrado al ticker de GSAP (receta en CLAUDE.md).
   Exportá funciones de pausa/reanudación para la intro y el menú. Si
   prefers-reduced-motion está activo, no inicialices Lenis.

3. src/components/Bevel.tsx — el primitivo de la forma biselada.
   Props: variant ('solid'|'outline'|'ghost'), bevel (default 14), as, className.
   La variante outline usa el doble contenedor con padding 1px.
   Este componente se usa en TODO el sitio.

4. src/components/MeshOverlay.tsx — la malla ámbar con linterna. Seguí la receta
   exacta: rAF-throttled, escritura directa de CSS vars en documentElement, sin
   estado de React en el pointermove. Manejá (hover: none) con deriva ambiental
   y prefers-reduced-motion.

5. src/components/Rail.tsx — riel izquierdo fijo con el marcador \, 56px en
   desktop, 16px en mobile.

6. src/components/SectionHeader.tsx — eyebrow (índice + nombre) + titular en
   Archivo extendido, alineado a la izquierda.

7. src/App.tsx: fondo negro, riel, malla, y placeholders de 100vh con título para
   Hero, Contadores, Segmentos, Vehículos, Fiat Plan, Cotizá tu usado, Marcas,
   Preguntas, CTA, Contacto, Footer.

8. Foco global: outline ámbar de 2px con offset, que respete el clip-path.

Corré el build y decime si hay warnings. Sin animaciones de scroll todavía.
```

---

## FASE 2 — Intro

```
El logo está en src/assets/logo.svg. Abrilo y leé su estructura antes de animar:
tiene grupos con id (#lg-word, #lg-automotores, #lg-auto, #lg-shop, #lg-jujuy,
#lg-flag) y los 7 cuadros de la bandera tienen id propio (#lg-flag-1 a
#lg-flag-7), YA ordenados de izquierda a derecha en el DOM. Un stagger normal
de GSAP sobre los hijos de #lg-flag produce el barrido correcto sin calcular
posiciones.

Importalo como componente React (?react con vite-plugin-svgr, o inline) para
poder targetear los grupos. No lo uses como <img>.

Implementá la secuencia de intro siguiendo el timeline exacto de CLAUDE.md,
sección "Intro (2.6 s techo)". Ese techo es un requisito: si te da más, recortá
duraciones, no saques pasos.

Detalles:
- Una sola timeline de GSAP en src/components/Intro.tsx, dentro de useGSAP.
- El láser es un div de 2px con el glow de dos capas de CLAUDE.md. La estela es
  un div hermano con gradiente horizontal de ~120px que lo sigue con delay corto.
  Nada de canvas.
- El revelado de #lg-word usa clip-path inset() con la MISMA curva y dirección
  que el láser: tiene que leerse como que el láser lo dibuja.
- Los cuadros de #lg-flag entran después, con stagger de 0.045s, opacidad más
  un scale corto desde .9. Sin rotación: la bandera ya viene inclinada en el SVG.
- El viaje al header usa GSAP Flip contra la posición real del logo del header.
  Nada de coordenadas hardcodeadas.
- Botón SKIP /// abajo a la derecha con <Bevel variant="outline">, visible desde
  el primer frame. Al tocarlo, la timeline hace seek() al final, no se corta.
- sessionStorage 'intro-seen'.
- Durante la intro: lenis.stop() + overflow hidden. Al terminar: lenis.start() y
  ScrollTrigger.refresh().
- prefers-reduced-motion: sin intro, logo ya en el header, hero visible.

Decime cuánto dura la timeline medida con tl.duration().
```

---

## FASE 3 — Hero + menú

```
Referencias: docs/refs/11-hero-ticker.png y docs/refs/12-menu-desplegado.png.

1. HERO
   - Video de fondo desde /video/hero-desktop.mp4, con selección por matchMedia
     del archivo mobile. Reglas de video de CLAUDE.md.
   - Overlay: negro al 55% más una viñeta radial suave. El titular tiene que
     leerse sobre cualquier frame.
   - Titular en Archivo extendido, izquierda, sobre el riel. Dos líneas cortas y
     concretas sobre comprar auto en Jujuy. Nada de "Descubrí la experiencia".
   - Ticker infinito arriba, en Martian Mono:
     SAN SALVADOR DE JUJUY · 24.1858°S 65.2995°W · 0KM Y USADOS · FIAT PLAN ·
     FINANCIACIÓN PROPIA · EST. 2015
     Tween lineal infinito de GSAP sobre xPercent, con el contenido duplicado
     para el loop sin costura. Se pausa con prefers-reduced-motion.

2. BOTÓN MENU
   - Fijo abajo al centro, <Bevel variant="solid">. "MENU" a la izquierda, ///
     a la derecha. En hover las barras se corren en secuencia.

3. MENÚ DESPLEGADO
   - Overlay completo, fondo --color-bone con texto negro. El contraste invertido
     es lo que lo hace sentir una capa aparte y no otra sección.
   - Items: Vehículos · Usados · Fiat Plan · Cotizar usado · Test drive ·
     Nosotros · Contacto.
   - Cada item se dibuja desde /// hacia la derecha: las barras entran primero y
     el texto se revela detrás con clip-path inset en la misma dirección.
     Stagger 0.05s.
   - Tipografía --text-h1, izquierda, leading corto. Barra CLOSE ↓ abajo, biselada.
   - lenis.stop() mientras está abierto. Cierra con Escape, con click en el
     backdrop y con CLOSE. Trap de foco. Los links hacen lenis.scrollTo.

motion para el menú, GSAP para el ticker. En mobile el menú es pantalla completa
y los items se apilan sin cambiar de tamaño.
```

---

## FASE 4 — Contadores

```
Referencia: docs/refs/02-contadores.png.

Franja de ancho completo, fondo --color-amber, texto negro, 4 columnas con
separadores verticales de 1px. Las cifras arrancan en 0 y suben al entrar en
viewport (receta de CLAUDE.md, con Intl es-AR y tabular-nums), una sola vez.

Datos inventados pero plausibles: 500+ unidades entregadas · 12 marcas ·
9 años en Jujuy · 100% financiación propia.

El sufijo + o % entra al final con un corte seco, sin animar.
En mobile: 2x2, no una columna. El bloque completo tiene que entrar en pantalla
para que se vea el conteo simultáneo — ese es todo el efecto.
```

---

## FASE 5 — Carrusel apilado

```
Referencia: docs/refs/01-carrusel-apilado.png.

Sección "Segmentos". Implementá la receta completa de CLAUDE.md.

Las imágenes son frames extraídos de los videos (en /img/segmentos/), no fotos
de catálogo. Son ambientales: ruta, noche, movimiento. Elegí 4 segmentos, no 5,
y que el texto haga el trabajo de diferenciarlos.

Izquierda: titular "Qué estás buscando" + lista de segmentos con contador
"2 / 4" en Martian Mono. Derecha: las imágenes apiladas.

Lo importante: un solo scrub controla lista e imagen. El ítem activo pasa a
ámbar con barrido de izquierda a derecha, los inactivos quedan en graphite.
La imagen entrante sube y tapa a la anterior con clip-path inset(100% 0 0 0)
→ inset(0). No es un fade.

Mobile: sin pin. Scroll horizontal con scroll-snap-type: x mandatory, cards de
85vw. No intentes pinnear en mobile.

ScrollTrigger.refresh() después de que carguen las imágenes, y width/height
explícitos en los <img>.
```

---

## FASE 6 — Catálogo

```
Sección "Vehículos". Hay SOLO 3 fotos de auto, en /img/vehiculos/.

NO hagas una grilla de 3 cards: se ve vacía y delata la falta de contenido.
Hacé un riel horizontal de 3 cards grandes (cada una ~62% del ancho del
contenedor en desktop, 85vw en mobile), con scroll-snap y arrastre. Tres
elementos en un riel se leen como decisión; tres en una grilla se leen como
falta de material.

Datos en src/data/vehiculos.ts — 3 unidades inventadas pero plausibles para
Jujuy, mezclando 0km y usado, con precios en pesos argentinos realistas.

Cada card:
- <Bevel variant="outline">, fondo --color-asphalt.
- Foto arriba, ratio 4:3, object-cover.
- Marca + modelo en Archivo, versión abajo en tamaño chico.
- Fila HUD en Martian Mono separada por barras de 1px: año | km | motor | caja.
- Precio en Martian Mono grande, formateado con Intl es-AR.
- Chip de estado arriba a la derecha: Disponible (ámbar) / Reservado / Vendido
  (--color-flag). Solo ahí se usa el rojo.
- Hover con puntero fino: la foto pasa a un recorte cerrado de sí misma (un
  detalle: rueda, óptica o insignia) con barrido de clip-path izquierda→derecha
  de 0.4s. Generá esos recortes con object-position y scale, no necesitás
  archivos nuevos.

Arriba, chips de filtro biselados: Todos / 0km / Usados. Filtrado client-side
con transición de layout de motion. Los activos en ámbar con texto negro.
Con 3 unidades el filtro va a dejar 1 o 2: está bien, muestra que el mecanismo
funciona.

Debajo del riel, una línea: "Mostramos 3 de 47 unidades en stock" con un botón
"Ver catálogo completo". Eso comunica que el sitio real tendría más, sin que
tengamos que inventarlas.
```

---

## FASE 7 — Simulador + cotizador

```
Dos bloques lado a lado en desktop, apilados en mobile.

A) SIMULADOR
   - Slider de valor del vehículo (8.000.000 – 60.000.000 ARS).
   - Slider de anticipo (0 – 50%).
   - Chips biselados de plazo: 12 / 24 / 36 / 48 / 60 cuotas.
   - La parte llena de cada slider es ámbar, y sobre ella corren barras ///
     diagonales animadas (repeating-linear-gradient con background-position
     animada, no canvas).
   - Resultado en Martian Mono grande, en vivo, formateado en es-AR. Fórmula de
     cuota fija simple con la tasa como constante del archivo.
   - Debajo, en letra chica: "Cálculo estimativo. No constituye una oferta."
     Esto no es opcional: es una simulación financiera.
   - <input type="range"> reales, estilizados. No divs con eventos de mouse.

B) COTIZÁ TU USADO
   - Tres selects biselados: marca, modelo, año.
   - Botón "Escanear valuación". Al tocarlo, una línea ámbar recorre la card de
     arriba abajo dos veces en 1.2s y después aparece un rango estimado en
     Martian Mono con conteo desde 0.
   - prefers-reduced-motion: el resultado aparece directo.

Todo client-side, sin backend.
```

---

## FASE 8 — Marcas

```
NO uses logos de marcas. Recrearlos da resultados imprecisos y es un problema
de marca registrada.

Hacé la sección tipográfica: los nombres (Fiat, Peugeot, Volkswagen, Toyota,
Chevrolet, Renault, Ford, Citroën) en Archivo extendido, tamaño grande, como
un listado a ancho completo o dos filas de marquesina que corren en direcciones
opuestas.

En reposo: --color-graphite, casi fundidos con el fondo negro.
En hover (o al pasar por el centro del viewport en mobile): la marca se enciende
en ámbar con una micro-distorsión — dos copias desplazadas 1-2px en direcciones
opuestas durante 90ms, y después se asienta. Corto y seco, no un glitch continuo.

Encima, una línea de contexto: "Trabajamos con" o similar, breve.
Esto encaja mejor con el lenguaje tipográfico del sitio que una grilla de logos
ajenos, y no depende de ningún asset.
```

---

## FASE 9 — FAQ

```
Referencia: docs/refs/03-faq-barrido.png.

Dos columnas: titular grande a la izquierda, acordeón a la derecha. Apilado en
mobile. Fondo --color-bone con texto negro: es la segunda sección clara del
sitio (la otra es el menú) y funciona como respiro entre tanto negro.

Barrido exacto de la receta de CLAUDE.md: ::before con scaleX desde origin left
y el color del texto con transition-delay para que el barrido lo alcance.
Altura con grid-template-rows 0fr→1fr.

6 preguntas reales de alguien comprando un auto en Jujuy: entrega de usado como
parte de pago, financiación sin recibo de sueldo, transferencia y patentamiento,
garantía de los usados, permuta, demora de entrega de un 0km.
Respuestas inventadas pero verosímiles y concretas, 2-3 líneas cada una.

Solo una abierta a la vez. <button> reales con aria-expanded, navegable con teclado.
```

---

## FASE 10 — CTA con video-máscara

```
Referencia: docs/refs/06-cta-video.png.

Caja centrada y biselada con el segundo video corriendo dentro (no a pantalla
completa). El titular usa el video como relleno: probá primero
background-clip: text sobre un contenedor con el video; si falla en Safari iOS,
caé a <text> + <mask> en SVG.

El texto flota con un movimiento muy leve y continuo (translateY ±6px, 4s,
sine.inOut, con stagger entre líneas). Si se nota, está de más.

Copy concreto sobre comprar auto en Jujuy, no sobre "experiencias".
Debajo: dos botones biselados, "Ver vehículos" y "Hablar por WhatsApp".

Agregá también el botón flotante de WhatsApp abajo a la derecha, biselado, con
"Hablar con un asesor ///" y un punto que pulsa lento como indicador de estado.
En mobile colapsa a solo el ícono y se corre para no chocar con el botón MENU.
```

---

## FASE 11 — Contacto

```
Referencia: docs/refs/04-formulario.png.

Dos columnas. Izquierda: titular grande + bloque de datos de contacto (email,
teléfono, dirección en San Salvador de Jujuy, horarios) con íconos biselados
chicos, más una fila de íconos de redes. TODOS los datos son inventados —
usá una dirección plausible del centro de San Salvador de Jujuy y un horario
comercial normal.

Derecha: el formulario.
- Nombre, email, teléfono.
- Select "¿Qué necesitás?": Comprar 0km / Comprar usado / Cotizar mi usado /
  Fiat Plan / Test drive / Otra consulta.
- Chips biselados de presupuesto: hasta $15M / $15M–$30M / $30M+. El activo en
  ámbar con texto negro.
- Textarea de mensaje.
- Botón "Enviar consulta", ancho completo, ámbar sólido con texto negro.

Sin backend: validación client-side real y un estado de éxito que aclare que es
una demostración. Los errores dicen qué pasó y cómo arreglarlo, en la voz de la
interfaz, sin disculpas.

Inputs biselados, fondo asphalt, borde graphite que pasa a ámbar en focus.
Labels reales con htmlFor. Nada de placeholders como sustituto de label.

Mobile: una columna, datos arriba del formulario, inputs de 16px mínimo para que
iOS no haga zoom al enfocar.
```

---

## FASE 12 — Footer

```
Referencias: docs/refs/09-footer.png y docs/refs/10-lista-escalonada.png.

Fondo negro. "AUTOSHOP JUJUY" en Archivo extendido enorme a ancho completo arriba.

Debajo, tres columnas con el tratamiento escalonado: sangría creciente por ítem,
y en hover aparece el \ a la izquierda mientras el link se corre y pasa a ámbar
(receta en CLAUDE.md).

Columnas: CONTENIDO (links de secciones) · UTILIDAD (Contacto, Privacidad,
Términos) · REDES (Instagram, Facebook, WhatsApp).

Abajo: © Automotores AutoShop Jujuy, "Volver arriba" con lenis.scrollTo(0), y la
nota "Sitio de demostración — unidades, precios y datos de contacto son de muestra."

Mobile: las columnas se apilan pero el escalonado se mantiene, es la firma del bloque.
```

---

## FASE 13 — Mobile + performance

```
Pasada de responsive y performance. No agregues features en esta fase.

1. Probá a 360, 390, 768, 1024 y 1440px. Buscá overflow-x específicamente en el
   ticker, el carrusel, el riel del catálogo y el titular del footer.

2. En (hover: none), verificá que nada quede inaccesible por depender del hover.
   Todo lo que en desktop se revela con hover tiene que estar visible o
   accesible con tap.

3. Peso: convertí todas las fotos a WebP. Lazy-load en todo lo que esté bajo el
   hero. Ninguna imagen arriba de 250 KB.

4. Confirmá que TODA animación de scrub usa solo transform, opacity y clip-path.
   Si encontrás una que anime width, height, top o left, reescribila.

5. prefers-reduced-motion: recorré el sitio entero con el flag activo. Tiene que
   ser usable, no faltar contenido, y los cambios de estado seguir siendo visibles.

6. Teclado: recorré todo con Tab. Foco visible, menú abre y cierra, acordeón
   funciona, sliders responden a las flechas.

7. npm run build y decime el tamaño del bundle. Si GSAP entra entero, importá
   solo los plugins usados.

8. Chequeá que la intro no dispare layout shift y que ScrollTrigger.refresh() se
   llame después de que todo cargue.

Reportame qué encontraste y qué arreglaste, punto por punto.
```

---

## FASE 14 — Deploy

```bash
npm run build && npx vercel --prod
```

**Abrí el link en tu celular con datos móviles, no con WiFi.** Es la condición real en la que el cliente lo va a ver.

Últimos 30 minutos:
- Grabá un video de pantalla de 30s del recorrido completo, por si falla el WiFi en la reunión.
- Dejá el `dist/` accesible offline como plan B.

---

## Para la reunión

Abrí en el celular, dejá correr la intro completa una vez, y después scrolleá despacio. El orden importa más que la cantidad: intro → hero → menú → carrusel → catálogo → contacto. Si algo quedó a medias, no lo abras.
