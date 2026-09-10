import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import Bevel from './Bevel'
import { MENU } from '../data/nav'
import { prefersReducedMotion } from '../lib/motion-prefs'
import { scrollTo, startScroll, stopScroll } from '../lib/smooth'

type MenuProps = {
  abierto: boolean
  onAbrir: () => void
  onCerrar: () => void
}

/** Las tres barras del marcador ///, como elemento propio para poder animarlas. */
function Barras({ className = '' }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`barras inline-flex ${className}`}>
      <i />
      <i />
      <i />
    </span>
  )
}

/**
 * Barra MENU flotante + overlay del menú.
 *
 * El overlay va en `--color-bone` con texto negro: el contraste invertido es
 * lo que lo hace sentir una capa aparte y no otra sección del sitio.
 *
 * APILADO: el overlay va en z-45, DEBAJO del riel (z-50) y del header (z-55),
 * que quedan encima y se adaptan al fondo claro — es la decisión 19 y 31
 * aplicada al menú. El riel es el único elemento constante de toda la página;
 * taparlo justo cuando el usuario está navegando lo contradiría. La malla
 * queda en z-40, o sea debajo del overlay: sobre el bone no aporta y ya se
 * había visto en la FAQ que se lee como ruido.
 */
export function Menu({ abierto, onAbrir, onCerrar }: MenuProps) {
  const panel = useRef<HTMLDivElement>(null)
  const zonaBoton = useRef<HTMLDivElement>(null)
  const rm = prefersReducedMotion()

  // Escape para cerrar y trampa de foco: con el scroll bloqueado y un overlay
  // opaco encima, un Tab que se escapa al contenido de atrás deja el foco en
  // algo que no se ve.
  useEffect(() => {
    if (!abierto) return
    stopScroll()

    // Se copia el nodo del disparador acá y no en la limpieza: para cuando la
    // limpieza corre, `zonaBoton.current` ya puede apuntar a otra cosa.
    const volverA = zonaBoton.current?.querySelector('button')

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCerrar()
        return
      }
      if (e.key !== 'Tab' || !panel.current) return

      const focusables = panel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      )
      if (focusables.length === 0) return
      const primero = focusables[0]
      const ultimo = focusables[focusables.length - 1]

      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primero.focus()
      }
    }

    document.addEventListener('keydown', alTeclear)
    // El foco entra al panel: si se queda en el botón MENU, que está detrás
    // del overlay, el primer Tab parece no hacer nada.
    const t = window.setTimeout(
      () => panel.current?.querySelector<HTMLElement>('a[href]')?.focus(),
      rm ? 0 : 300,
    )

    return () => {
      document.removeEventListener('keydown', alTeclear)
      window.clearTimeout(t)
      startScroll()
      // El foco vuelve al disparador: es la regla de cualquier diálogo.
      volverA?.focus()
    }
  }, [abierto, onCerrar, rm])

  const irA = (href: string) => {
    onCerrar()
    // Después del cierre, para que el scroll no compita con el desmontaje del
    // overlay ni con el startScroll() de la limpieza del efecto.
    window.setTimeout(() => scrollTo(href), rm ? 0 : 340)
  }

  return (
    <>
      {/* ── BARRA MENU FLOTANTE ──────────────────────────────────────
          Centrada abajo. Es, con el logo del intro, la única cosa centrada
          del sitio. Se esconde mientras el menú está abierto: su lugar lo
          ocupa la barra CLOSE, en la misma posición. */}
      <div
        ref={zonaBoton}
        className={`fixed bottom-6 left-1/2 z-60 -translate-x-1/2 transition-all duration-300 ${
          abierto ? 'pointer-events-none translate-y-4 opacity-0' : 'opacity-100'
        }`}
      >
        <Bevel
          as="button"
          variant="solid"
          bevel={12}
          type="button"
          onClick={onAbrir}
          aria-expanded={abierto}
          aria-haspopup="dialog"
          className="menu-btn font-hud flex w-56 items-center justify-between px-6 py-4 md:w-72"
        >
          <span>MENU</span>
          <Barras />
        </Bevel>
      </div>

      <AnimatePresence>
        {abierto && (
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label="Menú principal"
            className="fixed inset-0 z-45 flex flex-col bg-bone"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: rm ? 0 : 0.45, ease: [0.65, 0, 0.35, 1] }}
            // Click en el fondo del panel = click fuera de los links: cierra.
            // El <nav> para la propagación, así un click en un item no llega.
            onClick={onCerrar}
          >
            <nav
              className="flex flex-1 flex-col justify-center pt-24 pb-28 shell"
              onClick={(e) => e.stopPropagation()}
            >
              <ul>
                {MENU.map((item, i) => (
                  <li
                    key={item.label}
                    className="menu-item-host"
                    style={{ '--i': i } as React.CSSProperties}
                  >
                    <a
                      href={item.href}
                      onClick={(e) => {
                        e.preventDefault()
                        irA(item.href)
                      }}
                      className="menu-item flex items-center gap-3 py-0.5 text-void md:gap-5"
                    >
                      <Barras className="menu-item-barras" />
                      <span className="menu-item-texto font-display-xl text-h1 leading-[0.95]">
                        {item.label}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* ── BARRA CLOSE ↓ ────────────────────────────────────
                Arranca donde arranca el riel, no en el borde: si sangrara
                hasta 0 cruzaría la línea del riel, que queda por encima. */}
            <div
              className="absolute right-0 bottom-6 left-0 shell"
              onClick={(e) => e.stopPropagation()}
            >
              <Bevel
                as="button"
                variant="ghost"
                bevel={12}
                type="button"
                onClick={onCerrar}
                surfaceClassName="bg-void text-bone"
                className="menu-close font-hud flex w-full items-center justify-between px-6 py-4"
              >
                <span className="flex items-center gap-3">
                  CLOSE
                  <span aria-hidden="true" className="close-flecha">
                    ↓
                  </span>
                </span>
                <span aria-hidden="true" className="text-amber">
                  \
                </span>
              </Bevel>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default Menu
