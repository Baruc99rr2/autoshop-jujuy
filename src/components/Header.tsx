import Logo from './Logo'
import { scrollTo } from '../lib/smooth'

/**
 * Header mínimo y fijo: solo el logo chico. El resto de la navegación vive en
 * la barra MENU flotante (fase 3), así que acá no compite nada con el hero.
 *
 * El `id` del logo es el destino del Flip de la intro. No lo cambies sin
 * actualizar Intro.tsx.
 */
export function Header() {
  return (
    <header className="fixed top-0 right-0 left-0 z-50 flex items-center justify-between py-4 shell">
      <a
        href="#hero"
        onClick={(e) => {
          e.preventDefault()
          scrollTo(0)
        }}
        aria-label="Automotores AutoShop Jujuy — volver arriba"
        className="bevel block"
        style={{ '--bevel': '6px' } as React.CSSProperties}
      >
        <Logo id="header-logo" className="h-8 w-auto md:h-10" decorative />
      </a>
    </header>
  )
}

export default Header
