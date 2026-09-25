import { useState } from 'react'
import Bevel from './Bevel'
import type { Etiqueta, Foto } from '../types/vehiculo'

/**
 * Las etiquetas de una unidad: lo que la dueña quiere destacar, en grilla.
 *
 * El fondo NO es una imagen propia de la etiqueta: es una de las fotos del
 * mismo auto, elegida por id (ver `Etiqueta` en `types/vehiculo.ts`). Por eso
 * este componente recibe también las fotos y resuelve la referencia acá: si
 * una etiqueta apunta a una foto que se borró, queda con fondo liso y no rota.
 *
 * El efecto es el barrido ámbar de izquierda a derecha de post-venta y de la
 * FAQ, más un acercamiento corto de la foto. No se reinventa: es el gesto
 * compartido del sitio.
 */

type EtiquetasProps = {
  etiquetas: Etiqueta[]
  fotos: Foto[]
}

export function EtiquetasVehiculo({ etiquetas, fotos }: EtiquetasProps) {
  /**
   * Cuál está encendida por TAP.
   *
   * En un teléfono no hay hover, así que sin esto el barrido no existiría en
   * el dispositivo donde se va a ver el sitio casi siempre. Solo reacciona a
   * `pointerType === 'touch'`: con mouse manda el `:hover` del CSS, y mezclar
   * los dos deja una etiqueta encendida después de un click.
   *
   * El contenido de la etiqueta se lee igual sin encenderla: el barrido no
   * revela nada, así que nada depende del gesto.
   */
  const [encendida, setEncendida] = useState<string | null>(null)

  const porId = new Map(fotos.map((f) => [f.id, f]))
  const ordenadas = [...etiquetas].sort((a, b) => a.orden - b.orden)

  return (
    <ul className="mt-8 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3">
      {ordenadas.map((e) => {
        const foto = e.fotoFondoId ? porId.get(e.fotoFondoId) : undefined

        return (
          <Bevel
            key={e.id}
            as="li"
            variant="outline"
            bevel={16}
            borderClassName="bg-graphite"
            outerClassName="etq-host block h-full transition-colors duration-300 hover:bg-amber focus-within:bg-amber"
            className="etq flex min-h-44 flex-col justify-end p-4 md:min-h-52 md:p-6"
            data-activo={encendida === e.id}
            onPointerDown={(ev: React.PointerEvent) => {
              if (ev.pointerType !== 'touch') return
              setEncendida((a) => (a === e.id ? null : e.id))
            }}
          >
            {/* Sin foto elegida no se dibuja nada: el fondo asphalt que ya
                trae la variante `outline` del bisel ES el estado sin foto. */}
            {foto && (
              <>
                <img
                  src={foto.url}
                  alt=""
                  width={foto.ancho}
                  height={foto.alto}
                  loading="lazy"
                  decoding="async"
                  className="etq-foto"
                />
                {/* El velo. Sin él, un texto blanco sobre una foto de un auto
                    claro desaparece; y el degradado deja la parte de arriba de
                    la foto más limpia, que es donde se ve el auto. */}
                <span aria-hidden="true" className="etq-velo" />
              </>
            )}
            <span aria-hidden="true" className="etq-barrido" />

            <h3 className="font-display text-lg md:text-xl">{e.titulo}</h3>
            <p className="mt-2 text-sm/6 opacity-75">{e.texto}</p>
          </Bevel>
        )
      })}
    </ul>
  )
}

export default EtiquetasVehiculo
