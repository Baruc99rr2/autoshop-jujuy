import { Suspense, lazy, useEffect, useLayoutEffect } from 'react'
import type { ReactNode } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Catalogo from './routes/Catalogo'
import Home from './routes/Home'
import NoEncontrado from './routes/NoEncontrado'
import Vehiculo from './routes/Vehiculo'
import { getLenis, startScroll } from './lib/smooth'

/**
 * El panel entra por `lazy()` y es lo ÚNICO que se parte del bundle.
 *
 * No es una optimización de tamaño por deporte: el panel es para una sola
 * persona y el resto del sitio es para el visitante que llega del link de
 * WhatsApp con datos móviles en Jujuy. Que su código no viaje en el bundle
 * público se verifica en cada build mirando que exista un chunk `Admin-*.js`
 * aparte (`npm run build`).
 */
const Admin = lazy(() => import('./routes/Admin'))

/**
 * Pantalla de espera del panel. Negro liso con una línea: el chunk pesa poco y
 * en la práctica se ve un frame, así que cualquier cosa más elaborada sería un
 * parpadeo.
 */
function Cargando() {
  return (
    <div className="grid min-h-svh place-items-center bg-void">
      <p className="font-hud text-bone/45">CARGANDO…</p>
    </div>
  )
}

/**
 * Lo que pasa ENTRE dos páginas.
 *
 * Va con `key={pathname}`, así que React desmonta el árbol viejo entero y
 * monta el nuevo. Eso importa por el orden: la limpieza de un `useLayoutEffect`
 * del árbol que se va corre en la fase de mutación, ANTES de que corran los
 * layout effects del árbol que entra. Con un `useEffect` común la limpieza
 * podría quedar diferida y matar los ScrollTrigger que la página NUEVA acaba
 * de crear, que es exactamente el bug que esto evita.
 *
 * Al entrar: arriba de todo, sin animación de scroll — nadie quiere ver el
 * catálogo pasar volando cuando pidió una ficha.
 *
 * Al salir: se van todos los ScrollTrigger de la página anterior y se suelta
 * el scroll, por si la página se abandonó con el menú abierto o con la intro a
 * medias, que lo dejan frenado.
 */
function TransicionDeRuta({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    const lenis = getLenis()
    lenis?.scrollTo(0, { immediate: true, force: true })
    window.scrollTo(0, 0)

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill())
      ScrollTrigger.clearScrollMemory()
      startScroll()
    }
  }, [])

  // Después de pintar la página nueva se recalculan las medidas: Lenis tiene
  // que enterarse del alto del documento nuevo y los ScrollTrigger recién
  // creados, de dónde empiezan. Las imágenes que llegan más tarde disparan su
  // propio refresh donde hace falta (ver Segmentos).
  useEffect(() => {
    getLenis()?.resize()
    ScrollTrigger.refresh()
  }, [])

  return <>{children}</>
}

function Rutas() {
  const { pathname } = useLocation()

  return (
    <TransicionDeRuta key={pathname}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/catalogo" element={<Catalogo />} />
        <Route path="/vehiculo/:slug" element={<Vehiculo />} />
        <Route
          path="/admin"
          element={
            <Suspense fallback={<Cargando />}>
              <Admin />
            </Suspense>
          }
        />
        {/* Comodín obligatorio: `vercel.json` sirve `/index.html` para
            CUALQUIER URL, así que sin esto una dirección inventada daría 200 y
            pantalla en blanco. */}
        <Route path="*" element={<NoEncontrado />} />
      </Routes>
    </TransicionDeRuta>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Rutas />
    </BrowserRouter>
  )
}

export default App
