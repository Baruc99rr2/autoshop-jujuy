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
  /** Pasa derecho a `SectionHeader`. La ficha la baja a `'contenido'`. */
  escala?: 'portada' | 'contenido'
  /**
   * Lo que va ENTRE el header y el encabezado de la página: en la ficha, el
   * enlace de vuelta al catálogo. Va como prop y no como el primer hijo
   * porque `children` se pinta debajo del `SectionHeader`, y una salida que
   * aparece después del titular obliga a bajar para poder subir.
   */
  arriba?: ReactNode
  children?: ReactNode
  /**
   * Cuándo se muestra el botón flotante de WhatsApp.
   *
   * La ficha lo pide en `'nunca'`, EN NINGÚN VIEWPORT: en mobile ya tiene su
   * propia barra fija con el mismo botón, y en desktop el panel de precio
   * lleva el botón principal a la vista. Con el flotante además quedaban dos
   * biseles ámbar en pantalla pidiendo exactamente lo mismo, que es lo que
   * hace dudar de cuál es el bueno. El resto de las páginas internas no tiene
   * botón propio y lo muestran siempre.
   */
  flotante?: 'siempre' | 'nunca'
  /**
   * Una barra fija propia de la página, apilada arriba de la barra MENU (ver
   * `encima` en `Menu`). La usa la ficha para su WhatsApp de mobile.
   */
  barra?: ReactNode
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
  escala,
  arriba,
  children,
  flotante = 'siempre',
  barra,
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
      <Header tono={menuAbierto ? 'claro' : 'oscuro'} oculto={menuAbierto} />

      <Menu
        abierto={menuAbierto}
        onAbrir={() => setMenuAbierto(true)}
        onCerrar={() => setMenuAbierto(false)}
        encima={barra}
      />

      {/* `min-h-svh` y no `vh`: la barra del navegador de WhatsApp cambia el
          alto al scrollear y con `vh` la página entera se empuja.

          EL PADDING DE ARRIBA ES EL MÍNIMO QUE DESPEJA AL HEADER, no un
          respiro de portada. El header mide 64 px en mobile y 72 en desktop,
          así que `pt-24`/`md:pt-28` dejan 32 y 40 px de aire. Estaba en
          `pt-32 md:pt-40` y eso son 64 y 88 px de negro vacío entre el logo y
          el titular: en el home ese aire lo llena el hero, pero una página
          interna arranca en su encabezado y el hueco se lee como que algo no
          cargó. */}
      <main className="min-h-svh pt-24 pb-24 shell md:pt-28">
        {arriba}
        <SectionHeader
          index={indice}
          eyebrow={eyebrow}
          title={titulo}
          lead={lead}
          escala={escala}
        />
        {children}
      </main>

      <Footer />

      {!menuAbierto && flotante === 'siempre' && <WhatsApp />}
    </>
  )
}

export default PaginaInterna
