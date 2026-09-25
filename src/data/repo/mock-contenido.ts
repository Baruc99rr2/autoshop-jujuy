import type {
  Contadores,
  DatosContacto,
  Pregunta,
  Segmento,
  Servicio,
} from '../../types/contenido'
import { borrarBlobs, guardarBlob, urlDeBlob } from './blobs'
import {
  SEMILLA_CONTACTO,
  SEMILLA_CONTADORES,
  SEMILLA_PREGUNTAS,
  SEMILLA_SEGMENTOS,
  SEMILLA_SERVICIOS,
} from './semilla-contenido'
import { ErrorRepo, revisarContacto, revisarSegmentos } from './tipos'
import type { RepoContenido } from './tipos'

/**
 * El contenido del inicio sobre localStorage, con las mismas reglas que el
 * mock de vehículos: lo guardado gana sobre la semilla, así que si la semilla
 * cambia hay que SUBIR la versión de la clave.
 *
 * Es texto y pesa nada —diez servicios y veinte preguntas no llegan a 20 KB—
 * así que va en una sola clave. Lo único que va a IndexedDB son las fotos de
 * los segmentos, igual que las de los vehículos: en la clave queda
 * `idb:<clave>` y se cambia por una dirección al leer.
 *
 * Segmentos y contacto se sumaron después sin subir la versión: un bloque
 * que no está en lo guardado se cae a la semilla, que es justo lo que tiene
 * que pasar.
 */
const CLAVE = 'autoshop.contenido.v1'

interface Guardado {
  contadores: Contadores
  servicios: Servicio[]
  preguntas: Pregunta[]
  segmentos: Segmento[]
  contacto: DatosContacto
}

const SEMILLA: Guardado = {
  contadores: SEMILLA_CONTADORES,
  servicios: SEMILLA_SERVICIOS,
  preguntas: SEMILLA_PREGUNTAS,
  segmentos: SEMILLA_SEGMENTOS,
  contacto: SEMILLA_CONTACTO,
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
      segmentos: Array.isArray(d.segmentos) ? d.segmentos : copia(SEMILLA_SEGMENTOS),
      contacto:
        d.contacto && Array.isArray(d.contacto.horarios)
          ? d.contacto
          : copia(SEMILLA_CONTACTO),
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

// ── Fotos de los segmentos ────────────────────────────────────────────────

const REF = 'idb:'
const esRef = (url: string) => url.startsWith(REF)
const claveDe = (url: string) => url.slice(REF.length)

/** La referencia cambiada por una dirección que un `<img>` entiende. */
async function hidratar(lista: Segmento[]): Promise<Segmento[]> {
  return Promise.all(
    lista.map(async (s) =>
      esRef(s.imagen.url)
        ? { ...s, imagen: { ...s.imagen, url: (await urlDeBlob(claveDe(s.imagen.url))) ?? s.imagen.url } }
        : s,
    ),
  )
}

/**
 * La `ruta` de una foto del mock es su referencia `idb:`; en Supabase es el
 * camino dentro del bucket. Así el panel puede tratarlas igual: con ruta, es
 * un archivo propio; sin ruta, una imagen del sitio que no se borra.
 */
const refDe = (s: Segmento) => s.imagen.ruta

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

  async listarSegmentos() {
    return hidratar(porOrden(copia(leer().segmentos)))
  },

  async guardarSegmentos(lista) {
    revisarSegmentos(lista)
    const d = leer()
    const antes = new Set(d.segmentos.map(refDe).filter((r): r is string => Boolean(r)))

    const nuevos: Segmento[] = []
    for (const [i, s] of lista.entries()) {
      let imagen = s.imagen
      if (s.archivo) {
        const clave = `seg-${s.id}-${Date.now().toString(36)}`
        await guardarBlob(clave, s.archivo)
        const { ancho, alto } = await medir(s.archivo)
        imagen = { url: REF + clave, ruta: REF + clave, ancho, alto }
      } else if (imagen?.ruta) {
        // Lo que vino del panel trae la dirección ya hidratada: se vuelve a
        // guardar la referencia, que es lo que sobrevive a la pestaña.
        imagen = { ...imagen, url: imagen.ruta }
      }
      if (!imagen) throw new ErrorRepo(`Al segmento «${s.titulo}» le falta la foto.`)
      nuevos.push({
        id: s.id,
        titulo: s.titulo,
        texto: s.texto,
        etiqueta: s.etiqueta,
        imagen,
        orden: i,
      })
    }

    d.segmentos = nuevos
    guardar(d)

    const quedan = new Set(nuevos.map(refDe))
    await borrarBlobs([...antes].filter((r) => !quedan.has(r)).map(claveDe))
    return hidratar(copia(nuevos))
  },

  async obtenerContacto() {
    return copia(leer().contacto)
  },

  async guardarContacto(datos) {
    revisarContacto(datos)
    const d = leer()
    d.contacto = copia(datos)
    guardar(d)
    return copia(d.contacto)
  },
}

/** Ancho y alto reales del archivo: van al `<img>` del carrusel. */
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
