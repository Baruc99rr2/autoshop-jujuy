import { useEffect, useRef, useState } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Link } from 'react-router'
import Bevel from './Bevel'
import ErrorCarga from './ErrorCarga'
import SectionHeader from './SectionHeader'
import VehiculoCard, { VehiculoCardEsqueleto } from './VehiculoCard'
import { FILTROS } from '../data/catalogo'
import { seccion } from '../data/nav'
import { repo } from '../data/repo'
import type { Vehiculo } from '../types/vehiculo'

const S = seccion('vehiculos')

/** Cuántas unidades muestra el home. El stock completo vive en `/catalogo`. */
const CUANTAS = 3

/**
 * El ancho de la card EN EL RIEL. Está elegido por el ALTO que resulta: con la
 * foto en 4:3, una card del 46% del contenedor mide 660 px de ancho y 495 solo
 * de foto, así que en un notebook de 900 px no entran la foto y el precio en la
 * misma pantalla —y el precio es el dato de la sección—. Al 40% la card entera
 * entra, y siguen viéndose dos completas más el borde de la tercera, que es lo
 * que hace que el conjunto se lea como riel y no como grilla.
 *
 * En la grilla del catálogo la misma card va al 100% de su columna: ese ancho
 * lo pone `/catalogo`, no este archivo.
 */
const ANCHO_RIEL = 'w-[85vw] shrink-0 md:w-[56%] lg:w-[40%]'

/**
 * Vehículos destacados.
 *
 * RIEL HORIZONTAL, NO GRILLA. Con tres unidades, una grilla de tres columnas
 * se lee como "no tienen más autos"; tres cards grandes en un riel se leen
 * como una selección. Es la misma cantidad de contenido diciendo otra cosa.
 *
 * Los datos salen del repositorio, nunca de un array escrito en el código: hoy
 * el repo es el mock sobre localStorage y mañana es Supabase, y esta sección
 * no se entera.
 */
export function Vehiculos() {
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]['id']>('todos')
  const [lista, setLista] = useState<Vehiculo[]>([])
  const [cargando, setCargando] = useState(true)
  const [fallo, setFallo] = useState(false)
  const [intento, setIntento] = useState(0)
  const riel = useRef<HTMLDivElement>(null)
  const arrastre = useRef<{
    x: number
    scroll: number
    id: number
    capturado: boolean
  } | null>(null)
  const ultimoFueArrastre = useRef(false)

  // Destacados; si la dueña todavía no marcó ninguno, los más recientes. El
  // home nunca puede quedar sin autos por un campo que nadie tildó.
  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const destacados = await repo.listarDestacados(CUANTAS)
        const final =
          destacados.length > 0
            ? destacados
            : await repo.listar({ orden: 'recientes', limite: CUANTAS })
        if (!vivo) return
        setLista(final)
        setFallo(false)
      } catch {
        if (vivo) setFallo(true)
      } finally {
        if (vivo) setCargando(false)
      }
    })()
    return () => {
      vivo = false
    }
  }, [intento])

  // Las cards y el cartel de error no miden lo mismo que los esqueletos: al
  // llegar la respuesta, lo de abajo se corre y los pines tienen que volver
  // a medir.
  useEffect(() => {
    if (cargando) return
    const t = requestAnimationFrame(() => ScrollTrigger.refresh())
    return () => cancelAnimationFrame(t)
  }, [cargando, fallo])

  const reintentar = () => {
    setFallo(false)
    setCargando(true)
    setIntento((n) => n + 1)
  }

  const visibles =
    filtro === 'todos' ? lista : lista.filter((v) => v.condicion === filtro)

  // Arrastre con puntero. ES DEL RIEL, no de la card: la grilla del catálogo
  // usa la misma card y ahí no hay nada que arrastrar.
  //
  // La captura NO se pide en el `pointerdown` sino recién cuando el gesto
  // superó el umbral. Pedirla antes rompía la navegación entera: con
  // `setPointerCapture` puesto, Chrome dispara el `click` sobre el elemento
  // que capturó —el riel— y no sobre el link de la card, así que un click
  // limpio en una card no abría nada. Estando puesta solo durante un arrastre
  // real, se sigue ganando lo que la captura da: soltar el mouse fuera del
  // riel termina el gesto en vez de dejarlo pegado.
  const UMBRAL = 6

  const alBajar = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !riel.current) return
    arrastre.current = {
      x: e.clientX,
      scroll: riel.current.scrollLeft,
      id: e.pointerId,
      capturado: false,
    }
  }

  const alMover = (e: React.PointerEvent<HTMLDivElement>) => {
    const a = arrastre.current
    if (!a || !riel.current) return
    const dx = e.clientX - a.x
    if (!a.capturado) {
      if (Math.abs(dx) < UMBRAL) return
      a.capturado = true
      riel.current.setPointerCapture(a.id)
    }
    riel.current.scrollLeft = a.scroll - dx
  }

  const alSoltar = () => {
    const a = arrastre.current
    if (!a || !riel.current) return
    if (a.capturado) riel.current.releasePointerCapture(a.id)
    arrastre.current = null
    // Se recuerda hasta el `click`, que llega justo después del `pointerup`.
    ultimoFueArrastre.current = a.capturado
  }

  // Arrastrar el riel terminaba abriendo la ficha de la card donde se soltó el
  // mouse. Se cancela el click cuando el gesto movió el riel; un click limpio
  // pasa igual que antes.
  const alClickear = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ultimoFueArrastre.current) return
    e.preventDefault()
    e.stopPropagation()
    ultimoFueArrastre.current = false
  }

  return (
    <section id={S.id} className="border-b border-graphite/60 py-20 md:py-28">
      <div className="shell">
        <SectionHeader index={S.indice} eyebrow={S.eyebrow} title={S.titulo} />

        <div
          className="mt-8 flex flex-wrap gap-2"
          role="group"
          aria-label="Filtrar por condición"
        >
          {FILTROS.map((f) => {
            const activo = f.id === filtro
            return (
              <Bevel
                key={f.id}
                as="button"
                type="button"
                variant={activo ? 'solid' : 'outline'}
                bevel={10}
                onClick={() => setFiltro(f.id)}
                aria-pressed={activo}
                outerClassName={
                  activo
                    ? undefined
                    : 'block transition-colors duration-200 hover:bg-amber'
                }
                className="font-hud px-5 py-2.5"
              >
                {f.label.toUpperCase()}
              </Bevel>
            )
          })}
        </div>
      </div>

      {/* El riel sangra hasta el borde derecho a propósito: una card cortada
          por el borde es lo que le dice al ojo que hay más para el costado. */}
      <div
        ref={riel}
        className="veh-riel mt-8 flex items-stretch gap-5 overflow-x-auto pb-4"
        onPointerDown={alBajar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        onClickCapture={alClickear}
        // El navegador arrastra links e imágenes por su cuenta, y eso pisa el
        // gesto del riel con el fantasma del link colgando del mouse.
        onDragStart={(e) => e.preventDefault()}
      >
        {/* Mientras llegan, esqueletos del mismo ancho que las cards: debajo
            hay secciones con pin, y una sección que crece de golpe cuando
            responde la red corre todos los puntos de ScrollTrigger. */}
        {cargando
          ? Array.from({ length: CUANTAS }, (_, i) => (
              <VehiculoCardEsqueleto key={i} className={ANCHO_RIEL} />
            ))
          : visibles.map((v) => <VehiculoCard key={v.id} v={v} className={ANCHO_RIEL} />)}
      </div>

      {fallo && (
        <div className="shell">
          <ErrorCarga
            titulo="No pudimos traer las unidades"
            onReintentar={reintentar}
            conWhatsapp
          />
        </div>
      )}

      {!cargando && !fallo && visibles.length === 0 && (
        <p className="mt-2 text-bone/55 shell">
          No hay unidades cargadas con esa condición. Escribinos y te avisamos
          apenas entre alguna.
        </p>
      )}

      <div className="mt-8 shell">
        <Bevel
          as={Link}
          variant="outline"
          bevel={12}
          to="/catalogo"
          outerClassName="inline-block transition-colors duration-200 hover:bg-amber"
          className="font-hud px-5 py-3 text-bone"
        >
          VER CATÁLOGO COMPLETO
        </Bevel>
      </div>
    </section>
  )
}

export default Vehiculos
