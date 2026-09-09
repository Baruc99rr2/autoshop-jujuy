import { useId, useState, type FormEvent } from 'react'
import Bevel from './Bevel'
import Icono, { type NombreIcono } from './Icono'
import SectionHeader from './SectionHeader'
import { CONSULTAS, CONTACTO, PRESUPUESTOS, REDES } from '../data/contacto'
import { seccion } from '../data/nav'

/**
 * Índice y eyebrow salen de `nav.ts`, no escritos acá: al insertar una
 * sección nueva se corren todos los números, y con el índice a mano el riel
 * diría una cosa y el encabezado de la sección otra.
 */
const S = seccion('contacto')

type Campos = {
  nombre: string
  email: string
  telefono: string
  consulta: string
  presupuesto: string
  mensaje: string
}

type Errores = Partial<Record<keyof Campos, string>>

const VACIO: Campos = {
  nombre: '',
  email: '',
  telefono: '',
  consulta: '',
  presupuesto: '',
  mensaje: '',
}

/**
 * Validación del lado del cliente. No hay backend: esto es todo lo que hay,
 * así que tiene que ser de verdad y no un `required` decorativo.
 *
 * Los mensajes dicen QUÉ pasó y CÓMO se arregla, en la voz de la interfaz.
 * Nada de "Por favor complete este campo" ni de disculpas: el formulario no
 * hizo nada malo.
 */
function validar(c: Campos): Errores {
  const e: Errores = {}

  if (c.nombre.trim().length < 2) {
    e.nombre = 'Poné tu nombre para saber con quién estamos hablando.'
  }

  // Nada de la regex canónica de RFC: acá alcanza con detectar el error que la
  // gente comete de verdad, que es dejar el dominio a medias.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.email.trim())) {
    e.email = 'Falta el @ o el dominio. Un ejemplo: nombre@gmail.com'
  }

  const digitos = c.telefono.replace(/\D/g, '')
  if (digitos.length < 8) {
    e.telefono = 'El teléfono va con característica: 388 seguido del número.'
  }

  if (!c.consulta) {
    e.consulta = 'Elegí una opción y te contesta la persona que corresponde.'
  }

  if (c.mensaje.trim().length < 10) {
    e.mensaje = 'Contanos en una línea qué modelo o qué operación te interesa.'
  }

  return e
}

const DATOS: { icono: NombreIcono; label: string; valor: string; href?: string }[] =
  [
    {
      icono: 'mail',
      label: 'Mail',
      valor: CONTACTO.email,
      href: `mailto:${CONTACTO.email}`,
    },
    {
      icono: 'telefono',
      label: 'Teléfono',
      valor: CONTACTO.telefono,
      href: `tel:${CONTACTO.telefonoHref}`,
    },
    {
      icono: 'ubicacion',
      label: 'Salón',
      valor: `${CONTACTO.direccion}, ${CONTACTO.ciudad}`,
    },
    {
      icono: 'reloj',
      label: 'Horarios',
      valor: CONTACTO.horarios.map((h) => `${h.dias} ${h.horas}`).join(' · '),
    },
  ]

/**
 * Campo de texto con el label adentro de la caja biselada.
 *
 * Va a nivel de módulo y NO adentro de `Contacto`. Un componente definido en
 * el cuerpo de otro se vuelve a crear en cada render, así que React desmonta y
 * remonta el `<input>` en cada tecla y el foco se pierde después de escribir
 * una letra.
 */
function CampoTexto({
  id,
  idError,
  label,
  value,
  error,
  onChange,
  type = 'text',
  autoComplete,
  inputMode,
  textarea,
}: {
  id: string
  idError: string
  label: string
  value: string
  error?: string
  onChange: (v: string) => void
  type?: string
  autoComplete?: string
  inputMode?: 'text' | 'email' | 'tel'
  textarea?: boolean
}) {
  // El error NO va en --color-flag: CLAUDE.md reserva ese rojo para los
  // estados de stock ("Vendido" / "Reservado") y usarlo acá lo convertiría en
  // un rojo de sistema más. Va en ámbar, y quien dice qué pasó es el mensaje.
  // El borde de error gana sobre el de foco: si no, enfocar el campo tapa la
  // única señal visual de que ese campo es el del problema.
  const props = {
    id,
    value,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? idError : undefined,
    autoComplete,
    inputMode,
    // 16px como mínimo: por debajo de eso iOS hace zoom al enfocar y la página
    // queda corrida.
    className: 'w-full bg-transparent text-base text-bone outline-none',
    onChange: (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(ev.target.value),
  }

  return (
    <div>
      <Bevel
        variant="outline"
        bevel={12}
        borderClassName={error ? 'bg-amber' : 'bg-graphite'}
        outerClassName={`block transition-colors duration-200 ${
          error ? '' : 'focus-within:bg-amber'
        }`}
        className="px-4 pt-3 pb-3.5"
      >
        <label htmlFor={id} className="font-hud mb-1.5 block text-bone/45">
          {label}
        </label>
        {textarea ? (
          <textarea
            {...props}
            rows={4}
            className={`${props.className} resize-none`}
          />
        ) : (
          <input {...props} type={type} />
        )}
      </Bevel>

      {error && (
        <p id={idError} className="font-hud mt-2 text-amber">
          <span aria-hidden="true" className="mr-2">
                      </span>
          {error}
        </p>
      )}
    </div>
  )
}


export function Contacto() {
  const uid = useId()
  const [campos, setCampos] = useState<Campos>(VACIO)
  const [errores, setErrores] = useState<Errores>({})
  const [enviado, setEnviado] = useState(false)

  const set = (k: keyof Campos, v: string) => {
    setCampos((c) => ({ ...c, [k]: v }))
    // El error se limpia al corregir, no recién al reenviar: si no, el campo
    // sigue en rojo mientras la persona ya lo arregló.
    setErrores((e) => (e[k] ? { ...e, [k]: undefined } : e))
  }

  const enviar = (ev: FormEvent) => {
    ev.preventDefault()
    const e = validar(campos)
    setErrores(e)
    if (Object.keys(e).length > 0) {
      // El foco va al primer campo con problema: sin esto, en mobile el error
      // puede quedar fuera de pantalla y parece que el botón no hizo nada.
      const primero = Object.keys(e)[0]
      document.getElementById(`${uid}-${primero}`)?.focus()
      return
    }
    setEnviado(true)
  }

  const idDe = (k: keyof Campos) => `${uid}-${k}`
  const idError = (k: keyof Campos) => `${uid}-${k}-error`

  return (
    <section
      id="contacto"
      className="border-b border-graphite/60 py-24 shell md:py-32"
    >
      <div className="grid gap-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
        {/* ── Izquierda: titular y datos ────────────────────────────────── */}
        <div>
          <SectionHeader
            index={S.indice}
            eyebrow={S.eyebrow}
            title={
              <>
                Contanos
                <br />
                qué auto
                <br />
                buscás
              </>
            }
            lead="Contestamos el mismo día. Si querés verlo antes, coordinamos para que pases por el salón sin turno."
          />

          <ul className="mt-12 space-y-px">
            {DATOS.map((d) => (
              <li
                key={d.label}
                className="flex items-start gap-4 border-t border-graphite py-5"
              >
                <Bevel
                  bevel={7}
                  className="mt-0.5 shrink-0 border border-graphite p-2.5 text-amber"
                >
                  <Icono name={d.icono} size={18} />
                </Bevel>

                <div className="min-w-0">
                  <p className="font-hud text-bone/40">{d.label}</p>
                  {d.href ? (
                    <a
                      href={d.href}
                      className="mt-1 block break-words text-bone transition-colors hover:text-amber"
                    >
                      {d.valor}
                    </a>
                  ) : (
                    <p className="mt-1 break-words text-bone">{d.valor}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* Las redes van con el nombre escrito, no con el logo redibujado:
              el mismo criterio que en la sección de marcas. Un ícono de
              Instagram trazado a mano se nota, y además es marca registrada. */}
          <ul className="mt-8 flex flex-wrap gap-2">
            {REDES.map((r) => (
              <li key={r.label}>
                <Bevel
                  as="a"
                  variant="outline"
                  bevel={9}
                  borderClassName="bg-graphite"
                  outerClassName="block transition-colors hover:bg-amber"
                  className="font-hud px-3.5 py-2.5 text-bone/75"
                  href={r.href}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {r.label}
                  <span className="ml-2 text-bone/35">{r.usuario}</span>
                </Bevel>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Derecha: formulario ───────────────────────────────────────── */}
        <div>
          {enviado ? (
            <Bevel
              variant="outline"
              bevel={16}
              className="p-8 md:p-10"
              role="status"
            >
              <p className="font-hud text-amber">CONSULTA REGISTRADA</p>
              <h3 className="font-display-xl mt-4 text-h2 text-bone">
                Listo, {campos.nombre.split(' ')[0]}
              </h3>
              <p className="mt-4 max-w-[52ch] text-bone/70">
                En el sitio real esta consulta ya estaría en la casilla de
                ventas y te contestaríamos hoy mismo.
              </p>
              <p className="font-hud mt-6 text-bone/40">
                Este es un sitio de demostración: no se envió ni se guardó
                ningún dato.
              </p>

              <Bevel
                as="button"
                variant="outline"
                bevel={10}
                outerClassName="mt-8 inline-block"
                className="font-hud px-5 py-3 text-bone transition-colors hover:text-amber"
                type="button"
                onClick={() => {
                  setCampos(VACIO)
                  setEnviado(false)
                }}
              >
                Cargar otra consulta
              </Bevel>
            </Bevel>
          ) : (
            <form onSubmit={enviar} noValidate className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <CampoTexto
                  id={idDe('nombre')}
                  idError={idError('nombre')}
                  label="Nombre y apellido"
                  value={campos.nombre}
                  error={errores.nombre}
                  onChange={(v) => set('nombre', v)}
                  autoComplete="name"
                />
                <CampoTexto
                  id={idDe('email')}
                  idError={idError('email')}
                  label="Mail"
                  value={campos.email}
                  error={errores.email}
                  onChange={(v) => set('email', v)}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                />
              </div>

              <CampoTexto
                id={idDe('telefono')}
                idError={idError('telefono')}
                label="Teléfono"
                value={campos.telefono}
                error={errores.telefono}
                onChange={(v) => set('telefono', v)}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
              />

              {/* El select va con el mismo tratamiento que los inputs. */}
              <div>
                <Bevel
                  variant="outline"
                  bevel={12}
                  borderClassName={errores.consulta ? 'bg-amber' : 'bg-graphite'}
                  outerClassName={`block transition-colors duration-200 ${
                    errores.consulta ? '' : 'focus-within:bg-amber'
                  }`}
                  className="px-4 pt-3 pb-3.5"
                >
                  <label
                    htmlFor={idDe('consulta')}
                    className="font-hud mb-1.5 block text-bone/45"
                  >
                    ¿Qué necesitás?
                  </label>
                  <select
                    id={idDe('consulta')}
                    name="consulta"
                    value={campos.consulta}
                    aria-invalid={errores.consulta ? true : undefined}
                    aria-describedby={
                      errores.consulta ? idError('consulta') : undefined
                    }
                    onChange={(e) => set('consulta', e.target.value)}
                    className="w-full appearance-none bg-transparent text-base text-bone outline-none"
                  >
                    <option value="" className="bg-asphalt">
                      Elegí una opción
                    </option>
                    {CONSULTAS.map((o) => (
                      <option key={o.value} value={o.value} className="bg-asphalt">
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Bevel>
                {errores.consulta && (
                  <p id={idError('consulta')} className="font-hud mt-2 text-amber">
                    <span aria-hidden="true" className="mr-2">
                                          </span>
                    {errores.consulta}
                  </p>
                )}
              </div>

              {/* Presupuesto: chips, no un select. Son tres opciones y verlas
                  todas de una es más rápido que abrir una lista. */}
              <fieldset>
                <legend className="font-hud mb-3 text-bone/45">
                  Presupuesto
                </legend>
                <div className="flex flex-wrap gap-2">
                  {PRESUPUESTOS.map((o) => {
                    const activo = campos.presupuesto === o.value
                    return (
                      <Bevel
                        key={o.value}
                        as="button"
                        variant={activo ? 'solid' : 'outline'}
                        bevel={10}
                        borderClassName="bg-graphite"
                        outerClassName="block"
                        className={`font-hud px-4 py-2.5 transition-colors ${
                          activo ? '' : 'text-bone/70 hover:text-amber'
                        }`}
                        type="button"
                        aria-pressed={activo}
                        onClick={() =>
                          set('presupuesto', activo ? '' : o.value)
                        }
                      >
                        {o.label}
                      </Bevel>
                    )
                  })}
                </div>
              </fieldset>

              <CampoTexto
                id={idDe('mensaje')}
                idError={idError('mensaje')}
                label="Mensaje"
                value={campos.mensaje}
                error={errores.mensaje}
                onChange={(v) => set('mensaje', v)}
                textarea
              />

              <Bevel
                as="button"
                variant="solid"
                bevel={14}
                className="font-hud w-full px-6 py-4.5 text-center transition-opacity hover:opacity-90"
                type="submit"
              >
                Enviar consulta
              </Bevel>

              <p className="font-hud text-bone/35">
                Sitio de demostración: el formulario valida pero no envía nada.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}

export default Contacto
