import { useCallback, useEffect, useRef, useState } from 'react'
import Bevel from './Bevel'
import Icono from './Icono'
import { prefersReducedMotion } from '../lib/motion-prefs'
import { startScroll, stopScroll } from '../lib/smooth'
import { useMedia } from '../lib/use-media'
import type { Foto } from '../types/vehiculo'

/**
 * El visor de fotos a pantalla completa.
 *
 * POR QUÉ EXISTE. En un teléfono la galería de la ficha mide lo que mide la
 * columna de texto, y un auto en 340 px de ancho no se mira: se adivina. Acá
 * la foto ocupa la pantalla entera y se ve el estado de la pintura, el
 * tapizado y las llantas, que es lo único que alguien quiere revisar antes de
 * escribir por WhatsApp.
 *
 * UN SOLO MECANISMO PARA LOS DOS DISPOSITIVOS, al revés que en la galería de
 * abajo. Acá la tira con scroll-snap sirve igual de bien en los dos: con el
 * dedo se desliza y con el teclado o las flechas se llama a `scrollTo`, así
 * que el índice se sigue deduciendo del `scrollLeft` y no hay dos verdades que
 * mantener sincronizadas. Lo único que cambia por dispositivo son las flechas,
 * que solo aparecen donde hay puntero.
 *
 * Las fotos van en `object-contain` y no `cover`: acá el encuadre lo puso
 * quien sacó la foto y recortarlo sería esconder justamente lo que se vino a
 * mirar.
 */

const MD = '(min-width: 768px)'

/**
 * Cuánto hay que arrastrar hacia abajo para que se cierre, en px.
 *
 * 110 es un gesto claramente intencional en un teléfono: por debajo de eso
 * quedan los tirones de quien intenta scrollear la página que hay detrás, y
 * cerrarle el visor a alguien que no lo pidió es peor que no tener el gesto.
 */
const CIERRE_Y = 110

type VisorFotosProps = {
  fotos: Foto[]
  /** Para el `aria-label` del diálogo y el `alt` de la foto que se está viendo. */
  titulo: string
  /** Qué foto se abre. Es la que se tocó, no siempre la primera. */
  inicial: number
  onCerrar: () => void
}

export function VisorFotos({
  fotos,
  titulo,
  inicial,
  onCerrar,
}: VisorFotosProps) {
  const [i, setI] = useState(inicial)
  /** Cuánto se lleva arrastrado hacia abajo. 0 cuando no hay gesto en curso. */
  const [arrastre, setArrastre] = useState(0)

  const tira = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const cerrar = useRef<HTMLButtonElement>(null)

  const conPuntero = useMedia(MD)
  const sola = fotos.length === 1

  // ── Montaje ───────────────────────────────────────────────────────────
  // Se frena el scroll de la página de atrás y se lleva el foco al botón de
  // cerrar, que es la salida. Al desmontar se devuelve el foco a lo que lo
  // tenía —la foto que se tocó—, si no quien navega con teclado vuelve al
  // principio del documento y tiene que recorrer la ficha entera otra vez.
  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null
    stopScroll()
    cerrar.current?.focus()
    return () => {
      startScroll()
      previo?.focus?.()
    }
  }, [])

  // La tira arranca en la foto que se tocó. Va sin `behavior: smooth` a
  // propósito: es la posición inicial, no un movimiento, y verla viajar desde
  // la primera foto sería un efecto que nadie pidió.
  useEffect(() => {
    const el = tira.current
    if (el) el.scrollLeft = inicial * el.clientWidth
  }, [inicial])

  const alScrollear = () => {
    const el = tira.current
    if (!el) return
    const n = Math.round(el.scrollLeft / el.clientWidth)
    setI(Math.min(Math.max(n, 0), fotos.length - 1))
  }

  /**
   * Mover la tira, que es lo mismo que cambiar de foto: el índice lo va a
   * recalcular `onScroll` cuando llegue. No se toca `setI` acá para no tener
   * dos fuentes de verdad —el scroll manda— salvo cuando el movimiento es
   * instantáneo, que es el caso de `prefers-reduced-motion`.
   */
  const irA = useCallback(
    (n: number) => {
      const el = tira.current
      if (!el) return
      const k = Math.min(Math.max(n, 0), fotos.length - 1)
      el.scrollTo({
        left: k * el.clientWidth,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      })
    },
    [fotos.length],
  )

  // ── Teclado ───────────────────────────────────────────────────────────
  // Escape cierra y las flechas se mueven, que es lo que espera cualquiera
  // que haya abierto una foto en una pantalla con teclado. El listener va en
  // `window` y no en el panel: el foco puede estar en cualquiera de los
  // botones de adentro, y todos tienen que responder igual.
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCerrar()
        return
      }
      if (sola) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        irA(i - 1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        irA(i + 1)
      }
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [i, sola, onCerrar, irA])

  /**
   * El foco no se escapa del visor.
   *
   * Es un diálogo modal: con Tab suelto se recorrería la ficha que quedó
   * debajo, que no se ve y no se puede tocar. Se resuelve a mano y no con una
   * librería porque acá adentro hay tres botones contados y el ciclo es una
   * división por módulo.
   */
  const alTabular = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return
    const foco = panel.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled])',
    )
    if (!foco || foco.length === 0) return
    const lista = Array.from(foco)
    const actual = lista.indexOf(document.activeElement as HTMLElement)
    const paso = e.shiftKey ? -1 : 1
    const siguiente = (actual + paso + lista.length) % lista.length
    e.preventDefault()
    lista[siguiente].focus()
  }

  // ── Arrastrar hacia abajo para cerrar ─────────────────────────────────
  // El eje se decide en el primer movimiento y no se vuelve a discutir: sin
  // eso, un deslizamiento horizontal con la muñeca apenas torcida arrastra el
  // panel hacia abajo mientras la tira cambia de foto, y se ven las dos cosas
  // a la vez. `'?'` es "todavía no sé".
  const gesto = useRef<{ x: number; y: number; eje: '?' | 'x' | 'y' } | null>(
    null,
  )

  const alTocar = (e: React.TouchEvent) => {
    const t = e.touches[0]
    gesto.current = { x: t.clientX, y: t.clientY, eje: '?' }
  }

  const alMover = (e: React.TouchEvent) => {
    const g = gesto.current
    if (!g) return
    const t = e.touches[0]
    const dx = t.clientX - g.x
    const dy = t.clientY - g.y
    if (g.eje === '?') {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      g.eje = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x'
    }
    if (g.eje !== 'y') return
    // Solo hacia abajo. Hacia arriba no cierra nada, así que el panel no se
    // mueve: un gesto que arranca a la deriva y no termina en nada se lee
    // como que la pantalla está rota.
    setArrastre(Math.max(dy, 0))
  }

  const alSoltar = () => {
    const paso = arrastre
    gesto.current = null
    setArrastre(0)
    if (paso > CIERRE_Y) onCerrar()
  }

  const foto = fotos[i]

  return (
    /* `z-70`: por encima de todo el mueble flotante del sitio —el header (55),
       el botón de WhatsApp (60) y la barra fija de la ficha (40)—. Un visor a
       pantalla completa con el logo del header encima no es a pantalla
       completa. */
    <div
      className="fixed inset-0 z-70 bg-void/96"
      role="dialog"
      aria-modal="true"
      aria-label={`Fotos de ${titulo}`}
      onKeyDown={alTabular}
      onTouchStart={alTocar}
      onTouchMove={alMover}
      onTouchEnd={alSoltar}
      onTouchCancel={alSoltar}
    >
      <div
        ref={panel}
        /* `h-svh` y no `vh`: la barra del navegador de WhatsApp cambia el alto
           al scrollear y con `vh` el visor queda más alto que la pantalla.
           La opacidad acompaña al arrastre: el panel no solo baja, se va. */
        className="flex h-svh flex-col"
        style={{
          transform: arrastre ? `translateY(${arrastre}px)` : undefined,
          opacity: arrastre ? Math.max(1 - arrastre / (CIERRE_Y * 2.2), 0.3) : 1,
          transition: arrastre ? 'none' : 'transform .25s ease, opacity .25s ease',
        }}
      >
        {/* ── Barra de arriba ───────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between gap-4 px-4 py-4 md:px-6">
          <p className="font-hud num text-bone/70" aria-hidden="true">
            {i + 1} / {fotos.length}
          </p>
          {/* Lo que se anuncia al cambiar de foto. El indicador de al lado se
              lee "tres barra diez", que no dice nada. */}
          <p className="sr-only" aria-live="polite">
            Foto {i + 1} de {fotos.length}
          </p>

          <Bevel
            as="button"
            ref={cerrar}
            type="button"
            variant="outline"
            bevel={10}
            borderClassName="bg-graphite"
            outerClassName="block transition-colors duration-200 hover:bg-amber focus-visible:bg-amber"
            className="flex items-center gap-2 p-3 text-bone"
            onClick={onCerrar}
          >
            <Icono name="cerrar" className="h-5 w-5" />
            <span className="sr-only">Cerrar el visor de fotos</span>
          </Bevel>
        </div>

        {/* ── Las fotos ─────────────────────────────────────────────── */}
        <div className="relative min-h-0 flex-1">
          <div
            ref={tira}
            onScroll={sola ? undefined : alScrollear}
            className={`gal-tira flex h-full ${sola ? '' : 'overflow-x-auto overscroll-x-contain'}`}
            role={sola ? undefined : 'group'}
            aria-label={sola ? undefined : `Fotos de ${titulo}`}
            tabIndex={sola ? undefined : 0}
          >
            {fotos.map((f, k) => (
              <div
                key={f.id}
                className="gal-slide grid h-full w-full shrink-0 place-items-center px-4"
              >
                <img
                  src={f.url}
                  alt={k === 0 ? titulo : ''}
                  width={f.ancho}
                  height={f.alto}
                  /* La que se abrió tiene que estar ya; el resto llega cuando
                     alguien deslice. En la práctica están todas en caché: son
                     las mismas urls que la galería de la ficha. */
                  loading={k === inicial ? 'eager' : 'lazy'}
                  decoding="async"
                  className="max-h-full w-auto max-w-full object-contain"
                />
              </div>
            ))}
          </div>

          {/* Las flechas solo donde hay puntero. En un teléfono el gesto es el
              dedo y dos botones sobre la foto le comen la pantalla. */}
          {conPuntero && !sola && (
            <>
              <Flecha
                hacia="izquierda"
                onClick={() => irA(i - 1)}
                deshabilitada={i === 0}
              />
              <Flecha
                hacia="derecha"
                onClick={() => irA(i + 1)}
                deshabilitada={i === fotos.length - 1}
              />
            </>
          )}
        </div>

        {/* ── Pie ───────────────────────────────────────────────────── */}
        {/* Dice cómo se sale, porque el gesto de arrastrar hacia abajo no se
            ve. La X ya está arriba: esto es para quien no la busca. */}
        <p className="font-hud shrink-0 px-4 py-4 text-center text-bone/35 md:px-6">
          {sola
            ? 'TOCÁ LA X PARA VOLVER'
            : conPuntero
              ? 'FLECHAS PARA MOVERTE · ESC PARA CERRAR'
              : 'DESLIZÁ PARA CAMBIAR · HACIA ABAJO PARA CERRAR'}
        </p>
      </div>

      {/* Solo para el lector de pantalla: el `alt` de la foto activa cambia con
          el scroll, y sin esto no hay forma de saber qué se está mirando. */}
      <span className="sr-only">{foto ? titulo : ''}</span>
    </div>
  )
}

/**
 * Una de las dos flechas de escritorio.
 *
 * Deshabilitada en los extremos en vez de dar la vuelta: con "3 / 10" a la
 * vista, volver a la primera foto después de la última se lee como que algo
 * falló, no como una vuelta.
 */
function Flecha({
  hacia,
  onClick,
  deshabilitada,
}: {
  hacia: 'izquierda' | 'derecha'
  onClick: () => void
  deshabilitada: boolean
}) {
  const izq = hacia === 'izquierda'
  return (
    <Bevel
      as="button"
      type="button"
      variant="outline"
      bevel={10}
      borderClassName="bg-graphite"
      outerClassName={`absolute top-1/2 -translate-y-1/2 transition-colors duration-200 ${
        izq ? 'left-4' : 'right-4'
      } ${deshabilitada ? 'opacity-25' : 'hover:bg-amber focus-visible:bg-amber'}`}
      className="p-3 text-bone"
      onClick={onClick}
      disabled={deshabilitada}
    >
      <Icono name={hacia} className="h-6 w-6" />
      <span className="sr-only">
        {izq ? 'Foto anterior' : 'Foto siguiente'}
      </span>
    </Bevel>
  )
}

export default VisorFotos
