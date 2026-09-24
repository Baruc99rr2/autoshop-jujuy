import type { SupabaseClient } from '@supabase/supabase-js'
import type { Contador, Contadores, Pregunta, Servicio } from '../../types/contenido'
import { cliente } from '../supabase'
import { traducir } from './errores'
import { ErrorRepo } from './tipos'
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
 */

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
  tabla: 'servicios' | 'preguntas',
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
}
