import { useEffect, useState } from 'react'

/**
 * Suscripción a una media query.
 *
 * Existe para que el hero pueda elegir QUÉ LAYOUT MONTAR en vez de montar los
 * dos y esconder uno con `md:hidden`. Con las dos variantes en el DOM había
 * dos `<video>` con el mismo `src`, y el oculto igual pedía la metadata del
 * archivo: una petición de red y un decodificador por una caja que nadie ve.
 *
 * El valor inicial se lee de forma síncrona, así que no hay un frame con el
 * layout equivocado antes de que corra el efecto.
 */
export function useMedia(query: string): boolean {
  const [coincide, setCoincide] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(query)
    const alCambiar = () => setCoincide(mq.matches)
    alCambiar()
    mq.addEventListener('change', alCambiar)
    return () => mq.removeEventListener('change', alCambiar)
  }, [query])

  return coincide
}
