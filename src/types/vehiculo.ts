/**
 * El modelo de una unidad del catálogo.
 *
 * Es el contrato entre el panel de carga, el catálogo público y la base: la
 * ficha de un auto no tiene motor, caja ni ficha técnica porque en este
 * negocio ese detalle se resuelve por WhatsApp. Lo que el sitio muestra es lo
 * que la dueña puede cargar desde el celular en un minuto.
 *
 * Las fechas van como STRING ISO 8601 y no como `Date`: el mock guarda en
 * localStorage y Supabase devuelve `timestamptz` como texto, así que un
 * `Date` no sobrevive ninguno de los dos viajes sin rehidratarse a mano.
 */

export type Condicion = '0km' | 'usado'

/** `reservado` y `vendido` se dibujan en `--color-flag`: son señales, no decoración. */
export type EstadoVehiculo = 'disponible' | 'reservado' | 'vendido'

export interface Foto {
  id: string
  url: string
  /** Dimensiones reales del archivo. Van al `<img>`: sin ellas hay layout shift. */
  ancho: number
  alto: number
  /** 0 es la portada. Ver `MAX_FOTOS`. */
  orden: number
}

export interface Video {
  url: string
  /**
   * Primer frame. El video va con `preload="none"`, así que el póster es lo
   * único que se ve hasta que el visitante lo pide.
   */
  posterUrl: string
  /** Para avisar en el panel cuando un video sube pesado. */
  pesoBytes: number
}

/**
 * Bloque de texto destacado dentro de la ficha ("Único dueño", "Service al
 * día"). **No sube imagen propia**: elige una de las fotos del mismo auto por
 * id, o ninguna. Una etiqueta con su propio uploader sería un segundo lugar
 * donde perder fotos, y la dueña ya tiene seis por unidad.
 */
export interface Etiqueta {
  id: string
  titulo: string
  texto: string
  /** id de una `Foto` del MISMO vehículo, o null para fondo liso. */
  fotoFondoId: string | null
  orden: number
}

export interface Vehiculo {
  id: string
  /** Parte visible de la URL de la ficha: `/vehiculo/:slug`. Único. */
  slug: string
  titulo: string
  descripcion: string
  condicion: Condicion
  /** Pesos argentinos. `null` se muestra como "Consultar precio". */
  precio: number | null
  anio: number | null
  /** En un 0km es 0 y se muestra "0 km"; `null` es "no lo sé todavía". */
  km: number | null
  estado: EstadoVehiculo
  /** `false` es borrador: existe en el panel y no sale en el sitio. */
  publicado: boolean
  /** Los destacados son los que aparecen en la sección Vehículos del home. */
  destacado: boolean
  /** Hasta `MAX_FOTOS`, ordenadas por `orden`. La primera es la portada. */
  fotos: Foto[]
  video: Video | null
  etiquetas: Etiqueta[]
  /** ISO 8601. */
  creadoEn: string
  actualizadoEn: string
}

/**
 * Seis fotos por unidad. No es un límite técnico: es el punto donde una
 * galería deja de ayudar a decidir y empieza a ser un álbum, y además es lo
 * que se puede sacar con un celular en una recorrida sin abandonar a la mitad.
 */
export const MAX_FOTOS = 6

/** La portada, o `null` si la unidad todavía no tiene fotos. */
export function portada(v: Vehiculo): Foto | null {
  return v.fotos.length > 0 ? v.fotos[0] : null
}
