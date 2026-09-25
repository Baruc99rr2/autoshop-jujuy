import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from '../lib/motion-prefs'
import { valorContador } from '../types/contenido'
import type { Seccion } from '../data/nav'
import type { Contadores as DatosContadores } from '../types/contenido'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const FORMATO = new Intl.NumberFormat('es-AR')

/**
 * Separadores verticales de 1px, por posición.
 *
 * En 2×2 la única divisoria vertical es la del medio, así que la regla no
 * puede ser "todas menos la primera": depende de la columna, que cambia con el
 * breakpoint. Se escribe celda por celda para no apilar clases de Tailwind que
 * se contradigan (`md:border-l` junto a `md:border-l-0` deja el resultado a
 * merced del orden en que Tailwind emita las reglas, no del orden del
 * atributo).
 */
const CELDA = [
  '',
  'border-l border-void/20 pl-5 md:pl-8',
  'md:border-l md:border-void/20 md:pl-8',
  'border-l border-void/20 pl-5 md:pl-8',
]

/**
 * Franja ámbar a sangre con las cuatro cifras.
 *
 * Es la única sección del sitio sin titular: la franja ES el contenido, y un
 * eyebrow más un titular arriba le sacarían el golpe de color entre el hero
 * negro y la sección que sigue. El riel igual la numera, como a todas.
 *
 * El bloque entero tiene que entrar en pantalla de una: el efecto es ver las
 * cuatro cifras subir **al mismo tiempo**. Por eso la franja es baja y en
 * mobile va 2×2 y no en una columna.
 *
 * Las cifras vienen del repositorio (las edita la dueña en el panel). Mientras
 * llegan, la franja se dibuja igual y vacía: el riel y el header la buscan por
 * id desde el primer render, y el conteo arranca recién cuando hay cifras.
 */
export function Contadores({
  s,
  datos,
}: {
  /** La sección tal como la numeró `seccionesVisibles`: índice y eyebrow. */
  s: Seccion
  datos: DatosContadores | null
}) {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const el = root.current
      if (!el) return

      const cifras = Array.from(
        el.querySelectorAll<HTMLElement>('[data-cifra]'),
      )
      const sufijos = Array.from(
        el.querySelectorAll<HTMLElement>('[data-sufijo]'),
      )
      if (cifras.length === 0) return

      const objetivo = (i: number) => Number(cifras[i].dataset.cifra)

      // Con reduced-motion el cambio de estado sigue siendo visible: las cifras
      // están, simplemente no cuentan.
      if (prefersReducedMotion()) {
        cifras.forEach((c, i) => {
          c.textContent = FORMATO.format(objetivo(i))
        })
        gsap.set(sufijos, { autoAlpha: 1 })
        return
      }

      // Un solo tween para las cuatro. Con un ScrollTrigger por cifra, las de
      // la derecha podrían arrancar un poco después y se perdería el arranque
      // simultáneo, que es todo el efecto.
      const n = cifras.map(() => ({ v: 0 }))

      gsap.to(n, {
        v: (i: number) => objetivo(i),
        duration: 1.8,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 78%', once: true },
        onUpdate() {
          cifras.forEach((c, i) => {
            c.textContent = FORMATO.format(Math.round(n[i].v))
          })
        },
        // El sufijo entra al final con un corte seco: aparece, no se desvanece.
        onComplete: () => gsap.set(sufijos, { autoAlpha: 1 }),
      })
    },
    // Se rearma si cambian las cifras: la primera pasada corre sin datos.
    { scope: root, dependencies: [datos], revertOnUpdate: true },
  )

  return (
    <section
      ref={root}
      id="contadores"
      className="bg-amber py-14 text-void md:py-16"
      /* La franja sangra hasta el borde derecho pero ARRANCA en el riel.
         Si pasara por debajo, el `02` ámbar del riel quedaría ámbar sobre
         ámbar —invisible— y el nombre de la sección, gris claro sobre ámbar.
         Cortarla en el riel además refuerza lo que el riel es: el único
         elemento que no cambia en toda la página. */
      style={{ marginInlineStart: 'var(--rail-w)' }}
    >
      {/* ── Eyebrow ────────────────────────────────────────────────
          Es la única sección sin titular, y por eso era la única cuyo
          número no aparecía en un celular: ahí el riel es solo una línea y
          el número de cada sección lo pone su eyebrow. Va también en
          desktop, aunque ahí el riel ya lo dice al costado: todas las
          demás secciones llevan eyebrow en los dos tamaños, y esta sin él
          se leía como un adorno entre secciones y no como la 02.

          Mismo molde que el de `SectionHeader`, en negro: el índice va en
          negro pleno porque el ámbar sobre ámbar no existe. */}
      <p
        className="font-hud mb-10 flex items-center gap-2 text-void/60 md:mb-12"
        style={{ paddingInline: 'var(--shell-pad)' }}
      >
        <span aria-hidden="true" className="md:hidden">
          \
        </span>
        <span className="num text-void">{s.indice}</span>
        <span aria-hidden="true">—</span>
        <span>{s.eyebrow}</span>
      </p>

      <dl
        className="grid grid-cols-2 gap-y-10 md:grid-cols-4 md:gap-y-0"
        /* Solo el padding del shell: el hueco del riel ya lo puso el margen,
           así que las cifras siguen alineadas con el resto de la página. */
        style={{ paddingInline: 'var(--shell-pad)' }}
      >
        {datos?.lista.map((c, i) => (
          // column-reverse: en el DOM va primero el término y después la cifra
          // —así el lector de pantalla lee "Unidades entregadas: 500"— pero en
          // pantalla la cifra va arriba. El `gap` no depende de la dirección,
          // que es lo que hace que esto no se complique.
          <div
            key={c.id}
            className={`flex flex-col-reverse gap-4 pr-4 md:pr-6 ${CELDA[i] ?? ''}`}
          >
            <dt className="font-hud text-void/65">{c.etiqueta}</dt>

            <dd className="num flex items-baseline font-bold text-void">
              <span
                data-cifra={valorContador(c, datos.apertura)}
                className="text-[clamp(2.75rem,7vw,4.5rem)] leading-none"
              >
                0
              </span>
              {c.sufijo && (
                <span
                  data-sufijo="true"
                  className="invisible text-[clamp(1.5rem,3.5vw,2.25rem)] leading-none"
                >
                  {c.sufijo}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export default Contadores
