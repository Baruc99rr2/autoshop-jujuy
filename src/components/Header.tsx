import type { CSSProperties, RefObject } from 'react'
import { useLocation, useNavigate } from 'react-router'
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
 *
 * APILADO: z-55, por encima del overlay del menú (45) y del riel (50). Con el
 * menú abierto el logo queda sobre el fondo bone, así que recibe tono
 * `claro` y se dibuja en negro — la decisión 19 aplicada al menú.
 */
export function Header({ logoRef, tono = 'oscuro' }: HeaderProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const enHome = pathname === '/'

  return (
    <header
      data-tono={tono}
      className="header-adapt fixed top-0 right-0 left-0 z-55 flex items-center justify-between py-4 shell"
    >
      {/* El href es SIEMPRE "/" y no "#hero": desde una ficha, "#hero" no
          apunta a nada, y es el href el que decide qué copia el visitante
          cuando usa "copiar dirección del enlace". Estando en el home el
          click se intercepta y se resuelve con un scroll suave. */}
      <a
        ref={logoRef}
        href="/"
        onClick={(e) => {
          e.preventDefault()
          if (enHome) {
            scrollTo(0)
            return
          }
          navigate('/')
        }}
        aria-label="Automotores AutoShop Jujuy — volver al inicio"
        className="bevel block"
        style={{ '--bevel': '6px' } as CSSProperties}
      >
        <Logo id="header-logo" className="h-8 w-auto md:h-10" decorative />
      </a>
    </header>
  )
}

export default Header
