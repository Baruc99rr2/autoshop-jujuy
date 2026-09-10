import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import Bevel from './Bevel'
import { CTA, VIDEO_CTA } from '../data/cta'
import { seccion } from '../data/nav'
import { prefersReducedMotion } from '../lib/motion-prefs'
import { scrollTo } from '../lib/smooth'

const S = seccion('cta')

/**
 * CTA con el video adentro de las letras.
 *
 * CÓMO SE HACE, Y POR QUÉ NO ES `background-clip: text`.
 * Un `background` de CSS no puede ser un `<video>`: acepta imágenes, degradados
 * y poco más, así que `background-clip: text` sobre un contenedor con un video
 * detrás no rellena nada — recorta el fondo del contenedor, que está vacío.
 *
 * Las dos técnicas que sí funcionan son una máscara SVG con `<text>` y el
 * modo de fusión. Acá va **`mix-blend-mode: multiply`**: encima del video se
 * pone un panel NEGRO con el titular en BLANCO. Multiplicar por 0 da negro
 * —el panel tapa— y multiplicar por 1 deja pasar el video: las letras quedan
 * caladas. Es una regla de CSS contra un `<text>` de SVG que habría que
 * dimensionar a mano y que no hereda el eje `wdth` de Archivo, que es la firma
 * tipográfica del sitio.
 *
 * El riesgo de esta técnica es que falla en silencio: si el blend no se aplica,
 * se ve un titular blanco sobre negro y parece a propósito. Por eso el arnés
 * muestrea el color de los píxeles DENTRO de las letras en dos tiempos
 * distintos del video: si son iguales, no hay video adentro.
 */
export function Cta() {
  const flotar = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion() || !flotar.current) return
      // Movimiento muy leve y continuo. Si se nota, está de más: son 6 px en
      // 4 segundos, con las líneas desfasadas para que el bloque respire en
      // vez de subir y bajar en bloque.
      gsap.to('.cta-linea', {
        y: -6,
        duration: 4,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        stagger: 0.35,
      })
    },
    { scope: flotar },
  )

  const salto = (href: string) => (e: React.MouseEvent) => {
    if (href.startsWith('#')) {
      e.preventDefault()
      scrollTo(href)
    }
  }

  return (
    <section
      id={S.id}
      className="border-b border-graphite/60 py-20 md:py-28"
    >
      <div className="shell">
        <p className="font-hud mb-8 flex items-center gap-2 text-bone/45">
          <span aria-hidden="true" className="text-amber md:hidden">
            \
          </span>
          <span className="num text-amber">{S.indice}</span>
          <span aria-hidden="true">—</span>
          <span>{S.eyebrow}</span>
        </p>

        {/* Caja centrada, no a pantalla completa. Es la única cosa centrada del
            sitio junto con el logo del intro y la barra MENU. */}
        <Bevel
          variant="outline"
          bevel={22}
          outerClassName="mx-auto block max-w-4xl"
          className="p-0"
        >
          <div className="cta-caja relative isolate overflow-hidden bg-void">
            <video
              className="absolute inset-0 h-full w-full object-cover"
              src={VIDEO_CTA.src}
              width={VIDEO_CTA.ancho}
              height={VIDEO_CTA.alto}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden="true"
            />

            {/* PISO DE LUMINANCIA.
                El calado solo se ve donde el video es claro: donde el clip es
                oscuro, la letra queda negra sobre negro y desaparece. Pasó con
                la última línea, que cae justo sobre la parte más oscura del
                encuadre. Esta capa levanta los negros del video antes de que
                lo multiplique la máscara, así que ninguna letra puede quedar
                por debajo de este gris. Va acá y no como `filter` en el video
                porque un `brightness()` sube TODO y quema el cielo nevado, que
                es lo que hace reconocible al clip. */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-bone/30"
            />

            {/* El panel del calado. Negro sobre el video, texto blanco puro.
                `multiply` deja pasar el video solo por las letras. */}
            <div className="cta-mascara relative flex min-h-[46svh] flex-col justify-center px-6 py-16 md:min-h-[54svh] md:px-14">
              <h2 ref={flotar} className="font-hero text-h1 leading-[0.92]">
                {CTA.titulo.map((linea) => (
                  <span key={linea} className="cta-linea block">
                    {linea}
                  </span>
                ))}
              </h2>
            </div>

            {/* La bajada y los botones van FUERA del panel de multiply: si
                estuvieran adentro, el texto de cuerpo también se calaría y
                sobre un video en movimiento un párrafo calado es ilegible. */}
            <div className="relative border-t border-graphite bg-void px-6 py-8 md:px-14">
              <p className="max-w-[52ch] text-body text-bone/70">{CTA.bajada}</p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Bevel
                  as="a"
                  variant="solid"
                  bevel={12}
                  href={CTA.primaria.href}
                  onClick={salto(CTA.primaria.href)}
                  className="font-hud px-6 py-4 transition-transform duration-200 hover:-translate-y-0.5"
                >
                  {CTA.primaria.label.toUpperCase()}
                </Bevel>

                <Bevel
                  as="a"
                  variant="outline"
                  bevel={12}
                  href={CTA.secundaria.href}
                  target="_blank"
                  rel="noreferrer"
                  outerClassName="block transition-colors duration-200 hover:bg-amber"
                  className="font-hud px-6 py-4 text-bone"
                >
                  {CTA.secundaria.label.toUpperCase()}
                </Bevel>
              </div>
            </div>
          </div>
        </Bevel>
      </div>
    </section>
  )
}

export default Cta
