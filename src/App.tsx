import { useEffect, useRef, useState } from 'react'
import Contacto from './components/Contacto'
import Cotizador from './components/Cotizador'
import Contadores from './components/Contadores'
import Faq from './components/Faq'
import Footer from './components/Footer'
import Header from './components/Header'
import Marcas from './components/Marcas'
import Simulador from './components/Simulador'
import Intro, { INTRO_SEEN_KEY } from './components/Intro'
import MeshOverlay from './components/MeshOverlay'
import Rail from './components/Rail'
import SectionHeader from './components/SectionHeader'
import { SECCIONES } from './data/nav'
import { prefersReducedMotion } from './lib/motion-prefs'

/**
 * Secciones que ya tienen componente propio. El resto todavía se dibuja como
 * placeholder, y el mapa de abajo las va reemplazando fase por fase.
 */
const IMPLEMENTADAS: Record<string, () => React.ReactElement> = {
  contacto: Contacto,
  contadores: Contadores,
  cotizador: Cotizador,
  marcas: Marcas,
  plan: Simulador,
  preguntas: Faq,
}

/**
 * La intro corre una sola vez por pestaña. Durante la demo el sitio se recarga
 * mucho y ver los 2.6 s en cada recarga cansa, así que sessionStorage la corta.
 *
 * Con prefers-reduced-motion no corre nunca: el logo aparece directo en el
 * header y el hero está visible desde el primer frame.
 */
function decidirIntro(): boolean {
  if (typeof window === 'undefined') return false
  if (prefersReducedMotion()) return false
  try {
    return sessionStorage.getItem(INTRO_SEEN_KEY) !== '1'
  } catch {
    return true
  }
}

function App() {
  // useState con inicializador perezoso: la decisión se toma antes de la
  // primera pintura, así no hay un frame de hero visible antes de la intro.
  const [introActiva, setIntroActiva] = useState(decidirIntro)
  const [activa, setActiva] = useState(SECCIONES[0])
  const [fondoHeader, setFondoHeader] = useState<'claro' | 'ambar' | 'oscuro'>(
    'oscuro',
  )
  const headerLogoRef = useRef<HTMLAnchorElement>(null)

  // El riel muestra el índice de la sección en pantalla. IntersectionObserver
  // en vez de ScrollTrigger: es un cambio de texto, no una animación, y no
  // tiene por qué entrar en el ciclo de scrub.
  useEffect(() => {
    const nodes = SECCIONES.map((s) => document.getElementById(s.id)).filter(
      (n): n is HTMLElement => Boolean(n),
    )
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (!visible) return
        const match = SECCIONES.find((s) => s.id === visible.target.id)
        if (match) setActiva(match)
      },
      { threshold: [0.25, 0.6], rootMargin: '-20% 0px -20% 0px' },
    )
    nodes.forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [])

  // El header es aparte. Ocupa ~70px arriba de todo, así que lo que le importa
  // no es qué sección domina la pantalla sino cuál le pasa POR DEBAJO: con la
  // franja ámbar de contadores centrada en el viewport, el header todavía está
  // sobre el negro del hero, y teñirlo ahí sería el error opuesto.
  //
  // El `rootMargin` con -90% abajo recorta la zona de observación a la franja
  // superior del viewport. Va en porcentaje y no en px porque rootMargin no
  // acepta calc() y así se adapta solo a cualquier alto de pantalla.
  useEffect(() => {
    const conFondo = SECCIONES.filter((s) => s.fondo)
    const nodes = conFondo
      .map((s) => document.getElementById(s.id))
      .filter((n): n is HTMLElement => Boolean(n))
    if (nodes.length === 0) return

    const io = new IntersectionObserver(
      (entries) => {
        const bajoElHeader = entries.find((e) => e.isIntersecting)
        if (!bajoElHeader) {
          setFondoHeader('oscuro')
          return
        }
        const match = conFondo.find((s) => s.id === bajoElHeader.target.id)
        setFondoHeader(match?.fondo ?? 'oscuro')
      },
      { threshold: 0, rootMargin: '0px 0px -90% 0px' },
    )
    nodes.forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [])

  return (
    <>
      <MeshOverlay tono={activa.tono === 'claro' ? 'claro' : 'oscuro'} />
      <Rail
        index={activa.indice}
        label={activa.eyebrow}
        tono={activa.tono === 'claro' ? 'claro' : 'oscuro'}
      />
      <Header logoRef={headerLogoRef} tono={fondoHeader} />

      {introActiva && (
        <Intro
          headerLogoRef={headerLogoRef}
          onDone={() => setIntroActiva(false)}
        />
      )}

      <main>
        {SECCIONES.map((s) => {
          const Componente = IMPLEMENTADAS[s.id]
          if (Componente) return <Componente key={s.id} />

          return (
            <section
              key={s.id}
              id={s.id}
              className="flex min-h-svh flex-col justify-center border-b border-graphite/60 py-24 shell"
            >
              <SectionHeader
                index={s.indice}
                eyebrow={s.eyebrow}
                title={s.titulo}
              />
              <p className="font-hud mt-8 text-bone/30">
                Placeholder — sección {s.indice}
              </p>
            </section>
          )
        })}
      </main>

      <Footer />
    </>
  )
}

export default App
