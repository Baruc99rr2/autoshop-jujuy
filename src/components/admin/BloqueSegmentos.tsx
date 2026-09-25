import { useEffect, useId, useRef, useState } from 'react'
import Bevel from '../Bevel'
import { BarraGuardar, BotonAgregar, FilaLista } from './Bloque'
import { idNuevo, mover, useBloque, useEnfocarNueva } from './estado-bloque'
import type { Errores } from './estado-bloque'
import { AreaTexto, Campo, Seccion } from './Campos'
import Dialogo from './Dialogo'
import { repoContenido } from '../../data/repo'
import { ErrorArchivo, PESO_OBJETIVO, pesoLegible, prepararFoto } from '../../lib/archivos'
import { MAX_SEGMENTOS, MIN_SEGMENTOS_CARRUSEL } from '../../types/contenido'
import type { ImagenSegmento, SegmentoAGuardar } from '../../types/contenido'

/**
 * Los segmentos del carrusel del inicio (sección 03): foto, título, texto y
 * un rótulo corto opcional.
 *
 * LA FOTO SE SUBE AL GUARDAR, NO AL ELEGIRLA. Se comprime en el momento —la
 * misma `prepararFoto` que las fotos de las unidades— y queda en el borrador
 * con una vista previa local. Subirla al elegirla dejaría en el bucket cada
 * foto que la dueña probó y descartó sin guardar. El repositorio la sube a
 * su propia carpeta (`segmentos/`) y borra la vieja recién cuando la lista
 * nueva ya quedó guardada.
 */

const MAX_TITULO = 20
const MAX_TEXTO = 180
const MAX_ETIQUETA = 12

/** La foto elegida y todavía no guardada. */
type Nueva = {
  archivo: File
  /** `blob:` local para la vista previa. También hace que el bloque se vea
   *  «sucio»: un `File` en JSON es `{}`, y dos fotos distintas darían igual. */
  vista: string
  ancho: number
  alto: number
}

type FilaB = {
  id: string
  titulo: string
  texto: string
  etiqueta: string
  imagen: ImagenSegmento | null
  nueva: Nueva | null
}

const aBorrador = (lista: SegmentoAGuardar[]): FilaB[] =>
  lista.map((s) => ({
    id: s.id,
    titulo: s.titulo,
    texto: s.texto,
    etiqueta: s.etiqueta,
    imagen: s.imagen,
    nueva: null,
  }))

const ids = (uid: string, id: string) => ({
  titulo: `${uid}-${id}-titulo`,
  texto: `${uid}-${id}-texto`,
  foto: `${uid}-${id}-foto`,
  archivo: `${uid}-${id}-archivo`,
})

const vacia = (s: FilaB) =>
  !s.titulo.trim() && !s.texto.trim() && !s.etiqueta.trim() && !s.imagen && !s.nueva

function preparar(uid: string, b: FilaB[]) {
  const errores: Errores = {}
  const datos: SegmentoAGuardar[] = b.filter((s) => !vacia(s)).map((s, i) => {
    const id = ids(uid, s.id)
    const titulo = s.titulo.trim()
    const texto = s.texto.trim()
    if (!s.imagen && !s.nueva) errores[id.foto] = 'Falta la foto.'
    if (!titulo) errores[id.titulo] = 'Falta el título.'
    if (!texto) errores[id.texto] = 'Falta el texto.'
    return {
      id: s.id,
      titulo,
      texto,
      etiqueta: s.etiqueta.trim().toUpperCase(),
      imagen: s.imagen,
      ...(s.nueva ? { archivo: s.nueva.archivo } : {}),
      orden: i,
    }
  })
  return { datos, errores }
}

export function BloqueSegmentos({
  inicial,
  onSucio,
}: {
  inicial: SegmentoAGuardar[]
  onSucio: (sucio: boolean) => void
}) {
  const uid = useId()
  const bloque = useBloque({
    inicial: aBorrador(inicial),
    preparar: (b: FilaB[]) => preparar(uid, b),
    enviar: (d: SegmentoAGuardar[]) => repoContenido.guardarSegmentos(d),
    aBorrador,
    onSucio,
  })
  const { b: lista, setB, errores, limpiarError } = bloque
  const [aBorrar, setABorrar] = useState<FilaB | null>(null)
  /** Fila → qué le pasa a su foto mientras se comprime, o por qué falló. */
  const [fotoEstado, setFotoEstado] = useState<Record<string, string>>({})
  const [fotoFalla, setFotoFalla] = useState<Record<string, string>>({})
  const enfocar = useEnfocarNueva()

  // Las vistas previas locales ocupan memoria hasta que se revocan. Se
  // revocan al salir de la pantalla; las que se reemplazan, en el momento.
  const vistas = useRef(new Set<string>())
  useEffect(() => {
    const set = vistas.current
    return () => set.forEach((u) => URL.revokeObjectURL(u))
  }, [])

  const editar = (id: string, cambios: Partial<FilaB>) =>
    setB((prev) => prev.map((s) => (s.id === id ? { ...s, ...cambios } : s)))

  const lleno = lista.length >= MAX_SEGMENTOS

  const agregar = () => {
    if (lleno) return
    const id = idNuevo('seg')
    setB((prev) => [
      ...prev,
      { id, titulo: '', texto: '', etiqueta: '', imagen: null, nueva: null },
    ])
    enfocar(ids(uid, id).foto)
  }

  const quitar = (id: string) => {
    setB((prev) => prev.filter((s) => s.id !== id))
    setABorrar(null)
  }

  const elegirFoto = async (fila: FilaB, archivo: File | undefined) => {
    if (!archivo) return
    const id = ids(uid, fila.id)
    setFotoFalla((prev) => ({ ...prev, [fila.id]: '' }))
    setFotoEstado((prev) => ({ ...prev, [fila.id]: 'ACHICANDO LA FOTO…' }))
    try {
      const lista = await prepararFoto(archivo)
      const vista = URL.createObjectURL(lista.archivo)
      vistas.current.add(vista)
      setB((prev) =>
        prev.map((s) => {
          if (s.id !== fila.id) return s
          if (s.nueva) {
            URL.revokeObjectURL(s.nueva.vista)
            vistas.current.delete(s.nueva.vista)
          }
          return { ...s, nueva: { ...lista, vista } }
        }),
      )
      limpiarError(id.foto)
    } catch (err) {
      setFotoFalla((prev) => ({
        ...prev,
        [fila.id]:
          err instanceof ErrorArchivo || err instanceof Error
            ? err.message
            : 'No se pudo preparar la foto.',
      }))
    } finally {
      setFotoEstado((prev) => ({ ...prev, [fila.id]: '' }))
      const entrada = document.getElementById(id.archivo) as HTMLInputElement | null
      if (entrada) entrada.value = ''
    }
  }

  const cuantos = lista.length

  return (
    <Seccion
      titulo="SEGMENTOS"
      contador={`${cuantos} / ${MAX_SEGMENTOS}`}
      ayuda={
        <>
          El carrusel de la sección «Qué estás buscando». Con {MIN_SEGMENTOS_CARRUSEL} o
          más se apilan al scrollear; con uno solo se ve una card fija; sin
          ninguno, la sección no aparece. Las fotos se achican solas a{' '}
          {pesoLegible(PESO_OBJETIVO)}: van mejor horizontales y oscuras, como
          las que ya están.
        </>
      }
    >
      {lista.length > 0 && (
        <ul className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {lista.map((s, i) => {
            const id = ids(uid, s.id)
            const src = s.nueva?.vista ?? s.imagen?.url
            const ancho = s.nueva?.ancho ?? s.imagen?.ancho ?? 4
            const alto = s.nueva?.alto ?? s.imagen?.alto ?? 3
            const ocupado = Boolean(fotoEstado[s.id])
            const errorFoto = errores[id.foto] || fotoFalla[s.id]
            return (
              <FilaLista
                key={s.id}
                indice={i}
                total={lista.length}
                nombre="el segmento"
                onMover={(hacia) => setB((prev) => mover(prev, i, hacia))}
                onBorrar={() => (vacia(s) ? quitar(s.id) : setABorrar(s))}
              >
                {/* ── Foto ─────────────────────────────────────────── */}
                <div className="mt-3">
                  <p className="font-hud text-bone/55">
                    FOTO
                    {s.nueva && <span className="ml-2 text-amber">NUEVA, SIN GUARDAR</span>}
                  </p>
                  {src ? (
                    <img
                      src={src}
                      alt=""
                      width={ancho}
                      height={alto}
                      className="bevel mt-2 aspect-4/3 w-full bg-graphite/35 object-cover"
                      style={{ '--bevel': '12px' } as React.CSSProperties}
                    />
                  ) : (
                    <div
                      className="bevel font-hud mt-2 flex aspect-4/3 w-full items-center justify-center bg-graphite/35 text-bone/35"
                      style={{ '--bevel': '12px' } as React.CSSProperties}
                    >
                      SIN FOTO
                    </div>
                  )}

                  <input
                    id={id.archivo}
                    type="file"
                    accept="image/*"
                    tabIndex={-1}
                    aria-hidden="true"
                    className="sr-only"
                    onChange={(e) => elegirFoto(s, e.target.files?.[0])}
                  />
                  <Bevel
                    as="button"
                    type="button"
                    id={id.foto}
                    variant="outline"
                    bevel={12}
                    disabled={ocupado}
                    onClick={() => document.getElementById(id.archivo)?.click()}
                    aria-invalid={errorFoto ? true : undefined}
                    aria-describedby={errorFoto ? `${id.foto}-msj` : undefined}
                    borderClassName={errorFoto ? 'bg-flag' : 'bg-amber'}
                    outerClassName={`mt-3 block w-full ${ocupado ? 'opacity-60' : ''}`}
                    className="font-hud flex min-h-[3rem] items-center justify-center gap-3 px-6 text-bone"
                  >
                    <span>
                      {fotoEstado[s.id] || (src ? 'CAMBIAR LA FOTO' : 'ELEGIR LA FOTO')}
                    </span>
                    <span aria-hidden="true" className="text-amber">
                      \
                    </span>
                  </Bevel>
                  {errorFoto && (
                    <p
                      id={`${id.foto}-msj`}
                      role="alert"
                      className="font-hud mt-2 flex gap-2 text-flag normal-case"
                    >
                      <span aria-hidden="true">\</span>
                      <span>{errorFoto}</span>
                    </p>
                  )}
                </div>

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
                  placeholder="Ciudad"
                  ayuda="Una o dos palabras: es lo que se lee grande en la lista."
                  className="mt-5"
                />
                <AreaTexto
                  id={id.texto}
                  label="TEXTO"
                  valor={s.texto}
                  onCambio={(v) => {
                    editar(s.id, { texto: v })
                    limpiarError(id.texto)
                  }}
                  error={errores[id.texto]}
                  maxLength={MAX_TEXTO}
                  filas={3}
                  placeholder="Para moverte por el centro y estacionar sin pelearte con el auto."
                  ayuda="Una frase concreta: para qué sirve ese auto en Jujuy."
                  className="mt-5"
                />
                <Campo
                  id={`${uid}-${s.id}-etiqueta`}
                  label="RÓTULO"
                  valor={s.etiqueta}
                  onCambio={(v) => editar(s.id, { etiqueta: v })}
                  maxLength={MAX_ETIQUETA}
                  placeholder="4X4"
                  ayuda="Opcional. Va chiquito al costado del título, en mayúsculas."
                  className="mt-5"
                />
              </FilaLista>
            )
          })}
        </ul>
      )}

      {cuantos === 1 && (
        <p className="font-hud mt-4 text-bone/55 normal-case">
          Con un solo segmento la sección se ve como una card fija, sin carrusel.
          Sumá otro para que se apilen.
        </p>
      )}

      {lleno ? (
        <p className="font-hud mt-5 text-bone/40 normal-case">
          Llegaste a los {MAX_SEGMENTOS} segmentos, que es el máximo. Para sumar
          otro, borrá alguno.
        </p>
      ) : (
        <BotonAgregar onClick={agregar}>AGREGAR UN SEGMENTO</BotonAgregar>
      )}

      <BarraGuardar
        etiqueta="GUARDAR LOS SEGMENTOS"
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
            : 'Vas a borrar un segmento'
        }
        confirmar="Borrar el segmento"
        onConfirmar={() => aBorrar && quitar(aBorrar.id)}
        cancelar="No, dejarlo"
        onCancelar={() => setABorrar(null)}
        tono="peligro"
      >
        <p>
          Sale del sitio, con su foto, cuando toques «Guardar los segmentos».
          Hasta entonces, salir sin guardar lo deja como estaba.
        </p>
      </Dialogo>
    </Seccion>
  )
}

export default BloqueSegmentos
