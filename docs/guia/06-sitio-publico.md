# 06 · El sitio público

El visitante típico **llega desde un link de WhatsApp, con datos móviles**. Todo
lo que sigue está pensado para ese caso: el link de una ficha abre la ficha (sin
intro), carga poco, y el próximo paso es siempre escribir por WhatsApp.

## Inicio (`/`)

Las secciones, su orden, sus anclas y su numeración salen de **una sola
fuente**: `SECCIONES` en `src/data/nav.ts` (`indice`, `id`, `eyebrow`,
`titulo`, y opcionalmente `tono`/`fondo` para que el riel, la malla y el header
se adapten a una sección clara). Los componentes leen su número con
`seccion(id)` en vez de llevarlo escrito (con números a mano, insertar una
sección corrió cuatro y el riel decía una cosa y el encabezado otra).

**Las secciones que dependen de datos se ocultan solas si están vacías, y el
resto se renumera**:

```ts
export function seccionesVisibles(ocultas: readonly string[]): Seccion[] {
  return SECCIONES.filter((s) => !ocultas.includes(s.id))
    .map((s, i) => ({ ...s, indice: String(i + 1).padStart(2, '0') }))
}
// lib/contenido.ts
export function ocultasPorCantidad(n: { marcas: number; servicios: number; preguntas: number }) {
  const fuera: string[] = []
  if (n.marcas === 0) fuera.push('marcas')
  if (n.servicios === 0) fuera.push('postventa')
  if (n.preguntas === 0) fuera.push('preguntas')
  return fuera
}
```

Mientras carga no se oculta nada (suponer que están evita que la numeración
salte al llegar). El menú y el footer tampoco ofrecen links a secciones ocultas
(`apuntaAOculta`). **Un id de sección, una vez publicado, no se renombra**
aunque cambie el nombre visible (en el original la sección "Servicios" sigue
siendo `#postventa`): renombrarlo rompe links ya compartidos.

La **sección activa** del riel es la que **cruza la mitad del viewport**
(`IntersectionObserver` con `rootMargin: '-49.5% 0px -49.5% 0px'`). Con "la de
más % visible", una franja chica le ganaba al hero y una sección alta nunca
llegaba al umbral. El header usa otro observador sobre la franja superior
(`rootMargin: '0px 0px -90% 0px'`) para saber qué fondo tiene debajo.

Los destacados del inicio salen de `repo.listarDestacados(3)`.

## Catálogo (`/catalogo`)

- **Chips de condición fijos** (Todos, 0km, Usados): no salen del stock. Un chip
  que aparece y desaparece según el stock mueve a los otros; tocar uno sin
  resultados muestra el vacío que invita a pedirlo por WhatsApp.
- **Buscador** sobre título y descripción, sin acentos ni mayúsculas. Lo filtra
  el **repo** (en Supabase viaja como `ilike` sobre `busqueda`), nunca el
  componente sobre todo el stock.
- **Ordenar por** (`<select>` nativo: en el celular abre la rueda del sistema):
  recientes, precio ↑↓, año ↑↓, km ↑↓. Ordena la base; los que no tienen el dato
  van al final; **los vendidos aparte, al fondo**, conservando el orden pedido
  (los reservados no: pueden liberarse).
- **Todo en la URL**, para que el link filtrado se comparta:
  `/catalogo?condicion=usado&q=ram&orden=precio-asc`. El orden por defecto no se
  escribe.
- **Historial**:
  - los chips y el orden **empujan** una entrada (cambiar de filtro es una
    decisión; atrás la deshace);
  - el texto se escribe en un estado local y pasa a la URL con **300 ms de
    retardo**; **empezar** a buscar empuja, **corregir** reemplaza. Así atrás
    deshace "la búsqueda" de una vez, en vez de letra por letra;
  - URL → campo solo cuando el cambio vino de afuera (atrás, link pegado): pisar
    el campo mientras se tipea mueve el cursor.
- "Cargando" se **deduce** comparando la consulta del resultado guardado con la
  actual (sin `setCargando(true)`, que miente un frame). Al cambiar de filtro con
  resultados en pantalla se atenúa la grilla; los esqueletos son solo para la
  primera carga.
- "Ver todas" limpia los filtros pero **no el orden**.
- Mobile: control lista / grilla 2×2 (`<prefijo>.catalogo.vista` en
  `localStorage`, leído en el inicializador). En la grilla compacta la card se
  queda con foto, título y precio.
- Vacío: dice que no hay, ofrece limpiar filtros y escribir por WhatsApp.
- **Por dónde iba el visitante** se anota en `sessionStorage`
  (`recordarCatalogo(location.search)`), para que la ficha ofrezca volver a
  *esos* filtros (`linkAlCatalogo()`, validando que empiece con `?`). En
  `sessionStorage` y no en `localStorage`: un filtro de la semana pasada
  aplicado solo se lee como "no hay stock". Quien entró directo a una ficha
  vuelve al catálogo pelado.

### La card (`components/VehiculoCard.tsx`)

La usan el inicio y el catálogo; no sabe en cuál está (el ancho lo pone el
contenedor). **La card entera es el link** a la ficha. Muestra: foto 16:10 con el
chip de estado, título (**entero, sin truncar**), condición, año y km, precio con
"+ gastos" y las etiquetas marcadas para la tarjeta (rótulo arriba, valor abajo,
como año y km; si no entran al lado del precio bajan a otro renglón). Con
segunda foto y **puntero fino**, el hover pasa a ella, **montándola recién en el
primer hover** (una grilla de doce no descarga doce fotos de más). Sin fotos:
"SIN FOTOS TODAVÍA" (es un estado real del panel, no un error).

## Ficha (`/vehiculo/:slug`)

- `repo.obtenerPorSlug(slug)`; **un borrador se trata como inexistente**: el repo
  se lo devuelve a la dueña logueada (para previsualizar), pero es la ficha la
  que decide. Inexistente y borrador dan **el mismo 404**, con salida al
  catálogo y a WhatsApp.
- Se muestra sin esperar a "otros vehículos" (segundo pedido, al final; si falla
  no hay cartel). Otros: **misma condición primero**, vendidos al fondo.
- Galería: en mobile tira con `scroll-snap` e indicador "2 / 5"; en desktop foto
  grande con miniaturas. Con una sola foto, sin controles. Desde `lg` la foto
  llena la columna (16:10 a 2:1).
- **Visor a pantalla completa**: se pasa con el dedo o flechas, cierra con X,
  Escape o deslizando hacia abajo, bloquea el scroll y **devuelve el foco** al
  cerrar.
- Video: **no se monta hasta la intención** del visitante (`preload="none"`
  evita la metadata pero no el pedido si el `<video>` está en el DOM). En reposo
  muestra la primera foto. Click lo abre con sonido a pantalla completa.
- Etiquetas en grilla, con su foto de fondo bajo un velo para que el texto se
  lea; en un teléfono se encienden con un toque (no hay hover).
- Precio: el texto llena el ancho del panel de precio **midiendo**
  (`useFitText(ref, 44, 20)`: techo y piso en px), con "+ gastos" dentro del
  mismo renglón medido.
- **WhatsApp de la ficha**: el mensaje lleva el título y el **link de la
  ficha**, armado con `window.location.origin` (no `location.href`: sin
  parámetros de campaña ni `#`). "Me interesa el Corolla" obliga a preguntar
  cuál; el link abre exactamente esa.
- Título de la pestaña y meta description con el nombre, año, km y precio.
- Mobile: barra fija con el botón de WhatsApp, apilada sobre la barra MENU,
  que **solo aparece cuando el botón del panel de precio no está libre en
  pantalla** (ver [07](07-responsividad-y-mobile.md)).

## WhatsApp

**Nunca se escribe un número ni un `wa.me/…` en un componente.** El número vive
en la base (contacto, editable en el panel) y se lee con `useContacto()`; el
link se arma con `whatsappUrl()` de `src/data/contacto.ts`:

```ts
/** Lo que escribió la dueña → formato de wa.me (internacional, sin +). null si no se puede. */
export function numeroWhatsapp(texto: string): string | null {
  let d = texto.replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('54')) d = d.slice(2)
  if (d.startsWith('9')) d = d.slice(1)
  if (d.startsWith('0')) d = d.slice(1)
  if (d.length === 12) {                         // el "15" viejo después de la característica
    for (const largo of [2, 3, 4]) {
      if (d.slice(largo, largo + 2) === '15') { d = d.slice(0, largo) + d.slice(largo + 2); break }
    }
  }
  return d.length === 10 ? `549${d}` : null
}
export function whatsappUrl(numero: string, mensaje?: string) {
  const base = `https://wa.me/${numeroWhatsapp(numero) ?? ''}`   // sin número: WhatsApp deja elegir contacto
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base
}
```

Es la normalización de **celulares argentinos** (+54 9, con o sin 0 y 15). Otro
país: reescribir esta función y su validación. El **formulario de contacto**
valida, arma el mensaje con las opciones elegidas y **abre WhatsApp**: no hay
backend de mails ni "mensaje enviado" (mentiría: no está enviado hasta que la
persona lo manda).

## Marcas deducidas de los títulos

La marca **no es un campo**: se deduce del título. `src/data/marcas.ts` tiene un
diccionario de marcas (nombre visible + alias normalizados) y:

```ts
export function marcasEnTitulos(titulos: readonly string[]): Marca[] {
  const textos = titulos.map((t) => ` ${normalizar(t)} `)   // sin tildes, minúsculas, no-alfanum → espacio
  return DICCIONARIO_MARCAS.filter((m) => m.alias.some((a) => textos.some((t) => t.includes(` ${a} `))))
}
```

Por **palabra entera** con espacios alrededor ("ram" encuentra "RAM 1500" y no
"Ramírez"); las de dos palabras entran porque el título se normaliza igual. Se
calcula sobre las **publicadas** y viaja en `useContenido()` (de si hay o no
depende la numeración). Sin marcas, no hay sección. Una marca nueva que no está
en el diccionario no aparece hasta agregarla. Sin logos de marcas (marca
registrada, y recrearlos sale impreciso).

## Precios

- `formatearPrecio(n)`: `Intl.NumberFormat('es-AR', { style: 'currency',
  currency: 'ARS', maximumFractionDigits: 0 })`; `null` → "Consultar precio".
- **"+ gastos"** (`MAS_GASTOS`) detrás del precio de una **unidad** en todo el
  sitio público (cards, catálogo, ficha, otros): el precio publicado no incluye
  transferencia ni patentamiento, y se dice de entrada. Más chico que la cifra,
  sin cortarse ("+ gas…" nunca: baja entero de renglón). Con "Consultar precio"
  no va. **En el panel no**: ahí se ve la cifra pelada, que es lo que se carga.
  `precioPublico(n)` lo arma como texto corrido para la meta description.
- Los precios de **servicios** usan el mismo formateador, sin "+ gastos".

## Mapa

Footer: embed de **OpenStreetMap** (sin clave ni cuenta) con un recuadro de
~1,2 × 0,9 km alrededor de las coordenadas y un marcador, oscurecido con CSS
(`.mapa-oscuro`, filtro sobre el iframe). En táctil, `pointer-events: none`
(`pointer-coarse:`): un mapa que se arrastra con el dedo secuestra el scroll de
la página. Debajo, **«Cómo llegar»** a Google Maps por coordenadas
(`/maps/dir/?api=1&destination=lat,lng`; el texto de la dirección Google lo
puede interpretar en otra ciudad) y la atribución de OSM. El CSP permite
`frame-src https://www.openstreetmap.org`.

## SEO

- **Título y meta description por página** con `useTitulo(titulo, descripcion)`
  (`src/lib/titulo.ts`): los pone al montar y **los restaura en la limpieza**
  (así una ruta que no llama al hook, el inicio, no hereda el título anterior).
  El título de la pestaña es el texto con el que WhatsApp y el historial nombran
  el link.
- **Canonical por ruta** con `useCanonical(pathname)` en `App`: dominio oficial
  + ruta, **sin parámetros** (`/catalogo?orden=…` es la misma página). También
  actualiza `og:url`.
- El dominio oficial está escrito en **cuatro lugares**: `src/data/sitio.ts`
  (`SITIO_URL`), `index.html` (canonical y Open Graph), `public/robots.txt`
  (`Sitemap:`) y `public/sitemap.xml`. Esos archivos se sirven sin JS: el
  dominio tiene que ir escrito.
- `sitemap.xml` con `/` y `/catalogo` (las fichas cambian todo el tiempo y no
  hay generación en build).
- **La limitación de Open Graph en una SPA**: la vista previa de un link pegado
  en WhatsApp, Facebook o X **no ejecuta JS**: siempre muestra el título, la
  descripción y la imagen de `index.html`, aunque el link sea de una ficha. Lo
  que pone `useTitulo` lo ven solo los buscadores que ejecutan JS. Resolverlo
  pide renderizar en el servidor o generar HTML por ficha (por ejemplo, una
  función de Vercel que sirva `/vehiculo/:slug` con sus `og:` leyendo la base);
  en el original **no se hizo**. Mientras tanto: `og:image` absoluta y buena en
  `index.html`, y el mensaje de WhatsApp lleva el título del auto escrito.
- `lang="es-AR"`, `theme-color`, íconos y `manifest.webmanifest`.
