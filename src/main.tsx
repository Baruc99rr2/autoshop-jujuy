import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App.tsx'
import { initSmooth } from './lib/smooth'

// Lenis se inicializa ANTES del primer render, no dentro de un efecto.
// La intro llama a stopScroll() en su layout effect, y los layout effects de
// los hijos corren antes que los efectos del padre: si el init viviera en
// App, Lenis nacería ya arrancado justo después de que la intro pidió frenar.
initSmooth()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
