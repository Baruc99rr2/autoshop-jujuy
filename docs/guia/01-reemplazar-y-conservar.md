# 01 · Qué se reemplaza y qué se conserva

El proyecto nuevo tiene **otro diseño** y **todo lo demás igual**. Esta es la
frontera. Ante la duda: si una pieza decide *cómo se ve*, se reemplaza; si
decide *qué pasa con los datos, quién puede hacer qué, o cómo se comporta en
un celular*, se conserva.

## Lo que se REEMPLAZA

Cada pieza: qué hace en el original y dónde vive, para saber qué sacar. **No
copies su estética**: el negocio nuevo trae la suya.

### Paleta

`src/styles/globals.css`, bloque `@theme` (Tailwind v4 define los tokens en
CSS, no hay `tailwind.config.js`). El original es negro con un único acento
cálido, un color claro para texto y secciones claras, y un rojo de señal.

Conviene **conservar los roles** aunque cambien los colores, porque el código
los usa con significado:

- **Un solo color de acento = "activo"**: hover, foco, elegido. Si el acento
  significa otras cosas, el foco deja de leerse.
- **Un color de señal** que nunca decora: solo estado *reservado/vendido* y
  errores de validación. Si se usa en un título, el chip de "Vendido" pierde peso.
- **Texto sobre el acento: siempre del color más oscuro.**

### Tipografía

En el original: una sola familia variable (pesos 200–800), autoalojada en
`public/fonts/`, con una fuente de respaldo con métricas medidas para que el
cambio no salte. Utilidades en `globals.css`: `font-hero`, `font-display`,
`font-display-xl` (títulos), `font-hud` (rótulos y botones en mayúscula),
`num` (cifras con `tabular-nums`), `font-cifra` (cifras grandes).

Se reemplaza la familia y la escala. **Se conserva la técnica** (ver
[08](08-rendimiento.md)): autoalojada, preload con `crossorigin`, fallback con
`size-adjust`/`ascent-override`, cifras tabulares donde un número cambia o se
alinea en columna.

### Intro

`src/components/Intro.tsx` + `src/components/intro-timeline.ts` +
`scripts/check-intro.mjs`. Una animación de ~2,6 s: una línea cruza la
pantalla, el logo se revela y viaja hasta su lugar en el header con GSAP Flip.

Si el diseño nuevo tiene intro, **conservá sus reglas**:
- corre solo si la pestaña **entró por `/`** (quien abre el link de una ficha
  ve la ficha, no la presentación), y una vez por sesión (`sessionStorage`);
- con `prefers-reduced-motion` no corre y el logo ya está en su lugar;
- frena el scroll mientras dura y lo suelta siempre al terminar;
- tiene techo de duración y un script que lo mide sin navegador
  (la timeline recibe los targets inyectados, ver [09](09-pruebas.md)).

Si no tiene intro: borrar los tres archivos y la marca `intro-seen`.

### Logo

`src/assets/logo.svg` importado como componente con `vite-plugin-svgr`;
`src/components/Logo.tsx`. Sus colores salen de variables CSS
(`--logo-white`, `--logo-yellow`) para recolorearlo sobre fondos claros sin
tocar el SVG. Tiene ids internos que anima la intro, protegidos por
`scripts/check-logo.mjs`.

Se reemplaza el SVG. Si el logo nuevo se anima por ids: **SVGO apagado** en
svgr y un check de ids (ver [10-trampas.md](10-trampas.md), T1).

### Hero

`src/components/Hero.tsx`, `HeroVideo.tsx`, `src/data/hero.ts` (titular partido
en líneas a mano, bajada, botones), `public/video/hero-desktop.mp4` y
`hero-mobile.mp4`, `public/img/hero-poster.webp`. Video de fondo a sangre con
encuadre ajustado y titular encima. `src/components/Ticker.tsx`: marquesina
con datos del negocio.

Se reemplaza entero. Se conserva: el video del hero es el **único** con
`preload` (los demás `none`), lleva póster en WebP, y la versión mobile es un
archivo aparte más liviano.

### Bisel

`src/components/Bevel.tsx` y la utilidad `bevel` de `globals.css`: toda caja
con borde tiene las esquinas superior-izquierda e inferior-derecha cortadas en
diagonal con `clip-path`. Tres variantes (`solid`, `outline`, `ghost`); el
borde de `outline` se hace con dos cajas recortadas (afuera el color del borde
con 1 px de padding, adentro la superficie), porque `clip-path` recorta el
`border` CSS.

Se reemplaza la forma. Si la forma nueva **también recorta** (clip-path,
máscara), conservá la técnica del anillo de foco hacia adentro
([07](07-responsividad-y-mobile.md)). Si son bordes redondeados comunes, el
foco vuelve a ser un `outline` normal.

### Malla

`src/components/MeshOverlay.tsx`: una grilla de líneas finas con diagonales,
fija detrás de todo, que cambia de tono sobre secciones claras. Decoración
pura: se borra o se reemplaza. (Lección de rendimiento si se anima: ver T29.)

### Riel y encabezados de sección

`src/components/Rail.tsx`: columna fija a la izquierda (56 px en desktop, 16
en mobile) con un marcador y el número de la sección activa.
`SectionHeader.tsx`: eyebrow con número + titular.

La **apariencia** se reemplaza. La **numeración** se conserva: sale de
`src/data/nav.ts` y se renumera sola cuando una sección queda vacía (ver
[06](06-sitio-publico.md)).

### Secciones del inicio (la presentación, no los datos)

| Archivo | Qué hace en el original | Qué se conserva |
|---|---|---|
| `Contadores.tsx` | Franja con cuatro cifras que cuentan desde 0 al entrar | Cuentan una vez, cifras tabulares, la de "años" se calcula del año de apertura |
| `Vehiculos.tsx` | Riel horizontal con 3 destacados | Salen de `listarDestacados()`, esqueletos y error con reintento |
| `Marcas.tsx` | Nombres de marca en tipografía grande que se encienden al pasar por el centro | La lista sale de los títulos publicados; sin marcas no hay sección |
| `Servicios.tsx` | Tiles con ícono dibujado y precio | Datos del panel; íconos se **eligen** de una lista cerrada, no se suben |
| `Faq.tsx` | Acordeón sobre fondo claro con un barrido de color | Botones reales con `aria-expanded`, uno abierto a la vez, alto con `grid-template-rows` |
| `Contacto.tsx` | Datos + formulario que arma un mensaje de WhatsApp | Validación con foco al primer error; envía abriendo WhatsApp |
| `Footer.tsx` | Logotipo a ancho completo, columnas escalonadas, mapa oscurecido | Mapa OSM + «Cómo llegar», observa su franja inferior para apartar flotantes |
| `Menu.tsx` | Barra MENU flotante + panel a pantalla completa | `inert` cerrado, header `inert` con el menú abierto, apila la barra de la ficha |
| `WhatsApp.tsx` | Botón flotante | Un solo WhatsApp visible por vez; se aparta del footer |
| `Icono.tsx` | Íconos SVG dibujados a mano, grilla 24, trazo 1.5 | Íconos propios, sin librería ni emojis |

### El gesto compartido

En el original, el feedback de interacción es un **barrido de color de
izquierda a derecha** (`scaleX` desde `transform-origin: left`, 0,45 s) con el
texto cambiando de color con un pequeño retraso. Está en FAQ, servicios,
cards y etiquetas. Se reemplaza por el gesto del diseño nuevo; lo que se
conserva es tener **uno solo** y reusarlo.

### Textos y contenido de muestra

- `src/data/hero.ts`, ticker, titulares y eyebrows de `src/data/nav.ts`.
- `src/data/contacto.ts`: `NEGOCIO`, `REDES`, `CONSULTAS`, `PRESUPUESTOS`,
  `FLOTANTE_LABEL`.
- `src/data/repo/semilla.ts` (unidades de muestra) y
  `src/data/repo/semilla-contenido.ts` (contadores, servicios, preguntas,
  contacto).
- `ICONOS_SERVICIO` en `src/types/contenido.ts` (paraguas, escáner, escudo…:
  son de un negocio de autos).
- `public/favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `icon-192.png`,
  `icon-512.png`, `manifest.webmanifest`.

## Lo que se CONSERVA tal cual

Todo lo demás. En concreto:

- **Datos**: tipos, interfaz del repositorio, mock + Supabase, modo por variable
  de entorno, carga perezosa del cliente, traducción de errores.
- **Supabase**: el SQL completo, RLS, bucket, `es_admin()`, triggers.
- **Seguridad**: sesión, cierre por inactividad, CSP y encabezados,
  noindex del panel, registro público apagado.
- **Panel**: todas sus funciones (provisoria, compresión, video, etiquetas,
  contenido por bloques, cambios sin guardar, reintentos). Su *estética* sigue
  al diseño nuevo, pero el panel prioriza claridad: sin intro, sin decoración,
  textos y botones grandes, pensado primero para 390 px.
- **Sitio público**: catálogo con filtros/búsqueda/orden en la URL, ficha,
  WhatsApp armado desde los datos, marcas deducidas, "+ gastos", mapa, SEO.
- **Piso de calidad**: responsive desde 360 px, nada que dependa solo del hover,
  `prefers-reduced-motion`, foco visible, 44 px táctiles, animar solo
  `transform`/`opacity`/`clip-path`, `width`/`height` en cada `<img>`, WebP
  < 250 KB, video `preload="none"` salvo el hero, alturas en `svh`.
- **Pruebas**: los scripts, adaptados a las rutas y textos nuevos.
- **Las trampas**: casi todas aplican sin importar el diseño.
