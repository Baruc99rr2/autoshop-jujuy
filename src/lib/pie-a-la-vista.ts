import { useEffect, useSyncExternalStore, type RefObject } from 'react'

/**
 * Si la barra inferior del footer está en pantalla.
 *
 * EL PROBLEMA. Todo el mueble flotante del sitio vive pegado al borde de
 * abajo: la barra MENU centrada, el botón de WhatsApp a la derecha y, en la
 * ficha, la barra fija de mobile. Cuando la página llega al final, esos tres
 * quedan justo encima de la última franja del footer —el © y la firma del
 * estudio—, que es la única parte del sitio con un enlace externo y la que más
 * chica se lee. No es que se vea apretado: en 390 px el enlace queda
 * literalmente abajo de un bisel ámbar y no se puede tocar.
 *
 * LA SOLUCIÓN. Un `IntersectionObserver` sobre esa franja. Cuando aparece, los
 * flotantes se van con el mismo gesto con el que la barra MENU se va cuando se
 * abre el menú: bajan un poco y se apagan. No se "suben" para dejarla pasar
 * porque subirlos los pondría encima de las tres columnas de links del footer,
 * que es el mismo problema movido de lugar; y al final de la página no hacen
 * falta, porque el footer tiene la navegación completa y su propio enlace de
 * WhatsApp.
 *
 * QUIÉN OBSERVA A QUIÉN. Observa el FOOTER, sobre su propia ref, y lo que
 * viaja hasta los flotantes es un booleano. No al revés.
 *
 * Las dos versiones anteriores hacían que cada flotante buscara el nodo del
 * footer —primero con `getElementById`, después con un registro— y las dos
 * fallaban en la ficha por lo mismo: `Vehiculo` monta un árbol con el
 * esqueleto y, cuando llegan los datos, lo desmonta entero y monta otro. Ahí
 * hay un footer que se va y uno que llega en el mismo commit, y quién ve qué
 * depende del orden exacto en que React separa y vuelve a enganchar las refs.
 * Apoyarse en ese orden es apoyarse en un detalle de implementación: en
 * 390 px la barra de WhatsApp de la ficha siguió tapando el © hasta que el
 * dueño lo vio en el navegador.
 *
 * Con el footer como dueño del observador no hay orden que acertar. Su efecto
 * corre sobre una ref propia, que para entonces está enganchada sí o sí, y el
 * booleano sobrevive al cambio: el footer que se va lo apaga y el que llega lo
 * vuelve a calcular.
 */

/** Cuánto antes de que asome la franja se apartan los flotantes, en px. */
const MARGEN = 32

let aLaVista = false
const oyentes = new Set<() => void>()

function publicar(valor: boolean): void {
  if (valor === aLaVista) return
  aLaVista = valor
  oyentes.forEach((avisar) => avisar())
}

/** Lo usa `Footer` sobre la ref de su franja inferior. Nadie más. */
export function useObservarPie(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current
    if (!el) return

    const io = new IntersectionObserver(
      ([entrada]) => publicar(entrada.isIntersecting),
      { rootMargin: `0px 0px ${MARGEN}px 0px` },
    )
    io.observe(el)

    return () => {
      io.disconnect()
      // Sin footer no hay nada que tapar, así que los flotantes vuelven. Si lo
      // que pasó fue un cambio de página, el footer nuevo lo recalcula.
      publicar(false)
    }
  }, [ref])
}

/** Lo usan los flotantes para saber si tienen que apartarse. */
export function usePieALaVista(): boolean {
  return useSyncExternalStore(
    (avisar) => {
      oyentes.add(avisar)
      return () => oyentes.delete(avisar)
    },
    () => aLaVista,
    () => false,
  )
}
