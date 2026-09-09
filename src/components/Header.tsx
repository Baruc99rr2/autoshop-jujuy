import type { CSSProperties, RefObject } from 'react'
import Logo from './Logo'
import { scrollTo } from '../lib/smooth'

type HeaderProps = {
  /** La intro necesita el nodo real para el Flip: no se mide por id. */
  logoRef?: RefObject<HTMLAnchorElement | null>
  /**
   * Color del fondo que le pasa por debajo. El header es fijo sobre TODA la
   * página: sobre el bone de la FAQ el blanco del logo desaparece y queda
   * flotando un "SHOP" ámbar suelto, y sobre la franja ámbar de contadores
   * desaparece justamente ese "SHOP".
   */
  tono?: 'claro' | 'ambar' | 'oscuro'
}

/**
 * Header mínimo y fijo: solo el logo chico. El resto de la navegación vive en
 * la barra MENU flotante, así que acá no compite nada con el hero.
 */
export function Header({ logoRef, tono = 'oscuro' }: HeaderProps) {
  return (
    <header
      data-tono={tono}
      className="header-adapt fixed top-0 right-0 left-0 z-50 flex items-center justify-between py-4 shell"
    >
      <a
        ref={logoRef}
        href="#hero"
        onClick={(e) => {
          e.preventDefault()
          scrollTo(0)
        }}
        aria-label="Automotores AutoShop Jujuy — volver arriba"
        className="bevel block"
        style={{ '--bevel': '6px' } as CSSProperties}
      >
        <Logo id="header-logo" className="h-8 w-auto md:h-10" decorative />
      </a>
    </header>
  )
}

export default Header
