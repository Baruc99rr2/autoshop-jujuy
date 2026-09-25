import { useCallback, useEffect, useRef, useState } from 'react'
import { CLAVE_CIERRE, cerrarPorInactividad } from '../data/sesion'
import { subidasEnCurso } from './subidas'

/**
 * Cierre de sesión por inactividad, SOLO en el panel.
 *
 * El panel se abre casi siempre desde el celular de la dueña, y un celular se
 * pierde, se presta o queda sobre el mostrador con la pantalla desbloqueada.
 * A los 30 minutos sin uso la sesión se cierra sola; a los 28 aparece el
 * aviso con la cuenta regresiva (`AvisoInactividad`).
 *
 * UN SOLO RELOJ PARA TODAS LAS PESTAÑAS. La última actividad se guarda en
 * localStorage y cada pestaña escucha el evento `storage`: trabajar en una
 * mantiene viva la otra, y como todas cuentan desde el mismo instante, vencen
 * juntas. Además la que cierra deja una marca (`CLAVE_CIERRE`) y las demás
 * cierran al verla, por si alguna tenía el reloj atrasado (una pestaña en
 * segundo plano el navegador la duerme).
 *
 * ACTIVIDAD es tocar, hacer click, escribir y scrollear, y también tener una
 * subida en curso (`lib/subidas.ts`): subir un video con mala señal puede
 * tardar más que el aviso, y sacarla a la mitad sería tirar la subida.
 */

export const LIMITE_MS = 30 * 60_000
export const AVISO_MS = 2 * 60_000

const CLAVE_ACTIVIDAD = 'autoshop.panel.actividad'
/** Escribir en localStorage en cada tecla es gratis pero despierta a las otras pestañas: a lo sumo cada 5 s. */
const CADA_MS = 5_000
/*
 * Scrollear cuenta, pero NO por el evento `scroll`: ese lo dispara también un
 * scroll programático (Lenis terminando una inercia, un `scrollTo` del
 * formulario), y el panel se mantendría vivo solo. Lo que mueve la página una
 * persona llega antes como rueda, dedo, tecla o click en la barra.
 */
const EVENTOS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'touchmove'] as const

function leerCompartida(): number {
  try {
    return Number(localStorage.getItem(CLAVE_ACTIVIDAD) ?? 0)
  } catch {
    return 0
  }
}

/**
 * Cuánto falta para el cierre, en ms, o `null` mientras falte más que el
 * aviso. Devuelve también `seguir()`, el botón "Seguir conectada".
 */
export function useInactividad(): { restante: number | null; seguir: () => void } {
  const [restante, setRestante] = useState<number | null>(null)
  /** El `marcar` del efecto, forzando la escritura: lo usa "Seguir conectada". */
  const reiniciar = useRef<() => void>(() => {})
  const seguir = useCallback(() => {
    reiniciar.current()
    setRestante(null)
  }, [])

  useEffect(() => {
    let ultima = Math.max(Date.now(), leerCompartida())
    let escrita = 0
    let cerrando = false

    const marcar = () => {
      const ahora = Date.now()
      ultima = ahora
      if (ahora - escrita < CADA_MS) return
      escrita = ahora
      try {
        localStorage.setItem(CLAVE_ACTIVIDAD, String(ahora))
      } catch {
        /* sin almacenamiento, el reloj es solo de esta pestaña */
      }
    }
    marcar()
    reiniciar.current = () => {
      escrita = 0
      marcar()
    }

    const cerrar = () => {
      if (cerrando) return
      cerrando = true
      cerrarPorInactividad()
    }

    const alGuardar = (e: StorageEvent) => {
      if (e.key === CLAVE_ACTIVIDAD) ultima = Math.max(ultima, Number(e.newValue ?? 0))
      else if (e.key === CLAVE_CIERRE && e.newValue) cerrar()
    }

    const tic = () => {
      if (subidasEnCurso() > 0) marcar()
      // También se relee lo compartido: un `storage` perdido mientras la
      // pestaña dormía no puede cerrar una sesión que la otra usa.
      ultima = Math.max(ultima, leerCompartida())
      const falta = ultima + LIMITE_MS - Date.now()
      if (falta <= 0) {
        setRestante(0)
        cerrar()
      } else {
        setRestante(falta <= AVISO_MS ? falta : null)
      }
    }

    EVENTOS.forEach((ev) =>
      window.addEventListener(ev, marcar, { passive: true, capture: true }),
    )
    window.addEventListener('storage', alGuardar)
    // Al volver a la pestaña se revisa en el acto: un celular bloqueado
    // congela los timers, y al desbloquearlo no puede mostrar el panel una
    // hora vencida hasta el próximo tic.
    document.addEventListener('visibilitychange', tic)
    const intervalo = setInterval(tic, 1000)

    return () => {
      EVENTOS.forEach((ev) =>
        window.removeEventListener(ev, marcar, { capture: true }),
      )
      window.removeEventListener('storage', alGuardar)
      document.removeEventListener('visibilitychange', tic)
      clearInterval(intervalo)
    }
  }, [])

  return { restante, seguir }
}
