# 07 · Responsividad y mobile

## Los anchos

El piso es **360 px**. Se audita con números (no a ojo) en:

| Ancho | Qué representa |
|---|---|
| 360 × 800 | El Android chico. El piso declarado |
| 390 × 844 | iPhone. El ancho de diseño del panel |
| 768 × 1024 | Tablet vertical |
| 1024 × 768 | Tablet horizontal / notebook chica: donde las filas de controles no entran |
| 1280 × 800 | Notebook |
| 1440 × 900 | Desktop de referencia |
| 1920 × 1080 | Monitor común |
| 2560 × 1440 | Monitor grande: donde lo que no tiene tope se estira |

El chequeo (`npm run responsivo`, ver [09](09-pruebas.md)) busca **textos que
se pisan, desborde horizontal y textos cortados**, con el mock y con datos
reales, porque los títulos reales son mucho más largos que los de muestra.

Lo que apareció y la regla que dejó:

- **Contenedores sin ancho máximo**: en 2560 las cards medían 800 px y el mapa
  una pantalla. El `shell` (padding del contenido) tiene tope: pasado
  `--shell-max` (1800 px, lo que mide en 1920), el sobrante va a la derecha y
  el sitio sigue alineado a la izquierda. El mueble fijo (header) va a sangre.

```css
:root {
  --shell-max: 1800px;
  /* el 100% se resuelve en el elemento que la usa */
  --shell-fin: max(var(--shell-pad), calc(100% - var(--rail-w) - var(--shell-pad) - var(--shell-max)));
}
@utility shell { padding-inline: calc(var(--rail-w) + var(--shell-pad)) var(--shell-fin); }
```

- **Párrafos con tope de renglón** (`max-width` ~62–68ch): en 2560 una
  respuesta corría a 145 caracteres por línea.
- **`clamp()` siempre con tope**, y con el mínimo **menor** que el valor
  preferido en el ancho chico (si no, el `vw` no hace nada; ver T6).
- **Filas de controles** (chips + ordenar + buscador) en fila **recién desde
  `xl`**: en 1024 pedían 36 px más que la pantalla.
- **Títulos nunca truncados** (`truncate`/`line-clamp`) en cards ni en el panel:
  envuelven con `break-words`.
- Palabras largas en grillas (`min-w-0`, `overflow-wrap`): a 360, una palabra
  de la FAQ forzaba una columna de 330 px dentro de 304 y toda la página
  scrolleaba de costado.
- Grillas del panel **con columnas declaradas**: una grilla sin columnas estiró
  el documento a 583 px y el navegador móvil se alejó, dejando todo diminuto.

## 44 px táctiles

**Todo control mide al menos 44 × 44 px**, en el sitio y en el panel. Los links
de texto (en párrafos, el footer) llegan con **padding vertical y margen
negativo del mismo valor**, para no mover el layout:

```html
<a class="-my-3.5 inline-block py-3.5 …">Cómo llegar</a>
```

`html` lleva `scroll-padding-block` con la altura del header y del mueble de
abajo, para que el foco por Tab no quede tapado.

## Nada que dependa solo del hover

Todo lo que se revela con hover tiene salida sin puntero: las etiquetas de la
ficha se encienden con un toque (`pointerType === 'touch'`), el hover de la card
solo existe con `(hover: hover) and (pointer: fine)`, el barrido responde al
foco igual que al puntero. El arnés lo verifica en un contexto táctil
(`hasTouch`, que pone `hover: none`).

## Foco visible sobre formas recortadas

Si el diseño nuevo recorta las cajas con `clip-path` (como el bisel del
original), el foco no se puede hacer como de costumbre: **`clip-path` recorta
el `outline`, y también un `drop-shadow` del mismo elemento** (el filtro se
aplica antes del recorte: filtro → clip → máscara → opacidad). En el original
el anillo no se veía en ningún botón.

La solución: el anillo va **hacia adentro**, como un `::after` a caja completa
recortado con **un polígono de dos contornos y regla `evenodd`**: la forma
achicada `--foco-o` (afuera) menos la forma achicada `--foco-o + --foco-g`
(adentro). Queda la franja. Al achicar una diagonal una distancia d, cada
vértice sobre un lado se corre d·(√2 − 1) ≈ d·0,4142.

```css
/* Para una forma con las esquinas superior-izquierda e inferior-derecha cortadas
   en --bevel. Adaptar los vértices a la forma del diseño nuevo. */
.bevel:focus-visible {
  --foco-g: 3px;   /* grosor del anillo */
  --foco-o: 0px;   /* separación del borde */
  outline: none;
  position: relative;
}
.bevel:focus-visible::after {
  --d1: var(--foco-o);
  --d2: calc(var(--foco-o) + var(--foco-g));
  --k1: calc(var(--bevel) + var(--d1) * 0.4142);
  --k2: calc(var(--bevel) + var(--d2) * 0.4142);
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: var(--foco, var(--color-acento));
  clip-path: polygon(
    evenodd,
    /* contorno de afuera */
    var(--k1) var(--d1), calc(100% - var(--d1)) var(--d1),
    calc(100% - var(--d1)) calc(100% - var(--k1)), calc(100% - var(--k1)) calc(100% - var(--d1)),
    var(--d1) calc(100% - var(--d1)), var(--d1) var(--k1), var(--k1) var(--d1),
    /* contorno de adentro (el tramo de unión se recorre ida y vuelta: no suma área) */
    var(--k2) var(--d2), calc(100% - var(--d2)) var(--d2),
    calc(100% - var(--d2)) calc(100% - var(--k2)), calc(100% - var(--k2)) calc(100% - var(--d2)),
    var(--d2) calc(100% - var(--d2)), var(--d2) var(--k2), var(--k2) var(--d2)
  );
}
/* Sobre una superficie del color de acento: anillo oscuro, más fino y separado
   del borde (pegado, se fundía con el fondo y el botón parecía achicarse). */
.bevel-sobre-acento { --foco: var(--color-fondo); }
.bevel-sobre-acento:focus-visible { --foco-g: 2px; --foco-o: 3px; }

/* Un control NO recortado dentro de una caja recortada (un input en una card):
   el clip del padre lo recorta, así que va hacia adentro. El :not(.bevel) evita
   pisar el anillo de un botón recortado dentro de otra caja recortada. */
.bevel :focus-visible:not(.bevel) {
  outline: none;
  box-shadow: inset 0 0 0 2px var(--color-acento);
}
```

En la variante con borde hecho por dos cajas, el anillo va en la caja de afuera
(el `::after` se pinta encima del hijo, que no está posicionado). El arnés de
teclado **mide el anillo en píxeles** (compara la captura con y sin foco), no
solo que exista `:focus-visible`.

Con bordes redondeados comunes nada de esto hace falta: `outline` con
`outline-offset` y listo.

## La barra del navegador de WhatsApp: `svh` e `ignoreMobileResize`

En el navegador interno de WhatsApp (y en Safari de iOS) hay una barra que se
contrae y se expande al scrollear. Cada movimiento cambia el alto del viewport
y dispara `resize`. Si algo recalcula layout ahí, **la página entera se empuja
y vuelve, varias veces por segundo**, que es el peor síntoma para un sitio que
se abre desde un chat.

Reglas:

1. **Altos de pantalla en `svh`**, nunca `vh` ni `dvh` (`min-h-svh`). `svh` es
   el alto con la barra expandida: no cambia al scrollear.
2. **`ScrollTrigger.config({ ignoreMobileResize: true })`**, en el módulo que
   registra el plugin (`lib/smooth.ts`), antes de crear el primer
   ScrollTrigger. Sin esto, cada movimiento de la barra recalcula los
   pin-spacers y cambia el alto del documento.
3. **Lo que se recalcula en `resize` filtra los cambios que no son de ancho**
   (`lib/viewport.ts`): un cambio de ancho es un giro o una ventana
   redimensionada; un cambio de **solo alto, menor a 150 px**, es la barra y se
   ignora (las barras miden 50–120 px; un teclado mueve más).
4. `useFitText` observa el **ancho** del contenedor y solo recalcula si cambió
   el ancho redondeado (con el alto, el logotipo del footer parpadeaba de
   tamaño al scrollear).

El arnés lo verifica (`auditarBarraDelNavegador`): achica el viewport de 844 a
780 px de alto en tres puntos de la página y exige que el scroll, el alto del
documento y la posición de un elemento de referencia **no se muevan**.

## Lenis y ScrollTrigger entre rutas

- **Un solo ticker** para GSAP y Lenis (`gsap.ticker.add` con `lenis.raf`,
  `lagSmoothing(0)`, `lenis.on('scroll', ScrollTrigger.update)`). Dos `rAF`
  separados dan un frame de desfase que se ve como temblor en lo pinneado.
- Con `prefers-reduced-motion`, **Lenis no se inicializa**: el scroll nativo es
  la respuesta correcta.
- Lenis se inicializa **en `main.tsx`, antes del primer render** (ver T15).
- **Al cambiar de ruta**: en la limpieza de un `useLayoutEffect` del árbol que se
  va, `ScrollTrigger.getAll().forEach(t => t.kill())`,
  `ScrollTrigger.clearScrollMemory()` y soltar el scroll (por si se salió con el
  menú abierto). Al entrar: `lenis.scrollTo(0, { immediate: true, force: true })`
  y `window.scrollTo(0, 0)`; después de pintar, `lenis.resize()` y
  `ScrollTrigger.refresh()`.
- Los links internos a secciones usan `scrollTo` de Lenis, no anclas nativas
  (descolocan la posición interna de Lenis). `lib/ir-a.ts` resuelve "ir a una
  sección del home estando en otra página" (navega y después baja) y "ir a la
  ruta en la que ya estoy" (sube con scroll suave).

## El mueble fijo de abajo

En mobile hay hasta tres cosas fijas abajo: la barra MENU, el botón flotante de
WhatsApp y, en la ficha, la barra de WhatsApp de la ficha.

**No se enciman**: el contenedor de MENU tiene una prop `encima` que apila lo que
la página quiera poner arriba de la barra (alturas calculadas, no posiciones
independientes que se pisan).

**Un solo WhatsApp visible por vez.** En la ficha el flotante general no se
muestra (`flotante="nunca"` en `PaginaInterna`), y la barra de mobile **solo
aparece cuando el botón del panel de precio no está libre en pantalla**:

```ts
function useBotonLibre(ref: RefObject<HTMLElement | null>, activo: boolean) {
  const [libre, setLibre] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!activo || !el) return
    // En rem → px al montar: con la letra agrandada, el header y el mueble crecen.
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    const io = new IntersectionObserver(
      ([e]) => setLibre(e.isIntersecting && e.intersectionRatio > 0.98),
      // 5rem: el header; 9rem: MENU + la barra apilada encima
      { rootMargin: `-${5 * rem}px 0px -${9 * rem}px 0px`, threshold: [0, 0.99, 1] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, activo])
  return libre
}
```

**Lo escondido va `inert`**: una barra escondida, el menú cerrado (sale del
orden de tabulación) y **el header mientras el menú está abierto** (el logo era
un link fuera del diálogo modal).

**Los flotantes se apartan del footer.** Cuando la franja inferior del footer
(© y créditos) entra en pantalla, los flotantes bajan y se apagan: si no,
quedan encima del único link externo del sitio y en 390 px no se puede tocar.
Lo resuelve `lib/pie-a-la-vista.ts`, con una regla importante: **el footer
observa su propia franja** y publica un booleano; los flotantes solo lo leen.

```ts
let aLaVista = false
const oyentes = new Set<() => void>()
function publicar(v: boolean) { if (v !== aLaVista) { aLaVista = v; oyentes.forEach((f) => f()) } }

export function useObservarPie(ref: RefObject<HTMLElement | null>) {   // solo el Footer
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => publicar(e.isIntersecting), { rootMargin: '0px 0px 32px 0px' })
    io.observe(el)
    return () => { io.disconnect(); publicar(false) }
  }, [ref])
}
export function usePieALaVista() {                                    // los flotantes
  return useSyncExternalStore((f) => { oyentes.add(f); return () => oyentes.delete(f) }, () => aLaVista, () => false)
}
```

Las dos versiones anteriores (cada flotante buscando el nodo del footer) fallaban
en la ficha, que desmonta el esqueleto y monta otro árbol cuando llegan los
datos (T23).

## `prefers-reduced-motion`

- La intro no corre, Lenis no se inicializa, los contadores muestran su valor
  final, la marquesina queda quieta pero legible.
- En CSS, **transiciones en `0s` y sin retardo**, no `0.01ms`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    scroll-behavior: auto !important;
  }
}
```

Con `0.01ms`, cada cambio de estilo sigue siendo una transición
(`transition-property` vale `all` por defecto), y quien mide justo después de
cambiar un tamaño lee el valor viejo (T13).

- **El contenido tiene que seguir alcanzable**: en el original, con
  reduced-motion tres cuartos de un carrusel pinneado quedaban inaccesibles.
- Animar solo `transform`, `opacity` y `clip-path`.
