import { useEffect, useState } from 'react'
import Header from './components/Header'
import MeshOverlay from './components/MeshOverlay'
import Rail from './components/Rail'
import SectionHeader from './components/SectionHeader'
import { SECCIONES } from './data/nav'
import { destroySmooth, initSmooth } from './lib/smooth'

function App() {
  const [activa, setActiva] = useState(SECCIONES[0])

  useEffect(() => {
    initSmooth()
    return () => destroySmooth()
  }, [])

  // El riel muestra el índice de la sección en pantalla. IntersectionObserver
  // en vez de ScrollTrigger: es un cambio de texto, no una animación, y no
  // necesita entrar en el ciclo de scrub.
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

  return (
    <>
      <MeshOverlay />
      <Rail index={activa.indice} label={activa.eyebrow} />
      <Header />

      <main>
        {SECCIONES.map((s) => (
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
        ))}
      </main>

      <footer className="min-h-svh py-24 shell">
        <SectionHeader index="11" eyebrow="FOOTER" title="AutoShop Jujuy" />
        <p className="font-hud mt-8 text-bone/30">Placeholder — footer</p>
      </footer>
    </>
  )
}

export default App
