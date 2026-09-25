import type {
  Condicion,
  EstadoVehiculo,
  Etiqueta,
  Foto,
  Vehiculo,
  Video,
} from '../../types/vehiculo'
import type {
  Contadores,
  DatosContacto,
  Pregunta,
  Segmento,
  SegmentoAGuardar,
  Servicio,
} from '../../types/contenido'
import { MAX_SEGMENTOS } from '../../types/contenido'
import { coordenadasValidas, numeroWhatsapp } from '../contacto'

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

/**
 * El contenido fijo del sitio: contadores, segmentos, servicios, preguntas
 * y los datos de contacto.
 *
 * Cada bloque se lee y se guarda ENTERO, porque en el panel cada bloque tiene
 * su propio botón de guardar y lo que se manda es la lista como quedó: con
 * altas, bajas y el orden nuevo. En Supabase eso es un upsert de la lista más
 * un delete de los ids que ya no vinieron.
 *
 * Las listas salen ordenadas por `orden`, y al guardar el repositorio
 * renumera desde 0 según la posición: el orden de la lista manda.
 */
export interface RepoContenido {
  obtenerContadores(): Promise<Contadores>
  /** Falla si no son exactamente cuatro. */
  guardarContadores(datos: Contadores): Promise<Contadores>

  listarServicios(): Promise<Servicio[]>
  guardarServicios(lista: Servicio[]): Promise<Servicio[]>

  listarPreguntas(): Promise<Pregunta[]>
  guardarPreguntas(lista: Pregunta[]): Promise<Pregunta[]>

  listarSegmentos(): Promise<Segmento[]>
  /**
   * Sube las fotos nuevas (a su carpeta propia, `segmentos/`), guarda la
   * lista y DESPUÉS borra los archivos que dejaron de usarse. Falla si pasa
   * de `MAX_SEGMENTOS` o si una fila se queda sin foto.
   */
  guardarSegmentos(lista: SegmentoAGuardar[]): Promise<Segmento[]>

  obtenerContacto(): Promise<DatosContacto>
  guardarContacto(datos: DatosContacto): Promise<DatosContacto>
}

/** Error propio del repositorio, para poder distinguirlo de un bug al mostrarlo. */
export class ErrorRepo extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'ErrorRepo'
  }
}

/**
 * Las reglas de una lista de segmentos, iguales para el mock y Supabase. El
 * panel ya las cumple; esto es para que ningún camino las saltee.
 */
export function revisarSegmentos(lista: SegmentoAGuardar[]): void {
  if (lista.length > MAX_SEGMENTOS) {
    throw new ErrorRepo(`Son ${MAX_SEGMENTOS} segmentos como máximo.`)
  }
  for (const s of lista) {
    if (!s.titulo.trim()) throw new ErrorRepo('Hay un segmento sin título.')
    if (!s.imagen && !s.archivo) {
      throw new ErrorRepo(`Al segmento «${s.titulo.trim()}» le falta la foto.`)
    }
  }
}

/** Lo mínimo para que los links de contacto funcionen. */
export function revisarContacto(d: DatosContacto): void {
  if (!numeroWhatsapp(d.whatsapp)) {
    throw new ErrorRepo('El número de WhatsApp no parece un celular argentino.')
  }
  if (!coordenadasValidas(d.lat, d.lng)) {
    throw new ErrorRepo('La latitud o la longitud no son válidas.')
  }
}
