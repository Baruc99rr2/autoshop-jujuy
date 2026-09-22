/**
 * Guardia contra los resizes que NO son resizes.
 *
 * EL PROBLEMA. En el navegador interno de WhatsApp en Android —y en menor
 * medida en Safari de iOS— hay una barra superior que se contrae y se expande
 * al scrollear. Cada vez que se mueve, el alto del viewport cambia y el
 * navegador dispara un `resize`. Si algo del sitio recalcula layout ahí, la
 * página entera se empuja hacia abajo y vuelve, varias veces por segundo,
 * mientras el usuario scrollea. Es el peor síntoma posible para una demo que
 * el cliente probablemente va a abrir desde un chat de WhatsApp.
 *
 * LA DISTINCIÓN. Un cambio de ANCHO es un giro de pantalla o una ventana
 * redimensionada: ahí sí hay que recalcular todo. Un cambio de ALTO solo, y
 * chico, es la barra del navegador y hay que ignorarlo.
 *
 * El umbral está en 150 px porque las barras de Chrome, de Safari y del
 * navegador de WhatsApp miden entre 50 y 120 px. Un teclado virtual abriéndose
 * mueve mucho más que eso, y un cambio de alto real de más de 150 px sin que
 * cambie el ancho es raro en un teléfono, así que dejar pasar esos casos no
 * cuesta nada.
 */
const UMBRAL_ALTO = 150

/**
 * Llama a `cb` solo cuando el viewport cambió DE VERDAD.
 *
 * Devuelve la función de limpieza. El primer `resize` no dispara nada: el
 * tamaño inicial queda registrado al suscribirse.
 */
export function onViewportChange(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {}

  let ancho = window.innerWidth
  let alto = window.innerHeight

  const alCambiar = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    const cambioReal = w !== ancho || Math.abs(h - alto) > UMBRAL_ALTO
    // El alto se actualiza SIEMPRE, aunque no se dispare el callback: si no,
    // la barra bajando de a poco acumularía diferencia hasta cruzar el umbral
    // sin que haya pasado nada.
    ancho = w
    alto = h
    if (cambioReal) cb()
  }

  window.addEventListener('resize', alCambiar)
  return () => window.removeEventListener('resize', alCambiar)
}

/**
 * La versión para `ResizeObserver`: decide si una entrada vale la pena.
 *
 * Se le pasa el ancho anterior y devuelve si hay que recalcular. Se usa donde
 * lo que se observa es un elemento y no la ventana — por ejemplo el contenedor
 * del logotipo del footer, que cambia de alto cuando cambia el font-size de su
 * propio contenido.
 */
export function anchoCambio(anterior: number, actual: number): boolean {
  return Math.round(anterior) !== Math.round(actual)
}
