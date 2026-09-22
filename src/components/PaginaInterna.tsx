import { useState } from 'react'
import type { ReactNode } from 'react'
import Footer from './Footer'
import Header from './Header'
import Menu from './Menu'
import MeshOverlay from './MeshOverlay'
import Rail from './Rail'
import SectionHeader from './SectionHeader'
import WhatsApp from './WhatsApp'

type PaginaInternaProps = {
  /** Índice de dos dígitos del riel y del encabezado. */
  indice: string
  /** Nombre corto en mayúsculas. */
  eyebrow: string
  titulo: ReactNode
  lead?: ReactNode
  children?: ReactNode
  /**
   * Cuándo se muestra el botón flotante de WhatsApp.
   *
   * La ficha lo pide en `'desktop'`: en mobile ya tiene su propia barra fija
   * con el mismo botón, y los dos juntos son dos biseles ámbar superpuestos
   * pidiendo lo mismo. El resto de las páginas internas no pasa nada y lo
   * muestran siempre.
   */
  flotante?: 'siempre' | 'desktop'
}

/**
 * El marco de todas las páginas que no son el home: catálogo, ficha y panel.
 *
 * Lleva las mismas cuatro capas fijas del home —malla, riel, header y menú— y
 * el mismo footer, porque el riel es lo único constante del sitio y una página
 * interna sin él se lee como otro sitio. Lo que NO lleva es la intro ni los
 * IntersectionObserver de sección: acá hay una sola sección, así que el índice
 * del riel es fijo y no hay nada que observar.
 *
 * El índice arranca en "01" en cada página interna y no sigue la numeración
 * 01–08 del home a propósito: esa numeración cuenta las secciones de UNA
 * página, no las páginas del sitio.
 */
export function PaginaInterna({
  indice,
  eyebrow,
  titulo,
  lead,
  children,
  flotante = 'siempre',
}: PaginaInternaProps) {
  const [menuAbierto, setMenuAbierto] = useState(false)

  return (
    <>
      <MeshOverlay tono={menuAbierto ? 'claro' : 'oscuro'} />
      <Rail
        index={indice}
        label={eyebrow}
        tono={menuAbierto ? 'claro' : 'oscuro'}
      />
      <Header tono={menuAbierto ? 'claro' : 'oscuro'} />

      <Menu
        abierto={menuAbierto}
        onAbrir={() => setMenuAbierto(true)}
        onCerrar={() => setMenuAbierto(false)}
      />

      {/* `min-h-svh` y no `vh`: la barra del navegador de WhatsApp cambia el
          alto al scrollear y con `vh` la página entera se empuja. */}
      <main className="min-h-svh pt-32 pb-24 shell md:pt-40">
        <SectionHeader
          index={indice}
          eyebrow={eyebrow}
          title={titulo}
          lead={lead}
        />
        {children}
      </main>

      <Footer />

      {!menuAbierto && <WhatsApp soloDesktop={flotante === 'desktop'} />}
    </>
  )
}

export default PaginaInterna
