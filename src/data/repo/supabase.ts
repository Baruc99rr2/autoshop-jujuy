import type { SupabaseClient } from '@supabase/supabase-js'
import { plano, slugificar } from '../../lib/texto'
import { MAX_FOTOS } from '../../types/vehiculo'
import type { Etiqueta, Foto, Vehiculo, Video } from '../../types/vehiculo'
import { BUCKET, cliente } from '../supabase'
import { traducir } from './errores'
import { ErrorRepo } from './tipos'
import type {
  CambiosVehiculo,
  FiltrosVehiculos,
  NuevoVehiculo,
  RepoVehiculos,
} from './tipos'

/**
 * El repositorio de vehículos sobre Supabase.
 *
 * Misma interfaz que el mock y las mismas reglas, con dos diferencias que
 * importan:
 *
 * 1. EL FILTRO DE PUBLICADOS SE PIDE SIEMPRE A MANO, aunque la base ya
 *    oculte los borradores. La RLS esconde un borrador a quien NO es admin;
 *    a la dueña con la sesión abierta se lo muestra. Sin el filtro, ella
 *    vería sus borradores en el catálogo público de la misma pestaña.
 *
 * 2. LOS ARCHIVOS SE BORRAN A MANO. La base borra en cascada las filas de
 *    fotos y video, pero Supabase no deja borrar archivos del bucket desde
 *    SQL: si esto no lo hace, quedan huérfanos que nadie ve y que se pagan.
 *    Cada unidad tiene su carpeta (`<id>/...`) y al borrarla se vacía la
 *    carpeta entera, así que también se va lo que haya quedado de una subida
 *    cortada a la mitad.
 */

// ── Forma de las filas ────────────────────────────────────────────────────

type FilaFoto = { id: string; url: string; ancho: number; alto: number; orden: number }
type FilaVideo = { url: string; poster_url: string; peso_bytes: number }
type FilaEtiqueta = {
  id: string
  titulo: string
  texto: string
  foto_fondo_id: string | null
  orden: number
}
type FilaVehiculo = {
  id: string
  slug: string
  titulo: string
  descripcion: string
  condicion: Vehiculo['condicion']
  precio: number | null
  anio: number | null
  km: number | null
  estado: Vehiculo['estado']
  publicado: boolean
  destacado: boolean
  creado_en: string
  actualizado_en: string
  fotos: FilaFoto[] | null
  // Uno a uno: PostgREST lo devuelve como objeto, pero se acepta la lista por
  // si una versión futura cambia de idea.
  videos: FilaVideo | FilaVideo[] | null
  etiquetas: FilaEtiqueta[] | null
}

const SELECT = `
  id, slug, titulo, descripcion, condicion, precio, anio, km, estado,
  publicado, destacado, creado_en, actualizado_en,
  fotos ( id, url, ancho, alto, orden ),
  videos ( url, poster_url, peso_bytes ),
  etiquetas ( id, titulo, texto, foto_fondo_id, orden )
`

const porOrden = <T extends { orden: number }>(a: T, b: T) => a.orden - b.orden

function aVehiculo(f: FilaVehiculo): Vehiculo {
  const video = Array.isArray(f.videos) ? (f.videos[0] ?? null) : f.videos
  return {
    id: f.id,
    slug: f.slug,
    titulo: f.titulo,
    descripcion: f.descripcion,
    condicion: f.condicion,
    precio: f.precio,
    anio: f.anio,
    km: f.km,
    estado: f.estado,
    publicado: f.publicado,
    destacado: f.destacado,
    fotos: (f.fotos ?? []).map(aFoto).sort(porOrden),
    video: video
      ? { url: video.url, posterUrl: video.poster_url, pesoBytes: video.peso_bytes }
      : null,
    etiquetas: (f.etiquetas ?? [])
      .map((e) => ({
        id: e.id,
        titulo: e.titulo,
        texto: e.texto,
        fotoFondoId: e.foto_fondo_id,
        orden: e.orden,
      }))
      .sort(porOrden),
    creadoEn: f.creado_en,
    actualizadoEn: f.actualizado_en,
  }
}

function aFoto(f: FilaFoto): Foto {
  return { id: f.id, url: f.url, ancho: f.ancho, alto: f.alto, orden: f.orden }
}

/** Lo que se manda a la tabla: solo los campos que vinieron. */
function aFila(d: CambiosVehiculo): Record<string, unknown> {
  const fila: Record<string, unknown> = {}
  if (d.titulo !== undefined) fila.titulo = d.titulo
  if (d.descripcion !== undefined) fila.descripcion = d.descripcion
  if (d.condicion !== undefined) fila.condicion = d.condicion
  if (d.precio !== undefined) fila.precio = d.precio
  if (d.anio !== undefined) fila.anio = d.anio
  if (d.km !== undefined) fila.km = d.km
  if (d.estado !== undefined) fila.estado = d.estado
  if (d.publicado !== undefined) fila.publicado = d.publicado
  if (d.destacado !== undefined) fila.destacado = d.destacado
  return fila
}

// ── Ayudas ────────────────────────────────────────────────────────────────

const uuid = () => crypto.randomUUID()

/** Extensión según el tipo, para que el archivo se sirva con el nombre justo. */
function extension(archivo: Blob): string {
  const t = archivo.type
  if (t === 'image/webp') return 'webp'
  if (t === 'image/jpeg') return 'jpg'
  if (t === 'image/png') return 'png'
  if (t === 'video/mp4') return 'mp4'
  if (t === 'video/webm') return 'webm'
  if (t === 'video/quicktime') return 'mov'
  return 'bin'
}

/**
 * Mide la imagen. Las dimensiones NO se pueden inventar: van al `<img>` para
 * reservar la caja, y un ancho equivocado es un salto de layout.
 */
function medir(archivo: Blob): Promise<{ ancho: number; alto: number }> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(archivo)
    const img = new Image()
    img.onload = () => {
      res({ ancho: img.naturalWidth, alto: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      rej(new ErrorRepo('El archivo no es una imagen válida.'))
    }
    img.src = url
  })
}

/** Un `like` que no interprete los comodines que haya escrito la persona. */
const sinComodines = (s: string) => s.replace(/[\\%_*]/g, ' ').trim()

/**
 * Un slug que no choque: el segundo "Corolla XEI" pasa a ser `...-2`.
 * Se consulta la base porque es la única que sabe qué está tomado; como la
 * dueña es admin, ve también los slugs de los borradores.
 */
async function slugLibre(sb: SupabaseClient, base: string, exceptoId?: string): Promise<string> {
  const { data, error } = await sb
    .from('vehiculos')
    .select('id, slug')
    .or(`slug.eq.${base},slug.like.${base}-*`)
  if (error) throw traducir(error, 'No se pudo revisar la dirección')
  const tomados = new Set(
    (data ?? []).filter((v) => v.id !== exceptoId).map((v) => v.slug as string),
  )
  let slug = base
  let n = 2
  while (tomados.has(slug)) slug = `${base}-${n++}`
  return slug
}

async function subir(sb: SupabaseClient, ruta: string, archivo: Blob): Promise<string> {
  const { error } = await sb.storage.from(BUCKET).upload(ruta, archivo, {
    contentType: archivo.type,
    // El nombre es único y nunca se reescribe: el navegador lo puede guardar
    // para siempre.
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw traducir(error, 'No se pudo subir el archivo')
  return sb.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl
}

/**
 * Borra archivos del bucket SIN FALLAR: se llama cuando la fila ya no está,
 * y a esa altura un error no tiene arreglo desde la pantalla. Lo que no se
 * pudo borrar queda en la carpeta de la unidad y se va cuando se borre la
 * unidad entera.
 */
async function borrarArchivos(sb: SupabaseClient, rutas: (string | null | undefined)[]): Promise<void> {
  const limpias = [...new Set(rutas.filter((r): r is string => Boolean(r)))]
  if (limpias.length === 0) return
  const { error } = await sb.storage.from(BUCKET).remove(limpias)
  if (error) console.warn('[repo] No se pudieron borrar archivos del bucket', limpias, error)
}

/** ¿Alguna foto usa este archivo? El póster del video puede ser la portada. */
async function laUsaUnaFoto(sb: SupabaseClient, ruta: string): Promise<boolean> {
  const { data, error } = await sb.from('fotos').select('id').eq('ruta', ruta).limit(1)
  if (error) return true // ante la duda, no se borra
  return (data ?? []).length > 0
}

async function leer(sb: SupabaseClient, campo: 'id' | 'slug', valor: string): Promise<Vehiculo | null> {
  const { data, error } = await sb.from('vehiculos').select(SELECT).eq(campo, valor).maybeSingle()
  if (error) throw traducir(error, 'No se pudo leer la unidad')
  return data ? aVehiculo(data as unknown as FilaVehiculo) : null
}

async function leerOFallar(sb: SupabaseClient, vid: string): Promise<Vehiculo> {
  const v = await leer(sb, 'id', vid)
  if (!v) throw new ErrorRepo('Esa unidad ya no existe. Puede que la hayan borrado desde otra pestaña.')
  return v
}

async function fotosDe(sb: SupabaseClient, vid: string): Promise<{ id: string; orden: number }[]> {
  const { data, error } = await sb
    .from('fotos')
    .select('id, orden')
    .eq('vehiculo_id', vid)
    .order('orden')
  if (error) throw traducir(error, 'No se pudieron leer las fotos')
  return data ?? []
}

/** Reenumera `orden` de 0 en adelante. Toca solo las que cambiaron. */
async function renumerar(sb: SupabaseClient, idsEnOrden: string[], actuales: Map<string, number>) {
  const cambios = idsEnOrden
    .map((id, i) => ({ id, orden: i }))
    .filter((f) => actuales.get(f.id) !== f.orden)
  const res = await Promise.all(
    cambios.map((f) => sb.from('fotos').update({ orden: f.orden }).eq('id', f.id)),
  )
  const falla = res.find((r) => r.error)
  if (falla?.error) throw traducir(falla.error, 'No se pudo cambiar el orden')
}

/**
 * Las etiquetas se guardan ENTERAS, como las manda el formulario: se
 * actualiza o se agrega lo que vino y se borra lo que no vino. Primero lo
 * nuevo y después el borrado: si algo se corta en el medio, sobra una
 * etiqueta vieja en vez de faltar una nueva.
 *
 * Las que nacieron en el panel traen un id armado en el navegador
 * (`etq-nueva-...`); acá se cambian por uno de verdad.
 */
async function guardarEtiquetas(sb: SupabaseClient, vid: string, lista: Etiqueta[]) {
  const filas = lista.map((e, i) => ({
    id: e.id.startsWith('etq-nueva') ? uuid() : e.id,
    vehiculo_id: vid,
    titulo: e.titulo,
    texto: e.texto,
    foto_fondo_id: e.fotoFondoId,
    orden: i,
  }))

  if (filas.length > 0) {
    const { error } = await sb.from('etiquetas').upsert(filas)
    if (error) throw traducir(error, 'No se pudieron guardar las etiquetas')
  }

  let borrar = sb.from('etiquetas').delete().eq('vehiculo_id', vid)
  if (filas.length > 0) borrar = borrar.not('id', 'in', `(${filas.map((f) => `"${f.id}"`).join(',')})`)
  const { error } = await borrar
  if (error) throw traducir(error, 'No se pudieron guardar las etiquetas')
}

// ── Repositorio ───────────────────────────────────────────────────────────

export const repoSupabase: RepoVehiculos = {
  async listar(filtros: FiltrosVehiculos = {}) {
    const {
      condicion,
      estado,
      texto,
      soloPublicados = true,
      orden = 'recientes',
      limite,
    } = filtros

    try {
      const sb = await cliente()
      let q = sb.from('vehiculos').select(SELECT)
      if (soloPublicados) q = q.eq('publicado', true)
      if (condicion) q = q.eq('condicion', condicion)
      if (estado) q = q.eq('estado', estado)
      const buscado = texto ? sinComodines(plano(texto)) : ''
      if (buscado) q = q.ilike('busqueda', `%${buscado}%`)

      if (orden === 'recientes') q = q.order('creado_en', { ascending: false })
      else if (orden === 'actualizados') q = q.order('actualizado_en', { ascending: false })
      else {
        // `null` va SIEMPRE al final: "Consultar precio" no es ni el más
        // barato ni el más caro.
        q = q
          .order('precio', { ascending: orden === 'precio-asc', nullsFirst: false })
          .order('creado_en', { ascending: false })
      }
      if (limite) q = q.limit(limite)

      const { data, error } = await q
      if (error) throw error
      return (data as unknown as FilaVehiculo[]).map(aVehiculo)
    } catch (e) {
      throw traducir(e, 'No se pudo leer el stock')
    }
  },

  async obtenerPorId(vid) {
    try {
      return await leer(await cliente(), 'id', vid)
    } catch (e) {
      throw traducir(e, 'No se pudo abrir la unidad')
    }
  },

  async obtenerPorSlug(slug) {
    // Sin filtro de publicado: la ficha decide qué hacer con un borrador. Un
    // visitante igual no lo recibe nunca —la base no se lo manda—; la dueña
    // con sesión sí, y el panel lo usa para ver si una dirección está tomada.
    try {
      return await leer(await cliente(), 'slug', slug)
    } catch (e) {
      throw traducir(e, 'No se pudo abrir la unidad')
    }
  },

  async listarDestacados(limite = 3) {
    try {
      const sb = await cliente()
      const { data, error } = await sb
        .from('vehiculos')
        .select(SELECT)
        .eq('publicado', true)
        .eq('destacado', true)
        .order('creado_en', { ascending: false })
        .limit(limite)
      if (error) throw error
      return (data as unknown as FilaVehiculo[]).map(aVehiculo)
    } catch (e) {
      throw traducir(e, 'No se pudieron leer los destacados')
    }
  },

  async crear(datos: NuevoVehiculo) {
    try {
      const sb = await cliente()
      const base = slugificar(datos.slug || datos.titulo)
      const fila = {
        ...aFila(datos),
        descripcion: datos.descripcion ?? '',
        estado: datos.estado ?? 'disponible',
        // Nace como borrador: se publica cuando tiene fotos y precio, no antes.
        publicado: datos.publicado ?? false,
        destacado: datos.destacado ?? false,
      }

      // Dos pestañas pueden pedir el mismo slug a la vez: si la base lo
      // rechaza por repetido, se busca otro y se reintenta.
      let id: string | null = null
      for (let intento = 0; intento < 4 && !id; intento++) {
        const slug = await slugLibre(sb, base)
        const { data, error } = await sb
          .from('vehiculos')
          .insert({ ...fila, slug })
          .select('id')
          .single()
        if (error?.code === '23505') continue
        if (error) throw error
        id = data.id as string
      }
      if (!id) throw new ErrorRepo('No se pudo armar una dirección libre. Cambiá el título y probá de nuevo.')

      if (datos.etiquetas?.length) await guardarEtiquetas(sb, id, datos.etiquetas)
      return await leerOFallar(sb, id)
    } catch (e) {
      throw traducir(e, 'No se pudo crear la unidad')
    }
  },

  async actualizar(vid, cambios: CambiosVehiculo) {
    try {
      const sb = await cliente()
      const { slug, etiquetas } = cambios
      const fila = aFila(cambios)

      for (let intento = 0; intento < 4; intento++) {
        if (slug !== undefined) {
          const titulo = cambios.titulo ?? (await leerOFallar(sb, vid)).titulo
          fila.slug = await slugLibre(sb, slugificar(slug || titulo), vid)
        }
        if (Object.keys(fila).length === 0) break

        // `select` para saber si tocó algo: una actualización que la RLS no
        // deja pasar no da error, devuelve cero filas.
        const { data, error } = await sb.from('vehiculos').update(fila).eq('id', vid).select('id')
        if (error?.code === '23505' && slug !== undefined) continue
        if (error) throw error
        if (!data || data.length === 0) {
          throw new ErrorRepo('No se guardó: la unidad ya no existe o tu cuenta no tiene permiso.')
        }
        break
      }

      if (etiquetas !== undefined) await guardarEtiquetas(sb, vid, etiquetas)
      return await leerOFallar(sb, vid)
    } catch (e) {
      throw traducir(e, 'No se pudieron guardar los cambios')
    }
  },

  async eliminar(vid) {
    try {
      const sb = await cliente()

      // Las rutas se leen ANTES: después del borrado las filas ya no están.
      const [fotos, video] = await Promise.all([
        sb.from('fotos').select('ruta').eq('vehiculo_id', vid),
        sb.from('videos').select('ruta, poster_ruta').eq('vehiculo_id', vid).maybeSingle(),
      ])
      if (fotos.error) throw fotos.error
      if (video.error) throw video.error

      const { data, error } = await sb.from('vehiculos').delete().eq('id', vid).select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        throw new ErrorRepo('No se borró: la unidad ya no existe o tu cuenta no tiene permiso.')
      }

      // Los archivos se borran DESPUÉS de que la ficha ya no está: si esto
      // fallara, lo que queda es un archivo huérfano y no una unidad en el
      // listado apuntando a fotos que ya no existen.
      const enCarpeta = await sb.storage.from(BUCKET).list(vid, { limit: 1000 })
      await borrarArchivos(sb, [
        ...(fotos.data ?? []).map((f) => f.ruta as string | null),
        video.data?.ruta as string | null,
        // El póster puede ser una imagen del sitio (`/img/...`): esos no
        // tienen ruta y no se tocan.
        video.data?.poster_ruta as string | null,
        ...(enCarpeta.data ?? []).map((o) => `${vid}/${o.name}`),
      ])
    } catch (e) {
      throw traducir(e, 'No se pudo borrar la unidad')
    }
  },

  async subirFoto(vid, archivo) {
    try {
      const sb = await cliente()
      const actuales = await fotosDe(sb, vid)
      if (actuales.length >= MAX_FOTOS) {
        throw new ErrorRepo(`Son ${MAX_FOTOS} fotos como máximo por unidad.`)
      }

      const { ancho, alto } = await medir(archivo)
      const ruta = `${vid}/foto-${uuid()}.${extension(archivo)}`
      const url = await subir(sb, ruta, archivo)

      const { data, error } = await sb
        .from('fotos')
        .insert({ vehiculo_id: vid, url, ruta, ancho, alto, orden: actuales.length })
        .select('id, url, ancho, alto, orden')
        .single()
      if (error) {
        // La fila no entró (tope, permiso, unidad borrada): el archivo que ya
        // subió no le sirve a nadie.
        await borrarArchivos(sb, [ruta])
        throw error
      }
      return aFoto(data as FilaFoto)
    } catch (e) {
      throw traducir(e, 'No se pudo guardar la foto')
    }
  },

  async eliminarFoto(vid, fotoId) {
    try {
      const sb = await cliente()
      const { data: foto, error: e1 } = await sb
        .from('fotos')
        .select('id, ruta')
        .eq('id', fotoId)
        .eq('vehiculo_id', vid)
        .maybeSingle()
      if (e1) throw e1
      if (!foto) return

      // La base deja sin fondo a las etiquetas que la usaban (`on delete set
      // null`), igual que hacía el mock a mano.
      const { data, error } = await sb.from('fotos').delete().eq('id', fotoId).select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        throw new ErrorRepo('No se borró la foto: tu cuenta no tiene permiso.')
      }

      const quedan = await fotosDe(sb, vid)
      await renumerar(
        sb,
        quedan.map((f) => f.id),
        new Map(quedan.map((f) => [f.id, f.orden])),
      )

      // El archivo se borra SOLO si no quedó nadie apuntándole. El póster del
      // video puede ser esta misma foto —es a lo que se cae `subirVideo`
      // cuando no le dan uno— y borrarlo dejaría el bloque de video sin imagen.
      const ruta = foto.ruta as string | null
      if (ruta) {
        const { data: v } = await sb
          .from('videos')
          .select('poster_ruta')
          .eq('vehiculo_id', vid)
          .maybeSingle()
        if (v?.poster_ruta !== ruta) await borrarArchivos(sb, [ruta])
      }
    } catch (e) {
      throw traducir(e, 'No se pudo borrar la foto')
    }
  },

  async reordenarFotos(vid, idsEnOrden) {
    try {
      const sb = await cliente()
      const actuales = await fotosDe(sb, vid)
      const conocidas = new Set(actuales.map((f) => f.id))
      if (
        idsEnOrden.length !== actuales.length ||
        !idsEnOrden.every((id) => conocidas.has(id))
      ) {
        throw new ErrorRepo('El nuevo orden tiene que incluir todas las fotos.')
      }
      await renumerar(sb, idsEnOrden, new Map(actuales.map((f) => [f.id, f.orden])))
      return (await leerOFallar(sb, vid)).fotos
    } catch (e) {
      throw traducir(e, 'No se pudo cambiar el orden')
    }
  },

  async subirVideo(vid, archivo, poster) {
    try {
      const sb = await cliente()
      const { data: previo, error: e1 } = await sb
        .from('videos')
        .select('ruta, poster_ruta')
        .eq('vehiculo_id', vid)
        .maybeSingle()
      if (e1) throw e1

      const ruta = `${vid}/video-${uuid()}.${extension(archivo)}`
      const url = await subir(sb, ruta, archivo)

      // Sin póster propio se usa la portada: el video va con
      // `preload="none"`, así que sin una imagen quedaría un rectángulo negro.
      let posterUrl = '/img/hero-poster.jpg'
      let posterRuta: string | null = null
      try {
        if (poster) {
          posterRuta = `${vid}/poster-${uuid()}.${extension(poster)}`
          posterUrl = await subir(sb, posterRuta, poster)
        } else {
          const { data: portada } = await sb
            .from('fotos')
            .select('url, ruta')
            .eq('vehiculo_id', vid)
            .order('orden')
            .limit(1)
            .maybeSingle()
          if (portada) {
            posterUrl = portada.url as string
            posterRuta = portada.ruta as string | null
          }
        }
      } catch (e) {
        await borrarArchivos(sb, [ruta])
        throw e
      }

      const { error } = await sb.from('videos').upsert({
        vehiculo_id: vid,
        url,
        ruta,
        poster_url: posterUrl,
        poster_ruta: posterRuta,
        peso_bytes: archivo.size,
      })
      if (error) {
        await borrarArchivos(sb, [ruta, poster ? posterRuta : null])
        throw error
      }

      // Subir otro reemplaza al anterior, así que los archivos del viejo se
      // van. Su póster, solo si no es una foto de la unidad que sigue viva.
      if (previo) {
        const viejos: (string | null)[] = [previo.ruta as string | null]
        const pv = previo.poster_ruta as string | null
        if (pv && pv !== posterRuta && !(await laUsaUnaFoto(sb, pv))) viejos.push(pv)
        await borrarArchivos(sb, viejos)
      }

      const video: Video = { url, posterUrl, pesoBytes: archivo.size }
      return video
    } catch (e) {
      throw traducir(e, 'No se pudo guardar el video')
    }
  },

  async eliminarVideo(vid) {
    try {
      const sb = await cliente()
      const { data: previo, error: e1 } = await sb
        .from('videos')
        .select('ruta, poster_ruta')
        .eq('vehiculo_id', vid)
        .maybeSingle()
      if (e1) throw e1
      if (!previo) return

      const { error } = await sb.from('videos').delete().eq('vehiculo_id', vid)
      if (error) throw error

      // El póster puede ser una foto de la unidad, que sigue viva: solo se
      // borra lo que era del video y de nadie más.
      const archivos: (string | null)[] = [previo.ruta as string | null]
      const pv = previo.poster_ruta as string | null
      if (pv && !(await laUsaUnaFoto(sb, pv))) archivos.push(pv)
      await borrarArchivos(sb, archivos)
    } catch (e) {
      throw traducir(e, 'No se pudo quitar el video')
    }
  },
}
