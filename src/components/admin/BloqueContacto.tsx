import { useId } from 'react'
import { BarraGuardar, BotonAgregar, FilaLista } from './Bloque'
import { idNuevo, mover, useBloque, useEnfocarNueva } from './estado-bloque'
import type { Errores } from './estado-bloque'
import { Campo, Seccion } from './Campos'
import { repoContenido } from '../../data/repo'
import { coordenadasValidas, numeroWhatsapp, whatsappUrl } from '../../data/contacto'
import type { DatosContacto } from '../../types/contenido'

/**
 * Teléfono, mail, WhatsApp, dirección, coordenadas y horarios.
 *
 * Es UN solo lugar para todo el sitio: el formulario de contacto, el botón
 * flotante, el de la ficha y el footer leen de acá. Por eso el WhatsApp se
 * revisa antes de guardar —un número mal escrito deja a todos los botones
 * mandando a nadie— y se muestra el link que va a quedar armado, para poder
 * probarlo.
 *
 * LAS COORDENADAS VAN APARTE DE LA DIRECCIÓN porque el mapa de
 * OpenStreetMap no busca direcciones: recibe un punto. Se pueden pegar las
 * dos juntas en cualquiera de los dos campos, como las copia Google Maps
 * ("-24.19541, -65.29769"), y se reparten solas.
 */

const MAX_HORARIOS = 4

type HorarioB = { id: string; dias: string; horas: string }

type Borrador = Omit<DatosContacto, 'lat' | 'lng' | 'horarios'> & {
  lat: string
  lng: string
  horarios: HorarioB[]
}

const aBorrador = (d: DatosContacto): Borrador => ({
  ...d,
  lat: String(d.lat),
  lng: String(d.lng),
  horarios: d.horarios.map((h) => ({ id: idNuevo('hor'), ...h })),
})

const campos = (uid: string) => ({
  whatsapp: `${uid}-whatsapp`,
  telefono: `${uid}-telefono`,
  email: `${uid}-email`,
  direccion: `${uid}-direccion`,
  lat: `${uid}-lat`,
  lng: `${uid}-lng`,
})
const idHorario = (uid: string, id: string) => ({
  dias: `${uid}-${id}-dias`,
  horas: `${uid}-${id}-horas`,
})

/** "-24,19" y "-24.19" valen lo mismo: el celular argentino pone coma. */
const leerGrados = (t: string) => Number(t.trim().replace(',', '.'))

/** "-24.19541, -65.29769", como lo copia Google Maps. */
const PAR = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/

/**
 * Un recuadro generoso alrededor de Jujuy. No es para ser exactos: es para
 * atajar el error típico, que es copiar el número sin el signo menos y
 * mandar el salón al hemisferio norte.
 */
const enJujuy = (lat: number, lng: number) =>
  lat > -28 && lat < -20 && lng > -69 && lng < -62

function preparar(uid: string, b: Borrador) {
  const id = campos(uid)
  const errores: Errores = {}

  const whatsapp = b.whatsapp.trim()
  if (!whatsapp) errores[id.whatsapp] = 'Falta el número de WhatsApp.'
  else if (!numeroWhatsapp(whatsapp)) {
    errores[id.whatsapp] =
      'No reconozco el número. Escribilo con la característica, por ejemplo +54 9 388 465-2485.'
  }

  const telefono = b.telefono.trim()
  if (telefono && telefono.replace(/\D/g, '').length < 8) {
    errores[id.telefono] = 'Le faltan cifras. Va con la característica: 0388 423-7788.'
  }

  const email = b.email.trim()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    errores[id.email] = 'Falta el @ o el dominio. Un ejemplo: ventas@autoshopjujuy.com.ar'
  }

  const direccion = b.direccion.trim()
  if (!direccion) errores[id.direccion] = 'Falta la dirección del salón.'

  const lat = leerGrados(b.lat)
  const lng = leerGrados(b.lng)
  if (!b.lat.trim() || !Number.isFinite(lat) || Math.abs(lat) > 90) {
    errores[id.lat] = 'Falta la latitud, o no es un número.'
  }
  if (!b.lng.trim() || !Number.isFinite(lng) || Math.abs(lng) > 180) {
    errores[id.lng] = 'Falta la longitud, o no es un número.'
  }
  if (!errores[id.lat] && !errores[id.lng] && !enJujuy(lat, lng)) {
    errores[id.lat] =
      'Esas coordenadas caen fuera de Jujuy. Revisá que las dos empiecen con el signo menos.'
  }

  const horarios = b.horarios
    .map((h) => ({ ...h, dias: h.dias.trim(), horas: h.horas.trim() }))
    .filter((h) => h.dias || h.horas)
  for (const h of horarios) {
    const hid = idHorario(uid, h.id)
    if (!h.dias) errores[hid.dias] = 'Faltan los días.'
    if (!h.horas) errores[hid.horas] = 'Falta el horario.'
  }

  const datos: DatosContacto = {
    telefono,
    email,
    whatsapp,
    direccion,
    lat,
    lng,
    horarios: horarios.map(({ dias, horas }) => ({ dias, horas })),
  }
  return { datos, errores }
}

export function BloqueContacto({
  inicial,
  onSucio,
}: {
  inicial: DatosContacto
  onSucio: (sucio: boolean) => void
}) {
  const uid = useId()
  const id = campos(uid)
  const bloque = useBloque({
    inicial: aBorrador(inicial),
    preparar: (b: Borrador) => preparar(uid, b),
    enviar: (d: DatosContacto) => repoContenido.guardarContacto(d),
    aBorrador,
    onSucio,
  })
  const { b, setB, errores, limpiarError } = bloque
  const enfocar = useEnfocarNueva()

  const editar = (k: keyof Borrador, v: string) => {
    setB((prev) => ({ ...prev, [k]: v }))
    limpiarError(id[k as keyof typeof id])
  }

  /** Si pegó "lat, lng" juntas en un campo, van cada una a su lugar. */
  const editarCoordenada = (k: 'lat' | 'lng', v: string) => {
    const par = PAR.exec(v)
    if (par) {
      setB((prev) => ({ ...prev, lat: par[1], lng: par[2] }))
      limpiarError(id.lat)
      limpiarError(id.lng)
      return
    }
    editar(k, v)
  }

  const editarHorario = (hid: string, cambios: Partial<HorarioB>) =>
    setB((prev) => ({
      ...prev,
      horarios: prev.horarios.map((h) => (h.id === hid ? { ...h, ...cambios } : h)),
    }))

  const agregarHorario = () => {
    const nuevo = idNuevo('hor')
    setB((prev) => ({ ...prev, horarios: [...prev.horarios, { id: nuevo, dias: '', horas: '' }] }))
    enfocar(idHorario(uid, nuevo).dias)
  }

  const numero = numeroWhatsapp(b.whatsapp)
  const lat = leerGrados(b.lat)
  const lng = leerGrados(b.lng)
  const puntoOk = coordenadasValidas(lat, lng) && enJujuy(lat, lng)

  return (
    <Seccion
      titulo="CONTACTO"
      ayuda="Lo usan el formulario de contacto, el botón de WhatsApp, el de cada ficha y el footer. Todos leen de acá."
    >
      <Campo
        id={id.whatsapp}
        label="WHATSAPP"
        valor={b.whatsapp}
        onCambio={(v) => editar('whatsapp', v)}
        error={errores[id.whatsapp]}
        inputMode="text"
        autoComplete="tel"
        placeholder="+54 9 388 465-2485"
        maxLength={30}
        ayuda={
          numero ? (
            <>
              Así se ve en el sitio. Los botones abren{' '}
              <a
                href={whatsappUrl(b.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="-my-3.5 inline-block py-3.5 text-bone/70 underline underline-offset-4 hover:text-amber focus-visible:text-amber"
              >
                wa.me/{numero}
              </a>
              : tocalo para probarlo.
            </>
          ) : (
            'Con la característica. Puede ir con +54 9, con 0388 o con 15: el link se arma solo.'
          )
        }
        className="mt-5"
      />
      <Campo
        id={id.telefono}
        label="TELÉFONO"
        valor={b.telefono}
        onCambio={(v) => editar('telefono', v)}
        error={errores[id.telefono]}
        autoComplete="tel"
        placeholder="0388 423-7788"
        maxLength={30}
        ayuda="El fijo del salón, como querés que se lea. Vacío: no se muestra."
        className="mt-5"
      />
      <Campo
        id={id.email}
        label="MAIL"
        type="email"
        inputMode="email"
        valor={b.email}
        onCambio={(v) => editar('email', v)}
        error={errores[id.email]}
        autoComplete="email"
        placeholder="ventas@autoshopjujuy.com.ar"
        maxLength={80}
        ayuda="Vacío: no se muestra."
        className="mt-5"
      />
      <Campo
        id={id.direccion}
        label="DIRECCIÓN"
        valor={b.direccion}
        onCambio={(v) => editar('direccion', v)}
        error={errores[id.direccion]}
        autoComplete="street-address"
        placeholder="Av. Éxodo 750, San Salvador de Jujuy"
        maxLength={90}
        ayuda="Si la cambiás, cambiá también las coordenadas de abajo: el mapa sigue a las coordenadas."
        className="mt-5"
      />

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Campo
          id={id.lat}
          label="LATITUD"
          valor={b.lat}
          onCambio={(v) => editarCoordenada('lat', v)}
          error={errores[id.lat]}
          inputMode="text"
          placeholder="-24.19541"
          maxLength={40}
          monoespaciado
        />
        <Campo
          id={id.lng}
          label="LONGITUD"
          valor={b.lng}
          onCambio={(v) => editarCoordenada('lng', v)}
          error={errores[id.lng]}
          inputMode="text"
          placeholder="-65.29769"
          maxLength={40}
          monoespaciado
        />
      </div>
      <p className="font-hud mt-2 text-bone/40 normal-case">
        Cómo sacarlas: en Google Maps, mantené apretado (o clic derecho) sobre
        la puerta del salón. Arriba de todo aparecen dos números como
        «-24.19541, -65.29769»: tocalos para copiarlos y pegalos acá, en
        cualquiera de los dos campos.
        {puntoOk && (
          <>
            {' '}
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="-my-3.5 inline-block py-3.5 text-bone/70 underline underline-offset-4 hover:text-amber focus-visible:text-amber"
            >
              Ver este punto en Google Maps
            </a>
          </>
        )}
      </p>

      <h3 className="font-hud mt-8 text-bone/55">HORARIOS</h3>
      {b.horarios.length > 0 && (
        <ul className="mt-3 grid grid-cols-1 gap-3">
          {b.horarios.map((h, i) => {
            const hid = idHorario(uid, h.id)
            return (
              <FilaLista
                key={h.id}
                indice={i}
                total={b.horarios.length}
                nombre="el horario"
                onMover={(hacia) =>
                  setB((prev) => ({ ...prev, horarios: mover(prev.horarios, i, hacia) }))
                }
                onBorrar={() =>
                  setB((prev) => ({
                    ...prev,
                    horarios: prev.horarios.filter((x) => x.id !== h.id),
                  }))
                }
              >
                <Campo
                  id={hid.dias}
                  label="DÍAS"
                  valor={h.dias}
                  onCambio={(v) => {
                    editarHorario(h.id, { dias: v })
                    limpiarError(hid.dias)
                  }}
                  error={errores[hid.dias]}
                  placeholder="Lunes a viernes"
                  maxLength={40}
                  className="mt-3"
                />
                <Campo
                  id={hid.horas}
                  label="HORARIO"
                  valor={h.horas}
                  onCambio={(v) => {
                    editarHorario(h.id, { horas: v })
                    limpiarError(hid.horas)
                  }}
                  error={errores[hid.horas]}
                  placeholder="9:00 a 13:00 · 17:00 a 20:30"
                  maxLength={60}
                  className="mt-3"
                />
              </FilaLista>
            )
          })}
        </ul>
      )}
      {b.horarios.length < MAX_HORARIOS ? (
        <BotonAgregar onClick={agregarHorario}>AGREGAR UN HORARIO</BotonAgregar>
      ) : (
        <p className="font-hud mt-5 text-bone/40 normal-case">
          Son {MAX_HORARIOS} renglones como máximo.
        </p>
      )}

      <BarraGuardar
        etiqueta="GUARDAR EL CONTACTO"
        sucio={bloque.sucio}
        ocupado={bloque.ocupado}
        guardado={bloque.guardado}
        falla={bloque.falla}
        onGuardar={bloque.guardar}
      />
    </Seccion>
  )
}

export default BloqueContacto
