import { useEffect, useRef, useState } from 'react'
import SectionHeader from './SectionHeader'
import { MARCAS } from '../data/marcas'

/**
 * Listado tipográfico de marcas. Sin logos: ver `src/data/marcas.ts`.
 *
 * En reposo los nombres van en `--color-graphite`, casi fundidos con el negro.
 * Se encienden en ámbar con una micro-distorsión de 90 ms — dos copias
 * desplazadas 2px en direcciones opuestas — y después se asientan. Corto y
 * seco: no es un glitch continuo.
 *
 * El encendido tiene DOS disparadores:
 *
 * 1. Hover y foco de teclado, en cualquier dispositivo con puntero.
 * 2. **Pasar por la línea central del viewport**, en todos los dispositivos y
 *    no solo en mobile. Con los nombres casi invisibles en reposo, dejar el
 *    encendido atado únicamente al hover haría que en desktop la sección se
 *    leyera como un bloque vacío hasta que alguien mueva el mouse por arriba.
 *    Al scrollear, las marcas se encienden de a una: se lee como una luz que
 *    recorre la lista, y es el mismo gesto de barrido del resto del sitio.
 */
export function Marcas() {
  const lista = useRef<HTMLUListElement>(null)
  const [enLinea, setEnLinea] = useState<string | null>(null)

  useEffect(() => {
    const el = lista.current
    if (!el) return
    const filas = Array.from(el.querySelectorAll<HTMLElement>('[data-marca-id]'))
    if (filas.length === 0) return

    // rootMargin -50%/-50% deja una franja de observación de altura cero: la
    // línea central exacta del viewport. Así hay una sola marca encendida a la
    // vez sin tener que comparar distancias a mano en cada scroll.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.marcaId
          if (!id) continue
          if (e.isIntersecting) setEnLinea(id)
          else setEnLinea((actual) => (actual === id ? null : actual))
        }
      },
      { rootMargin: '-50% 0px -50% 0px', threshold: 0 },
    )
    filas.forEach((f) => io.observe(f))
    return () => io.disconnect()
  }, [])

  return (
    <section
      id="marcas"
      className="border-b border-graphite/60 py-24 shell md:py-32"
    >
      <SectionHeader
        index="07"
        eyebrow="MARCAS"
        title="Trabajamos con"
        lead="Doce marcas pasan por el salón. Estas son las ocho que más entregamos, entre 0km y usados seleccionados."
      />

      <ul ref={lista} className="mt-16 md:mt-20">
        {MARCAS.map((m) => (
          <li key={m.id}>
            <span
              data-marca-id={m.id}
              data-marca={m.nombre}
              data-encendida={enLinea === m.id ? 'true' : undefined}
              className="marca font-hero block text-[clamp(1.9rem,8.5vw,6.5rem)] leading-[1.02]"
            >
              {m.nombre}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default Marcas
