# 05 · El panel (`/admin`)

Lo usa una sola persona, que no es técnica, **casi siempre desde el celular**.
Se diseña primero para 390 px. Mismo sistema visual que el sitio pero claridad
antes que efecto: sin intro, sin decoración, sin animaciones decorativas,
textos y botones grandes (todo control ≥ 44 px). El marco del panel
(`components/admin/Marco.tsx`) no lleva menú, footer ni flotantes.

Todo el panel entra por `lazy()` (su código no viaja a quien mira un auto) y
tiene rutas propias: `/admin/login`, `/admin` (listado), `/admin/nuevo`,
`/admin/editar/:id`, `/admin/contenido`. Arriba, dos pestañas: **Unidades** y
**Contenido del sitio**, y SALIR.

## Login

- Validación antes de molestar al servidor, con mensajes que dicen qué hacer:
  "Escribí tu email para entrar", "Ese email está incompleto. Tiene que ser
  como nombre@dominio.com".
- Al abrirse muestra `avisoDeSalida()` si la sesión se cerró sola (vencida,
  inactividad, cerrada desde otra pestaña).
- Al entrar vuelve a la página del panel que se había pedido (viaja en el
  `state` de la navegación).
- Con sesión abierta, `/admin/login` redirige al panel.

## Listado

- **Todo el stock, borradores incluidos**, ordenado por **último cambio**
  (`orden: 'actualizados'`): lo que se estuvo tocando es lo que se va a volver
  a tocar.
- Cada fila **grita su estado** con insignias, en este orden: `INCOMPLETA`
  (provisoria que nunca se guardó con título), `BORRADOR`, `RESERVADA` /
  `VENDIDA` (color de señal), `DESTACADA`. El error caro es creer que una
  unidad está online cuando es un borrador.
- Buscador (con un mínimo de letras antes de pedir al repo).
- Vista **lista o grilla**, recordada en `localStorage`
  (`<prefijo>.panel.vista`), leída en el inicializador del estado para no
  parpadear.
- **Títulos enteros, nunca truncados**: los títulos reales se distinguen al
  final ("… 1.5 SEL" y "… 1.5 SEL AUT") y truncados en un celular quedaban
  iguales.
- Toda la fila es el link a la edición.

## «Nueva unidad»: la unidad provisoria

Una foto se sube **contra el id de una unidad**, así que la unidad tiene que
existir antes de que la dueña escriba nada: si no, no puede empezar por las
fotos, que es como trabaja. «Nueva unidad» crea en el acto un **borrador
provisorio** y abre su edición.

```ts
// src/lib/provisoria.ts
export const TITULO_PROVISORIO = 'Unidad sin título'
export function slugProvisorio() {
  return 'borrador-' + Math.random().toString(36).slice(2, 10)   // dos pestañas no chocan
}
export const esProvisoria = (v: { titulo: string }) => v.titulo === TITULO_PROVISORIO
/** Provisoria y sin archivos: la que se borra sola si se sale sin tocar nada. */
export const estaVacia = (v: Vehiculo) => esProvisoria(v) && v.fotos.length === 0 && !v.video
```

```tsx
// NuevaUnidad: el pedido vive en un ref. StrictMode corre el efecto dos veces
// en desarrollo, y dos pedidos serían dos unidades.
const pedido = useRef<Promise<Vehiculo> | null>(null)
useEffect(() => {
  let vivo = true
  pedido.current ??= repo.crear({
    titulo: TITULO_PROVISORIO, slug: slugProvisorio(),
    condicion: 'usado', publicado: false, destacado: false,
  })
  pedido.current
    .then((v) => vivo && navegar(`/admin/editar/${v.id}`, { replace: true }))  // atrás no vuelve acá
    .catch((e) => { pedido.current = null; if (vivo) setFalla(e.message) })
  return () => { vivo = false }
}, [navegar, intento])
```

En el formulario:

- La provisoria abre con **título y dirección vacíos** (no muestra "Unidad sin
  título"); la dirección sigue al título real. **Deja de ser provisoria la
  primera vez que se guarda** con su título (la validación no deja guardar el
  título provisorio).
- **Si se sale sin cargar nada, se borra sola.** Dos caminos: la salida de
  adentro (volver, el diálogo) espera al borrado antes de ir al listado; cualquier
  otra salida dentro del sitio pasa por el desmontaje:

```tsx
// En refs: el desmontaje ve el último render, no el del efecto que lo agendó.
useEffect(() => {
  vaciaRef.current = Boolean(guardada && estaVacia(guardada))
  sucioRef.current = sucio
})
useEffect(() => {
  if (!id) return
  clearTimeout(pendiente.current)        // el re-montaje de StrictMode cancela el borrado
  return () => {
    pendiente.current = setTimeout(() => {
      if (resuelta.current || !vaciaRef.current || sucioRef.current) return
      repo.eliminar(id).catch(() => {})
    }, 0)
  }
}, [id])
```

- **Con una foto o el video ya subidos no se borra**, aunque no se haya
  guardado: es trabajo hecho. Cerrar la pestaña no pasa por ninguno de los dos
  caminos: queda en el listado como `INCOMPLETA` para retomarla o borrarla.

## Formulario de una unidad

- **Los campos viven a nivel de módulo** (`components/admin/Campos.tsx`).
  Definidos dentro del formulario, React los recrea en cada render y el input
  pierde el foco después de cada tecla (T3).
- Validación al guardar: errores en el color de señal, **el foco salta al
  primer campo con problema** y se scrollea hasta él. El error se va al
  corregir ese campo. Rangos: año entre 1950 y el año que viene, km hasta
  1.500.000, título obligatorio, dirección con la forma de slug.
- **La dirección (slug) sigue al título** mientras no se la toque a mano;
  después queda fija. Botón «Armarla del título» para volver.
- **Precio y km con separador de miles mientras se escribe** (`CampoMiles`):
  "12500000" y "1250000" se distinguen contando ceros en un celular, que es
  como se publica un auto a la décima parte de su precio. El campo guarda
  **texto** (vacío no es 0). El cursor vuelve a su lugar **contando cifras, no
  posiciones**:

```tsx
const escribir = (e: ChangeEvent<HTMLInputElement>) => {
  const crudo = e.target.value
  const corte = e.target.selectionStart ?? crudo.length
  const cifras = soloDigitos(crudo.slice(0, corte)).length   // cuántas cifras había antes del cursor
  const formateado = separarMiles(crudo)                     // "12.500.000"
  cursor.current = trasCifras(formateado, cifras)            // misma cantidad de cifras a la izquierda
  onCambio(formateado)
}
useLayoutEffect(() => {                                      // después de pintar, sin dependencias
  const n = cursor.current; cursor.current = null
  if (n !== null) propio.current?.setSelectionRange(n, n)
})
```

- Publicación: `publicado` y `destacado` como interruptores claros, y el estado
  (disponible/reservado/vendido).
- Desde `lg`: formulario en dos columnas (datos y publicación | fotos y video),
  etiquetas a lo ancho; contenido hasta 80rem.
- Barra de guardar fija abajo, **opaca** (sin `backdrop-blur`, ver T29).
- Borrar la unidad pide confirmación en `Dialogo.tsx`: un **`<dialog>` nativo**
  (trae capa superior, trampa de foco y Escape) y no `confirm()` (que no puede
  decir cuántas fotos se van a borrar). El titular dice qué va a pasar, no
  "¿Estás seguro?"; el botón dice qué hace ("Borrar la unidad"); **entra
  enfocado el botón que cancela**, así un Enter de más no borra nada; el
  peligroso va en el color de señal.

## Fotos (`components/admin/Fotos.tsx`)

- **Se guardan al instante**, no con el botón del formulario: cada foto es un
  archivo que ya viajó, y colgarlas de un "guardar" significaría que cerrar la
  pestaña con seis fotos subidas las pierde todas.
- Se eligen varias a la vez y se procesan **de a una**, en una cola visible con
  la etapa de cada una: EN LA FILA → ACHICANDO… → GUARDANDO…, o NO SE PUDO con
  el motivo y **reintentar sin volver a elegirla** (se guarda el original). El
  color de acento lo lleva solo la que se está procesando.
- **Reordenar con flechas, no arrastrando**: en un celular el arrastre pelea con
  el scroll de la página. La primera es la portada.
- Borrar una foto deja sin fondo a las etiquetas que la usaban (la base lo
  hace con `on delete set null`).
- Tope de 10, avisado antes de elegir.

### Compresión en el navegador (`src/lib/archivos.ts`)

Una foto de celular son 4–5 MB de 4000 px. Se achica **antes** de tocar el
repositorio: lo que se guarda es lo que se sirve.

```ts
export const LADO_MAYOR = 1600
export const PESO_OBJETIVO = 250 * 1024
const CALIDADES = [0.82, 0.72, 0.62, 0.5, 0.4]   // 0.9 nunca entra: no perder tiempo

export async function prepararFoto(archivo: File) {
  // Sin imageOrientation las fotos verticales de iPhone entran ACOSTADAS: el sensor
  // graba en horizontal y anota la rotación en EXIF, que el canvas ignora.
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(archivo, { imageOrientation: 'from-image' })
  } catch {
    throw new ErrorArchivo(`«${archivo.name}» no se pudo abrir como imagen. Probá con otra foto.`)
  }
  const escala = Math.min(1, LADO_MAYOR / Math.max(bitmap.width, bitmap.height))  // nunca agranda
  const ancho = Math.max(1, Math.round(bitmap.width * escala))
  const alto = Math.max(1, Math.round(bitmap.height * escala))
  const lienzo = document.createElement('canvas')
  lienzo.width = ancho; lienzo.height = alto
  lienzo.getContext('2d')!.drawImage(bitmap, 0, 0, ancho, alto)
  bitmap.close()

  let mejor: Blob | null = null
  for (const calidad of CALIDADES) {
    const blob = await new Promise<Blob | null>((r) => lienzo.toBlob(r, 'image/webp', calidad))
    if (!blob) continue
    mejor = blob
    if (blob.size <= PESO_OBJETIVO) break        // si ninguna entra, queda la última
  }
  // toBlob con un tipo no soportado devuelve PNG EN SILENCIO (más pesado que el original).
  if (!mejor || mejor.type !== 'image/webp') {
    mejor = await new Promise<Blob | null>((r) => lienzo.toBlob(r, 'image/jpeg', 0.75))
  }
  if (!mejor) throw new ErrorArchivo('No se pudo comprimir la foto.')
  const ext = mejor.type === 'image/webp' ? 'webp' : 'jpg'
  const base = archivo.name.replace(/\.[^.]+$/, '') || 'foto'
  return { archivo: new File([mejor], `${base}.${ext}`, { type: mejor.type }), ancho, alto }
}
```

El repo vuelve a **medir** la imagen al subir (`naturalWidth`/`naturalHeight`)
para guardar `ancho` y `alto` reales.

## Video (`components/admin/VideoUnidad.tsx`)

- **No se recodifica.** Se valida tipo (mp4, webm, mov, también por extensión)
  y peso (≤ 25 MB). Lo que no entra se rechaza con el peso real y cómo
  arreglarlo: "El video pesa 48 MB y el máximo es 25 MB. Probá con un clip más
  corto o grabalo en 720p."
- **Póster**: `posterDeVideo()` toma un cuadro con un `<video>` oculto y un
  canvas, **no en el segundo 0** (suele ser el piso o el borroneo del arranque:
  al 10% del clip, máximo 1 s), a 1280 px, WebP. **Devuelve `undefined` en vez
  de fallar** (códec que el navegador no decodifica, 8 s de espera): el repo se
  cae a la **foto de portada** y no se pierde el video. En la ficha, el reposo
  del video muestra la primera foto de la unidad.
- Uno por unidad: subir otro reemplaza al anterior y borra sus archivos (el
  póster solo si no es una foto de la unidad).
- Una subida en curso cuenta como actividad (no la corta la inactividad).

## Etiquetas (`components/admin/Etiquetas.tsx`)

- **Son texto y se guardan con el botón del formulario**, como el título: así
  arrepentirse se deshace saliendo sin guardar, y el aviso de cambios sin
  guardar las cubre.
- Sin tope. Título ≤ 24, texto ≤ 90 caracteres.
- **Sugerencias de un toque** con los encabezados que aparecen en casi todas
  las unidades (en el original: Motor, Transmisión, Combustible, Tracción,
  Kilometraje, Equipamiento). Crean la etiqueta con el título; el texto lo
  pone la dueña. Una sugerencia ya usada en la unidad queda deshabilitada.
- **Foto de fondo: se elige una foto de la misma unidad** (o ninguna), en un
  selector de miniaturas. No se sube nada.
- **«Mostrar en la tarjeta»**: interruptor por etiqueta; con dos marcadas, el
  tercero no se puede prender y el panel dice cuáles ocupan el lugar: "Ya hay 2
  en la tarjeta («Anticipo» y «Cuotas»)".
- Reordenar con flechas. Las nuevas llevan un id temporal `etq-nueva-…` que el
  repo cambia por uno real al guardar (upsert de la lista + borrado de lo que
  no vino; primero lo nuevo, después el borrado: si se corta en el medio sobra
  una vieja en vez de faltar una nueva).

## Contenido del sitio (`/admin/contenido`)

Lo que no son unidades: **números, servicios, preguntas y contacto**, en el
orden en que aparecen en el inicio. Va aparte porque es otro ritmo de trabajo
(las unidades se tocan todos los días; esto una vez por mes).

- **Un guardado por bloque.** Cada bloque usa `useBloque()`
  (`components/admin/estado-bloque.ts`): `base` (lo guardado) y `b` (lo que se
  edita); `sucio` comparando los dos; `preparar()` limpia (recorta espacios,
  descarta filas vacías) y devuelve los errores; si hay errores, foco al primero;
  al guardar bien, `olvidarContenido()` para que el sitio en la misma pestaña
  muestre lo nuevo.
- **Números**: los cuatro fijos; valor, sufijo (ninguno, +, %), etiqueta, y el
  año de apertura (la cifra de años se calcula).
- **Servicios y preguntas**: listas con agregar (el foco va al primer campo de
  la fila nueva y la pantalla baja hasta ella: `useEnfocarNueva`), mover con
  flechas y borrar. Servicios eligen ícono de una lista cerrada.
- **Contacto**: teléfono, mail, WhatsApp (se valida que se pueda armar el link
  y se muestra cómo queda), dirección, latitud/longitud (con instrucción de
  cómo sacarlas de Google Maps), horarios (lista).
- **Número de sección**: cada bloque muestra el número que su sección tiene en
  la web (`seccionesVisibles(ocultasPorCantidad({...}))`). Si una lista queda
  vacía al guardar, su sección se oculta en el sitio, el resto se renumera, y el
  bloque muestra "—".

## Cambios sin guardar

- `sucio = JSON.stringify(borrador) !== JSON.stringify(base)`.
- Con cambios: `beforeunload` (cerrar o recargar la pestaña pide confirmación).
- La salida de adentro del panel (volver al listado, cambiar de pestaña)
  pregunta con el diálogo propio: «Salir sin guardar» / «Seguir editando».
  Las pestañas del `Marco` reciben un `antesDeIr(destino)` que puede frenar el
  cambio y abrir ese diálogo.
- **El botón atrás del navegador no está cubierto**: `useBlocker` de React
  Router solo existe en un data router y el sitio usa `BrowserRouter`. Si el
  proyecto nuevo arranca de cero, considerar `createBrowserRouter` para tenerlo.
- `marcarSinGuardar(clave, sucio)` le avisa al cierre por inactividad, para que
  el login diga que lo último no se guardó.

## Errores y reintentos

- **Todo lo que carga tiene esqueleto** con la forma de lo que va a entrar (no
  un spinner centrado) y, si falla, `ErrorCarga` con título, qué pasó y
  **«Probar de nuevo»**.
- Los errores del repo llegan como `ErrorRepo` con texto para la dueña
  (`repo/errores.ts`). Se mira el **código** antes que el texto:

| Origen | Mensaje |
|---|---|
| Sin red (`navigator.onLine`, "failed to fetch"…) | "No hay conexión con el servidor. Revisá que tengas internet y probá de nuevo." |
| `PGRST301`/`PGRST303`/"jwt expired" | Cierra la sesión: "Tu sesión venció. Entrá de nuevo y repetí lo último que hiciste." |
| `42501`, "row-level security", 401/403 | "Tu cuenta no tiene permiso para hacer esto…" |
| 413 / "exceeded the maximum allowed size" | "El archivo pesa más de 25 MB…" |
| 415 / "mime type" | "Ese tipo de archivo no se puede subir…" |
| `P0001` (un `raise exception` de la base) | El texto de la base, que ya está en castellano |
| `23505` | "Ya hay otra unidad con esos datos. Cambiá la dirección…" |
| ≥ 500, `PGRST000`/`PGRST002` | "El servidor no está respondiendo…" |
| Otro | "<contexto>. Probá de nuevo en un momento." (y `console.error` en desarrollo) |

- Una subida que falla después de subir el archivo **borra el archivo** (la fila
  no entró: no le sirve a nadie).
