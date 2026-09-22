import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { scrollTo } from './smooth'

/**
 * Un solo destino para el menú, el footer y el header.
 *
 * Los hrefs del sitio son de dos clases y no se pueden tratar igual:
 *
 * - `#vehiculos` es una SECCIÓN del home. Estando en el home se scrollea con
 *   Lenis; desde cualquier otra ruta hay que ir primero al home, así que se
 *   navega a `/#vehiculos` y el home lee el hash al montarse.
 * - `/catalogo` es una RUTA y se navega.
 *
 * Sin esto, "Nosotros" desde la ficha de un auto no hacía nada: `scrollTo`
 * buscaba un `#contadores` que en esa página no existe.
 */
export function useIrA(): (href: string) => void {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return useCallback(
    (href: string) => {
      if (!href.startsWith('#')) {
        navigate(href)
        return
      }
      if (pathname === '/') {
        scrollTo(href)
        return
      }
      navigate(`/${href}`)
    },
    [navigate, pathname],
  )
}
