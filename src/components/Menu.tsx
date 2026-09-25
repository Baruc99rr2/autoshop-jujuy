import { useEffect, useRef } from 'react'
import Bevel from './Bevel'
import { MENU } from '../data/nav'
import { apuntaAOculta, seccionesOcultas, useContenido } from '../lib/contenido'
import { useIrA } from '../lib/ir-a'
import { prefersReducedMotion } from '../lib/motion-prefs'
import { usePieALaVista } from '../lib/pie-a-la-vista'
import { startScroll, stopScroll } from '../lib/smooth'

type MenuProps = {
  abierto: boolean
  onAbrir: () => void
  onCerrar: () => void
  /**
   * Lo que va apilado ARRIBA de la barra MENU, en el mismo contenedor fijo: la
   * barra de WhatsApp de la ficha en mobile. Van juntas y no como dos piezas
   * fijas con alturas calculadas a mano porque así no se pueden encimar nunca,
   * ni con el tamaño de letra agrandado del teléfono: la columna las separa
   * sola. Y se van juntas al abrir el menú o al llegar al footer.
   */
  encima?: React.ReactNode
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
export function Menu({ abierto, onAbrir, onCerrar, encima }: MenuProps) {
  const panel = useRef<HTMLDivElement>(null)
  const zonaBoton = useRef<HTMLDivElement>(null)
  const rm = prefersReducedMotion()
  const irAlDestino = useIrA()
  // Sin servicios cargados, "Servicios" no lleva a ningún lado: se saca.
  const ocultas = seccionesOcultas(useContenido())
  const items = MENU.filter((item) => !apuntaAOculta(item.href, ocultas))

  // La barra se va por dos motivos distintos y con el mismo gesto: porque el
  // menú se abrió (su lugar lo ocupa la barra CLOSE) o porque la página llegó
  // al footer y estaría tapando el © y la firma.
  const enElPie = usePieALaVista()
  const barraEscondida = abierto || enElPie

  // Escape para cerrar y trampa de foco: con el scroll bloqueado y un overlay
  // opaco encima, un Tab que se escapa al contenido de atrás deja el foco en
  // algo que no se ve.
  useEffect(() => {
    if (!abierto) return
    stopScroll()

    // Se copia el nodo del disparador acá y no en la limpieza: para cuando la
    // limpieza corre, `zonaBoton.current` ya puede apuntar a otra cosa.
    const volverA = zonaBoton.current?.querySelector<HTMLElement>('.menu-btn')

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
    // overlay ni con el startScroll() de la limpieza del efecto. Para un href
    // de ruta la espera sirve igual: el overlay bone termina de irse antes de
    // que cambie la página, en vez de cortarse a la mitad.
    window.setTimeout(() => irAlDestino(href), rm ? 0 : 340)
  }

  return (
    <>
      {/* ── BARRA MENU FLOTANTE ──────────────────────────────────────
          Centrada abajo. Es, con el logo del intro, la única cosa centrada
          del sitio. Se esconde mientras el menú está abierto: su lugar lo
          ocupa la barra CLOSE, en la misma posición.

          El contenedor ocupa todo el ancho para poder apilar `encima` a lo
          ancho, pero no atrapa toques: solo sus hijos. Escondida va `inert`,
          que además de los toques le saca el foco — invisible pero tabulable
          dejaba el Tab en un botón que no se ve. */}
      <div
        ref={zonaBoton}
        inert={barraEscondida}
        className={`pointer-events-none fixed inset-x-0 bottom-6 z-60 flex flex-col items-center gap-3 transition-[opacity,transform] duration-300 ${
          barraEscondida ? 'translate-y-4 opacity-0' : 'opacity-100'
        }`}
      >
        {encima}
        <Bevel
          as="button"
          variant="solid"
          bevel={12}
          type="button"
          onClick={onAbrir}
          aria-expanded={abierto}
          aria-haspopup="dialog"
          className="menu-btn font-hud pointer-events-auto flex w-56 items-center justify-between px-6 py-4 md:w-72"
        >
          <span>MENU</span>
          <Barras />
        </Bevel>
      </div>

      {/* El panel está SIEMPRE en el DOM y se abre y cierra con CSS.
          Antes lo montaba y desmontaba `AnimatePresence` de `motion`, que
          entraba al bundle con 133 KB para animar un solo `clip-path`. Con el
          panel montado, la animación de salida no necesita que nadie retenga
          el nodo: la hace la misma transición que la de entrada.
          Mientras está cerrado va `inert`, que lo saca del orden de tabulación
          y del árbol de accesibilidad — sin eso, un panel siempre montado se
          recorrería con Tab estando invisible. */}
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Navegación"
        data-abierto={abierto}
        inert={!abierto}
        className="menu-panel fixed inset-0 z-45 flex flex-col bg-bone"
        // Click en el fondo del panel = click fuera de los links: cierra.
        // El <nav> para la propagación, así un click en un item no llega.
        onClick={onCerrar}
      >
          <nav
            className="flex flex-1 flex-col justify-center pt-24 pb-28 shell"
            onClick={(e) => e.stopPropagation()}
          >
            <ul>
              {items.map((item, i) => (
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
      </div>
    </>
  )
}

export default Menu
