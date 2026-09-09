import { useEffect, useId, useRef, useState } from 'react'
import { gsap } from 'gsap'
import Bevel from './Bevel'
import SectionHeader from './SectionHeader'
import { ANIOS, MARCAS_USADOS, estimar } from '../data/cotizador'
import { prefersReducedMotion } from '../lib/motion-prefs'

const PESOS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

/** Duración del escaneo: dos pasadas de 0.6 s, como pide el guion. */
const ESCANEO_MS = 1200

type Estado = 'vacio' | 'escaneando' | 'listo'

function SelectBiselado({
  id,
  label,
  value,
  onChange,
  disabled,
  children,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <Bevel
      variant="outline"
      bevel={12}
      borderClassName="bg-graphite"
      outerClassName={`block transition-colors duration-200 focus-within:bg-amber ${
        disabled ? 'opacity-45' : ''
      }`}
      className="px-4 pt-3 pb-3.5"
    >
      <label htmlFor={id} className="font-hud mb-1.5 block text-bone/45">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-transparent text-base text-bone outline-none disabled:cursor-not-allowed"
      >
        {children}
      </select>
    </Bevel>
  )
}

/**
 * Cotizador de usados.
 *
 * El botón dispara un escaneo: una línea ámbar recorre la card de arriba abajo
 * dos veces en 1,2 s y recién después aparece el rango, contando desde 0. Es
 * el único momento de la sección en que se mueve algo, y lo dispara la persona.
 *
 * Con `prefers-reduced-motion` el resultado aparece directo: sin escaneo y sin
 * conteo. El contenido es el mismo, solo que instantáneo.
 */
export function Cotizador() {
  const uid = useId()
  const card = useRef<HTMLDivElement>(null)
  const minRef = useRef<HTMLSpanElement>(null)
  const maxRef = useRef<HTMLSpanElement>(null)

  const [marcaId, setMarcaId] = useState('')
  const [modeloId, setModeloId] = useState('')
  const [anio, setAnio] = useState('')
  const [estado, setEstado] = useState<Estado>('vacio')

  const marca = MARCAS_USADOS.find((m) => m.id === marcaId)
  const modelo = marca?.modelos.find((m) => m.id === modeloId)
  const completo = Boolean(modelo && anio)

  // Cambiar la marca invalida el modelo elegido, y cualquier cambio invalida
  // un resultado ya calculado: dejarlo en pantalla lo volvería la cotización
  // de un auto que no es.
  const cambiarMarca = (v: string) => {
    setMarcaId(v)
    setModeloId('')
    setEstado('vacio')
  }

  const escanear = () => {
    if (!completo) return
    if (prefersReducedMotion()) {
      setEstado('listo')
      return
    }
    setEstado('escaneando')
    window.setTimeout(() => setEstado('listo'), ESCANEO_MS)
  }

  // El conteo del resultado. Va en un efecto y no en el timeout para que
  // también corra cuando el estado llega a 'listo' por el camino de
  // reduced-motion, donde no hay escaneo.
  useEffect(() => {
    if (estado !== 'listo' || !modelo || !anio) return
    const { min, max } = estimar(modelo.base, Number(anio))
    const escribir = (el: HTMLElement | null, v: number) => {
      if (el) el.textContent = PESOS.format(Math.round(v))
    }

    if (prefersReducedMotion()) {
      escribir(minRef.current, min)
      escribir(maxRef.current, max)
      return
    }

    const n = { a: 0, b: 0 }
    const tw = gsap.to(n, {
      a: min,
      b: max,
      duration: 1.1,
      ease: 'power2.out',
      onUpdate: () => {
        escribir(minRef.current, n.a)
        escribir(maxRef.current, n.b)
      },
    })
    return () => {
      tw.kill()
    }
  }, [estado, modelo, anio])

  return (
    <section
      id="cotizador"
      className="border-b border-graphite/60 py-24 shell md:py-32"
    >
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
        <SectionHeader
          index="06"
          eyebrow="COTIZADOR"
          title={
            <>
              Cotizá
              <br />
              tu usado
            </>
          }
          lead="Tres datos y te damos un rango de referencia. El número final sale cuando lo vemos: estado, kilómetros y service al día mueven la aguja."
          className="lg:sticky lg:top-28 lg:self-start"
        />

        <Bevel
          variant="outline"
          bevel={18}
          outerClassName="relative"
          className="relative overflow-hidden p-6 md:p-10"
        >
          {/* La línea del escaneo. Ocupa toda la card y se desplaza una vez su
              propio alto, así que barre de arriba abajo con puro transform. */}
          {estado === 'escaneando' && (
            <div
              ref={card}
              className="escaneo pointer-events-none absolute inset-0 z-10"
              aria-hidden="true"
            />
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <SelectBiselado
              id={`${uid}-marca`}
              label="Marca"
              value={marcaId}
              onChange={cambiarMarca}
            >
              <option value="" className="bg-asphalt">
                Elegí
              </option>
              {MARCAS_USADOS.map((m) => (
                <option key={m.id} value={m.id} className="bg-asphalt">
                  {m.nombre}
                </option>
              ))}
            </SelectBiselado>

            <SelectBiselado
              id={`${uid}-modelo`}
              label="Modelo"
              value={modeloId}
              disabled={!marca}
              onChange={(v) => {
                setModeloId(v)
                setEstado('vacio')
              }}
            >
              <option value="" className="bg-asphalt">
                {marca ? 'Elegí' : 'Primero la marca'}
              </option>
              {marca?.modelos.map((m) => (
                <option key={m.id} value={m.id} className="bg-asphalt">
                  {m.nombre}
                </option>
              ))}
            </SelectBiselado>

            <SelectBiselado
              id={`${uid}-anio`}
              label="Año"
              value={anio}
              onChange={(v) => {
                setAnio(v)
                setEstado('vacio')
              }}
            >
              <option value="" className="bg-asphalt">
                Elegí
              </option>
              {ANIOS.map((a) => (
                <option key={a} value={a} className="bg-asphalt">
                  {a}
                </option>
              ))}
            </SelectBiselado>
          </div>

          <Bevel
            as="button"
            variant="solid"
            bevel={12}
            className={`font-hud mt-6 w-full px-6 py-4 text-center transition-opacity ${
              completo ? 'hover:opacity-90' : 'cursor-not-allowed opacity-35'
            }`}
            type="button"
            disabled={!completo || estado === 'escaneando'}
            onClick={escanear}
          >
            {estado === 'escaneando' ? 'Escaneando ///' : 'Escanear valuación'}
          </Bevel>

          <div className="mt-8 border-t border-graphite pt-8" aria-live="polite">
            {estado === 'listo' && modelo ? (
              <>
                <p className="font-hud text-bone/50">
                  {marca?.nombre} {modelo.nombre} {anio} — rango estimado
                </p>
                <p className="num mt-3 flex flex-wrap items-baseline gap-x-3 text-[clamp(1.5rem,3.6vw,2.5rem)] leading-tight font-bold text-amber">
                  <span ref={minRef}>{PESOS.format(0)}</span>
                  <span aria-hidden="true" className="text-bone/30">
                    —
                  </span>
                  <span ref={maxRef}>{PESOS.format(0)}</span>
                </p>
                <p className="font-hud mt-6 text-bone/35">
                  Valor de referencia sobre unidad en buen estado y con service
                  al día. No constituye una oferta de compra.
                </p>
              </>
            ) : (
              <p className="font-hud text-bone/35">
                {completo
                  ? 'Tocá escanear y te mostramos el rango.'
                  : 'Elegí marca, modelo y año.'}
              </p>
            )}
          </div>
        </Bevel>
      </div>
    </section>
  )
}

export default Cotizador
