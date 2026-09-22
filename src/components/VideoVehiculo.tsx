import { useState } from 'react'
import Bevel from './Bevel'
import Icono from './Icono'
import type { Video } from '../types/vehiculo'

/**
 * El video de una unidad: póster y botón de play, y nada más hasta que alguien
 * lo pida.
 *
 * EL VIDEO NO ESTÁ EN EL DOM antes del click. `preload="none"` evita que el
 * navegador baje la metadata, pero no evita la conexión ni el pedido; con el
 * elemento sin montar no hay nada que pedir. Son varios megas que no se bajan
 * en una ficha que casi siempre se abre desde un link de WhatsApp con datos
 * móviles, y el plan del hosting es el gratuito: el ancho de banda se paga en
 * cuota agotada.
 *
 * Después del click sí lleva `autoPlay`: el click ES el pedido de reproducir.
 * Lo que la ficha no hace es arrancar sola.
 */
export function VideoVehiculo({ video, titulo }: { video: Video; titulo: string }) {
  const [reproduciendo, setReproduciendo] = useState(false)

  return (
    <Bevel
      variant="outline"
      bevel={16}
      borderClassName="bg-graphite"
      /* La proporción va en el contenedor EXTERIOR: el hijo de la variante
         `outline` ya lleva `h-full`, y las dos cosas juntas en el mismo
         elemento dejan la altura a merced del navegador. */
      outerClassName="block aspect-video"
      className="relative overflow-hidden p-0"
    >
      {reproduciendo ? (
        <video
          src={video.url}
          poster={video.posterUrl}
          controls
          autoPlay
          playsInline
          preload="none"
          className="absolute inset-0 h-full w-full bg-void object-contain"
        />
      ) : (
        <button
          type="button"
          onClick={() => setReproduciendo(true)}
          /* El `aria-label` reemplaza al contenido: sin él, un lector de
             pantalla anuncia "ver el video" sin decir de qué auto, y en la
             ficha hay más de un botón que empieza igual. */
          aria-label={`Ver el video de ${titulo}`}
          className="video-play absolute inset-0 grid h-full w-full place-items-center"
        >
          {/* El póster va como <img> y no como `background-image`: así lleva
              `loading="lazy"` y el navegador puede elegir no bajarlo si el
              bloque quedó abajo del pliegue.

              Las medidas son las de un 16:9 y no las del archivo: el modelo
              guarda el póster sin dimensiones. No hay salto de layout igual,
              porque la caja ya está reservada por el `aspect-video` del
              contenedor; el atributo está para que el navegador sepa la
              proporción mientras la imagen viaja. */}
          <img
            src={video.posterUrl}
            alt=""
            width={1280}
            height={720}
            loading="lazy"
            decoding="async"
            className="video-poster absolute inset-0 h-full w-full object-cover"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-void/45 transition-colors duration-300"
          />

          <Bevel
            variant="solid"
            bevel={12}
            className="font-hud relative flex items-center gap-3 px-5 py-3.5"
          >
            <Icono name="play" size={20} className="shrink-0" />
            VER EL VIDEO
          </Bevel>
        </button>
      )}
    </Bevel>
  )
}

export default VideoVehiculo
