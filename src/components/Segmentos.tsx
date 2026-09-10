import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import SectionHeader from './SectionHeader'
import { SEGMENTOS } from '../data/segmentos'
import { seccion } from '../data/nav'
import { prefersReducedMotion } from '../lib/motion-prefs'
import { useMedia } from '../lib/use-media'

gsap.registerPlugin(ScrollTrigger)

const S = seccion('segmentos')

/**
 * Carrusel apilado.
 *
 * DESKTOP: sección pinneada. Izquierda la lista, derecha las imágenes apiladas
 * en absoluto. Cada imagen entrante sube y tapa a la anterior con
 * `clip-path: inset(100% 0 0 0)` → `inset(0)`. No es un fade: el fade dejaría
 * las dos imágenes visibles a la vez y con cuatro fotos oscuras eso se leería
 * como suciedad, no como transición.
 *
 * UN SOLO SCRUB CONTROLA LISTA E IMAGEN. Con dos animaciones separadas, en un
 * scroll rápido la lista y la imagen pueden llegar a estados distintos y
 * mostrar "Ruta" encendido sobre la foto de Aventura. Acá el progreso del
 * ScrollTrigger es la única fuente: de él salen el recorte de cada imagen y el
 * índice del ítem encendido.
 *
 * MOBILE: sin pin. El pin en mobile pelea con la barra de URL de Safari —el
 * viewport cambia de alto mientras se scrollea y el pin salta— así que va
 * scroll horizontal con `scroll-snap-type: x mandatory` y cards de 85vw.
 */
export function Segmentos() {
  const root = useRef<HTMLDivElement>(null)
  const [activo, setActivo] = useState(0)
  const esMobile = useMedia('(max-width: 767px)')

  // El pin se cae en dos casos, y los dos van al MISMO layout de riel.
  //
  // Con `prefers-reduced-motion` la primera versión se limitaba a no armar el
  // ScrollTrigger y dejaba el layout de desktop puesto: las cuatro imágenes
  // apiladas sin que nadie las recortara, o sea la última visible, con la
  // lista diciendo "Ciudad" al lado de la foto de "Escapada". Y sin scrub no
  // había forma de llegar a los otros tres segmentos: tres cuartos del
  // contenido de la sección, inalcanzables.
  //
  // El piso de calidad dice que con reduced-motion los cambios de estado
  // siguen siendo visibles, solo instantáneos. Un riel con las cuatro cards
  // cumple eso: está todo, y se llega scrolleando sin que nada se anime.
  const sinPin = esMobile || prefersReducedMotion()

  useGSAP(
    () => {
      if (sinPin || !root.current) return

      const imagenes = gsap.utils.toArray<HTMLElement>('.seg-img', root.current)
      if (imagenes.length < 2) return

      // Estado inicial: la primera visible, el resto recortadas desde abajo.
      gsap.set(imagenes.slice(1), { clipPath: 'inset(100% 0 0 0)' })
      gsap.set(imagenes[0], { clipPath: 'inset(0% 0 0 0)' })

      const pasos = imagenes.length - 1

      const st = ScrollTrigger.create({
        trigger: root.current,
        start: 'top top',
        end: () => `+=${pasos * window.innerHeight * 0.8}`,
        pin: true,
        scrub: 0.6,
        snap: { snapTo: 1 / pasos, duration: 0.3 },
        // will-change solo mientras el pin está activo, y se saca al salir:
        // dejarlo puesto mantiene cuatro capas promovidas a compositor durante
        // toda la visita.
        onToggle: (self) => {
          imagenes.forEach((el) => {
            el.style.willChange = self.isActive ? 'clip-path' : ''
          })
        },
        onUpdate: (self) => {
          // El progreso total se reparte entre los `pasos` tramos. `p` es el
          // avance dentro del tramo actual, entre 0 y 1.
          const total = self.progress * pasos
          const indice = Math.min(Math.floor(total), pasos - 1)
          const p = total - indice

          imagenes.forEach((el, i) => {
            if (i <= indice) {
              el.style.clipPath = 'inset(0% 0 0 0)'
            } else if (i === indice + 1) {
              el.style.clipPath = `inset(${(1 - p) * 100}% 0 0 0)`
            } else {
              el.style.clipPath = 'inset(100% 0 0 0)'
            }
          })

          // El ítem activo sale del MISMO progreso: la lista no tiene
          // animación propia, así que no puede desincronizarse de la imagen.
          setActivo(p > 0.5 ? indice + 1 : indice)
        },
      })

      // Gancho para el arnés, igual que `window.__introTl` en la intro
      // (decisión 26): sin poder leer `start`, `end` y `progress` del propio
      // ScrollTrigger no hay forma de distinguir "el carrusel está mal" de "la
      // medición está mal", y ya pasó una vez. Son dos líneas y no cambia nada
      // en runtime.
      ;(window as unknown as { __segST?: ScrollTrigger }).__segST = st

      // Las imágenes cambian el alto del contenedor al decodificarse y eso
      // corre el punto donde arranca el pin. Se refresca cuando terminan.
      const imgs = root.current.querySelectorAll('img')
      let pendientes = 0
      imgs.forEach((img) => {
        if (img.complete) return
        pendientes += 1
        img.addEventListener(
          'load',
          () => {
            pendientes -= 1
            if (pendientes === 0) ScrollTrigger.refresh()
          },
          { once: true },
        )
      })

      return () => st.kill()
    },
    { scope: root, dependencies: [sinPin] },
  )

  // ── SIN PIN: mobile, o desktop con reduced-motion ─────────────────
  if (sinPin) {
    return (
      <section id={S.id} className="border-b border-graphite/60 py-20">
        <div className="shell">
          <SectionHeader index={S.indice} eyebrow={S.eyebrow} title={S.titulo} />
        </div>

        <div className="seg-riel mt-10 flex gap-4 overflow-x-auto pb-4">
          {SEGMENTOS.map((s, i) => (
            <article
              key={s.nombre}
              className="seg-card w-[85vw] shrink-0 md:w-[46%] lg:w-[38%]"
            >
              <img
                src={s.imagen}
                alt={s.alt}
                width={s.ancho}
                height={s.alto}
                loading="lazy"
                decoding="async"
                // 4:5 en mobile, donde la card es angosta y el vertical
                // aprovecha la pantalla; 4:3 de md para arriba, donde la card
                // mide 547 px y un 4:5 la haría de 684 px de alto: el nombre
                // del segmento quedaría siempre debajo del pliegue.
                className="bevel aspect-4/5 w-full object-cover md:aspect-4/3"
                style={{ '--bevel': '16px' } as React.CSSProperties}
              />
              <div className="mt-4 flex items-baseline justify-between gap-4">
                <h3 className="font-display text-h2 text-bone">{s.nombre}</h3>
                <span className="font-hud num text-amber">
                  {String(i + 1).padStart(2, '0')} /{' '}
                  {String(SEGMENTOS.length).padStart(2, '0')}
                </span>
              </div>
              <p className="mt-2 text-bone/65">{s.copy}</p>
            </article>
          ))}
        </div>
      </section>
    )
  }

  // ── DESKTOP ───────────────────────────────────────────────────────
  return (
    <section id={S.id} className="border-b border-graphite/60">
      <div ref={root} className="flex min-h-svh items-center gap-12 py-20 shell">
        {/* Izquierda: titular + lista */}
        <div className="w-[46%] shrink-0">
          <SectionHeader index={S.indice} eyebrow={S.eyebrow} title={S.titulo} />

          <ul className="mt-10 border-t border-graphite">
            {SEGMENTOS.map((s, i) => (
              <li key={s.nombre} className="border-b border-graphite">
                <div
                  className="seg-item flex items-center justify-between gap-4 px-4 py-4"
                  data-activo={i === activo}
                >
                  <span className="font-display text-h2 leading-none">
                    {s.nombre}
                  </span>
                  <span className="font-hud shrink-0">{s.etiqueta}</span>
                </div>
              </li>
            ))}
          </ul>

          {/* Contador y copy del activo. Van juntos porque los dos responden al
              mismo índice: separarlos invitaría a desincronizarlos. */}
          <div className="mt-8 flex items-start gap-6">
            <span className="seg-contador font-hud num shrink-0 text-amber">
              {String(activo + 1).padStart(2, '0')} /{' '}
              {String(SEGMENTOS.length).padStart(2, '0')}
            </span>
            <p className="max-w-[46ch] text-bone/65">{SEGMENTOS[activo].copy}</p>
          </div>
        </div>

        {/* Derecha: las imágenes apiladas en absoluto */}
        {/* La caja lleva el bisel del sitio: es un contenedor como cualquier
            otro y con esquinas rectas quedaba como el único rectángulo puro de
            la página. Va sin borde ámbar —el panel del hero ya lo tiene y dos
            marcos encendidos compiten— así que se aplica la utilidad `.bevel`
            directamente en vez de <Bevel variant="outline">. */}
        <div
          className="bevel relative aspect-4/5 max-h-[76svh] flex-1 overflow-hidden"
          style={{ '--bevel': '20px' } as React.CSSProperties}
        >
          {SEGMENTOS.map((s) => (
            <img
              key={s.nombre}
              src={s.imagen}
              alt={s.alt}
              width={s.ancho}
              height={s.alto}
              // Las cuatro van lazy aunque estén apiladas: el navegador las
              // pide cuando la caja se acerca al viewport, o sea antes de que
              // arranque el pin, y no en la carga inicial de la página.
              loading="lazy"
              decoding="async"
              className="seg-img absolute inset-0 h-full w-full object-cover"
            />
          ))}

          {/* Viñeta suave, para que el borde de la caja no quede duro contra el
              negro y para asentar las cuatro fotos en la misma paleta. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 130% 90% at 50% 50%, transparent 45%, rgb(0 0 0 / .5) 100%)',
            }}
          />
        </div>
      </div>
    </section>
  )
}

export default Segmentos
