import { useMemo, useState, type CSSProperties } from 'react'
import Bevel from './Bevel'
import SectionHeader from './SectionHeader'
import {
  ANTICIPO,
  PLAZOS,
  PLAZO_INICIAL,
  TNA,
  VALOR,
  cuotaMensual,
} from '../data/financiacion'
import { seccion } from '../data/nav'

/**
 * Índice y eyebrow salen de `nav.ts`, no escritos acá: al insertar una
 * sección nueva se corren todos los números, y con el índice a mano el riel
 * diría una cosa y el encabezado de la sección otra.
 */
const S = seccion('plan')

const PESOS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

/**
 * Slider real: `<input type="range">` estilizado, no divs con eventos de mouse.
 * Con el input nativo vienen gratis las flechas del teclado, Home/End, el rol
 * correcto y el valor anunciado por el lector de pantalla.
 *
 * El porcentaje lleno viaja por la variable `--fill`, que la hoja de estilos
 * usa como `background-size` de las dos capas ámbar. Es una escritura por
 * render y no toca el layout.
 */
function Slider({
  id,
  label,
  valor,
  min,
  max,
  paso,
  formato,
  onChange,
}: {
  id: string
  label: string
  valor: number
  min: number
  max: number
  paso: number
  formato: (v: number) => string
  onChange: (v: number) => void
}) {
  const pct = ((valor - min) / (max - min)) * 100

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="font-hud text-bone/50">
          {label}
        </label>
        <output htmlFor={id} className="num text-lg font-bold text-amber">
          {formato(valor)}
        </output>
      </div>

      <input
        id={id}
        type="range"
        className="slider mt-4 w-full"
        style={{ '--fill': `${pct}%` } as CSSProperties}
        min={min}
        max={max}
        step={paso}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
      />

      <div className="font-hud mt-2 flex justify-between text-bone/30">
        <span>{formato(min)}</span>
        <span>{formato(max)}</span>
      </div>
    </div>
  )
}

/**
 * Simulador de cuota del Fiat Plan.
 *
 * La sección va sola y no lado a lado con el cotizador, como decía el prompt
 * original: `src/data/nav.ts` las numera como dos secciones distintas (05 y
 * 06) y el riel las cuenta por separado, así que meterlas en una sola pantalla
 * dejaría un número sin sección. Además el simulador tiene dos sliders, cinco
 * chips y un resultado grande: en media pantalla queda apretado.
 */

export function Simulador() {
  const [valor, setValor] = useState(VALOR.inicial)
  const [anticipoPct, setAnticipoPct] = useState(ANTICIPO.inicial)
  const [plazo, setPlazo] = useState<number>(PLAZO_INICIAL)

  const { anticipo, financiado, cuota } = useMemo(() => {
    const anticipo = Math.round((valor * anticipoPct) / 100)
    const financiado = valor - anticipo
    return { anticipo, financiado, cuota: cuotaMensual(financiado, plazo) }
  }, [valor, anticipoPct, plazo])

  return (
    <section
      id="plan"
      className="border-b border-graphite/60 py-24 shell md:py-32"
    >
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
        <SectionHeader
          index={S.indice}
          eyebrow={S.eyebrow}
          title={
            <>
              Entrá con
              <br />
              cuota fija
            </>
          }
          lead="Movés el valor y el anticipo y ves la cuota al instante. Después lo cerramos con vos en el salón, con la tasa del día."
          className="lg:sticky lg:top-28 lg:self-start"
        />

        <Bevel variant="outline" bevel={18} className="p-6 md:p-10">
          <div className="space-y-10">
            <Slider
              id="sim-valor"
              label="Valor del vehículo"
              valor={valor}
              min={VALOR.min}
              max={VALOR.max}
              paso={VALOR.paso}
              formato={(v) => PESOS.format(v)}
              onChange={setValor}
            />

            <Slider
              id="sim-anticipo"
              label="Anticipo"
              valor={anticipoPct}
              min={ANTICIPO.min}
              max={ANTICIPO.max}
              paso={ANTICIPO.paso}
              formato={(v) => `${v}%`}
              onChange={setAnticipoPct}
            />

            <fieldset>
              <legend className="font-hud mb-4 text-bone/50">
                Plazo en cuotas
              </legend>
              {/* Grilla de cinco columnas y no flex-wrap: con wrap, en 390px
                  el quinto plazo se caía a una segunda fila y quedaba un "60"
                  suelto abajo a la izquierda. */}
              <div className="grid grid-cols-5 gap-2">
                {PLAZOS.map((p) => {
                  const activo = p === plazo
                  return (
                    <Bevel
                      key={p}
                      as="button"
                      variant={activo ? 'solid' : 'outline'}
                      bevel={10}
                      borderClassName="bg-graphite"
                      outerClassName="block"
                      className={`font-hud num px-2 py-2.5 text-center transition-colors ${
                        activo ? '' : 'text-bone/70 hover:text-amber'
                      }`}
                      type="button"
                      aria-pressed={activo}
                      onClick={() => setPlazo(p)}
                    >
                      {p}
                    </Bevel>
                  )
                })}
              </div>
            </fieldset>
          </div>

          {/* El resultado. Es lo único de la card que se lee de lejos. */}
          <div className="mt-10 border-t border-graphite pt-8">
            <p className="font-hud text-bone/50">Cuota estimada</p>
            <p
              data-cuota
              className="num mt-2 text-[clamp(2.25rem,5.5vw,3.75rem)] leading-none font-bold text-amber"
            >
              {PESOS.format(Math.round(cuota))}
            </p>

            <dl className="font-hud mt-8 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <div>
                <dt className="text-bone/40">Anticipo</dt>
                <dd className="num mt-1 text-bone">{PESOS.format(anticipo)}</dd>
              </div>
              <div>
                <dt className="text-bone/40">A financiar</dt>
                <dd className="num mt-1 text-bone">
                  {PESOS.format(financiado)}
                </dd>
              </div>
              <div>
                <dt className="text-bone/40">TNA</dt>
                <dd className="num mt-1 text-bone">
                  {(TNA * 100).toFixed(0)}%
                </dd>
              </div>
            </dl>

            {/* No es opcional: esto es una simulación financiera. */}
            <p className="font-hud mt-8 text-bone/35">
              Cálculo estimativo. No constituye una oferta.
            </p>
          </div>
        </Bevel>
      </div>
    </section>
  )
}

export default Simulador
