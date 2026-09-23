import type { Contadores, Pregunta, Servicio } from '../../types/contenido'
import {
  SEMILLA_CONTADORES,
  SEMILLA_PREGUNTAS,
  SEMILLA_SERVICIOS,
} from './semilla-contenido'
import { ErrorRepo } from './tipos'
import type { RepoContenido } from './tipos'

/**
 * El contenido del inicio sobre localStorage, con las mismas reglas que el
 * mock de vehículos: lo guardado gana sobre la semilla, así que si la semilla
 * cambia hay que SUBIR la versión de la clave.
 *
 * Es texto y pesa nada —diez servicios y veinte preguntas no llegan a 20 KB—
 * así que va en una sola clave y sin IndexedDB.
 */
const CLAVE = 'autoshop.contenido.v1'

interface Guardado {
  contadores: Contadores
  servicios: Servicio[]
  preguntas: Pregunta[]
}

const SEMILLA: Guardado = {
  contadores: SEMILLA_CONTADORES,
  servicios: SEMILLA_SERVICIOS,
  preguntas: SEMILLA_PREGUNTAS,
}

/** Copia profunda barata: quien lee no puede mutar lo guardado. */
function copia<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T
}

function leer(): Guardado {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (!crudo) return copia(SEMILLA)
    const d = JSON.parse(crudo) as Partial<Guardado>
    // Un bloque que falte o venga roto se cae a la semilla SOLO ese bloque:
    // perder las preguntas porque se rompió un contador sería desproporcionado.
    return {
      contadores:
        d.contadores && Array.isArray(d.contadores.lista)
          ? d.contadores
          : copia(SEMILLA_CONTADORES),
      servicios: Array.isArray(d.servicios) ? d.servicios : copia(SEMILLA_SERVICIOS),
      preguntas: Array.isArray(d.preguntas) ? d.preguntas : copia(SEMILLA_PREGUNTAS),
    }
  } catch {
    // Incógnito con storage bloqueado o JSON corrupto: el sitio se ve con la
    // semilla, y lo que se pierde es la persistencia del panel.
    return copia(SEMILLA)
  }
}

function guardar(d: Guardado): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(d))
  } catch {
    throw new ErrorRepo('No se pudo guardar en este navegador.')
  }
}

const porOrden = <T extends { orden: number }>(lista: T[]) =>
  [...lista].sort((a, b) => a.orden - b.orden)

/** El orden de la lista manda: se renumera desde 0 según la posición. */
const renumerar = <T extends { orden: number }>(lista: T[]) =>
  lista.map((x, i) => ({ ...x, orden: i }))

export const contenidoMock: RepoContenido = {
  async obtenerContadores() {
    return copia(leer().contadores)
  },

  async guardarContadores(datos) {
    if (datos.lista.length !== 4) {
      throw new ErrorRepo('Los contadores son cuatro, ni más ni menos.')
    }
    const d = leer()
    d.contadores = copia(datos)
    guardar(d)
    return copia(d.contadores)
  },

  async listarServicios() {
    return porOrden(copia(leer().servicios))
  },

  async guardarServicios(lista) {
    const d = leer()
    d.servicios = renumerar(copia(lista))
    guardar(d)
    return copia(d.servicios)
  },

  async listarPreguntas() {
    return porOrden(copia(leer().preguntas))
  },

  async guardarPreguntas(lista) {
    const d = leer()
    d.preguntas = renumerar(copia(lista))
    guardar(d)
    return copia(d.preguntas)
  },
}
