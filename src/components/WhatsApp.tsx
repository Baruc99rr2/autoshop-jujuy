import Bevel from './Bevel'
import Icono from './Icono'
import { FLOTANTE } from '../data/contacto'

/**
 * Botón flotante de WhatsApp, abajo a la derecha.
 *
 * En mobile colapsa a solo el ícono y sube por encima de la barra MENU, que
 * ocupa el centro inferior: con los dos a la misma altura, en 390 px el
 * flotante le comería la esquina derecha al botón MENU.
 *
 * El ícono es un globo de conversación genérico, NO el logo de WhatsApp. Es el
 * mismo criterio de la decisión 38: un logo ajeno redibujado a mano se nota y
 * además es marca registrada. La palabra "WhatsApp" en el `aria-label` y en el
 * texto de desktop identifica igual de bien.
 */
export function WhatsApp() {
  return (
    /* Quién lo muestra y quién no lo decide `PaginaInterna`: la ficha lo saca
       entero porque ya tiene su propio botón de WhatsApp, arriba en el panel
       de precio y abajo en la barra fija de mobile. Acá adentro no hay
       variantes. */
    <div className="fixed right-4 bottom-24 z-60 md:right-6 md:bottom-6">
      <Bevel
        as="a"
        variant="solid"
        bevel={12}
        href={FLOTANTE.href}
        target="_blank"
        rel="noreferrer"
        aria-label={FLOTANTE.aria}
        className="wa-btn font-hud flex items-center gap-3 px-4 py-4 transition-transform duration-200 hover:-translate-y-0.5 md:px-5"
      >
        {/* El punto que pulsa lento.
            Va NEGRO y no en --color-flag: el rojo del sitio es para estados de
            stock y errores de validación, y un punto rojo permanente en la
            esquina de la pantalla lo convertiría en decoración, que es
            justamente lo que la regla prohíbe. Sobre el ámbar del botón, el
            negro contrasta igual de bien.
            Y va DENTRO de la fila, no en una esquina con posición absoluta: el
            clip-path del bisel recorta todo lo que se salga de la silueta, así
            que un punto en `-top-1 -right-1` desaparecería en la diagonal. */}
        <span
          aria-hidden="true"
          className="wa-pulso block h-2 w-2 shrink-0 bg-void"
        />

        <Icono name="chat" className="h-5 w-5 shrink-0" />

        {/* El texto y las barras solo en desktop: en mobile el botón es el
            ícono y nada más. */}
        <span className="hidden md:inline">{FLOTANTE.label.toUpperCase()}</span>
        {/* El `hidden` va en un envoltorio y no en `.barras`: la clase de las
            barras ya no fija `display` propio, pero envolver además deja
            explícito que lo que se esconde es el bloque entero. */}
        <span aria-hidden="true" className="hidden md:inline-flex">
          <span className="barras inline-flex">
            <i />
            <i />
            <i />
          </span>
        </span>
      </Bevel>
    </div>
  )
}

export default WhatsApp
