import { useId, useState } from 'react'
import Bevel from '../Bevel'
import Icono from '../Icono'
import { BarraGuardar, BotonAgregar, FilaLista } from './Bloque'
import { idNuevo, mover, useBloque, useEnfocarNueva } from './estado-bloque'
import type { Errores } from './estado-bloque'
import { Campo, CampoMiles, Seccion } from './Campos'
import Dialogo from './Dialogo'
import { repoContenido } from '../../data/repo'
import { leerMiles, separarMiles } from '../../lib/formato'
import { ICONOS_SERVICIO } from '../../types/contenido'
import type { IconoServicio, Servicio } from '../../types/contenido'

/**
 * Los servicios de la sección SERVICIOS del inicio.
 *
 * Mismo patrón que las etiquetas de una unidad: alta al pie, flechas para
 * reordenar, borrar con aviso si la fila tiene algo escrito. Sin tope: la
 * grilla del sitio suma filas.
 *
 * EL ÍCONO SE ELIGE, NO SE SUBE. Ver `ICONOS_SERVICIO`.
 */

const MAX_TITULO = 40
const MAX_DETALLE = 60

type FilaB = Omit<Servicio, 'precio' | 'orden'> & { precio: string }

const aBorrador = (lista: Servicio[]): FilaB[] =>
  lista.map(({ orden: _orden, precio, ...s }) => ({
    ...s,
    precio: precio === null ? '' : separarMiles(String(precio)),
  }))

const ids = (uid: string, id: string) => ({ titulo: `${uid}-${id}-titulo` })

const vacia = (s: FilaB) => !s.titulo.trim() && !s.precio && !s.detalle.trim()

function preparar(uid: string, b: FilaB[]) {
  const errores: Errores = {}
  // Una fila sin nada escrito se descarta sin preguntar: es un «agregar» que
  // se tocó de más, no un servicio sin título.
  const datos: Servicio[] = b.filter((s) => !vacia(s)).map((s, i) => {
    const titulo = s.titulo.trim()
    if (!titulo) errores[ids(uid, s.id).titulo] = 'Falta el título del servicio.'
    return {
      id: s.id,
      icono: s.icono,
      titulo,
      precio: leerMiles(s.precio),
      detalle: s.detalle.trim(),
      orden: i,
    }
  })
  return { datos, errores }
}

/**
 * Los seis dibujos en una fila, como botones de radio.
 *
 * `grid-cols-6` y no un `flex` con anchos fijos: a 390 px la fila tiene unos
 * 300 px, y seis cuadrados de 48 más los huecos no entran. En grilla cada uno
 * toma lo que haya, y nunca baja de 44.
 */
function ElegirIcono({
  valor,
  onCambio,
  nombreFila,
}: {
  valor: IconoServicio
  onCambio: (v: IconoServicio) => void
  nombreFila: string
}) {
  const elegido = ICONOS_SERVICIO.find((x) => x.id === valor)
  return (
    <div className="mt-3">
      <p className="font-hud text-bone/55">
        ÍCONO <span className="ml-2 text-bone/35">{elegido?.label.toUpperCase()}</span>
      </p>
      <div
        role="radiogroup"
        aria-label={`Ícono ${nombreFila}`}
        className="mt-2 grid grid-cols-6 gap-1.5"
      >
        {ICONOS_SERVICIO.map((ic) => {
          const activo = ic.id === valor
          return (
            <Bevel
              key={ic.id}
              as="button"
              type="button"
              role="radio"
              aria-checked={activo}
              aria-label={ic.label}
              onClick={() => onCambio(ic.id)}
              variant="outline"
              bevel={8}
              borderClassName={activo ? 'bg-amber' : 'bg-graphite'}
              /* El tamaño va AFUERA: en una `outline` el div de adentro ya
                 trae `h-full w-full`, y dos alturas en el mismo atributo las
                 decide el orden de emisión de Tailwind. */
              outerClassName="block aspect-square min-h-[2.75rem] transition-colors duration-200 hover:bg-amber"
              className={`flex items-center justify-center ${
                activo ? 'text-amber' : 'text-bone/55'
              }`}
            >
              <Icono name={ic.id} size={24} />
            </Bevel>
          )
        })}
      </div>
    </div>
  )
}

export function BloqueServicios({
  inicial,
  onSucio,
  indice,
  onCantidad,
}: {
  inicial: Servicio[]
  onSucio: (sucio: boolean) => void
  /** El número de la sección en la web, de `nav.ts`. */
  indice: string
  /** Cuántos quedaron guardados: con cero la sección se oculta y la numeración se corre. */
  onCantidad: (n: number) => void
}) {
  const uid = useId()
  const bloque = useBloque({
    inicial: aBorrador(inicial),
    preparar: (b: FilaB[]) => preparar(uid, b),
    enviar: async (d: Servicio[]) => {
      const guardado = await repoContenido.guardarServicios(d)
      onCantidad(guardado.length)
      return guardado
    },
    aBorrador,
    onSucio,
  })
  const { b: lista, setB, errores, limpiarError } = bloque
  const [aBorrar, setABorrar] = useState<FilaB | null>(null)
  const enfocar = useEnfocarNueva()

  const editar = (id: string, cambios: Partial<FilaB>) =>
    setB((prev) => prev.map((s) => (s.id === id ? { ...s, ...cambios } : s)))

  const agregar = () => {
    const id = idNuevo('srv')
    setB((prev) => [...prev, { id, icono: 'llave', titulo: '', precio: '', detalle: '' }])
    enfocar(ids(uid, id).titulo)
  }

  const quitar = (id: string) => {
    setB((prev) => prev.filter((s) => s.id !== id))
    setABorrar(null)
  }

  return (
    <Seccion
      titulo="SERVICIOS"
      indice={indice}
      contador={String(lista.length)}
      ayuda="Los tiles de la sección Servicios. Sin servicios, la sección no aparece en el sitio."
    >
      {lista.length > 0 && (
        <ul className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {lista.map((s, i) => {
            const id = ids(uid, s.id)
            return (
              <FilaLista
                key={s.id}
                indice={i}
                total={lista.length}
                nombre="el servicio"
                onMover={(hacia) => setB((prev) => mover(prev, i, hacia))}
                onBorrar={() => (vacia(s) ? quitar(s.id) : setABorrar(s))}
              >
                <ElegirIcono
                  valor={s.icono}
                  onCambio={(icono) => editar(s.id, { icono })}
                  nombreFila={`del servicio ${i + 1}`}
                />
                <Campo
                  id={id.titulo}
                  label="TÍTULO"
                  valor={s.titulo}
                  onCambio={(v) => {
                    editar(s.id, { titulo: v })
                    limpiarError(id.titulo)
                  }}
                  error={errores[id.titulo]}
                  maxLength={MAX_TITULO}
                  placeholder="Escaneo vehicular"
                  className="mt-5"
                />
                <CampoMiles
                  id={`${uid}-${s.id}-precio`}
                  label="PRECIO"
                  valor={s.precio}
                  onCambio={(v) => editar(s.id, { precio: v })}
                  prefijo="$"
                  placeholder="Sin precio"
                  ayuda={
                    s.precio
                      ? 'En pesos, con los puntos como lo ves acá.'
                      : 'Vacío: el tile muestra solo el detalle.'
                  }
                  className="mt-5"
                />
                <Campo
                  id={`${uid}-${s.id}-detalle`}
                  label="DETALLE"
                  valor={s.detalle}
                  onCambio={(v) => editar(s.id, { detalle: v })}
                  maxLength={MAX_DETALLE}
                  placeholder="Reservá tu turno"
                  ayuda="La condición o el próximo paso. Se puede dejar vacío."
                  className="mt-5"
                />
              </FilaLista>
            )
          })}
        </ul>
      )}

      <BotonAgregar onClick={agregar}>AGREGAR UN SERVICIO</BotonAgregar>

      <BarraGuardar
        etiqueta="GUARDAR LOS SERVICIOS"
        sucio={bloque.sucio}
        ocupado={bloque.ocupado}
        guardado={bloque.guardado}
        falla={bloque.falla}
        onGuardar={bloque.guardar}
      />

      <Dialogo
        abierto={aBorrar !== null}
        titulo={
          aBorrar?.titulo.trim()
            ? `Vas a borrar «${aBorrar.titulo.trim()}»`
            : 'Vas a borrar un servicio'
        }
        confirmar="Borrar el servicio"
        onConfirmar={() => aBorrar && quitar(aBorrar.id)}
        cancelar="No, dejarlo"
        onCancelar={() => setABorrar(null)}
        tono="peligro"
      >
        <p>
          Sale del sitio cuando toques «Guardar los servicios». Hasta entonces,
          salir sin guardar lo deja como estaba.
        </p>
      </Dialogo>
    </Seccion>
  )
}

export default BloqueServicios
