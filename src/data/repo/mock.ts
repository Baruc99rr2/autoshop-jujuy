import { slugificar } from '../../lib/texto'
import { MAX_FOTOS } from '../../types/vehiculo'
import type { Foto, Vehiculo, Video } from '../../types/vehiculo'
import { SEMILLA } from './semilla'
import { ErrorRepo } from './tipos'
import type {
  CambiosVehiculo,
  FiltrosVehiculos,
  NuevoVehiculo,
  RepoVehiculos,
} from './tipos'

/**
 * Implementación de mentira sobre localStorage, para trabajar el catálogo, la
 * ficha y el panel antes de que exista Supabase.
 *
 * LÍMITE CONOCIDO: localStorage son ~5 MB por origen y las fotos se guardan
 * como data URL, así que entran pocas y pesadas mal. No es un descuido: es el
 * único almacenamiento que sobrevive a una recarga sin servidor, y el mock se
 * tira a la basura el día que entre Supabase. Cuando no entra, `guardar()`
 * tira un `ErrorRepo` con un mensaje que se puede mostrar en el panel, en vez
 * de fallar en silencio y perder la carga.
 */

// El número de versión se SUBE cada vez que cambia la semilla: lo guardado en
// localStorage gana sobre la semilla nueva, así que sin subirlo un navegador
// que ya visitó el sitio se queda con los datos de muestra viejos para
// siempre. v2 agregó la segunda foto del Tucson y de la RAM; v3 llevó el
// Tucson a cinco fotos, cinco etiquetas y video, y la RAM a tres fotos, para
// poder probar la galería de la ficha; v4 subió el tope a diez fotos y llevó
// el Tucson a diez fotos y doce etiquetas, y el Amarok a seis y seis, que son
// los tres tamaños con los que hay que mirar la galería y la grilla.
const CLAVE = 'autoshop.vehiculos.v4'

// ── Persistencia ──────────────────────────────────────────────────────────

/** Copia profunda barata: evita que quien lee mute el array guardado. */
function estructurar<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T
}

function guardar(lista: Vehiculo[]): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lista))
  } catch (e) {
    throw new ErrorRepo(
      e instanceof DOMException && e.name === 'QuotaExceededError'
        ? 'No entra en el almacenamiento del navegador. Probá con una foto más liviana.'
        : 'No se pudo guardar en este navegador.',
    )
  }
}

function leer(): Vehiculo[] {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (!crudo) {
      // Primera visita: se siembra y se guarda, para que editar y recargar
      // muestre el cambio en vez de volver a la semilla.
      guardar(SEMILLA)
      return estructurar(SEMILLA)
    }
    const datos = JSON.parse(crudo) as Vehiculo[]
    return Array.isArray(datos) ? datos : estructurar(SEMILLA)
  } catch {
    // Incógnito con storage bloqueado, o JSON corrupto: se trabaja en memoria
    // sobre la semilla. El sitio público se ve igual; lo que se pierde es la
    // persistencia de lo que cargue el panel.
    return estructurar(SEMILLA)
  }
}

// ── Ayudas ────────────────────────────────────────────────────────────────

const ahora = () => new Date().toISOString()

const nuevoId = (p: string) =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

/** Sin acentos ni mayúsculas, para comparar texto escrito a mano. */
function plano(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/** Un slug que no choque: el segundo "Corolla XEI" pasa a ser `...-2`. */
function slugLibre(base: string, lista: Vehiculo[], exceptoId?: string): string {
  let slug = base
  let n = 2
  while (lista.some((v) => v.slug === slug && v.id !== exceptoId)) {
    slug = `${base}-${n++}`
  }
  return slug
}

function buscar(lista: Vehiculo[], vid: string): Vehiculo {
  const v = lista.find((x) => x.id === vid)
  if (!v) throw new ErrorRepo(`No existe el vehículo ${vid}.`)
  return v
}

/** Reenumera `orden` de 0 en adelante después de agregar, borrar o mover. */
function renumerar(fotos: Foto[]): Foto[] {
  return fotos.map((f, i) => ({ ...f, orden: i }))
}

// ── Archivos ──────────────────────────────────────────────────────────────

function aDataUrl(archivo: File): Promise<string> {
  return new Promise((res, rej) => {
    const fr = new FileReader()
    fr.onload = () => res(String(fr.result))
    fr.onerror = () => rej(new ErrorRepo('No se pudo leer el archivo.'))
    fr.readAsDataURL(archivo)
  })
}

/**
 * Mide la imagen ya cargada. Las dimensiones NO se pueden inventar: van al
 * `<img>` para reservar la caja, y un ancho equivocado es un salto de layout.
 */
function medir(url: string): Promise<{ ancho: number; alto: number }> {
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => res({ ancho: img.naturalWidth, alto: img.naturalHeight })
    img.onerror = () => rej(new ErrorRepo('El archivo no es una imagen válida.'))
    img.src = url
  })
}

// ── Orden ─────────────────────────────────────────────────────────────────

const masNuevoPrimero = (a: Vehiculo, b: Vehiculo) =>
  b.creadoEn.localeCompare(a.creadoEn)

/** Lo último que se tocó, arriba. Es el orden con el que trabaja el panel. */
const ultimoTocadoPrimero = (a: Vehiculo, b: Vehiculo) =>
  b.actualizadoEn.localeCompare(a.actualizadoEn)

/**
 * `null` va SIEMPRE al final, ordene como ordene: "Consultar precio" no es ni
 * el más barato ni el más caro, y ponerlo primero en el orden ascendente haría
 * que el catálogo arranque con las unidades sin dato.
 */
function porPrecio(a: Vehiculo, b: Vehiculo, asc: boolean): number {
  if (a.precio === null && b.precio === null) return masNuevoPrimero(a, b)
  if (a.precio === null) return 1
  if (b.precio === null) return -1
  return asc ? a.precio - b.precio : b.precio - a.precio
}

// ── Repositorio ───────────────────────────────────────────────────────────

export const repoMock: RepoVehiculos = {
  async listar(filtros: FiltrosVehiculos = {}) {
    const {
      condicion,
      estado,
      texto,
      soloPublicados = true,
      orden = 'recientes',
      limite,
    } = filtros

    let lista = leer()
    if (soloPublicados) lista = lista.filter((v) => v.publicado)
    if (condicion) lista = lista.filter((v) => v.condicion === condicion)
    if (estado) lista = lista.filter((v) => v.estado === estado)
    if (texto && texto.trim()) {
      const q = plano(texto.trim())
      lista = lista.filter(
        (v) => plano(v.titulo).includes(q) || plano(v.descripcion).includes(q),
      )
    }

    lista.sort((a, b) => {
      if (orden === 'recientes') return masNuevoPrimero(a, b)
      if (orden === 'actualizados') return ultimoTocadoPrimero(a, b)
      return porPrecio(a, b, orden === 'precio-asc')
    })

    return limite ? lista.slice(0, limite) : lista
  },

  async obtenerPorId(vid) {
    return leer().find((v) => v.id === vid) ?? null
  },

  async obtenerPorSlug(slug) {
    // Sin filtro de publicado: la ficha decide qué hacer con un borrador. Que
    // el repo devuelva null acá haría imposible previsualizar desde el panel.
    return leer().find((v) => v.slug === slug) ?? null
  },

  async listarDestacados(limite = 3) {
    return leer()
      .filter((v) => v.publicado && v.destacado)
      .sort(masNuevoPrimero)
      .slice(0, limite)
  },

  async crear(datos: NuevoVehiculo) {
    const lista = leer()
    const t = ahora()
    const v: Vehiculo = {
      id: nuevoId('veh'),
      slug: slugLibre(slugificar(datos.slug || datos.titulo), lista),
      titulo: datos.titulo,
      descripcion: datos.descripcion ?? '',
      condicion: datos.condicion,
      precio: datos.precio ?? null,
      anio: datos.anio ?? null,
      km: datos.km ?? null,
      estado: datos.estado ?? 'disponible',
      // Nace como borrador: se publica cuando tiene fotos y precio, no antes.
      publicado: datos.publicado ?? false,
      destacado: datos.destacado ?? false,
      fotos: [],
      video: null,
      etiquetas: datos.etiquetas ?? [],
      creadoEn: t,
      actualizadoEn: t,
    }
    guardar([v, ...lista])
    return estructurar(v)
  },

  async actualizar(vid, cambios: CambiosVehiculo) {
    const lista = leer()
    const v = buscar(lista, vid)
    const { slug, ...resto } = cambios

    Object.assign(v, resto)
    if (slug !== undefined) {
      v.slug = slugLibre(slugificar(slug || v.titulo), lista, vid)
    }
    v.actualizadoEn = ahora()

    guardar(lista)
    return estructurar(v)
  },

  async eliminar(vid) {
    const lista = leer()
    const quedan = lista.filter((v) => v.id !== vid)
    if (quedan.length === lista.length) {
      throw new ErrorRepo(`No existe el vehículo ${vid}.`)
    }
    guardar(quedan)
  },

  async subirFoto(vid, archivo) {
    const lista = leer()
    const v = buscar(lista, vid)
    if (v.fotos.length >= MAX_FOTOS) {
      throw new ErrorRepo(`Son ${MAX_FOTOS} fotos como máximo por unidad.`)
    }

    const url = await aDataUrl(archivo)
    const { ancho, alto } = await medir(url)
    const foto: Foto = {
      id: nuevoId('foto'),
      url,
      ancho,
      alto,
      orden: v.fotos.length,
    }

    v.fotos = renumerar([...v.fotos, foto])
    v.actualizadoEn = ahora()
    guardar(lista)
    return estructurar(foto)
  },

  async eliminarFoto(vid, fotoId) {
    const lista = leer()
    const v = buscar(lista, vid)

    v.fotos = renumerar(v.fotos.filter((f) => f.id !== fotoId))
    // Una etiqueta que apuntaba a esa foto queda sin fondo, no rota.
    v.etiquetas = v.etiquetas.map((e) =>
      e.fotoFondoId === fotoId ? { ...e, fotoFondoId: null } : e,
    )
    v.actualizadoEn = ahora()
    guardar(lista)
  },

  async reordenarFotos(vid, idsEnOrden) {
    const lista = leer()
    const v = buscar(lista, vid)

    const porId = new Map(v.fotos.map((f) => [f.id, f]))
    const movidas = idsEnOrden
      .map((fid) => porId.get(fid))
      .filter((f): f is Foto => Boolean(f))
    if (movidas.length !== v.fotos.length) {
      throw new ErrorRepo('El nuevo orden tiene que incluir todas las fotos.')
    }

    v.fotos = renumerar(movidas)
    v.actualizadoEn = ahora()
    guardar(lista)
    return estructurar(v.fotos)
  },

  async subirVideo(vid, archivo, poster) {
    const lista = leer()
    const v = buscar(lista, vid)

    const url = await aDataUrl(archivo)
    // Sin póster propio se usa la portada: el video va con `preload="none"`,
    // así que sin una imagen quedaría un rectángulo negro.
    const posterUrl = poster
      ? await aDataUrl(poster)
      : (v.fotos[0]?.url ?? '/img/hero-poster.jpg')

    const video: Video = { url, posterUrl, pesoBytes: archivo.size }
    v.video = video
    v.actualizadoEn = ahora()
    guardar(lista)
    return estructurar(video)
  },

  async eliminarVideo(vid) {
    const lista = leer()
    const v = buscar(lista, vid)
    v.video = null
    v.actualizadoEn = ahora()
    guardar(lista)
  },
}

/** Vuelve a la semilla. Lo va a usar el panel para limpiar los datos de muestra. */
export function reiniciarMock(): void {
  guardar(SEMILLA)
}
