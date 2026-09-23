/**
 * Dónde viven los archivos del mock.
 *
 * LOCALSTORAGE NO ALCANZA Y NO ES UN DETALLE. Son ~5 MB por origen y guarda
 * texto, así que un archivo tiene que ir como data URL, que abulta un tercio
 * más. Diez fotos de 250 KB ya son 3,4 MB de base64 y un video de 25 MB son
 * 33: la carga fallaba con la cuarta foto y un video no entró nunca. El panel
 * no se podía probar de verdad, que es exactamente lo que el panel tiene que
 * dejar hacer.
 *
 * Acá los BYTES van a IndexedDB —cientos de megas, y guarda `Blob` sin
 * convertirlo a texto— y en localStorage queda solo la ficha del vehículo con
 * una referencia `idb:<clave>` donde antes iba la data URL. Es la misma
 * división que va a haber con Supabase, donde la fila tiene la URL del Storage
 * y no el archivo.
 *
 * Esto se tira a la basura junto con el resto del mock. Ningún componente lo
 * importa: se entra por `data/repo`.
 */

const BASE = 'autoshop-archivos'
const ALMACEN = 'blobs'

/**
 * El bote salvavidas para incógnito con almacenamiento bloqueado.
 *
 * Si IndexedDB no abre, los archivos se quedan en memoria: el panel funciona
 * hasta que se recargue la página, que es bastante mejor que una pantalla de
 * error en la que no se puede cargar nada. Lo que se pierde es la persistencia,
 * y eso ya lo dice el listado con los datos de muestra.
 */
const enMemoria = new Map<string, Blob>()

let conexion: Promise<IDBDatabase | null> | null = null

function abrir(): Promise<IDBDatabase | null> {
  if (conexion) return conexion
  conexion = new Promise((res) => {
    try {
      const pedido = indexedDB.open(BASE, 1)
      pedido.onupgradeneeded = () => {
        pedido.result.createObjectStore(ALMACEN)
      }
      pedido.onsuccess = () => res(pedido.result)
      pedido.onerror = () => res(null)
      pedido.onblocked = () => res(null)
    } catch {
      res(null)
    }
  })
  return conexion
}

function transaccion(
  db: IDBDatabase,
  modo: IDBTransactionMode,
): IDBObjectStore {
  return db.transaction(ALMACEN, modo).objectStore(ALMACEN)
}

function comoPromesa<T>(pedido: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    pedido.onsuccess = () => res(pedido.result)
    pedido.onerror = () => rej(pedido.error ?? new Error('IndexedDB falló'))
  })
}

export async function guardarBlob(clave: string, blob: Blob): Promise<void> {
  const db = await abrir()
  if (!db) {
    enMemoria.set(clave, blob)
    return
  }
  try {
    await comoPromesa(transaccion(db, 'readwrite').put(blob, clave))
  } catch {
    enMemoria.set(clave, blob)
  }
}

export async function leerBlob(clave: string): Promise<Blob | null> {
  if (enMemoria.has(clave)) return enMemoria.get(clave) ?? null
  const db = await abrir()
  if (!db) return null
  try {
    const blob = await comoPromesa(transaccion(db, 'readonly').get(clave))
    return blob instanceof Blob ? blob : null
  } catch {
    return null
  }
}

/**
 * Las direcciones ya entregadas, por clave.
 *
 * Un `createObjectURL` por lectura sería una dirección nueva cada vez que el
 * catálogo se vuelve a listar: el `<img>` se recargaría en cada render y la
 * memoria del documento crecería sin techo. Con la caché, cada archivo tiene
 * UNA dirección mientras la pestaña viva, y se revoca recién cuando el archivo
 * se borra de verdad.
 */
const urls = new Map<string, string>()

export async function borrarBlobs(claves: string[]): Promise<void> {
  claves.forEach((c) => enMemoria.delete(c))
  claves.forEach((c) => {
    const u = urls.get(c)
    if (u) {
      URL.revokeObjectURL(u)
      urls.delete(c)
    }
  })

  const db = await abrir()
  if (!db) return
  try {
    const store = transaccion(db, 'readwrite')
    await Promise.all(claves.map((c) => comoPromesa(store.delete(c))))
  } catch {
    /* si no se pudo borrar, queda un archivo huérfano en un mock que se tira */
  }
}

export async function urlDeBlob(clave: string): Promise<string | null> {
  const ya = urls.get(clave)
  if (ya) return ya

  const blob = await leerBlob(clave)
  if (!blob) return null

  // Entre el `get` de arriba y esta línea pudo resolverse otra lectura de la
  // misma clave. Se queda la primera, para no repartir dos direcciones.
  const otra = urls.get(clave)
  if (otra) return otra

  const url = URL.createObjectURL(blob)
  urls.set(clave, url)
  return url
}
