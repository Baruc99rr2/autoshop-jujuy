import { useId, useState, type FormEvent } from 'react'
import Bevel from './Bevel'
import Icono, { type NombreIcono } from './Icono'
import SectionHeader from './SectionHeader'
import {
  CONSULTAS,
  PRESUPUESTOS,
  REDES,
  telefonoHref,
  whatsappUrl,
} from '../data/contacto'
import type { Red } from '../data/contacto'
import type { Seccion } from '../data/nav'
import { useContacto } from '../lib/contenido'
import type { DatosContacto } from '../types/contenido'

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

/**
 * Arma el texto que se abre en WhatsApp.
 *
 * Va en líneas sueltas y con etiquetas: del lado de la dueña el mensaje llega
 * como texto plano en el celular, y un párrafo corrido con los cinco datos
 * mezclados es ilegible. El presupuesto es opcional, así que la línea aparece
 * solo si la eligieron: un "Presupuesto: —" es ruido.
 */
function mensajeWhatsApp(c: Campos): string {
  const consulta =
    CONSULTAS.find((o) => o.value === c.consulta)?.label ?? c.consulta
  const presupuesto = PRESUPUESTOS.find((o) => o.value === c.presupuesto)?.label

  return [
    `Hola, soy ${c.nombre.trim()}.`,
    `Necesito: ${consulta}`,
    ...(presupuesto ? [`Presupuesto: ${presupuesto}`] : []),
    `Mensaje: ${c.mensaje.trim()}`,
  ].join('\n')
}

type Dato = { icono: NombreIcono; label: string; valor: string; href?: string }

/**
 * Los datos de la columna izquierda, desde lo que cargó la dueña. Un dato
 * vacío no se dibuja: una fila "Teléfono" sin número es peor que ninguna.
 */
function datosDe(c: DatosContacto): Dato[] {
  const lista: (Dato | null)[] = [
    c.email ? { icono: 'mail', label: 'Mail', valor: c.email, href: `mailto:${c.email}` } : null,
    c.telefono
      ? { icono: 'telefono', label: 'Teléfono', valor: c.telefono, href: telefonoHref(c.telefono) }
      : null,
    c.direccion ? { icono: 'ubicacion', label: 'Salón', valor: c.direccion } : null,
    c.horarios.length > 0
      ? {
          icono: 'reloj',
          label: 'Horarios',
          valor: c.horarios.map((h) => `${h.dias} ${h.horas}`).join(' · '),
        }
      : null,
  ]
  return lista.filter((d): d is Dato => d !== null)
}

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
  // El error va en --color-flag. El rojo del sitio es para SEÑALES, no para
  // decoración: un chip "Vendido" y un campo inválido son la misma clase de
  // aviso. Además el ámbar ya significa "activo" en todo el sitio —hover, foco,
  // chip elegido—, así que un borde ámbar en un campo con error es ambiguo con
  // un campo simplemente enfocado.
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
        borderClassName={error ? 'bg-flag' : 'bg-graphite'}
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
        <p id={idError} className="font-hud mt-2 text-flag">
          <span aria-hidden="true" className="mr-2">
                      </span>
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * Índice y eyebrow llegan de `Home`: si Servicios o Preguntas quedan vacías y
 * no se dibujan, el número de Contacto se corre con el del riel.
 */
export function Contacto({ s: S }: { s: Seccion }) {
  const uid = useId()
  const [campos, setCampos] = useState<Campos>(VACIO)
  const contacto = useContacto()
  const redes: Red[] = [
    ...REDES,
    { label: 'WhatsApp', href: whatsappUrl(contacto.whatsapp), usuario: contacto.whatsapp },
  ]
  const [errores, setErrores] = useState<Errores>({})

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
    // Se abre WhatsApp con el mensaje ya escrito. No hay estado de éxito
    // propio: el acuse de recibo es la conversación que se abre, y una
    // pantalla de "listo" acá mentiría, porque el mensaje todavía no se mandó
    // hasta que la persona toque enviar en WhatsApp.
    window.open(whatsappUrl(contacto.whatsapp, mensajeWhatsApp(campos)), '_blank', 'noopener')
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
            {datosDe(contacto).map((d) => (
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
                    /* 44 px de alto al tacto sin mover el texto: el padding
                       vertical lo devuelven los márgenes negativos. */
                    <a
                      href={d.href}
                      className="-mt-1.5 -mb-2.5 block py-2.5 break-words text-bone transition-colors hover:text-amber"
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
            {redes.map((r) => (
              <li key={r.label}>
                <Bevel
                  as="a"
                  variant="outline"
                  bevel={9}
                  borderClassName="bg-graphite"
                  outerClassName="block transition-colors hover:bg-amber"
                  className="font-hud flex min-h-11 items-center px-3.5 text-bone/75"
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
                borderClassName={errores.consulta ? 'bg-flag' : 'bg-graphite'}
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
                <p id={idError('consulta')} className="font-hud mt-2 text-flag">
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
                      className={`font-hud flex min-h-11 items-center px-4 transition-colors ${
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
              Enviar por WhatsApp
            </Bevel>

            <p className="font-hud text-bone/35">
              Se abre WhatsApp con el mensaje ya escrito. Lo revisás y lo
              mandás vos.
            </p>
          </form>
        </div>
      </div>
    </section>
  )
}

export default Contacto
