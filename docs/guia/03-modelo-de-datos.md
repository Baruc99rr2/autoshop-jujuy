# 03 · Modelo de datos

Los tipos viven en `src/types/vehiculo.ts` y `src/types/contenido.ts` y son el
contrato entre el panel, el sitio y la base. La base usa `snake_case`
(`creado_en`) y el repositorio traduce a `camelCase` (`creadoEn`) al leer.
El SQL completo está en [supabase.sql](supabase.sql).

Decisiones transversales:

- **Las fechas viajan como texto ISO 8601**, no como `Date`: el mock guarda en
  localStorage y Supabase devuelve `timestamptz` como texto; un `Date` no
  sobrevive ninguno de los dos viajes.
- **Los ids son texto, no uuid.** El panel arma algunos en el navegador
  (`etq-nueva-…`, filas nuevas de servicios) y el contenido sembrado tiene ids
  legibles (`entregadas`, `seguros`). Si no se manda uno, la base pone un uuid
  como texto.
- **`null` significa "no lo sé"** y se muestra como tal: precio `null` →
  "Consultar precio" (nunca "$ 0"); km `null` → "—". Un 0km tiene `km = 0`.
- **No hay ficha técnica.** El detalle se resuelve por WhatsApp; lo que se
  carga es lo que la dueña puede cargar desde el celular en un minuto.

## Unidad (`Vehiculo`)

| Campo | Tipo | Regla |
|---|---|---|
| `id` | texto | uuid como texto, o `demo-…` en los datos de muestra |
| `slug` | texto único | `/vehiculo/:slug`. `^[a-z0-9]+(-[a-z0-9]+)*$`. Cambia si cambia el título |
| `titulo` | texto | Obligatorio. Es lo que la gente busca y de donde salen las marcas |
| `descripcion` | texto | Puede ser vacío |
| `condicion` | `'0km' \| 'usado'` | Los chips del catálogo |
| `precio` | entero ≥ 0 o `null` | Pesos. `null` = "Consultar precio" |
| `anio` | 1900–2100 o `null` | |
| `km` | entero ≥ 0 o `null` | |
| `estado` | `'disponible' \| 'reservado' \| 'vendido'` | Reservado y vendido se pintan con el color de señal. Los vendidos van al final del catálogo |
| `publicado` | booleano | `false` = borrador: existe en el panel, **no existe** en el sitio |
| `destacado` | booleano | Los destacados salen en el inicio |
| `fotos` | `Foto[]` | Hasta `MAX_FOTOS = 10`, ordenadas por `orden`. La 0 es la portada |
| `video` | `Video \| null` | Uno o ninguno |
| `etiquetas` | `Etiqueta[]` | Sin tope |
| `creadoEn`, `actualizadoEn` | ISO | `actualizadoEn` lo mueve la base, también al tocar fotos, video o etiquetas |

En la base hay además `busqueda`: título + descripción en minúsculas y sin
acentos, calculado por un trigger. El buscador hace `busqueda ilike '%texto%'`
con un índice trigram. El lado del navegador normaliza igual con `plano()`.

### Foto

`id`, `url` (pública, lista para el `<img>`), `ancho`, `alto` (**reales**: van
al `<img>` para que no haya salto de layout; se miden, no se inventan),
`orden`. En la base además `ruta` (camino en el bucket, para poder borrar el
archivo). Tope de 10 también en la base, con un trigger que bloquea la fila de
la unidad (`for update`) para que dos subidas simultáneas no lo pasen.

### Video

`url`, `posterUrl`, `pesoBytes`. En la base además `ruta` y `poster_ruta`. La
clave de la tabla es `vehiculo_id`: no puede haber dos. **El póster puede ser la
foto de portada** (es a lo que se cae si no se pudo sacar un cuadro del video):
antes de borrar `poster_ruta`, el repo se fija que ninguna foto la use.

### Etiqueta

Bloques cortos que la dueña quiere destacar ("Único dueño", "Service al día").

| Campo | Regla |
|---|---|
| `titulo`, `texto` | En el panel: 24 y 90 caracteres como máximo |
| `fotoFondoId` | Id de una foto **de la misma unidad**, o `null`. No se sube imagen propia: se elige una foto. En la base, FK compuesta `(vehiculo_id, foto_fondo_id)` con `on delete set null (foto_fondo_id)`: si se borra la foto, la etiqueta queda sin fondo, no rota |
| `orden` | |
| `enTarjeta` | Sale **también en la card**, junto al precio. Máximo `MAX_EN_TARJETA = 2` por unidad; lo controla el panel, no la base (al reordenar hay estados intermedios). En la card el título va sin el ":" final (`rotuloEtiqueta`) |

`enTarjeta` es opcional en el tipo porque puede faltar la columna (ver T22 y
`supabase.sql`).

## Contenido del sitio

Lo que no son unidades y la dueña edita en «Contenido del sitio».

### Contadores

`{ apertura: number, lista: Contador[] }`. **Siempre cuatro** (la franja está
dibujada para cuatro): la base no deja agregarlos ni borrarlos, solo
modificarlos.

`Contador`: `id`, `valor`, `sufijo` (`''`, `'+'` o `'%'`: opciones cerradas,
un sufijo largo desarma la cifra en 2×2 a 390 px), `etiqueta` (2–3 palabras),
`desdeApertura` (si es `true` la cifra **se calcula** como año actual −
`apertura`: un número a mano en un dato que crece solo queda viejo el 1 de
enero).

### Servicios

`id`, `icono` (se elige de `ICONOS_SERVICIO`, una lista cerrada de íconos
dibujados con la misma grilla; **nunca se suben**), `titulo`, `precio`
(número o `null` cuando depende de la unidad; se escribe con el mismo
`formatearPrecio` del catálogo), `detalle` (la condición o el próximo paso, sin
el precio), `orden`. Sin servicios, la sección no se dibuja.

### Preguntas

`id`, `pregunta`, `respuesta`, `orden`. Sin preguntas, no hay sección.

### Contacto (`DatosContacto`)

Una sola fila. **Todo** lo que muestra o enlaza un teléfono, un mail, el
WhatsApp o la dirección sale de acá vía `useContacto()`.

| Campo | Regla |
|---|---|
| `telefono` | Como se muestra. El `tel:` lo arma `telefonoHref()` |
| `email` | |
| `whatsapp` | Como lo escribe la dueña (`+54 9 11 0000-0000`). Obligatorio. El link lo arma `whatsappUrl()` |
| `direccion` | Texto para mostrar |
| `lat`, `lng` | El mapa y «Cómo llegar» usan esto, no el texto (geocodificar pediría un servicio con clave). `0,0` se rechaza |
| `horarios` | `[{ dias, horas }]` (jsonb en la base) |

El guardado valida que el WhatsApp se pueda convertir a número internacional y
que las coordenadas sean un punto válido (`revisarContacto`).

### Lo fijo (no editable)

`src/data/contacto.ts`: `NEGOCIO` (nombre, nombre legal, ciudad, provincia,
año desde), `REDES` (Instagram, Facebook…), opciones del formulario. Se
cambian en código.

### Segmentos (OPCIONAL)

En el original hubo un carrusel de "segmentos" (categorías por uso, con foto).
Se sacó del sitio y del panel; la tabla y el repo quedaron. En `supabase.sql`
está como **bloque opcional**, marcado. `Segmento`: `id`, `titulo`, `texto`,
`etiqueta` (rótulo corto opcional), `imagen` (`url`, `ruta` o `null` si es un
archivo del sitio, `ancho`, `alto`), `orden`. Máximo 6; con 1 se dibuja fija,
con 0 no hay sección. Fotos en el bucket, carpeta `segmentos/`.

## Constantes del sistema

| Constante | Valor | Dónde | Por qué |
|---|---|---|---|
| `MAX_FOTOS` | 10 | `types/vehiculo.ts` + trigger | Lo que se saca en una recorrida sin abandonar; la galería se recorre de un vistazo |
| `MAX_EN_TARJETA` | 2 | `types/vehiculo.ts` | Con tres, la fila del precio no se lee de un vistazo |
| `LADO_MAYOR` | 1600 px | `lib/archivos.ts` | Alcanza para el visor a pantalla completa |
| `PESO_OBJETIVO` | 250 KB | `lib/archivos.ts` | Piso de calidad: WebP < 250 KB |
| `MAX_VIDEO_BYTES` | 25 MB | `lib/archivos.ts` + bucket | Tope del bucket |
| Tipos de video | mp4, webm, mov | `lib/archivos.ts` + bucket | |
| Inactividad | 30 min, aviso a los 28 | `lib/inactividad.ts` | |

## Si no son autos

El modelo sirve para cualquier negocio que publica unidades con foto y precio
(motos, maquinaria, inmuebles en venta, muebles usados). Dos caminos:

1. **No renombrar nada interno** (recomendado si se parte del repo): las
   tablas y tipos siguen llamándose `vehiculos`/`Vehiculo`; se cambian solo los
   textos visibles y la ruta pública (`/vehiculo/:slug` → `/<lo-que-sea>/:slug`
   en `App.tsx`, en los links de las cards y en el mensaje de WhatsApp).
2. **Renombrar todo** (desde cero): `vehiculos` → `unidades`, el bucket, las
   políticas, los tipos. Hacerlo de una vez antes de escribir datos, nunca a
   medias.

Lo que es propio de autos y probablemente cambie: `condicion` (0km/usado),
`anio`, `km`, el diccionario de marcas y el orden por km/año. Si el negocio no
tiene marcas, la sección se oculta sola (sin marcas en los títulos, no se
dibuja) o se borra.
