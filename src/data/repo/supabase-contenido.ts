import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Contador,
  Contadores,
  DatosContacto,
  Horario,
  Pregunta,
  Segmento,
  Servicio,
} from '../../types/contenido'
import { cliente } from '../supabase'
import { traducir } from './errores'
import { borrarArchivos, extension, medir, subir } from './supabase'
import { ErrorRepo, revisarContacto, revisarSegmentos } from './tipos'
import type { RepoContenido } from './tipos'

/**
 * El contenido del inicio sobre Supabase.
 *
 * CONTADORES: la base no deja agregarlos ni borrarlos (siempre son cuatro),
 * así que se guardan con UPDATE fila por fila. Un upsert fallaría: pide
 * permiso de alta y a propósito no lo hay.
 *
 * SERVICIOS Y PREGUNTAS: cada bloque se guarda ENTERO, como la pantalla lo
 * manda. Upsert de la lista y borrado de lo que no vino, en ese orden: si
 * algo se corta en el medio, sobra una fila vieja en vez de faltar una nueva.
 * Los segmentos igual, con sus fotos: se suben antes, y los archivos que
 * quedaron sin usar se borran recién cuando la lista ya se guardó.
 *
 * CONTACTO: una sola fila, como `sitio`. Se guarda con UPDATE.
 */

/**
 * La carpeta de las fotos de los segmentos dentro del bucket. Aparte de las
 * de los vehículos, que van en `<vehiculo_id>/`: un id de vehículo es un uuid
 * o un `demo-...`, así que no puede chocar con este nombre.
 */
const CARPETA_SEGMENTOS = 'segmentos'

type FilaSegmento = {
  id: string
  titulo: string
  texto: string
  etiqueta: string
  imagen_url: string
  imagen_ruta: string | null
  ancho: number
  alto: number
  orden: number
}

const aSegmento = (f: FilaSegmento): Segmento => ({
  id: f.id,
  titulo: f.titulo,
  texto: f.texto,
  etiqueta: f.etiqueta,
  imagen: { url: f.imagen_url, ruta: f.imagen_ruta, ancho: f.ancho, alto: f.alto },
  orden: f.orden,
})

type FilaContacto = Omit<DatosContacto, 'horarios'> & { horarios: Horario[] | null }

type FilaContador = {
  id: string
  valor: number
  sufijo: Contador['sufijo']
  etiqueta: string
  desde_apertura: boolean
  orden: number
}

function aContador(f: FilaContador): Contador {
  const c: Contador = { id: f.id, valor: f.valor, sufijo: f.sufijo, etiqueta: f.etiqueta }
  if (f.desde_apertura) c.desdeApertura = true
  return c
}

/** Una lista entera: upsert de lo que vino y borrado de lo que no. */
async function reemplazar<T extends { id: string }>(
  sb: SupabaseClient,
  tabla: 'servicios' | 'preguntas' | 'segmentos',
  filas: T[],
): Promise<void> {
  if (filas.length > 0) {
    const { error } = await sb.from(tabla).upsert(filas).select('id')
    if (error) throw error
  }
  let borrar = sb.from(tabla).delete()
  borrar =
    filas.length > 0
      ? borrar.not('id', 'in', `(${filas.map((f) => `"${f.id}"`).join(',')})`)
      : // Un delete sin filtro lo frena la API: se pide "todas" explícito.
        borrar.neq('id', '')
  const { error } = await borrar
  if (error) throw error
}

export const contenidoSupabase: RepoContenido = {
  async obtenerContadores() {
    try {
      const sb = await cliente()
      const [sitio, lista] = await Promise.all([
        sb.from('sitio').select('apertura').maybeSingle(),
        sb.from('contadores').select('*').order('orden'),
      ])
      if (sitio.error) throw sitio.error
      if (lista.error) throw lista.error
      return {
        apertura: (sitio.data?.apertura as number | undefined) ?? new Date().getFullYear(),
        lista: (lista.data as FilaContador[]).map(aContador),
      }
    } catch (e) {
      throw traducir(e, 'No se pudieron leer los números')
    }
  },

  async guardarContadores(datos: Contadores) {
    if (datos.lista.length !== 4) {
      throw new ErrorRepo('Los contadores son cuatro, ni más ni menos.')
    }
    try {
      const sb = await cliente()
      const pedidos = [
        sb.from('sitio').update({ apertura: datos.apertura }).eq('id', true).select('id'),
        ...datos.lista.map((c, i) =>
          sb
            .from('contadores')
            .update({
              valor: c.valor,
              sufijo: c.sufijo,
              etiqueta: c.etiqueta,
              desde_apertura: Boolean(c.desdeApertura),
              orden: i,
            })
            .eq('id', c.id)
            .select('id'),
        ),
      ]
      const res = await Promise.all(pedidos)
      const falla = res.find((r) => r.error)
      if (falla?.error) throw falla.error
      // Cero filas sin error = la RLS no dejó tocar nada.
      if (res.some((r) => !r.data || r.data.length === 0)) {
        throw new ErrorRepo('No se guardaron los números: tu cuenta no tiene permiso.')
      }
      return await contenidoSupabase.obtenerContadores()
    } catch (e) {
      throw traducir(e, 'No se pudieron guardar los números')
    }
  },

  async listarServicios() {
    try {
      const sb = await cliente()
      const { data, error } = await sb
        .from('servicios')
        .select('id, icono, titulo, precio, detalle, orden')
        .order('orden')
      if (error) throw error
      return data as Servicio[]
    } catch (e) {
      throw traducir(e, 'No se pudieron leer los servicios')
    }
  },

  async guardarServicios(lista) {
    try {
      const sb = await cliente()
      // El orden de la lista manda: se renumera desde 0 según la posición.
      const filas: Servicio[] = lista.map((s, i) => ({
        id: s.id,
        icono: s.icono,
        titulo: s.titulo,
        precio: s.precio,
        detalle: s.detalle,
        orden: i,
      }))
      await reemplazar(sb, 'servicios', filas)
      return await contenidoSupabase.listarServicios()
    } catch (e) {
      throw traducir(e, 'No se pudieron guardar los servicios')
    }
  },

  async listarPreguntas() {
    try {
      const sb = await cliente()
      const { data, error } = await sb
        .from('preguntas')
        .select('id, pregunta, respuesta, orden')
        .order('orden')
      if (error) throw error
      return data as Pregunta[]
    } catch (e) {
      throw traducir(e, 'No se pudieron leer las preguntas')
    }
  },

  async guardarPreguntas(lista) {
    try {
      const sb = await cliente()
      const filas: Pregunta[] = lista.map((p, i) => ({
        id: p.id,
        pregunta: p.pregunta,
        respuesta: p.respuesta,
        orden: i,
      }))
      await reemplazar(sb, 'preguntas', filas)
      return await contenidoSupabase.listarPreguntas()
    } catch (e) {
      throw traducir(e, 'No se pudieron guardar las preguntas')
    }
  },

  async listarSegmentos() {
    try {
      const sb = await cliente()
      const { data, error } = await sb
        .from('segmentos')
        .select('id, titulo, texto, etiqueta, imagen_url, imagen_ruta, ancho, alto, orden')
        .order('orden')
      if (error) throw error
      return (data as FilaSegmento[]).map(aSegmento)
    } catch (e) {
      throw traducir(e, 'No se pudieron leer los segmentos')
    }
  },

  async guardarSegmentos(lista) {
    revisarSegmentos(lista)
    let sb: SupabaseClient
    try {
      sb = await cliente()
    } catch (e) {
      throw traducir(e, 'No se pudieron guardar los segmentos')
    }

    // Lo que está hoy en la base: después de guardar, lo que no siga en uso
    // se borra del bucket.
    let previas: (string | null)[]
    try {
      const { data, error } = await sb.from('segmentos').select('imagen_ruta')
      if (error) throw error
      previas = (data ?? []).map((f) => f.imagen_ruta as string | null)
    } catch (e) {
      throw traducir(e, 'No se pudieron guardar los segmentos')
    }

    // 1. Las fotos nuevas. Si una falla, las que ya subieron en esta vuelta
    //    no las usa nadie y se borran.
    const subidas: string[] = []
    const filas: FilaSegmento[] = []
    try {
      for (const [i, s] of lista.entries()) {
        let img = s.imagen
        if (s.archivo) {
          const { ancho, alto } = await medir(s.archivo)
          const ruta = `${CARPETA_SEGMENTOS}/${s.id}-${crypto.randomUUID()}.${extension(s.archivo)}`
          const url = await subir(sb, ruta, s.archivo)
          subidas.push(ruta)
          img = { url, ruta, ancho, alto }
        }
        if (!img) throw new ErrorRepo(`Al segmento «${s.titulo}» le falta la foto.`)
        filas.push({
          id: s.id,
          titulo: s.titulo,
          texto: s.texto,
          etiqueta: s.etiqueta,
          imagen_url: img.url,
          imagen_ruta: img.ruta,
          ancho: img.ancho,
          alto: img.alto,
          orden: i,
        })
      }
    } catch (e) {
      await borrarArchivos(sb, subidas)
      throw traducir(e, 'No se pudo subir la foto del segmento')
    }

    // 2. La lista. Si esto falla NO se borran las subidas: puede haber
    //    entrado el upsert y fallado el borrado, y ahí las filas ya apuntan a
    //    los archivos nuevos. Un archivo huérfano es mejor que una foto rota.
    try {
      await reemplazar(sb, 'segmentos', filas)
    } catch (e) {
      throw traducir(e, 'No se pudieron guardar los segmentos')
    }

    // 3. Los archivos que ya no usa ninguna fila.
    const enUso = new Set(filas.map((f) => f.imagen_ruta))
    await borrarArchivos(
      sb,
      previas.filter((r) => r && !enUso.has(r)),
    )
    return contenidoSupabase.listarSegmentos()
  },

  async obtenerContacto() {
    try {
      const sb = await cliente()
      const { data, error } = await sb
        .from('contacto')
        .select('telefono, email, whatsapp, direccion, lat, lng, horarios')
        .maybeSingle()
      if (error) throw error
      if (!data) throw new ErrorRepo('Todavía no hay datos de contacto cargados.')
      const f = data as FilaContacto
      return { ...f, horarios: Array.isArray(f.horarios) ? f.horarios : [] }
    } catch (e) {
      throw traducir(e, 'No se pudieron leer los datos de contacto')
    }
  },

  async guardarContacto(datos) {
    revisarContacto(datos)
    try {
      const sb = await cliente()
      const { data, error } = await sb
        .from('contacto')
        .update({
          telefono: datos.telefono,
          email: datos.email,
          whatsapp: datos.whatsapp,
          direccion: datos.direccion,
          lat: datos.lat,
          lng: datos.lng,
          horarios: datos.horarios,
        })
        .eq('id', true)
        .select('id')
      if (error) throw error
      // Cero filas sin error = la RLS no dejó tocar nada.
      if (!data || data.length === 0) {
        throw new ErrorRepo('No se guardó el contacto: tu cuenta no tiene permiso.')
      }
      return await contenidoSupabase.obtenerContacto()
    } catch (e) {
      throw traducir(e, 'No se pudieron guardar los datos de contacto')
    }
  },
}
