import type {
  Condicion,
  EstadoVehiculo,
  Etiqueta,
  Foto,
  Vehiculo,
  Video,
} from '../../types/vehiculo'

/**
 * Filtros del listado.
 *
 * `soloPublicados` viene en `true` por defecto A PROPÓSITO: el sitio público
 * es el que llama sin argumentos, y el que tiene que acordarse de pedir los
 * borradores es el panel. Al revés, olvidarse del filtro publicaría todo.
 */
export interface FiltrosVehiculos {
  condicion?: Condicion
  estado?: EstadoVehiculo
  /** Busca en título y descripción, sin acentos ni mayúsculas. */
  texto?: string
  /** Por defecto `true`. El panel pide `false` para ver también los borradores. */
  soloPublicados?: boolean
  /**
   * `recientes` ordena por fecha de ALTA y `actualizados` por fecha de último
   * cambio. El sitio público quiere lo primero —una unidad editada no es una
   * unidad nueva— y el panel lo segundo: ahí arriba tiene que estar lo que se
   * estuvo tocando recién.
   */
  orden?: 'recientes' | 'actualizados' | 'precio-asc' | 'precio-desc'
  limite?: number
}

/**
 * Lo que se manda al crear. Sin `id`, sin fechas y sin archivos: las fotos y
 * el video se suben después, contra un vehículo que ya existe.
 *
 * El `slug` es opcional; si no viene se arma del título y se le agrega un
 * sufijo si ya estaba tomado.
 */
export interface NuevoVehiculo {
  titulo: string
  descripcion?: string
  condicion: Condicion
  precio?: number | null
  anio?: number | null
  km?: number | null
  estado?: EstadoVehiculo
  publicado?: boolean
  destacado?: boolean
  etiquetas?: Etiqueta[]
  slug?: string
}

export type CambiosVehiculo = Partial<NuevoVehiculo>

/**
 * La única puerta a los datos.
 *
 * Todo devuelve promesas aunque el mock resuelva al instante: Supabase va a
 * ser asíncrono, y si la interfaz fuera sincrónica habría que reescribir cada
 * lugar que la llama el día que se cambie la implementación.
 */
export interface RepoVehiculos {
  listar(filtros?: FiltrosVehiculos): Promise<Vehiculo[]>
  obtenerPorSlug(slug: string): Promise<Vehiculo | null>
  /**
   * Por id y no por slug. Lo usa el PANEL: el slug de una unidad cambia
   * cuando se le corrige el título, así que una pantalla de edición
   * direccionada por slug se quedaría apuntando a una dirección que ya no
   * existe apenas se guarda el primer cambio.
   */
  obtenerPorId(id: string): Promise<Vehiculo | null>
  /** Solo publicados y destacados, más nuevo primero. */
  listarDestacados(limite?: number): Promise<Vehiculo[]>

  crear(datos: NuevoVehiculo): Promise<Vehiculo>
  actualizar(id: string, cambios: CambiosVehiculo): Promise<Vehiculo>
  eliminar(id: string): Promise<void>

  /** Falla si la unidad ya llegó a `MAX_FOTOS` (diez). La primera queda de portada. */
  subirFoto(id: string, archivo: File): Promise<Foto>
  eliminarFoto(id: string, fotoId: string): Promise<void>
  /** `idsEnOrden` es la lista completa de fotos de la unidad, en el orden nuevo. */
  reordenarFotos(id: string, idsEnOrden: string[]): Promise<Foto[]>

  /** Una unidad tiene un video o ninguno. Subir otro reemplaza al anterior. */
  subirVideo(id: string, archivo: File, poster?: File): Promise<Video>
  eliminarVideo(id: string): Promise<void>
}

/** Error propio del repositorio, para poder distinguirlo de un bug al mostrarlo. */
export class ErrorRepo extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'ErrorRepo'
  }
}
