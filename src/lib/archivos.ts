/**
 * Preparar en el navegador lo que se sube desde el celular.
 *
 * La dueña carga las fotos desde la galería del teléfono, y una foto de un
 * celular de hoy son cuatro o cinco megas de 4000 px de lado. Subirlas como
 * vienen sería mandar treinta megas por unidad y que el catálogo tarde diez
 * segundos en pintar en la conexión del salón. Por eso la foto se achica y se
 * recomprime ACÁ, antes de tocar el repositorio: lo que se guarda ya es lo
 * que se va a servir.
 *
 * Nada de esto sabe de vehículos ni de almacenamiento: entra un `File` del
 * `<input>` y sale otro `File`, más chico. El repositorio —mock hoy, Supabase
 * mañana— recibe el archivo ya listo y no tiene que volver a pensarlo.
 */

/** Lado mayor de la foto guardada. Alcanza para el visor a pantalla completa. */
export const LADO_MAYOR = 1600

/** El techo del piso de calidad del proyecto: imágenes en WebP, < 250 KB. */
export const PESO_OBJETIVO = 250 * 1024

/**
 * Se prueba de la mejor a la peor y se corta en la primera que entra en
 * `PESO_OBJETIVO`. Empezar por 0.9 es tirar tiempo: una foto de auto a 1600 px
 * nunca entra en 250 KB con esa calidad, y cada intento es una recompresión
 * entera. Si ninguna entra, queda la última: una foto pesada es mejor que una
 * carga que se rechaza sola.
 */
const CALIDADES = [0.82, 0.72, 0.62, 0.5, 0.4]

export const MAX_VIDEO_BYTES = 25 * 1024 * 1024

/** Lo que acepta el `<input>` del video, y lo que se valida después. */
export const TIPOS_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime']

/** "48 MB", "1,4 MB". Para los mensajes, que hablan de megas y no de bytes. */
export function pesoLegible(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  if (mb >= 10) return `${Math.round(mb)} MB`
  if (mb >= 1) return `${mb.toFixed(1).replace('.', ',')} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** Error que se le puede mostrar a la dueña tal cual, sin traducir. */
export class ErrorArchivo extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'ErrorArchivo'
  }
}

// ── Fotos ─────────────────────────────────────────────────────────────────

function aBlob(lienzo: HTMLCanvasElement, tipo: string, calidad: number) {
  return new Promise<Blob | null>((res) => lienzo.toBlob(res, tipo, calidad))
}

/**
 * Decodifica respetando la orientación EXIF.
 *
 * Sin `imageOrientation: 'from-image'` las fotos verticales de iPhone entran
 * acostadas: el sensor graba siempre en horizontal y deja la rotación anotada
 * al costado, que es lo que el canvas ignora si no se le pide lo contrario.
 * Se ve como si la dueña hubiera cargado la foto mal.
 */
async function decodificar(archivo: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(archivo, { imageOrientation: 'from-image' })
  } catch {
    throw new ErrorArchivo(
      `«${archivo.name}» no se pudo abrir como imagen. Probá con otra foto.`,
    )
  }
}

export type FotoLista = {
  archivo: File
  ancho: number
  alto: number
}

/**
 * Una foto de la galería, lista para guardar: 1600 px de lado mayor y WebP.
 *
 * Nunca AGRANDA: una foto de 900 px se recomprime pero se queda en 900. Subir
 * la escala no agrega información, solo peso y una imagen más blanda.
 */
export async function prepararFoto(archivo: File): Promise<FotoLista> {
  const bitmap = await decodificar(archivo)

  const escala = Math.min(1, LADO_MAYOR / Math.max(bitmap.width, bitmap.height))
  const ancho = Math.max(1, Math.round(bitmap.width * escala))
  const alto = Math.max(1, Math.round(bitmap.height * escala))

  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto
  const ctx = lienzo.getContext('2d')
  if (!ctx) throw new ErrorArchivo('Este navegador no puede procesar la foto.')
  ctx.drawImage(bitmap, 0, 0, ancho, alto)
  bitmap.close()

  let mejor: Blob | null = null
  for (const calidad of CALIDADES) {
    const blob = await aBlob(lienzo, 'image/webp', calidad)
    if (!blob) continue
    mejor = blob
    if (blob.size <= PESO_OBJETIVO) break
  }

  // `toBlob` con un tipo que no soporta devuelve PNG en silencio, y un PNG de
  // una foto pesa más que el original. Si pasó, se cae a JPEG, que lo entiende
  // cualquier navegador que llegue hasta acá.
  if (!mejor || mejor.type !== 'image/webp') {
    mejor = await aBlob(lienzo, 'image/jpeg', 0.75)
  }
  if (!mejor) throw new ErrorArchivo('No se pudo comprimir la foto.')

  const ext = mejor.type === 'image/webp' ? 'webp' : 'jpg'
  const base = archivo.name.replace(/\.[^.]+$/, '') || 'foto'
  return {
    archivo: new File([mejor], `${base}.${ext}`, { type: mejor.type }),
    ancho,
    alto,
  }
}

// ── Video ─────────────────────────────────────────────────────────────────

/** Qué pasa y cómo se arregla, con el peso real adentro. */
export function revisarVideo(archivo: File): string | null {
  const tipoOk =
    TIPOS_VIDEO.includes(archivo.type) || /\.(mp4|webm|mov)$/i.test(archivo.name)
  if (!tipoOk) {
    return `«${archivo.name}» no es un video que el sitio pueda reproducir. Tiene que ser mp4, webm o mov.`
  }
  if (archivo.size > MAX_VIDEO_BYTES) {
    return `El video pesa ${pesoLegible(archivo.size)} y el máximo es ${pesoLegible(
      MAX_VIDEO_BYTES,
    )}. Probá con un clip más corto o grabalo en 720p.`
  }
  return null
}

const ESPERA_POSTER_MS = 8000

function esperar(video: HTMLVideoElement, evento: string): Promise<void> {
  return new Promise((res, rej) => {
    const reloj = setTimeout(() => rej(new Error('tardó demasiado')), ESPERA_POSTER_MS)
    video.addEventListener(
      evento,
      () => {
        clearTimeout(reloj)
        res()
      },
      { once: true },
    )
    video.addEventListener(
      'error',
      () => {
        clearTimeout(reloj)
        rej(new Error('no se pudo decodificar'))
      },
      { once: true },
    )
  })
}

/**
 * Un frame del video, como imagen de portada.
 *
 * El video de la ficha va con `preload="none"`, así que hasta que el visitante
 * lo pide, el póster ES el video: sin él queda un rectángulo negro.
 *
 * DEVUELVE `undefined` EN VEZ DE FALLAR. Un códec que este navegador no
 * decodifica es motivo para quedarse sin póster —el repositorio se cae a la
 * foto de portada— pero no para perder el video que la dueña ya eligió.
 *
 * El frame no se toma en 0: el primer cuadro de un clip grabado a mano suele
 * ser el piso o el borroneo del arranque.
 */
export async function posterDeVideo(archivo: File): Promise<File | undefined> {
  const url = URL.createObjectURL(archivo)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'metadata'
  video.src = url

  try {
    await esperar(video, 'loadedmetadata')
    const dur = Number.isFinite(video.duration) ? video.duration : 0
    video.currentTime = dur > 2 ? Math.min(1, dur * 0.1) : 0
    await esperar(video, 'seeked')

    const lado = Math.max(video.videoWidth, video.videoHeight)
    const escala = lado > 0 ? Math.min(1, 1280 / lado) : 1
    const lienzo = document.createElement('canvas')
    lienzo.width = Math.round(video.videoWidth * escala) || 1280
    lienzo.height = Math.round(video.videoHeight * escala) || 720
    const ctx = lienzo.getContext('2d')
    if (!ctx) return undefined
    ctx.drawImage(video, 0, 0, lienzo.width, lienzo.height)

    const blob =
      (await aBlob(lienzo, 'image/webp', 0.8)) ??
      (await aBlob(lienzo, 'image/jpeg', 0.8))
    if (!blob) return undefined

    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
    return new File([blob], `poster.${ext}`, { type: blob.type })
  } catch {
    return undefined
  } finally {
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  }
}
