import { useId, useRef, useState } from 'react'
import Bevel from '../Bevel'
import { BotonChico, Seccion } from './Campos'
import Dialogo from './Dialogo'
import { repo } from '../../data/repo'
import {
  MAX_VIDEO_BYTES,
  pesoLegible,
  posterDeVideo,
  revisarVideo,
  TIPOS_VIDEO,
} from '../../lib/archivos'
import type { Video } from '../../types/vehiculo'

/**
 * El video de una unidad. Uno solo.
 *
 * NO SE COMPRIME. Recodificar video en el navegador significa traerse un
 * transcodificador de varios megas para que después tarde minutos con el
 * teléfono caliente, y para la mitad de los clips el resultado pesa más. Lo
 * que se hace en su lugar es RECHAZAR lo que no sirve y decir cómo arreglarlo:
 * el mensaje nombra el peso real del archivo y sugiere grabar en 720p, que es
 * un cambio de dos toques en la cámara y la única solución que no depende de
 * nosotros.
 *
 * El póster se saca acá, de un frame: el video de la ficha va con
 * `preload="none"`, así que hasta que el visitante lo pide, la imagen ES el
 * video.
 */

type VideoProps = {
  vehiculoId: string
  video: Video | null
  onVideo: (video: Video | null) => void
  /** Para avisar que, sin póster propio, se cae a la portada de la unidad. */
  hayFotos: boolean
}

type Etapa = null | 'mirando' | 'guardando'

const ETIQUETA: Record<'mirando' | 'guardando', string> = {
  mirando: 'SACANDO LA PORTADA…',
  guardando: 'GUARDANDO EL VIDEO…',
}

export function VideoUnidad({ vehiculoId, video, onVideo, hayFotos }: VideoProps) {
  const uid = useId()
  const entrada = useRef<HTMLInputElement>(null)

  const [etapa, setEtapa] = useState<Etapa>(null)
  const [falla, setFalla] = useState<string | null>(null)
  /** El archivo que no llegó a subir, para reintentar sin volver a elegirlo. */
  const [fallido, setFallido] = useState<File | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)

  const ocupado = etapa !== null

  const elegir = async (archivo: File | undefined) => {
    setFalla(null)
    setFallido(null)
    setAviso(null)
    if (!archivo) return

    // Se revisa ANTES de leer un solo byte: un archivo de 300 MB no tiene que
    // pasar por el decodificador para que se le diga que no entra.
    const problema = revisarVideo(archivo)
    if (problema) {
      setFalla(problema)
      if (entrada.current) entrada.current.value = ''
      return
    }

    try {
      setEtapa('mirando')
      const poster = await posterDeVideo(archivo)
      setEtapa('guardando')
      onVideo(await repo.subirVideo(vehiculoId, archivo, poster))
      if (!poster) {
        setAviso(
          hayFotos
            ? 'No se pudo sacar un cuadro de este video, así que la portada del bloque es la primera foto de la unidad.'
            : 'No se pudo sacar un cuadro de este video. Subí una foto: la primera de la unidad se va a usar como portada del bloque.',
        )
      }
    } catch (err) {
      setFalla(err instanceof Error ? err.message : 'No se pudo subir el video.')
      setFallido(archivo)
    } finally {
      setEtapa(null)
      if (entrada.current) entrada.current.value = ''
    }
  }

  const quitar = async () => {
    setFalla(null)
    setAviso(null)
    try {
      await repo.eliminarVideo(vehiculoId)
      onVideo(null)
    } catch (err) {
      setFalla(err instanceof Error ? err.message : 'No se pudo quitar el video.')
    } finally {
      setConfirmando(false)
    }
  }

  return (
    <Seccion
      titulo="VIDEO"
      contador={video ? '1 / 1' : '0 / 1'}
      ayuda={
        <>
          Uno por unidad, de hasta {pesoLegible(MAX_VIDEO_BYTES)}. Una vuelta
          alrededor del auto y un arranque en frío alcanzan. Si no entra,
          grabalo en 720p.
        </>
      }
    >
      <input
        ref={entrada}
        id={`${uid}-video`}
        type="file"
        accept={`${TIPOS_VIDEO.join(',')},.mov`}
        disabled={ocupado}
        onChange={(e) => elegir(e.target.files?.[0])}
        className="sr-only"
      />

      {video && (
        <Bevel
          variant="outline"
          bevel={12}
          borderClassName="bg-graphite"
          outerClassName="adm-video mt-5 block"
          className="p-3"
        >
          {/* `preload="none"`, igual que en la ficha: el panel se abre en el
              celular de la dueña y con datos móviles. La portada alcanza para
              reconocer el clip; si quiere verlo, lo toca.

              CAJA DE ALTO FIJO Y `object-contain`. Los clips de un celular son
              verticales, y dejándolo crecer con su aspecto el reproductor medía
              una pantalla entera de 390 px: el peso, «cambiarlo» y «quitarlo»
              quedaban abajo del pliegue. Además el alto real no se sabe hasta
              que carguen los metadatos, y con `preload="none"` eso no pasa
              nunca, así que un alto automático sería un salto de layout. */}
          <video
            src={video.url}
            poster={video.posterUrl}
            controls
            playsInline
            preload="none"
            className="block h-[40svh] w-full bg-void object-contain"
          />

          <div className="mt-3 flex items-baseline justify-between gap-3">
            <p className="font-hud text-bone/45">EN LA FICHA</p>
            <p className="font-hud num shrink-0 text-bone/45">
              {pesoLegible(video.pesoBytes)}
            </p>
          </div>

          <div className="mt-3 flex gap-2">
            <Bevel
              as="label"
              htmlFor={`${uid}-video`}
              variant="outline"
              bevel={10}
              borderClassName="bg-graphite"
              outerClassName={`flex-1 ${
                ocupado ? 'opacity-60' : 'cursor-pointer transition-colors duration-200 hover:bg-amber'
              }`}
              className="font-hud flex min-h-[2.75rem] items-center justify-center px-3 text-bone"
            >
              CAMBIARLO
            </Bevel>
            <BotonChico
              tono="peligro"
              onClick={() => setConfirmando(true)}
              disabled={ocupado}
              className="flex-1"
            >
              QUITARLO
            </BotonChico>
          </div>
        </Bevel>
      )}

      {!video && (
        <Bevel
          as="label"
          htmlFor={`${uid}-video`}
          variant="outline"
          bevel={12}
          borderClassName="bg-amber"
          outerClassName={`mt-5 block ${ocupado ? 'opacity-60' : 'cursor-pointer'}`}
          className="font-hud flex min-h-[3.25rem] items-center justify-center gap-3 px-6 text-bone"
        >
          <span>{ocupado ? ETIQUETA[etapa] : 'SUBIR UN VIDEO'}</span>
          <span aria-hidden="true" className="text-amber">
            \
          </span>
        </Bevel>
      )}

      {ocupado && video && (
        <p className="font-hud mt-3 text-amber" aria-live="polite">
          {ETIQUETA[etapa]}
        </p>
      )}

      {falla && (
        <p role="alert" className="font-hud mt-4 flex gap-2 text-flag normal-case">
          <span aria-hidden="true">\</span>
          <span>{falla}</span>
        </p>
      )}

      {falla && fallido && !ocupado && (
        <BotonChico onClick={() => elegir(fallido)} className="mt-3 w-full">
          PROBAR DE NUEVO
        </BotonChico>
      )}

      {aviso && (
        <p className="font-hud mt-4 flex gap-2 text-bone/45 normal-case">
          <span aria-hidden="true" className="text-amber">
            \
          </span>
          <span>{aviso}</span>
        </p>
      )}

      <Dialogo
        abierto={confirmando}
        titulo="Vas a quitar el video"
        confirmar="Quitar el video"
        onConfirmar={quitar}
        cancelar="No, dejarlo"
        onCancelar={() => setConfirmando(false)}
        tono="peligro"
      >
        <p>
          El bloque de video desaparece de la ficha. Las fotos y el resto de la
          unidad quedan como están. Para volver atrás hay que subirlo de nuevo.
        </p>
      </Dialogo>
    </Seccion>
  )
}

export default VideoUnidad
