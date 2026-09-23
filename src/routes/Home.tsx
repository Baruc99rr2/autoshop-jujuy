import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Contacto from '../components/Contacto'
import Contadores from '../components/Contadores'
import Faq from '../components/Faq'
import Footer from '../components/Footer'
import Header from '../components/Header'
import Hero from '../components/Hero'
import Marcas from '../components/Marcas'
import Menu from '../components/Menu'
import Vehiculos from '../components/Vehiculos'
import WhatsApp from '../components/WhatsApp'
import Intro, { INTRO_SEEN_KEY } from '../components/Intro'
import MeshOverlay from '../components/MeshOverlay'
import Servicios from '../components/Servicios'
import Segmentos from '../components/Segmentos'
import Rail from '../components/Rail'
import { SECCIONES, seccionesVisibles } from '../data/nav'
import type { Seccion } from '../data/nav'
import { seccionesOcultas, useContenido } from '../lib/contenido'
import type { ContenidoSitio } from '../lib/contenido'
import { prefersReducedMotion } from '../lib/motion-prefs'
import { scrollTo } from '../lib/smooth'

type PropsSeccion = { s: Seccion; contenido: ContenidoSitio | null }
type ComponenteSeccion = (p: PropsSeccion) => React.ReactElement | null

/**
 * Componente de cada sección del home, por id. Ya están todas: si un id de
 * `SECCIONES` no aparece acá es un error de programación, y `componenteDe`
 * tira en vez de dibujar un hueco silencioso.
 *
 * Las tres que editan la dueña reciben su parte del contenido. Servicios y
 * Preguntas no se dibujan mientras carga: con la lista vacía no deberían
 * existir, y dibujarlas vacías un instante sería un salto de layout.
 */
const SECCION_COMPONENTE: Record<string, ComponenteSeccion> = {
  contacto: ({ s }) => <Contacto s={s} />,
  contadores: ({ contenido }) => <Contadores datos={contenido?.contadores ?? null} />,
  hero: () => <Hero />,
  marcas: () => <Marcas />,
  postventa: ({ s, contenido }) =>
    contenido ? <Servicios s={s} servicios={contenido.servicios} /> : null,
  preguntas: ({ s, contenido }) =>
    contenido ? <Faq s={s} preguntas={contenido.preguntas} /> : null,
  segmentos: () => <Segmentos />,
  vehiculos: () => <Vehiculos />,
}

function componenteDe(id: string): ComponenteSeccion {
  const C = SECCION_COMPONENTE[id]
  if (!C) throw new Error(`Sección sin componente en Home.tsx: ${id}`)
  return C
}

/**
 * ¿La visita ENTRÓ por el home?
 *
 * Se mide una sola vez, al cargar el módulo, contra la URL con la que arrancó
 * la pestaña. Es lo que decide si la intro puede correr: quien abre el link de
 * una ficha que le pasaron por WhatsApp quiere ver ese auto, y si después toca
 * "Inicio" no tiene sentido recibirlo con una presentación de marca de dos
 * segundos y medio. La intro es el saludo de la puerta de entrada, no un peaje
 * interno.
 */
const ENTRO_POR_HOME =
  typeof window !== 'undefined' && window.location.pathname === '/'

/**
 * La intro corre una sola vez por pestaña. Durante la demo el sitio se recarga
 * mucho y ver los 2.6 s en cada recarga cansa, así que sessionStorage la corta.
 *
 * Con prefers-reduced-motion no corre nunca: el logo aparece directo en el
 * header y el hero está visible desde el primer frame.
 */
function decidirIntro(): boolean {
  if (typeof window === 'undefined') return false
  if (!ENTRO_POR_HOME) return false
  if (prefersReducedMotion()) return false
  try {
    return sessionStorage.getItem(INTRO_SEEN_KEY) !== '1'
  } catch {
    return true
  }
}

export function Home() {
  // useState con inicializador perezoso: la decisión se toma antes de la
  // primera pintura, así no hay un frame de hero visible antes de la intro.
  const [introActiva, setIntroActiva] = useState(decidirIntro)
  const [activa, setActiva] = useState(SECCIONES[0])
  const [fondoHeader, setFondoHeader] = useState<'claro' | 'ambar' | 'oscuro'>(
    'oscuro',
  )
  const [menuAbierto, setMenuAbierto] = useState(false)
  const headerLogoRef = useRef<HTMLAnchorElement>(null)
  const { hash } = useLocation()

  const contenido = useContenido()
  const secciones = useMemo(
    () => seccionesVisibles(seccionesOcultas(contenido)),
    [contenido],
  )

  // Servicios y Preguntas entran al DOM recién con el contenido, así que todo
  // lo que está debajo se corre: los ScrollTrigger de Contacto y del footer
  // quedarían midiendo posiciones viejas.
  useEffect(() => {
    if (!contenido) return
    const t = requestAnimationFrame(() => ScrollTrigger.refresh())
    return () => cancelAnimationFrame(t)
  }, [contenido])

  // Alguien llegó a `/#vehiculos` desde otra ruta: el home se monta arriba de
  // todo y después baja. Espera al contenido porque `#preguntas` y
  // `#postventa` no existen hasta que llega, y el rAF a que estén pintadas;
  // si además corre la intro, el scroll está frenado y Lenis aplica el
  // destino recién al soltarse, que es el orden correcto.
  useEffect(() => {
    if (!hash || !contenido) return
    const t = requestAnimationFrame(() => scrollTo(hash))
    return () => cancelAnimationFrame(t)
  }, [hash, contenido])

  // El riel muestra el índice de la sección en pantalla. IntersectionObserver
  // en vez de ScrollTrigger: es un cambio de texto, no una animación, y no
  // tiene por qué entrar en el ciclo de scrub.
  useEffect(() => {
    const nodes = secciones.map((s) => document.getElementById(s.id)).filter(
      (n): n is HTMLElement => Boolean(n),
    )
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (!visible) return
        const match = secciones.find((s) => s.id === visible.target.id)
        if (match) setActiva(match)
      },
      { threshold: [0.25, 0.6], rootMargin: '-20% 0px -20% 0px' },
    )
    nodes.forEach((n) => io.observe(n))
    return () => io.disconnect()
    // Se vuelve a armar cuando llega el contenido: hay secciones nuevas que
    // observar y los índices pudieron correrse.
  }, [secciones])

  // El header es aparte. Ocupa ~70px arriba de todo, así que lo que le importa
  // no es qué sección domina la pantalla sino cuál le pasa POR DEBAJO: con la
  // franja ámbar de contadores centrada en el viewport, el header todavía está
  // sobre el negro del hero, y teñirlo ahí sería el error opuesto.
  //
  // El `rootMargin` con -90% abajo recorta la zona de observación a la franja
  // superior del viewport. Va en porcentaje y no en px porque rootMargin no
  // acepta calc() y así se adapta solo a cualquier alto de pantalla.
  useEffect(() => {
    const conFondo = secciones.filter((s) => s.fondo)
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
  }, [secciones])

  // El menú es un overlay de fondo bone a pantalla completa, así que mientras
  // está abierto el riel y el header tienen encima el mismo blanco que la FAQ
  // y necesitan el mismo tratamiento (decisiones 19 y 31). Es la sección
  // activa la que decide el tono el resto del tiempo.
  const claro = menuAbierto || activa.tono === 'claro'

  return (
    <>
      <MeshOverlay tono={claro ? 'claro' : 'oscuro'} />
      <Rail
        index={activa.indice}
        label={activa.eyebrow}
        tono={claro ? 'claro' : 'oscuro'}
      />
      <Header
        logoRef={headerLogoRef}
        tono={menuAbierto ? 'claro' : fondoHeader}
        oculto={menuAbierto}
      />

      {/* El menú va acá, justo después del header, y NO al final del árbol.
          Los dos son `fixed`, así que el lugar en el DOM no cambia dónde se
          dibujan — cambia el ORDEN DE TABULACIÓN. Con el menú al final, quien
          navega con Tab recorría las once secciones enteras antes de llegar a
          la navegación principal del sitio. El panel cerrado está `inert`, así
          que sus links no aparecen en el recorrido hasta que se abre. */}
      <Menu
        abierto={menuAbierto}
        onAbrir={() => setMenuAbierto(true)}
        onCerrar={() => setMenuAbierto(false)}
      />

      {introActiva && (
        <Intro
          headerLogoRef={headerLogoRef}
          onDone={() => setIntroActiva(false)}
        />
      )}

      <main>
        {secciones.map((s) => {
          const Componente = componenteDe(s.id)
          return <Componente key={s.id} s={s} contenido={contenido} />
        })}
      </main>

      <Footer />

      {/* El flotante SÍ va al final: es una acción secundaria y persistente, y
          adelantarlo pondría un enlace externo entre el logo y el contenido.
          Se esconde mientras el menú está abierto: el overlay es una capa
          aparte y un botón de WhatsApp flotando encima la rompe. */}
      {!menuAbierto && <WhatsApp />}
    </>
  )
}

export default Home
