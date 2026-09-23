import { useId } from 'react'
import Bevel from '../Bevel'
import { BarraGuardar } from './Bloque'
import { useBloque } from './estado-bloque'
import type { Errores } from './estado-bloque'
import { Campo, CampoMiles, Opciones, Seccion } from './Campos'
import { repoContenido } from '../../data/repo'
import { leerMiles, separarMiles, soloDigitos } from '../../lib/formato'
import { SUFIJOS, valorContador } from '../../types/contenido'
import type { Contador, Contadores, SufijoContador } from '../../types/contenido'

/**
 * Las cuatro cifras de la franja ámbar.
 *
 * SON CUATRO FIJAS: no se agregan ni se borran, porque la franja está
 * dibujada para cuatro celdas —2×2 en el celular, cuatro en fila en la
 * compu— y con tres o con cinco queda un hueco. Lo que se edita es qué dice
 * cada una.
 *
 * La de los años no tiene cifra: tiene el AÑO DE APERTURA, y la cifra se
 * calcula. Así no hay que acordarse de subirla cada enero.
 */

/** Cinco cifras: más que eso no entra en una celda de 2×2 a 390 px. */
const MAX_CIFRAS = 5
const MAX_ETIQUETA = 28

type FilaB = Omit<Contador, 'valor'> & { valor: string }
type Borrador = { apertura: string; lista: FilaB[] }

const aBorrador = (c: Contadores): Borrador => ({
  apertura: String(c.apertura),
  lista: c.lista.map((x) => ({ ...x, valor: separarMiles(String(x.valor)) })),
})

const ids = (uid: string, id: string) => ({
  etiqueta: `${uid}-${id}-etiqueta`,
  valor: `${uid}-${id}-valor`,
  apertura: `${uid}-apertura`,
})

function preparar(uid: string, b: Borrador) {
  const errores: Errores = {}
  const hoy = new Date().getFullYear()
  const apertura = Number(b.apertura)

  const lista: Contador[] = b.lista.map((c) => {
    const id = ids(uid, c.id)
    const etiqueta = c.etiqueta.trim()
    if (!etiqueta) errores[id.etiqueta] = 'Falta el texto de abajo de la cifra.'
    if (c.desdeApertura) {
      if (b.apertura.length !== 4 || apertura < 1950 || apertura > hoy) {
        errores[id.apertura] = `Un año de cuatro cifras, entre 1950 y ${hoy}.`
      }
    } else if (leerMiles(c.valor) === null) {
      errores[id.valor] = 'Falta la cifra.'
    }
    return {
      id: c.id,
      etiqueta,
      sufijo: c.sufijo,
      valor: c.desdeApertura ? 0 : (leerMiles(c.valor) ?? 0),
      ...(c.desdeApertura ? { desdeApertura: true } : {}),
    }
  })

  return { datos: { apertura, lista }, errores }
}

export function BloqueContadores({
  inicial,
  onSucio,
}: {
  inicial: Contadores
  onSucio: (sucio: boolean) => void
}) {
  const uid = useId()
  const bloque = useBloque({
    inicial: aBorrador(inicial),
    preparar: (b: Borrador) => preparar(uid, b),
    enviar: (d: Contadores) => repoContenido.guardarContadores(d),
    aBorrador,
    onSucio,
  })
  const { b, setB, errores, limpiarError } = bloque

  const editar = (id: string, cambios: Partial<FilaB>) =>
    setB((prev) => ({
      ...prev,
      lista: prev.lista.map((c) => (c.id === id ? { ...c, ...cambios } : c)),
    }))

  return (
    <Seccion
      titulo="NÚMEROS"
      contador="4"
      ayuda="La franja amarilla debajo de la portada. Cada cifra cuenta desde 0 hasta el número que pongas."
    >
      <ul className="mt-5 grid grid-cols-1 gap-3">
        {b.lista.map((c, i) => {
          const id = ids(uid, c.id)
          const apertura = Number(b.apertura)
          const muestra =
            c.desdeApertura
              ? b.apertura.length === 4
                ? String(valorContador({ ...c, valor: 0 }, apertura))
                : '—'
              : c.valor || '—'

          return (
            <Bevel
              key={c.id}
              as="li"
              variant="outline"
              bevel={12}
              borderClassName="bg-graphite"
              outerClassName="block"
              className="p-3"
            >
              {/* La cifra como se va a leer en el sitio, con su signo, para
                  no tener que ir a mirar la portada después de cada cambio. */}
              <div className="flex items-baseline justify-between gap-3">
                <span className="num text-bone/45">{String(i + 1).padStart(2, '0')}</span>
                <span className="num text-xl text-amber" aria-hidden="true">
                  {muestra}
                  {c.sufijo}
                </span>
              </div>

              <Campo
                id={id.etiqueta}
                label="TEXTO"
                valor={c.etiqueta}
                onCambio={(v) => {
                  editar(c.id, { etiqueta: v })
                  limpiarError(id.etiqueta)
                }}
                error={errores[id.etiqueta]}
                maxLength={MAX_ETIQUETA}
                placeholder="Dos o tres palabras"
                className="mt-3"
              />

              {c.desdeApertura ? (
                <Campo
                  id={id.apertura}
                  label="AÑO DE APERTURA"
                  valor={b.apertura}
                  onCambio={(v) => {
                    setB((prev) => ({ ...prev, apertura: soloDigitos(v).slice(0, 4) }))
                    limpiarError(id.apertura)
                  }}
                  error={errores[id.apertura]}
                  inputMode="numeric"
                  maxLength={4}
                  monoespaciado
                  placeholder="2023"
                  ayuda="La cifra no se escribe: se calcula desde este año y sube sola cada 1 de enero."
                  className="mt-5"
                />
              ) : (
                <CampoMiles
                  id={id.valor}
                  label="CIFRA"
                  valor={c.valor}
                  onCambio={(v) => {
                    editar(c.id, { valor: separarMiles(soloDigitos(v).slice(0, MAX_CIFRAS)) })
                    limpiarError(id.valor)
                  }}
                  error={errores[id.valor]}
                  placeholder="500"
                  ayuda={`Hasta ${MAX_CIFRAS} cifras.`}
                  className="mt-5"
                />
              )}

              <Opciones<SufijoContador>
                label="SIGNO AL FINAL"
                valor={c.sufijo}
                opciones={SUFIJOS}
                onCambio={(v) => editar(c.id, { sufijo: v })}
                className="mt-5"
              />
            </Bevel>
          )
        })}
      </ul>

      <BarraGuardar
        etiqueta="GUARDAR LOS NÚMEROS"
        sucio={bloque.sucio}
        ocupado={bloque.ocupado}
        guardado={bloque.guardado}
        falla={bloque.falla}
        onGuardar={bloque.guardar}
      />
    </Seccion>
  )
}

export default BloqueContadores
