import { useEffect, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'
import { Link, useLocation } from 'react-router'
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
  /**
   * Saca el header de la pantalla mientras el menú está abierto.
   *
   * El menú es un diálogo a pantalla completa con fondo bone y su propia barra
   * CLOSE: ahí arriba a la izquierda el logo quedaba flotando sobre el panel
   * claro sin pertenecer a nada, y encima era un enlace interactivo FUERA de
   * un `aria-modal`. Como el menú ahora tiene su propio "Menú principal", el
   * logo tampoco hace falta como salida.
   */
  oculto?: boolean
}

/**
 * Header mínimo y fijo: solo el logo chico. El resto de la navegación vive en
 * la barra MENU flotante, así que acá no compite nada con el hero.
 *
 * APILADO: z-55, por encima del overlay del menú (45) y del riel (50). Con el
 * menú abierto el logo queda sobre el fondo bone, así que recibe tono
 * `claro` y se dibuja en negro — la decisión 19 aplicada al menú.
 *
 * EL VELO. Al scrollear, el logo se montaba encima del contenido y las dos
 * cosas quedaban ilegibles: el logo sobre una foto clara desaparece y el texto
 * que pasa por detrás se lee partido. Se resuelve con un degradado negro corto
 * de arriba hacia abajo que aparece SOLO cuando la página se movió: en el tope
 * no hay nada debajo del header y un velo ahí sería una barra pintada sobre el
 * hero.
 *
 * Y solo con tono `oscuro`: sobre la FAQ (fondo bone) o sobre la franja ámbar
 * de contadores, un degradado negro es una mancha. Ahí el logo ya se resuelve
 * invirtiendo sus colores.
 */

/** Cuánto hay que haber scrolleado para que aparezca el velo, en px. */
const VELO_DESDE = 24

/**
 * Lo que comparten las dos versiones del logo, la del home y la del `<Link>`.
 *
 * El atenuado en hover es lo único que avisa que el logo lleva a algún lado:
 * en el home se entiende porque no hay otro lado al que ir, pero en el
 * catálogo y en la ficha es la única salida al inicio que hay en pantalla, y
 * un logo que no reacciona se lee como un dibujo. Es `opacity` y nada más, que
 * es una de las tres propiedades que este sitio anima.
 */
const LOGO = {
  'aria-label': 'Automotores AutoShop Jujuy — volver al inicio',
  // El padding lleva el enlace a 44 px de alto al tacto (32 + 12 en mobile,
  // 40 + 8 en desktop). El header le descuenta lo mismo a su propio padding,
  // así que el logo queda exactamente donde estaba.
  className:
    'bevel block py-1.5 transition-opacity duration-200 hover:opacity-70 focus-visible:opacity-70 md:py-1',
  style: { '--bevel': '6px' } as CSSProperties,
}

export function Header({ logoRef, tono = 'oscuro', oculto = false }: HeaderProps) {
  const { pathname } = useLocation()
  const enHome = pathname === '/'

  // Se lee `window.scrollY` y no la posición de Lenis: Lenis scrollea el
  // documento de verdad, así que el número es el mismo, y con
  // `prefers-reduced-motion` Lenis no existe pero el velo tiene que seguir
  // apareciendo igual.
  const [scrolleado, setScrolleado] = useState(false)
  useEffect(() => {
    const alScrollear = () => setScrolleado(window.scrollY > VELO_DESDE)
    alScrollear()
    window.addEventListener('scroll', alScrollear, { passive: true })
    return () => window.removeEventListener('scroll', alScrollear)
  }, [])

  return (
    <header
      data-tono={tono}
      /* `inert` además de `opacity-0`: un header invisible pero tabulable deja
         el foco en un enlace que no se ve, que es justo lo que la trampa de
         foco del menú viene a evitar. */
      inert={oculto}
      className={`header-adapt fixed top-0 right-0 left-0 z-55 flex items-center justify-between py-2.5 shell md:py-3 transition-[opacity,transform] duration-300 ${
        oculto ? 'pointer-events-none -translate-y-3 opacity-0' : 'opacity-100'
      }`}
    >
      {/* Va en `z-index: -1` DENTRO del header: el header ya crea su propio
          contexto de apilado con `z-55`, así que el velo queda detrás del logo
          pero por delante de toda la página. */}
      <span
        aria-hidden="true"
        className="header-velo"
        data-on={tono === 'oscuro' && scrolleado}
      />

      {/* El destino es SIEMPRE "/" y no "#hero": desde una ficha, "#hero" no
          apunta a nada, y es el href el que decide qué copia el visitante
          cuando usa "copiar dirección del enlace".

          FUERA DEL HOME ES UN `<Link>` DE VERDAD, no un `<a>` con
          `preventDefault` y un `navigate()` a mano. Los dos llegan al mismo
          lado, pero el `<Link>` no depende de que corra un handler y deja
          intactos el click del medio, el ctrl+click y el "abrir en una pestaña
          nueva", que en un `<a>` interceptado funcionan de casualidad.

          En el home sí se intercepta: ahí "/" es la página en la que ya se
          está, así que navegar no haría nada visible y lo que corresponde es
          subir con un scroll suave. */}
      {enHome ? (
        <a
          ref={logoRef}
          href="/"
          onClick={(e) => {
            e.preventDefault()
            scrollTo(0)
          }}
          {...LOGO}
        >
          <Logo id="header-logo" className="h-8 w-auto md:h-10" decorative />
        </a>
      ) : (
        <Link ref={logoRef} to="/" {...LOGO}>
          <Logo id="header-logo" className="h-8 w-auto md:h-10" decorative />
        </Link>
      )}
    </header>
  )
}

export default Header
