# 10 · Trampas aprendidas

Todo lo que se rompió durante el proyecto original, por qué, y la regla que
dejó. Casi todas **fallan en silencio**: el build pasa, el lint pasa, y el
problema solo aparece en un navegador, en un celular o con datos reales. Están
numeradas porque el resto de la guía las cita.

Formato: **qué pasó** → **por qué** → **regla**.

---

## Build y herramientas

**T1 · SVGO borra los ids del logo.**
El logo se anima por ids internos; SVGO borra los ids que considera no usados
(`cleanupIds`) y el build no se queja. → `vite-plugin-svgr` con
`svgrOptions: { svgo: false }` (y, si alguien lo prende, `cleanupIds: false`).
Un script (`check-logo.mjs`) verifica los ids. Ojo también al reemplazar el SVG
por el que manda el cliente: puede venir sin ids o con metadata (en el original,
7,7 KB de metadata C2PA).

**T2 · Un `\` en un pseudo-elemento rompe Tailwind v4.**
`content: "\\"` escrito a mano corta el parser de CSS de Tailwind v4 con
"Unterminated string". → Escape unicode: `content: "\005C";`.

## React

**T3 · Componentes definidos dentro de otros pierden el foco.**
Los campos del formulario estaban definidos dentro del componente del
formulario: React los recrea en cada render y el input pierde el foco después de
cada tecla. → Todo componente a nivel de módulo (`components/admin/Campos.tsx`).

**T4 · StrictMode corre los efectos dos veces en desarrollo.**
«Nueva unidad» crea la unidad en un efecto: dos ejecuciones son dos unidades. Y
el borrado de la provisoria vacía al desmontar se disparaba en el desmontaje de
prueba. → La promesa del alta en un `ref` (`pedido.current ??= repo.crear(…)`);
el borrado al desmontar se agenda con `setTimeout(…, 0)` y el re-montaje lo
cancela con `clearTimeout`. Los valores que lee una limpieza van en refs (la
limpieza ve el render del efecto que la agendó, no el último).

## Datos (mock)

**T5 · `localStorage` no sirve para fotos ni videos.**
Son ~5 MB **de texto**; como data URL cada archivo abulta un tercio más. La
carga se rompía en la cuarta foto y un video no entró nunca. → La ficha en
`localStorage`, los bytes en **IndexedDB**, unidos por una referencia
`idb:<clave>` que se convierte en `blob:` URL al leer. Y si una escritura no
entra, `QuotaExceededError` → mensaje claro, no un fallo silencioso.

## CSS y layout

**T6 · `clamp()` mal armado, y contenedores sin tope.**
Un `clamp(2.5rem, 8.5vw, …)` tenía el mínimo (40 px) **mayor** que el valor
preferido a 390 px (33 px): el `vw` no hacía nada y una palabra tocaba el borde.
Y aunque todos los `clamp` tenían tope, **los contenedores no**: en 2560 las
cards medían 800 px. → Verificar el `clamp` en los dos extremos; tope en los
contenedores (`--shell-max`) y en los renglones (`max-width` en `ch`).

**T7 · Dos utilidades de la misma propiedad en el mismo atributo.**
`relative` + `absolute`, `bg-x` + `bg-y`, `hidden` + una clase propia con
`display`, `border-l` + `border-l-0`: gana **el orden en que Tailwind emite las
reglas, no el orden en que se escriben**. En el original: un video quedó con
alto 0, un flotante no se escondía en mobile, un borde no se podía pisar (cuatro
apariciones del mismo choque). → Nunca dos utilidades de la misma propiedad;
componentes con props que **reemplazan** la clase (`borderClassName`,
`surfaceClassName`) en vez de sumarla; arrays de clases escritos caso por caso
en vez de condicionales que se pisan.

**T8 · El tamaño en la caja equivocada de un componente compuesto.**
Un componente con dos cajas (borde afuera, superficie adentro con `h-full
w-full`) recibió el tamaño en la clase de la de adentro: el selector de foto de
fondo salió a pantalla completa. → Documentar en el componente qué prop lleva el
tamaño (en el original: en la variante con borde, el tamaño va en
`outerClassName`).

**T9 · Una palabra larga o una grilla sin columnas desbordan la página.**
A 360 px, "patentamiento" forzó una columna de 330 px en un contenedor de 304:
la página entera scrolleaba de costado. En el panel, una grilla sin columnas
declaradas estiró el documento a 583 px y el navegador móvil se alejó para
mostrarlo: todo el panel quedó diminuto. → `min-w-0` en hijos de flex/grid,
`overflow-wrap: anywhere` donde haya texto libre, grillas con columnas
explícitas, y el chequeo de desborde en 360.

**T10 · Truncar títulos esconde lo que los distingue.**
Los títulos reales se diferencian al final ("… 1.5 SEL" / "… 1.5 SEL AUT");
truncados o con `line-clamp` en un celular quedaban iguales. → Títulos enteros
(`break-words`), en cards y en el panel. Probar siempre con títulos reales, que
son más largos que los de muestra.

## Fuentes y medir texto

**T11 · Fuentes de terceros y preload.**
Un día Google Fonts no respondió y **todo el sitio se dibujó en Arial**. →
Fuentes autoalojadas; un pase offline en el arnés que exige cero pedidos
externos y verifica que la fuente cargó. El `preload` **lleva `crossorigin`**
aunque sea del mismo origen, o se descarga dos veces. Nombre de archivo estable
(sin hash) para poder precargarlo.

**T12 · Medir texto: tres errores distintos.**
(a) Un `clamp` adivinado para un logotipo de ancho completo lo cortaba ("…\JU")
porque el ancho de los glifos depende de la fuente, el peso y el texto. → Medir
(`useFitText`): poner un tamaño de sonda, medir, escalar.
(b) `scrollWidth` **nunca es menor que `clientWidth`**: con eso el ajuste solo
podía achicar. → Medir el texto con un `Range` (`getBoundingClientRect`).
(c) Medir con un `Range` una línea **ya partida** devuelve la unión de los
renglones (un ancho menor que el texto): el titular "entraba" en la medición y se
partía en pantalla en los doce anchos. → Medir una copia en `nowrap`.

**T13 · `prefers-reduced-motion` con `0.01ms` rompe las mediciones.**
La hoja global ponía `transition-duration: 0.01ms` a todo; como
`transition-property` vale `all` por defecto, **cada cambio de estilo pasaba a
ser una transición** y el ajuste de texto leía el tamaño viejo. El precio de la
ficha quedaba en el techo y desbordaba el panel **en todos los anchos**, solo
para quien tiene activado "reducir movimiento". → `transition-duration: 0s` y
`transition-delay: 0s`. (`0.01ms` existe para que dispare `transitionend`; si
nadie lo escucha, sobra.)

## Scroll y animación

**T14 · Limpiar ScrollTrigger entre rutas en un `useEffect` mata los de la
página nueva.**
La limpieza de un `useEffect` puede quedar diferida y correr después de que la
página nueva creó sus ScrollTrigger. → Envolver las rutas en un componente con
`key={pathname}` y limpiar (`ScrollTrigger.getAll().forEach(t => t.kill())`) en
la limpieza de un **`useLayoutEffect`**, que corre en la fase de mutación, antes
de los layout effects del árbol que entra.

**T15 · Lenis tiene que existir antes del primer render.**
La intro llama a `stopScroll()` en su layout effect, y los layout effects de los
hijos corren antes que los efectos del padre: con el init dentro de `App`, Lenis
nacía **arrancado** justo después de que la intro pidió frenar. →
`initSmooth()` en `main.tsx`, antes de `createRoot().render()`.

**T16 · La barra del navegador de WhatsApp empuja la página.**
Ver [07](07-responsividad-y-mobile.md). → Altos en `svh` (nunca `vh`/`dvh`),
`ScrollTrigger.config({ ignoreMobileResize: true })` antes del primer
ScrollTrigger, ignorar cambios de solo alto < 150 px, y lo que se ajusta al
ancho observa solo el ancho.

**T17 · "La sección con más % visible" no sirve para un índice.**
La franja corta de contadores le ganaba al hero, y una sección pinneada de tres
pantallas nunca llegaba al umbral: el riel arrancaba en 02 y saltaba al 04. → La
activa es **la que cruza la mitad del viewport** (`rootMargin: '-49.5% 0px
-49.5% 0px'`).

**T18 · Capturar el puntero en `pointerdown` se come el click.**
El riel arrastrable pedía `setPointerCapture` al apoyar el dedo, y Chrome
disparaba el click sobre el riel y no sobre el link: un click limpio en una card
no abría nada. → Capturar recién cuando el arrastre supera un umbral.

**T19 · Lo que el build no ve: la intro invisible.**
El panel del barrido iba después del escenario en el DOM, sin `z-index`, y lo
tapaba desde el frame cero: 2,3 de los 2,6 s eran pantalla negra, con build,
lint y dos scripts propios en verde. Y una estela con un retardo literal de
0,05 s, con la línea a ~11.500 px/s, quedaba 400 px atrás. → **La verificación
visual es parte de terminar**: capturas muestreadas contra reloj y mirarlas.
Con objetos rápidos, nada de retardos literales: compartir el tween y variar el
largo.

## Supabase

**T20 · Un `update` bloqueado por RLS no da error.**
Devuelve **cero filas**, y el panel decía "guardado". → `.select('id')` en cada
update/delete y tratar cero filas como "no se guardó: la unidad ya no existe o
tu cuenta no tiene permiso".

**T21 · `upsert` en filas fijas falla por permisos.**
Contadores, `sitio` y `contacto` no tienen permiso de alta a propósito (siempre
son las mismas filas); un `upsert` pide permiso de alta. → `UPDATE` fila por
fila.

**T22 · Pedir una columna que todavía no existe tumba toda la consulta.**
Si el código nuevo (que pide `etiquetas.en_tarjeta`) se despliega antes de
correr el SQL, **el sitio entero se queda sin stock**. → El repo pide la
columna; si la base contesta que no existe (`42703` en lectura, `PGRST204` en
escritura, nombrando la columna), lo recuerda por la sesión y repite sin ella. Y
**no descarta en silencio** lo que se iba a guardar en esa columna: si la dueña
marcó algo, no guarda y le dice qué falta. El orden entre deploy y SQL deja de
importar.

**T23 · Un componente que busca el nodo de otro se rompe cuando el árbol se
remonta.**
Los flotantes buscaban el nodo del footer (con `getElementById`, después con un
registro) para saber si estaba a la vista: en la ficha fallaba, porque la ficha
desmonta el árbol del esqueleto y monta otro cuando llegan los datos, y quién ve
qué dependía del orden en que React engancha las refs. → **El dueño del nodo
observa** (el footer, sobre su propia ref) y publica un booleano en un store;
los demás solo lo leen.

**T24 · La RLS le muestra los borradores a la dueña en el sitio público.**
La política deja ver borradores a los admins (el panel los necesita), así que
con la sesión abierta el catálogo público, en la misma pestaña, los mostraba. →
El repo filtra `publicado = true` a mano en todo lo público; la ficha trata un
borrador como 404.

**T25 · Los archivos del bucket no se borran solos.**
La base borra en cascada las filas, pero los archivos quedan huérfanos (y se
pagan). → El repo borra los archivos **después** de borrar la fila (al revés,
quedaría una unidad apuntando a fotos que no existen); carpeta por unidad, que se
vacía entera al borrarla; si la fila no entró después de subir el archivo, se
borra el archivo; **el póster del video puede ser la foto de portada**: antes de
borrarlo, fijarse que ninguna foto lo use.

**T26 · Configuración de Supabase que se rompe callada.**
(a) Pegar la Project URL con `/rest/v1/` arma `/rest/v1/rest/v1/…` y todo da 404
→ limpiarla en `modo.ts`. (b) Un build de producción sin claves que cayera al
mock **mostraría las unidades de muestra como stock real** → en producción, sin
claves, se queda en Supabase y muestra los carteles de error. (c) Supabase da
privilegios a `anon` sobre toda tabla nueva de `public` → `revoke all` primero
en el SQL. (d) Al crear el usuario de la dueña, sin "Auto Confirm User",
`es_admin()` no la reconoce.

## Rendimiento

**T27 · Una dependencia de animación por una sola animación.**
`motion` era el 25% del JS (133 KB) por el `clip-path` del menú. → CSS; el panel
vive siempre en el DOM y va `inert` cerrado.

**T28 · Importar algo de `cliente.ts` mete Supabase entero en el arranque.**
→ Nadie importa `cliente.ts`; se pide con `import()` dinámico. Las constantes
que hacen falta en otros lados (el nombre del bucket) viven en otro archivo.

**T29 · Efectos caros por frame en mobile.**
`backdrop-filter` en barras fijas a todo el ancho (header, barras de guardar) y
filtros SVG animados en la decoración. → Degradados o fondos opacos; decoración
animada solo con puntero fino, y medida (fps y cuadros largos con CPU ×4/×6)
antes de mantenerla.

**T30 · `preload="none"` no alcanza.**
Evita la metadata pero un `<video>` en el DOM puede pedir igual; y dos `<video>`
montados (uno oculto con CSS para mobile/desktop) pedían los dos. → No montar el
video hasta la intención del visitante; un solo `<video>`.

## Panel

**T31 · Fotos de iPhone acostadas y PNG silenciosos.**
El sensor graba en horizontal y anota la rotación en EXIF, que el canvas ignora:
las fotos verticales entraban acostadas. Y `canvas.toBlob` con un tipo que el
navegador no soporta **devuelve PNG sin avisar** (más pesado que el original). →
`createImageBitmap(archivo, { imageOrientation: 'from-image' })`; si el blob no
es WebP, caer a JPEG.

**T32 · La sesión y el reloj de inactividad.**
(a) Una constante declarada **más abajo** que la lectura que se hace al cargar
el módulo cae en la zona muerta (TDZ); un `try` se tragaba el error y el modo
mock arrancaba siempre sin sesión → declarar antes de usar a nivel de módulo.
(b) Si el token guardado ya no se puede renovar, el cliente lo borra al arrancar
y no queda forma de saber "venció" → mirar `localStorage` (`sb-*-auth-token`)
**al cargar el módulo** para poder decir "tu sesión venció".
(c) El evento `scroll` lo dispara también un scroll programático (Lenis
terminando una inercia): el panel se mantenía vivo solo → contar `pointerdown`,
`keydown`, `wheel`, `touchstart`, `touchmove`.
(d) Un celular bloqueado congela los timers → revisar en `visibilitychange`.
(e) Subir un video con mala señal tarda más que el aviso → las subidas en curso
cuentan como actividad.

**T33 · `useBlocker` no existe con `BrowserRouter`.**
Solo funciona en un data router. → `beforeunload` para cerrar/recargar, y un
diálogo propio en las salidas de adentro del panel. El botón atrás del navegador
queda sin cubrir; en un proyecto nuevo, evaluar `createBrowserRouter`.

**T34 · Direcciones que cambian y semillas que no se actualizan.**
(a) El slug cambia al corregir el título: una edición direccionada por slug
apunta a una dirección que ya no existe apenas se guarda → el panel edita **por
id**. (b) En el mock, lo guardado en `localStorage` gana sobre la semilla nueva:
un navegador que ya visitó el sitio se queda con los datos viejos para siempre →
**versionar la clave** (`…vehiculos.v4`) y subirla cada vez que cambia la
semilla.

**T35 · El QR para la calle.**
(a) Biselar los cuadros de las esquinas (aunque sea 0,5 módulo) rompe la lectura:
los lectores validan esos cuadros también en diagonal, que es justo donde el
bisel corta. (b) Un logo centrado en una versión 4 cae en dos de los cuatro
bloques de corrección y les come casi todo el margen: forzar versión 5 y un
hueco chico reparte el daño. (c) Un despintado del 10–15% **no lo aguanta ningún
QR**, ni sin logo: el nivel H corrige ~30% de las *palabras*, y cada mancha toca
varias. (d) Para simular sol, un velo blanco, no bajar el contraste hacia el
gris medio (eso voltea a los lectores aun con un QR pelado).

## Contenido y SPA

**T36 · Datos escritos a mano que envejecen.**
El contador de años decía 9 cuando eran 3, y el titular de al lado lo repetía;
los números de sección escritos en cada componente se desfasaban al insertar
una; el número de WhatsApp copiado en varios lugares. → Calcular lo que crece
solo (años desde la apertura), una fuente única para el orden de secciones, y el
contacto en la base leído con un hook.

**T37 · Lo que una SPA no puede hacer sola.**
`vercel.json` reescribe todo a `index.html`: sin una ruta comodín, una URL
inventada da 200 y pantalla en blanco. Y la vista previa de un link en WhatsApp
**no ejecuta JS**: muestra siempre el Open Graph de `index.html`. → Ruta `*` con
un 404 de verdad; OG fijo y bueno en el HTML (y, si hace falta por ficha,
renderizar en el servidor).

**T38 · El foco sobre formas recortadas no se ve.**
`clip-path` recorta el `outline`, y también un `drop-shadow` del mismo elemento
(el filtro se aplica antes del recorte). Después, una regla `.bevel
:focus-visible` con la misma especificidad, declarada más abajo, pisaba el
anillo de los botones recortados dentro de cajas recortadas. → Anillo hacia
adentro con `::after` y `polygon(evenodd, …)`; `:not(.bevel)` en la regla de los
controles internos; medir el anillo en píxeles.

**T39 · Accesibilidad del menú.**
Con el menú abierto, el logo del header quedaba como link fuera del diálogo; y
el botón MENU era la **última** parada del teclado, después de todas las
secciones. → Header `inert` con el menú abierto, menú `inert` cerrado, el orden
del DOM es el orden del Tab.

**T40 · Números de muchas cifras en un celular.**
Sin separador, "12500000" y "1250000" se distinguen contando ceros: es como se
publica algo a la décima parte del precio. → Separar miles **mientras se
escribe** y devolver el cursor contando cifras, no posiciones; el campo guarda
texto (vacío no es 0).

## Abierto

**T41 · Pendiente sin resolver en el original**: en el navegador sin interfaz
de las pruebas, una card del riel del inicio a veces pinta la foto en negro.
Está anotado como pendiente y no hay diagnóstico registrado. Si aparece en el
proyecto nuevo, una sugerencia (no verificada) para empezar: cómo se monta la
foto (`loading="lazy"` + `decoding="async"` dentro de un contenedor con
`overflow` y transformaciones, en un riel horizontal).
