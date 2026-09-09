import { useId, useState } from 'react'
import SectionHeader from './SectionHeader'
import { FAQ } from '../data/faq'

/**
 * Preguntas frecuentes con el barrido izquierda→derecha.
 *
 * Fondo `--color-bone` con texto negro: es la segunda sección clara del sitio
 * (la otra es el menú) y funciona como respiro entre tanto negro.
 *
 * Una sola abierta a la vez. El estado guarda el id, no el índice, así que
 * reordenar `FAQ` no cambia cuál está abierta.
 */
export function Faq() {
  const [abierta, setAbierta] = useState<string | null>(FAQ[0].id)
  const uid = useId()

  return (
    <section
      id="preguntas"
      className="bg-bone py-24 shell md:py-32"
    >
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <SectionHeader
          index="08"
          eyebrow="PREGUNTAS"
          tone="light"
          title={
            <>
              Lo que todos
              <br />
              preguntan
              <br />
              antes de firmar
            </>
          }
          lead="Si tu duda no está acá, escribinos por WhatsApp y te contestamos el mismo día."
          className="lg:sticky lg:top-28 lg:self-start"
        />

        <ul className="lg:pt-2">
          {FAQ.map((item) => {
            const open = abierta === item.id
            const btnId = `${uid}-b-${item.id}`
            const panelId = `${uid}-p-${item.id}`

            return (
              <li key={item.id} className="faq-item bevel" data-open={open}>
                <h3>
                  <button
                    type="button"
                    id={btnId}
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setAbierta(open ? null : item.id)}
                    className="faq-button"
                  >
                    <span className="faq-q font-display text-h2">
                      {item.pregunta}
                    </span>
                    <span className="faq-icon bevel" aria-hidden="true">
                      +
                    </span>
                  </button>
                </h3>

                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  className="faq-panel"
                  aria-hidden={!open}
                >
                  {/* El hijo con overflow hidden es lo que hace funcionar el
                      truco de grid-template-rows: la fila pasa de 0fr a 1fr y
                      el contenido queda recortado mientras tanto. */}
                  <div className="min-h-0 overflow-hidden">
                    <p className="faq-a">{item.respuesta}</p>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

export default Faq
