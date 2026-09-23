import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useMedia } from '../lib/use-media'
import type { Video } from '../types/vehiculo'

/**
 * El video de una unidad.
 *
 * EN REPOSO ES UNA FOTO, no un reproductor: el póster dentro del bisel de
 * siempre, con el nombre del auto debajo. Con la intención —pasar el cursor en
 * escritorio, el primer toque en un teléfono— la caja se comprime, la foto se
 * funde con el video, el bisel se abre a una figura con las cuatro esquinas
 * cortadas y aparecen las marcas de encuadre. Se lee como un visor que enfoca.
 * Al salir vuelve todo a la foto y el video se pausa.
 *
 * ── POR QUÉ NO HAY BOTÓN DE PLAY ────────────────────────────────────────
 *
 * Porque el video no es la atracción: es una toma corta de la unidad que ya se
 * está mirando. Un reproductor con controles pide una decisión —darle play,
 * esperar, volver— y esto no. Se muestra solo mientras el interés dura, en
 * silencio y en bucle, y recién si alguien lo quiere de verdad pasa a pantalla
 * completa con sonido: un click en escritorio, un segundo toque en mobile.
 *
 * ── EL VIDEO NO EXISTE HASTA LA INTENCIÓN ───────────────────────────────
 *
 * `preload="none"` evita que el navegador baje la metadata, pero no evita la
 * conexión ni el pedido; con el elemento sin montar no hay nada que pedir. Son
 * varios megas que no se bajan en una ficha que casi siempre se abre desde un
 * link de WhatsApp con datos móviles, y el plan del hosting es el gratuito: el
 * ancho de banda se paga en cuota agotada.
 *
 * Por eso hay TRES estados y no uno. `montado` es "el elemento existe";
 * `activo` es "la caja se comprimió y cambió de forma", y pasa en el acto con
 * la intención; `listo` es "el video ya tiene un cuadro" y es lo único que
 * dispara el fundido. Sin esa separación, la forma esperaría a la red y el
 * gesto llegaría tarde, o el fundido entraría en un rectángulo negro.
 */

/** Sólo donde hay puntero fino. En táctil el hover no es un estado, es un tap. */
const PUNTERO_FINO = '(hover: hover) and (pointer: fine)'

/** El bisel de reposo y el corte del visor, en px. Ver el CSS de `.vv-forma`. */
const FORMA = { '--b': '16px', '--c': '34px' } as CSSProperties
const FORMA_INTERIOR = { '--b': '15px', '--c': '33px' } as CSSProperties

export function VideoVehiculo({
  video,
  titulo,
}: {
  video: Video
  titulo: string
}) {
  const fino = useMedia(PUNTERO_FINO)

  const [montado, setMontado] = useState(false)
  const [activo, setActivo] = useState(false)
  const [listo, setListo] = useState(false)
  /** A pantalla completa: con sonido, con controles y sin bucle. */
  const [expandido, setExpandido] = useState(false)

  const ref = useRef<HTMLVideoElement>(null)

  const entrar = useCallback(() => {
    setMontado(true)
    setActivo(true)
  }, [])

  const salir = useCallback(() => {
    // `listo` NO se apaga: el video ya está descargado y el elemento sigue
    // montado, así que al volver a entrar el fundido es inmediato en vez de
    // repetir la espera de red.
    setActivo(false)
  }, [])

  // Reproducir y pausar según el estado, no en los manejadores: el elemento
  // puede no existir todavía cuando llega la intención, y acá el efecto corre
  // también en el render en el que recién se montó.
  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (activo || expandido) v.play().catch(() => {})
    else v.pause()
  }, [activo, expandido, montado])

  // Al salir de pantalla completa se vuelve al teaser: en silencio, en bucle y
  // sin controles. Sin esto, el video se queda con sonido dentro de la ficha.
  useEffect(() => {
    if (!expandido) return
    const alCambiar = () => {
      if (document.fullscreenElement) return
      setExpandido(false)
    }
    document.addEventListener('fullscreenchange', alCambiar)
    const v = ref.current
    v?.addEventListener('webkitendfullscreen', alCambiar)
    return () => {
      document.removeEventListener('fullscreenchange', alCambiar)
      v?.removeEventListener('webkitendfullscreen', alCambiar)
    }
  }, [expandido])

  /**
   * El click.
   *
   * En escritorio el cursor ya activó el efecto, así que el click va derecho a
   * pantalla completa. En un teléfono no hay hover: el PRIMER toque es el que
   * activa —ese es el `if` de abajo— y el segundo expande.
   */
  const alHacerClick = () => {
    if (!activo) {
      entrar()
      return
    }
    const v = ref.current
    if (!v) return
    // El `muted` se apaga acá Y en el estado. Acá porque el permiso de
    // reproducir con sonido se gasta en el gesto que lo pidió, y esperar al
    // re-render de React lo saca de ese gesto; en el estado para que React no
    // lo pise en el próximo render.
    v.muted = false
    setExpandido(true)
    const pedir = v.requestFullscreen?.bind(v)
    if (pedir) pedir().catch(() => {})
    else
      (v as HTMLVideoElement & { webkitEnterFullscreen?: () => void })
        .webkitEnterFullscreen?.()
    v.play().catch(() => {})
  }

  const pista = !fino
    ? activo
      ? 'Tocá de nuevo para verlo a pantalla completa'
      : 'Tocá para ver el video'
    : 'Pasá el cursor · click para pantalla completa'

  return (
    <div className="vv" data-activo={activo}>
      <div className="relative">
        <button
          type="button"
          className="vv-caja"
          /* El hover no cuenta en táctil: ahí el gesto es el toque, y un
             `pointerenter` de tipo touch llegaría antes del click y se comería
             el primer toque. */
          onPointerEnter={(e) => {
            if (e.pointerType !== 'touch') entrar()
          }}
          onPointerLeave={salir}
          /* Solo el foco DE TECLADO activa. Un `onFocus` suelto también se
             dispara al tocar la pantalla —el toque enfoca el botón antes del
             click—, y entonces el primer toque activaría y expandiría de una. */
          onFocus={(e) => {
            if (e.currentTarget.matches(':focus-visible')) entrar()
          }}
          onBlur={salir}
          onClick={alHacerClick}
          /* El `aria-label` reemplaza al contenido: sin él, un lector de
             pantalla anuncia "ver el video" sin decir de qué auto, y en la
             ficha hay más de un botón que empieza igual. */
          aria-label={`Ver el video de ${titulo} a pantalla completa`}
        >
          {/* Las dos capas del borde, como en `Bevel`: la de afuera es el
              color del borde con 1px de padding y la de adentro la superficie.
              No se usa `Bevel` porque acá la forma CAMBIA, y el componente
              dibuja una sola. */}
          <span
            className="vv-forma block bg-graphite p-px"
            style={FORMA}
            aria-hidden="true"
          >
            <span
              className="vv-forma relative block aspect-video overflow-hidden bg-void"
              style={FORMA_INTERIOR}
            >
              {/* El póster va como <img> y no como `background-image`: así
                  lleva `loading="lazy"` y el navegador puede elegir no bajarlo
                  si el bloque quedó abajo del pliegue.

                  Las medidas son las de un 16:9 y no las del archivo: el modelo
                  guarda el póster sin dimensiones. No hay salto de layout
                  igual, porque la caja ya está reservada por el `aspect-video`;
                  el atributo está para que el navegador sepa la proporción
                  mientras la imagen viaja. */}
              <img
                src={video.posterUrl}
                alt=""
                width={1280}
                height={720}
                loading="lazy"
                decoding="async"
                className="vv-capa absolute inset-0 h-full w-full object-cover"
                style={{ opacity: activo && listo ? 0 : 1 }}
              />

              {montado && (
                <video
                  ref={ref}
                  src={video.url}
                  poster={video.posterUrl}
                  muted={!expandido}
                  loop={!expandido}
                  controls={expandido}
                  playsInline
                  preload="none"
                  onLoadedData={() => setListo(true)}
                  className="vv-capa absolute inset-0 h-full w-full bg-void object-cover"
                  style={{ opacity: activo && listo ? 1 : 0 }}
                />
              )}

              {/* El velo se retira con el efecto: en reposo baja la foto para
                  que el bloque no compita con la galería de arriba, y una vez
                  adentro estorba. */}
              <span
                aria-hidden="true"
                className="vv-capa absolute inset-0 bg-void/35"
                style={{ opacity: activo ? 0 : 1 }}
              />
            </span>
          </span>
        </button>

        {/* Las cuatro marcas de encuadre. Van en el marco y no en la caja, que
            es lo que las deja AFUERA cuando la caja se comprime. */}
        <span aria-hidden="true" className="vv-marca vv-marca-ai" />
        <span aria-hidden="true" className="vv-marca vv-marca-ad" />
        <span aria-hidden="true" className="vv-marca vv-marca-bi" />
        <span aria-hidden="true" className="vv-marca vv-marca-bd" />
      </div>

      <p className="mt-4 flex flex-wrap items-baseline gap-x-3">
        <span className="font-display text-lg text-bone">{titulo}</span>
        <span className="font-hud text-bone/40">{pista}</span>
      </p>
    </div>
  )
}

export default VideoVehiculo
